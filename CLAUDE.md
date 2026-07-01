# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Next.js dev server on http://localhost:3000
npm run build         # Production build (also runs lint + types)
npm run start         # Run the production build
npm run type-check    # tsc --noEmit
npm run lint          # next lint
```

No test runner. To verify changes, hit routes with `curl` against the dev server — webhook is `/api/line/webhook`, agent endpoint is `/api/mastra/agent`. The README has agent test prompts.

## Big-picture architecture

Four surfaces share one Next.js 15 App Router project:

- `/` — marketing landing for sales (`src/app/page.tsx` + `src/components/landing/*`)
- `/dashboard/*` — HR/manager/executive web app, sidebar layout
- `/liff/*` — LINE LIFF mobile pages, max-w-md, runs inside LINE in-app browser
- `/api/line/webhook` and `/api/mastra/agent` — webhook + AI endpoints

### Dual-mode data layer

`src/lib/data.ts` is the only path to HR data. Most functions branch on `isDemo()`:
- `DEMO_MODE=true` (or missing `NEXT_PUBLIC_SUPABASE_URL`) → in-memory arrays from `src/lib/demo-data.ts`
- otherwise → Supabase via `src/lib/supabase/admin.ts` (service-role key, server-only, bypasses RLS)

**Not every function branches, though** — seven exported functions are demo-only and return seeded arrays **even when `DEMO_MODE=false`**: `getDashboardStats`, `getAttendanceTrend`, `getDepartmentBreakdown`, `listEmployeeShifts`, `listAttendanceLogs`, `listPayrolls`, `listPerformanceReviews`. So the entire dashboard analytics layer and those list views never touch Supabase in production yet. Don't assume a `data.ts` export reads the DB — check for an `isDemo()` branch first.

The schema (`supabase/schema.sql`) and demo data **mirror each other 1:1**, including UUIDs:
- Organization: `11111111-1111-1111-1111-111111111111`
- Employees: `33333333-...-333301` through `...-333310` (EMP001–EMP010). The `30N` trailing pattern is load-bearing — typos break FK constraints when seeding.

`hasSupabaseConfig()` in `admin.ts` strips a trailing `/rest/v1/` from the URL defensively (common copy-paste mistake), and the client throws loudly if env is missing.

Adding a new entity touches **five** files: `schema.sql`, `seed.sql`, `demo-data.ts`, the `types.ts` interface, and a helper pair in `data.ts` that branches on `isDemo()`.

### LIFF pages all follow the same cookie-session pattern

This is the **single most important non-obvious thing**. The whole gate is now encapsulated in **`guardLiffPage({ title, liffId })`** (`src/components/liff/page-guard.tsx`) — every feature page calls it first and renders the returned `view` when `ok === false`. Its three checks, in order:

1. **LINE login** — reads `liff_user_id` from cookies via `getLiffUserIdFromCookie()` (`src/lib/liff-session.ts`). If missing → render `<LiffInit liffId={...} />`, a client component that calls `liff.init()`, captures `profile.userId`, writes the cookie, then `router.refresh()`s so the server can re-render.
2. **Registration active** — `getRegistrationStatus(lineUserId)` collapses the DB `account_status` enum into four UI states: `pending_review`/`awaiting_supervisor` → `pending`, `inactive` → `rejected`, `active` → `active`, no employee row → `new`. Anything other than `active` → render `<NeedsRegistration status={...} />`.
3. **Tenant trial valid** — `getOrgTrialStatus(employee.org_id)`. If the org's trial is blocked → render `<TrialBlockedView />` (see SaaS multitenancy below). **This blocks the entire app, not just registration** — an active employee on an expired-trial org cannot open any feature page.

Only `/liff/page.tsx` (home) and `/liff/profile` roll their own version of this gate instead of calling `guardLiffPage`; the entry pages `/liff/register`, `/liff/register-supervisor`, `/liff/onboard` skip it entirely (the user isn't authenticated yet).

**Pitfall**: every form/page MUST pass its own LIFF id to `initLiff(...)`. With no arg, `initLiff` defaults to `NEXT_PUBLIC_LIFF_ID_CHECKIN`. Calling that default from a different page (e.g. `/liff/request-leave`) makes `liff.init` fail → silent fallback to a demo profile with userId `U1234...` → `getEmployeeByLineId` returns nothing → server actions misfire as EMP001. There's a `console.warn("falling back to demo")` in `liff-client.ts` when this happens — grep Vercel logs.

### SaaS multitenancy: tenants, tiers, trials, seats

The product is multi-tenant. The single demo org is one tenant among many; every employee/request is scoped by `org_id`.

- **Org columns** (added in `v3_saas_multitenant.sql`): `tier` (`free`/`starter`/`pro`/`enterprise`), `seat_limit` (default 10), `trial_started_at` / `trial_ends_at` (default `NOW() + 30 days`), `is_active`, plus `business_name` / `business_name_norm` / `business_type` / `owner_employee_id`.
- **Trial enforcement** lives in `getOrgTrialStatus(orgId)` and `canAcceptNewSeat(orgId)` (`data.ts`). An org is blocked with `reason: "deactivated"` (`is_active=false`), `"expired"` (`tier='free'` and past `trial_ends_at`), or `"seats_full"` (registration only). **Seats count `active` + `pending_review` employees** — a rejected applicant frees a seat.
- These trial/seat functions use **real `Date.now()`**, unlike the frozen-`2026-05-09` analytics — trials expire in wall-clock time.
- **Tenant resolution is by normalized name**: `business_name_norm = lower(trim(name))` (`normalizeBusinessName`), backed by a unique index. Same name in different case/spacing resolves to the same tenant. The first registrant of a new org becomes its `owner_employee_id` automatically.
- Manual upgrades use the `promote_org_tier(org_id, tier, seats, expires_at)` SQL function — no code change needed.
- The demo org is backfilled to `tier='enterprise'`, `seat_limit=999`, 5-year trial so demos never hit a gate.

### Registration & onboarding: supervisor-first, invite-driven

The product is **supervisor-first**. A boss registers their company, gets a QR / invite link, and shares it; employees self-register into the same tenant by opening that link. Three distinct LIFF entry flows create different things:

1. **`/liff/register-supervisor`** (`registerSupervisor`) — a boss/owner. Resolves the tenant by name **find-first** (`findOrganizationByBusinessName`), and only calls `createOrganization` **after** validating the (optional) declared team, so a failed registration never leaves an orphan org. `created = !existingOrg`. If `created`, the registrant is the **owner** and is **auto-activated** (`activateOwner`: `account_status='active'`, employee code, `owner_employee_id`) — nobody else can approve the first person — and a reusable **`org_invites`** row (opaque token) is minted; the success screen shows the QR + link. If joining an **existing** org they stay `pending_review` (approved by the owner/HR). **Security:** owner auto-activation keys off `created`, never `owner_employee_id IS NULL` (an existing populated tenant can have a NULL owner); `activateOwner` also refuses if the org already has any non-inactive member. Declaring subordinates against an existing org does **not** rewire their FKs at submit — the grants are stashed on `metadata.pending_subordinate_grants` and applied by `approveRegistration` only once the supervisor is approved (`applyPendingSubordinateGrants`).
2. **`/liff/register?invite=<token>`** (`registerEmployee`) — **invite-only**. `checkInvite(token)` resolves the org + inviting supervisor; the form hides the company step and auto-links the employee. `registerEmployee` requires `invite_token` (no business-name path), creates a `pending_review` employee in the invite's org, auto-links them to the inviting supervisor (leave/ot/contact FKs + `subordinate_ids` via the atomic `add_subordinate()` RPC), and increments `use_count`. The inviting supervisor approves via the existing LINE Flex card. A previously **rejected** (`inactive`) row on the same `line_user_id` may **re-apply** (the row is reused, possibly into a different org). The QR is served by `GET /api/invite-qr?token=` (stateless PNG via the `qrcode` lib); `/liff/invite` lets an active supervisor re-open / regenerate their company link.
3. **`/liff/onboard`** (`bindLineAccount`) — for an employee **already in the DB** (bulk-imported via `/dashboard/setup` CSV). It only binds `line_user_id` by `employee_code`; the form's other fields are vestigial and ignored server-side.

Invite links are carried through `src/lib/invite.ts` (`buildInviteUrl` = `https://liff.line.me/<REGISTER_LIFF_ID>?invite=<token>`). The token survives the LIFF login redirect via `sessionStorage` in `register-form.tsx`.

Cross-cutting facts:
- **Name resolution is fuzzy and org-scoped** (`findEmployeeByNameInOrg`): case-insensitive match across `name_th` / `name_en` / `name_zh` / `nickname` / `employee_code`, never crossing org boundaries.
- `account_status` is a 4-state machine: `pending_review` → `active` (via `approveRegistration`, sets `approved_at`/`approved_by_id`; **preserves the applicant's role** — approving a pending supervisor no longer demotes them to `employee`) or → `inactive` (reject, stores `rejection_reason`). `awaiting_supervisor` exists in the schema/types but **no code sets it yet** — it's reserved.
- Registration uploads photos (`id_card_photo_url`, `bank_book_photo_url`, `profile_photo_url`), which is why `next.config.ts` raises the Server Action `bodySizeLimit` to `10mb` and allowlists `profile.line-scdn.net` in `images.remotePatterns`.
- The demo-fallback LINE id `U1234…` (`DEMO_LINE_SENTINEL`) is rejected by both register functions when `!isDemo()`, so a mis-initialized LIFF client can't persist a phantom employee.

### Supervisor model

Two columns on `employees` drive team-management:
- `is_supervisor: boolean` — gates the "จัดการตารางลูกน้อง" toggle on the schedule page and the AI Assistant tab in `/liff/ai-chat`
- `subordinate_ids: uuid[]` — authoritative roster of who reports to this supervisor

Separately, three approval-routing pointers (each can point to a different supervisor):
- `leave_supervisor_id`, `ot_supervisor_id`, `contact_supervisor_id`

`listTeamForSupervisor()` prefers `subordinate_ids` and falls back to reverse-lookup on the three pointers if the array is empty. Both columns are added in `v3_saas_multitenant.sql`. The supervisor-only `/liff/team` page renders this roster as a live attendance board.

### LINE Flex approval flow

Three pieces work together:

1. **Flex builders** (`src/lib/line/flex.ts`) — six card builders (leave / OT / contact / registration approval + result card + schedule-change card), plus a `rejectionReasonQuickReply` helper. All share the formal corporate layout: navy header with reference code `KIND-YYYY-XXXXXXXX`, body with sender + details + optional stats sections, footer with postback Approve / Reject buttons. **No emojis anywhere in cards.**

2. **Service layer** (`src/lib/line/approvals.ts`) — `notifySupervisorOfLeave/Overtime/Contact`, `notifyHrOfRegistration`, `applyDecision`. Generates two single-use `line_action_tokens` per request (approve + reject) and embeds them in the postback data.

3. **Webhook** (`src/app/api/line/webhook/route.ts`):
   - `postback` event → parse `action=...&kind=...&token=...` → `consumeActionToken` (single-use, 7-day expiry) → `applyDecision`
   - On reject, set state via `setPendingRejection(userId, kind, requestId)` in `src/lib/line/pending-rejection.ts` (in-memory map, 5-min TTL) and reply with a Quick Reply asking for the reason
   - Next text message from that same userId is consumed as the rejection reason and pushed back as a Flex result card
   - Otherwise, text messages route to the AI agent

**LINE push gotcha**: Push API requires the user to have added the OA as a **friend** — not just to have messaged the bot. Reply API does not. If `pushFlex` returns 400 "Failed to send messages" but `replyText` works, the user has interacted but isn't friended. `src/lib/line/client.ts` `lineFetch` logs non-2xx as `console.error` with target userId and parsed body — visible in Vercel logs.

### Schedule change-log trigger

`schedule_entries` has a `BEFORE INSERT OR UPDATE` trigger `log_schedule_change` that inserts into `schedule_changes` whenever `is_supervisor_override = TRUE AND created_by_id != employee_id`. (This trigger's DDL is **not in any committed SQL file** — see the schema-drift warning under Production setup.) **Self-assignment intentionally does not fire the trigger** — testing the notification flow requires a real second employee.

`flushPendingScheduleNotifications` in `src/app/liff/my-attendance/schedule/actions.ts` drains `schedule_changes WHERE notified_at IS NULL`, pushes a `buildScheduleChangeCard` Flex to each affected employee with a deep-link to `https://liff.line.me/<LIFF_ID_ATTENDANCE>/schedule`, then marks `notified_at`. Runs inline after every supervisor mutation (move to cron in production).

### Mastra-style agent with deterministic fallback

`src/lib/mastra/agent.ts` exposes `runAgent(message, { employeeCode, channel })` with two implementations sharing the `{ response, tools_used }` shape:

1. `runAnthropic` — Claude Sonnet 4.6 tool-use loop (when `ANTHROPIC_API_KEY` is set; must start with `sk-ant-`)
2. `runFallback` — keyword intent detection + deterministic formatting (works without an API key)

`src/lib/mastra/tools.ts` registers 8 tools. Adding a tool requires updating **three** places:
- The `TOOLS` array (definition + `run` impl)
- The `detectIntent` switch in `agent.ts` (so fallback can route)
- A branch in `fallbackFormat` (so fallback returns nice text)

Same agent serves `/api/mastra/agent` (dashboard + LIFF AI chat) and `/api/line/webhook` (LINE text messages).

### i18n is cookie-based, not route-based

`src/i18n/request.ts` reads a `locale` cookie (default `en`); `src/i18n/actions.ts` `setLocale()` server action writes it and `revalidatePath()`s. Server pages use `getTranslations`, client components use `useTranslations`. The three message files (`src/messages/{en,th,zh}.json`) must stay key-aligned. The marketing landing at `/` deliberately hardcodes Thai — it's a sales page, not a localized app.

### Map components must be dynamic-imported

`src/components/dashboard/geofence-map.tsx` is a thin wrapper that `dynamic()`-imports `geofence-map-inner.tsx` with `ssr: false`. Leaflet touches `window` at module load and breaks SSR. Always import the wrapper, never the inner.

### Dashboard analytics still pin to a frozen "today"

`getDashboardStats` / `getAttendanceTrend` / `getDepartmentBreakdown` in `data.ts` (all three demo-only, per the data-layer note above), plus `todayMinus`/`timestampMinus` in `demo-data.ts`, are anchored to **`2026-05-09`**. The literal is **duplicated, not centralized** — it also appears in `data.ts`, `tools.ts`, `agent.ts`, and the `attendance`/`shifts` dashboard pages, so moving "today" means changing every copy, not re-seeding alone. Don't replace these with `new Date()` lightly — attendance logs, leave dates, and KPI math all live in this frame. Approval flows (leave/OT/contact submit + schedule entries) and the trial/seat checks use real `new Date()` and are not affected.

## Strict design conventions

These are enforced — reviewers reject deviations:

- **Palette only**: `#FFFFFF` background, `#0F172A` (`navy-900`) text, `#FB923C` (`orange-400`) accents. Tailwind has `navy-{50..900}` and `orange-{50..700}` ramps; use these, not arbitrary hex.
- **No emojis anywhere** — code, UI copy, Flex cards, comments. Use Lucide icons (navy or orange only).
- **Fonts**: Inter / Noto Sans Thai / Noto Sans SC, loaded in `src/app/layout.tsx` as CSS variables; `font-sans` cascades correctly.
- **Shadows**: only `shadow-soft` (controls) and `shadow-card` (cards).
- **Spacing**: 8px grid. Card padding `p-5` or `p-6`. Sections `py-20 sm:py-24`.
- **Use primitives** in `src/components/ui/`. Don't reach for raw `<button>` or invent new variants.
- **Toaster**: `sonner` is mounted in the root layout with palette-matching classNames — `import { toast } from "sonner"` and call.

## Layout boundaries

- Root layout (`src/app/layout.tsx`) installs fonts, the i18n provider, and the toaster. Don't add a top-level header here — each surface has its own.
- `/dashboard/*` shares `src/app/dashboard/layout.tsx` (sidebar + content shell). Each page renders its own `<DashboardTopbar>`.
- `/liff/*` shares `src/app/liff/layout.tsx` (max-w-md + bottom nav). Each page renders its own `<LiffHeader>`. Bottom nav (`bottom-nav.tsx`, `HIDDEN_PATHS`) is hidden on the three entry pages `/liff/register`, `/liff/register-supervisor`, and `/liff/onboard` (user isn't authenticated yet).

## Production setup

Apply Supabase SQL in this order (all idempotent). **Four** SQL files exist in the repo:

1. `supabase/schema.sql` — base 11 tables (organizations, employees, shifts, employee_shifts, attendance_logs, leave_requests, overtime_requests, payrolls, performance_reviews, notifications, ai_agent_interactions), RLS enabled
2. `supabase/seed.sql` — 10 demo employees, shifts, sample data
3. `supabase/migrations/v3_saas_multitenant.sql` — the SaaS layer: org tier/trial/seat columns, the `social_security_config` table (Thai SSO 2026 rates pre-seeded) + `current_sso_config` view, `profile_edit_audit` table, the `promote_org_tier()` function, the supervisor columns (`is_supervisor`, `subordinate_ids`), the three approval pointers, and the full registration/onboarding column set on `employees`.
4. `supabase/migrations/v4_org_invites.sql` — the supervisor-first invite layer: the **`org_invites`** table (token → org_id + inviting supervisor, expiry/max_uses/use_count), the atomic **`add_subordinate()`** function (race-free subordinate append), and an `owner_employee_id` backfill so no populated tenant is left "ownerless" (the seeded demo org is set to EMP008). **Must be applied for the invite/QR registration flow to work in production.**

**Schema-drift warning (important):** `data.ts` queries five tables — `contact_requests`, `line_action_tokens`, `schedule_entries`, `schedule_assignments`, `schedule_changes` — and relies on the `log_schedule_change` trigger, but **none of these have committed DDL anywhere in `supabase/`**. They exist only in the live Supabase database. A fresh Supabase project seeded from this repo's SQL alone will be missing them, and the LINE approval + scheduling flows will fail at runtime. If you touch those features, treat the live DB as the source of truth and consider committing their DDL as a new migration. (There is no `v2` file — everything before invites landed in `v3_saas_multitenant.sql`; the invite layer is `v4_org_invites.sql`.)

Required env vars (see `.env.example` for the authoritative list):
- `NEXT_PUBLIC_SUPABASE_URL` (no trailing `/rest/v1/`), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` + `LINE_CHANNEL_ID`
- `ANTHROPIC_API_KEY` (optional — fallback agent works without; key must start with `sk-ant-`)
- `NEXT_PUBLIC_APP_URL`
- **Eleven** `NEXT_PUBLIC_LIFF_ID_*` ids: CHECKIN, ATTENDANCE, LEAVE, OT, PAYSLIP, AI_CHAT, TEAM, ONBOARD, REGISTER, REGISTER_SUPERVISOR, PROFILE. Two have code fallbacks: REGISTER_SUPERVISOR falls back to REGISTER, and PROFILE falls back to CHECKIN.
- `DEMO_MODE=false`

Vercel inlines `NEXT_PUBLIC_*` at build time — change env vars then **Redeploy**, not just restart.

Geofence default in `demo-data.ts` and dashboard fallbacks: `13.740198598326677, 100.56227944249513`. Update via `organizations` table in production.

## Marketing landing image prompts

`marketing/IMAGE-PROMPTS-{TH,EN,ZH}.md` hold seven SaaS-ad composition templates (Product+Outcome, Before/After, 3-Step Flow, Metric Hero, Feature Grid, Persona, Comparison Table). Every prompt mandates in-image typography (hook ≤ 12 words + "wow" sub-description + 3 callouts + CTA pill + brand logo) and forbids emojis. Use **Ideogram 2.0** or **DALL·E 3** for Thai/Chinese rendering — Midjourney garbles non-Latin characters.

## LINE webhook signature

`src/lib/line/client.ts` `verifyLineSignature` uses HMAC-SHA256 + `crypto.timingSafeEqual`. The handler only skips verification when `LINE_CHANNEL_SECRET` is unset (dev). In any environment with the secret, an invalid signature returns 401.

## Sibling agent docs

`AGENTS.md` (untracked) is a near-verbatim copy of this file with `Claude`→`Codex` substitutions, kept for Codex/other agents. It is maintained **by hand**, so substantive edits here should be mirrored there (the sed-style copy also introduced one factual slip — "Codex Sonnet 4.6" should still read Claude Sonnet 4.6).
