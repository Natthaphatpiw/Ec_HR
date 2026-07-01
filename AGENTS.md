# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

`src/lib/data.ts` is the only path to HR data. Every function branches on `isDemo()`:
- `DEMO_MODE=true` (or missing `NEXT_PUBLIC_SUPABASE_URL`) → in-memory arrays from `src/lib/demo-data.ts`
- otherwise → Supabase via `src/lib/supabase/admin.ts` (service-role key, server-only, bypasses RLS)

The schema (`supabase/schema.sql`) and demo data **mirror each other 1:1**, including UUIDs:
- Organization: `11111111-1111-1111-1111-111111111111`
- Employees: `33333333-...-333301` through `...-333310` (EMP001–EMP010). The `30N` trailing pattern is load-bearing — typos break FK constraints when seeding.

`hasSupabaseConfig()` in `admin.ts` strips a trailing `/rest/v1/` from the URL defensively (common copy-paste mistake), and the client throws loudly if env is missing.

Adding a new entity touches **four** files: `schema.sql`, `seed.sql`, `demo-data.ts`, and a helper pair in `data.ts` that branches on `isDemo()`.

### LIFF pages all follow the same cookie-session pattern

This is the **single most important non-obvious thing**. Every page under `/liff/*` (except `/liff/register`, the entry point) follows:

1. Server component reads `liff_user_id` from cookies via `getLiffUserIdFromCookie()` (`src/lib/liff-session.ts`)
2. If missing → render `<LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_X} />` — a client component that calls `liff.init()`, captures `profile.userId`, writes the cookie, then `router.refresh()`s so the server can re-render
3. Once the cookie exists, server calls `getRegistrationStatus(lineUserId)`:
   - `new` / `pending` / `rejected` → render `<NeedsRegistration />`
   - `active` → fetch data scoped to `registration.employee.id` and render

**Pitfall**: every form/page MUST pass its own LIFF id to `initLiff(...)`. With no arg, `initLiff` defaults to `NEXT_PUBLIC_LIFF_ID_CHECKIN`. Calling that default from a different page (e.g. `/liff/request-leave`) makes `liff.init` fail → silent fallback to a demo profile with userId `U1234...` → `getEmployeeByLineId` returns nothing → server actions misfire as EMP001. There's a `console.warn("falling back to demo")` in `liff-client.ts` when this happens — grep Vercel logs.

### Supervisor model

Two columns on `employees` drive team-management:
- `is_supervisor: boolean` — gates the "จัดการตารางลูกน้อง" toggle on the schedule page and the AI Assistant tab in `/liff/ai-chat`
- `subordinate_ids: uuid[]` — authoritative roster of who reports to this supervisor

Separately, three approval-routing pointers (each can point to a different supervisor):
- `leave_supervisor_id`, `ot_supervisor_id`, `contact_supervisor_id`

`listTeamForSupervisor()` prefers `subordinate_ids` and falls back to reverse-lookup on the three pointers if the array is empty. Migration v4 backfills both columns from the existing pointers.

### LINE Flex approval flow

Three pieces work together:

1. **Flex builders** (`src/lib/line/flex.ts`) — five card types (leave / OT / contact / registration approval + result card + schedule-change card). All share the formal corporate layout: navy header with reference code `KIND-YYYY-XXXXXXXX`, body with sender + details + optional stats sections, footer with postback Approve / Reject buttons. **No emojis anywhere in cards.**

2. **Service layer** (`src/lib/line/approvals.ts`) — `notifySupervisorOfLeave/Overtime/Contact`, `notifyHrOfRegistration`, `applyDecision`. Generates two single-use `line_action_tokens` per request (approve + reject) and embeds them in the postback data.

3. **Webhook** (`src/app/api/line/webhook/route.ts`):
   - `postback` event → parse `action=...&kind=...&token=...` → `consumeActionToken` (single-use, 7-day expiry) → `applyDecision`
   - On reject, set state via `setPendingRejection(userId, kind, requestId)` in `src/lib/line/pending-rejection.ts` (in-memory map, 5-min TTL) and reply with a Quick Reply asking for the reason
   - Next text message from that same userId is consumed as the rejection reason and pushed back as a Flex result card
   - Otherwise, text messages route to the AI agent

**LINE push gotcha**: Push API requires the user to have added the OA as a **friend** — not just to have messaged the bot. Reply API does not. If `pushFlex` returns 400 "Failed to send messages" but `replyText` works, the user has interacted but isn't friended. `src/lib/line/client.ts` `lineFetch` logs non-2xx as `console.error` with target userId and parsed body — visible in Vercel logs.

### Schedule change-log trigger

`schedule_entries` has a `BEFORE INSERT OR UPDATE` trigger `log_schedule_change` (migration v2 SQL) that inserts into `schedule_changes` whenever `is_supervisor_override = TRUE AND created_by_id != employee_id`. **Self-assignment intentionally does not fire the trigger** — testing the notification flow requires a real second employee.

`flushPendingScheduleNotifications` in `src/app/liff/my-attendance/schedule/actions.ts` drains `schedule_changes WHERE notified_at IS NULL`, pushes a `buildScheduleChangeCard` Flex to each affected employee with a deep-link to `https://liff.line.me/<LIFF_ID_ATTENDANCE>/schedule`, then marks `notified_at`. Runs inline after every supervisor mutation (move to cron in production).

### Mastra-style agent with deterministic fallback

`src/lib/mastra/agent.ts` exposes `runAgent(message, { employeeCode, channel })` with two implementations sharing the `{ response, tools_used }` shape:

1. `runAnthropic` — Codex Sonnet 4.6 tool-use loop (when `ANTHROPIC_API_KEY` is set; must start with `sk-ant-`)
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

`getDashboardStats` / `getAttendanceTrend` / `getDepartmentBreakdown` in `data.ts`, plus `todayMinus`/`timestampMinus` in `demo-data.ts`, are anchored to **`2026-05-09`**. Don't replace these with `new Date()` without re-seeding — attendance logs, leave dates, and KPI math all live in this frame. Approval flows (leave/OT/contact submit + schedule entries) use real `new Date().toISOString()` and are not affected.

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
- `/liff/*` shares `src/app/liff/layout.tsx` (max-w-md + bottom nav). Each page renders its own `<LiffHeader>`. Bottom nav is hidden on `/liff/register` and `/liff/onboard` (entry pages where the user isn't yet authenticated).

## Production setup

Apply Supabase SQL in this order (all idempotent):

1. `supabase/schema.sql` — base 11 tables, RLS enabled
2. `supabase/seed.sql` — 10 demo employees, shifts, sample data
3. Migration v2+v3 (`contact_requests`, `schedule_entries/assignments/changes`, `line_action_tokens` with 4-value CHECK, `log_schedule_change` trigger, registration columns on `employees`)
4. Migration v4 (`is_supervisor` boolean + `subordinate_ids` UUID[] + backfill from reverse lookup)

Required env vars:
- `NEXT_PUBLIC_SUPABASE_URL` (no trailing `/rest/v1/`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET`
- `ANTHROPIC_API_KEY` (optional — fallback agent works without; key must start with `sk-ant-`)
- `NEXT_PUBLIC_LIFF_ID_*` (8 ids: CHECKIN, ATTENDANCE, LEAVE, OT, PAYSLIP, AI_CHAT, REGISTER, ONBOARD)
- `DEMO_MODE=false`

Vercel inlines `NEXT_PUBLIC_*` at build time — change env vars then **Redeploy**, not just restart.

Geofence default in `demo-data.ts` and dashboard fallbacks: `13.740198598326677, 100.56227944249513`. Update via `organizations` table in production.

## Marketing landing image prompts

`marketing/IMAGE-PROMPTS-{TH,EN,ZH}.md` hold seven SaaS-ad composition templates (Product+Outcome, Before/After, 3-Step Flow, Metric Hero, Feature Grid, Persona, Comparison Table). Every prompt mandates in-image typography (hook ≤ 12 words + "wow" sub-description + 3 callouts + CTA pill + brand logo) and forbids emojis. Use **Ideogram 2.0** or **DALL·E 3** for Thai/Chinese rendering — Midjourney garbles non-Latin characters.

## LINE webhook signature

`src/lib/line/client.ts` `verifyLineSignature` uses HMAC-SHA256 + `crypto.timingSafeEqual`. The handler only skips verification when `LINE_CHANNEL_SECRET` is unset (dev). In any environment with the secret, an invalid signature returns 401.
