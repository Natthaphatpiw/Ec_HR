# EC AIHR

> The LINE-First HR SaaS by **eCloudtec Thailand** — designed to fit any Thai business: restaurants,
> retail, clinics, factories, offices, logistics, construction, and more.
> Clock-in, leave, payroll, shifts, and an AI assistant — all running inside the LINE app your team
> already uses every day.

**Status:** v1.1 reference implementation. Ships with mock data and deterministic AI fallbacks so
the landing page, authenticated dashboard, LIFF flows, AI chat, and LINE webhook work locally
without configuring Supabase, LINE, OpenAI, or Anthropic.

---

## Stack

| Layer            | Choice                                          |
| ---------------- | ----------------------------------------------- |
| Framework        | Next.js 15 (App Router, Server Components, Server Actions, RSC streaming) |
| UI               | Tailwind CSS + shadcn/ui (Radix primitives)     |
| Charts           | Recharts                                        |
| Maps             | Leaflet + react-leaflet (geofence visualization) |
| i18n             | next-intl (EN / TH / ZH)                        |
| Database         | Supabase Postgres (RLS enabled; server data layer uses service role) |
| Auth             | Signed web owner session + server-verified LINE ID-token session |
| LINE             | Messaging API + Rich Menu + LIFF v2 + Webhook   |
| AI               | OpenAI Responses workforce assistant + legacy Mastra-style LINE agent |
| Deployment       | Vercel + Supabase                               |

---

## Quick start

```bash
# 1. Install
pnpm install   # or: npm install / yarn

# 2. Copy env, then add the values below to .env.local
cp .env.example .env.local

# 3. Signed owner login + isolated synthetic demo
DEMO_MODE=true
DASHBOARD_AUTH_USERNAME=demo@ecloudtec.com
DASHBOARD_AUTH_PASSWORD=EC-AIHR-Demo-2569!
DASHBOARD_SESSION_SECRET=<at-least-32-random-characters>
DASHBOARD_ORG_ID=11111111-1111-1111-1111-111111111111
DASHBOARD_WORKFORCE_JSON_DEMO=true
DEMO_WORKFORCE_ORG_ID=11111111-1111-1111-1111-111111111111

# 4. Run
pnpm dev
```

Open:

- **Landing page:** http://localhost:3000/
- **Owner login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **LIFF demo (mobile-shaped):** http://localhost:3000/liff
- **Workforce analytics:** http://localhost:3000/dashboard/analytics
- **AI assistant:** http://localhost:3000/dashboard/ai-assistant

The app boots in **demo mode** by default (`DEMO_MODE=true`). The analytics and web assistant can
use the deterministic 10-employee, two-month source in `src/data/demo-workforce-2026.json`. Change
the sample password and session secret before using an internet-accessible deployment.

For a real LINE account to open the demo as a specific seeded role, keep the
verified LINE user ID server-side and add a Vercel environment mapping such as:

```bash
DEMO_LIFF_EMPLOYEE_MAP={"U_your_32_hex_LINE_user_id":"EMP008"}
```

Open `/liff/onboard` through LINE and use **คัดลอก LINE ID สำหรับตั้งค่า Demo**
to obtain the verified subject for this mapping, then redeploy after changing
the Vercel environment variable.

Use `EMP008` (organization owner) or `EMP004` (HR) for organization analytics,
and `EMP002`/`EMP006` for team-only supervisor analytics. An unmapped LINE
account is sent to the existing registration flow instead of being silently
treated as another employee. The mapping is for the in-memory sales demo only;
production tenants should persist the verified LINE subject on the employee row.

---

## Demo accounts (LIFF)

| Code   | Name (EN)            | Role        | Department  | LINE bound |
| ------ | -------------------- | ----------- | ----------- | ---------- |
| EMP001 | Somchai Jaidee       | employee    | Production  | yes        |
| EMP002 | Somying Rakngan      | supervisor  | Production  | yes        |
| EMP004 | Nantana Sukjai       | hr          | HR          | no (try /liff/onboard) |
| EMP008 | Pariya Chalat        | executive   | Management  | yes        |
| EMP010 | Lalita Keng          | employee    | Production  | no (try /liff/onboard) |

---

## Production setup

### 1. Database (Supabase)

Run the schema and migrations in this exact order. The base seed is optional
and is only for the Northstar Electronics demo tenant:

```sql
\i supabase/schema.sql
\i supabase/seed.sql -- optional
\i supabase/migrations/v2_approvals_and_schedule.sql
\i supabase/migrations/v3_saas_multitenant.sql
\i supabase/migrations/v4_org_invites.sql
\i supabase/migrations/v5_preflight_payroll_duplicates.sql -- only when v5 reports duplicates
\i supabase/migrations/v5_analytics_geofence_payroll.sql
\i supabase/migrations/v6_workforce_assistant_reports.sql -- optional: durable live-tenant AI reports
\i supabase/migrations/v7_workforce_assistant_quota.sql -- recommended: shared OpenAI cost quota
```

Or copy-paste each file's contents into the SQL editor.

Then in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
DEMO_MODE=false
DASHBOARD_AUTH_USERNAME=<organization owner username>
DASHBOARD_AUTH_PASSWORD=<strong password>
DASHBOARD_SESSION_SECRET=<at least 32 random characters>
DASHBOARD_ORG_ID=<organization UUID>
```

The schema enables Row Level Security on sensitive tables, but `src/lib/data.ts`
uses the server-only service-role client and therefore bypasses those policies.
The dashboard owner cookie is signed and the LIFF cookie is issued only after server-side LINE
ID-token verification. Before a multi-organization production launch, replace the single-owner
environment credential with a per-user identity provider and enforce the following tenant/role
rules in both application authorization and RLS:

- **employee** — `SELECT` own row, own attendance, own leave/OT, own payroll only
- **supervisor** — same-department `SELECT`, `UPDATE` on leave/OT status
- **hr** — full CRUD inside their `org_id`
- **executive** — read-only inside their `org_id`

### 2. LINE Official Accounts

Create one **Employee OA** and one **Management OA** in the LINE Developers Console.

For each, register a **Messaging API channel** and grab:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ID`

Also set the numeric ID of the **LINE Login channel that owns the LIFF apps**:

- `LINE_LOGIN_CHANNEL_ID`
- `LIFF_SESSION_SECRET` (server-only, at least 32 random characters)

Set the webhook URL to:

```
https://<your-domain>/api/line/webhook
```

The webhook auto-verifies signatures with `LINE_CHANNEL_SECRET`.

### 3. LIFF apps

Create LIFF apps under your LINE Login channel. Each app maps to one of the LIFF routes:

| Env var                                | Endpoint URL                                  | Size     |
| -------------------------------------- | --------------------------------------------- | -------- |
| `NEXT_PUBLIC_LIFF_ID_CHECKIN`          | `https://<domain>/liff/checkin`               | Full     |
| `NEXT_PUBLIC_LIFF_ID_ATTENDANCE`       | `https://<domain>/liff/my-attendance`         | Full     |
| `NEXT_PUBLIC_LIFF_ID_LEAVE`            | `https://<domain>/liff/request-leave`         | Full     |
| `NEXT_PUBLIC_LIFF_ID_OT`               | `https://<domain>/liff/request-ot`            | Full     |
| `NEXT_PUBLIC_LIFF_ID_PAYSLIP`          | `https://<domain>/liff/payslip`               | Full     |
| `NEXT_PUBLIC_LIFF_ID_AI_CHAT`          | `https://<domain>/liff/ai-chat`               | Full     |
| `NEXT_PUBLIC_LIFF_ID_TEAM`             | `https://<domain>/liff/team`                  | Full     |
| `NEXT_PUBLIC_LIFF_ID_ONBOARD`          | `https://<domain>/liff/onboard`               | Full     |
| `NEXT_PUBLIC_LIFF_ID_ANALYTICS`        | `https://<domain>/liff/analytics`             | Full     |

Each LIFF app needs the `profile` and `openid` scopes.

`NEXT_PUBLIC_LIFF_ID_ANALYTICS` is optional in code. If it is absent, analytics reuses
`NEXT_PUBLIC_LIFF_ID_ATTENDANCE`. Reuse is reliable only when the Attendance LIFF Endpoint URL is
the common parent `https://<domain>/liff`; then open attendance and analytics through
`https://liff.line.me/<ATTENDANCE_LIFF_ID>/my-attendance` and
`https://liff.line.me/<ATTENDANCE_LIFF_ID>/analytics`. If the existing endpoint remains
`/liff/my-attendance`, create the dedicated analytics LIFF app instead.

### 4. Rich Menus

Build two Rich Menus:

- **Employee menu**: Clock In · Leave · OT · Payslip · My Attendance · AI
- **Management menu**: Today · Approvals · Team · Reports · AI · Settings

Switch menus per user with the LINE `richmenu/<menuId>/user/<userId>` API after binding completes
in `/liff/onboard`.

### 5. AI assistants

The authenticated web dashboard uses OpenAI Responses with structured output and the
`gpt-5.6-luna` model:

```bash
OPENAI_API_KEY=sk-...
```

Without this key, `/dashboard/ai-assistant` still answers common workforce questions from the
same JSON source deterministically. Generated report pages render validated React/Recharts data;
raw model HTML is never executed.

The synthetic JSON demo keeps OpenAI responses for multi-turn chat. Live tenant processing is
stateless and audit persistence is off by default. Enable `OPENAI_STORE_RESPONSES=true` and/or
`WORKFORCE_ASSISTANT_AUDIT_ENABLED=true` only after defining the organization's PDPA/DPA,
retention, and deletion policy. For an internet-facing Vercel deployment, apply migration v7 and
set `WORKFORCE_ASSISTANT_SHARED_RATE_LIMIT=true` plus
`WORKFORCE_ASSISTANT_SHARED_RATE_LIMIT_REQUIRED=true`. The shared minute/day quota is atomic
across regions and fails closed if unavailable; concurrency remains a per-instance latency guard.

The existing LINE/LIFF agent can additionally use Anthropic:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

The agent in `src/lib/mastra/agent.ts` calls Claude Sonnet 4.6 with the eight tools defined in
`src/lib/mastra/tools.ts`. Without a key, it falls back to deterministic intent routing so demos
still work.

To swap in `@mastra/core` formally, replace `runAnthropic` with a Mastra workflow that uses the
same tool list — the tool signatures are already Mastra-compatible.

---

## Routes

### Public

| Route | Description |
| ----- | ----------- |
| `/`   | Multilingual landing page (Hero, Why, Features, How, Compliance, Testimonials, CTA, Footer) |
| `/login` | Signed organization-owner login for all dashboard routes |

### Dashboard (`/dashboard/*`)

| Route                         | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `/dashboard`                  | Overview — KPIs, attendance trend, AI insight, activity    |
| `/dashboard/attendance`       | Calendar + geofence map + live clock-in feed                |
| `/dashboard/shifts`           | Interactive shift planner + AI Suggest Schedule             |
| `/dashboard/employees`        | Searchable roster + CSV import/export                       |
| `/dashboard/leave`            | Leave + OT approval queue                                   |
| `/dashboard/payroll`          | Payroll snapshots + Thai 2026 SSO/PIT estimate detail       |
| `/dashboard/reports`          | Legacy report presentation                                  |
| `/dashboard/analytics`        | Source-backed workforce dashboard + scoped Excel export     |
| `/dashboard/ai-assistant`     | Full-page OpenAI workforce chat with stop/new-chat controls  |
| `/dashboard/ai-reports/[slug]`| Validated charts and findings opened from assistant answers  |
| `/dashboard/settings`         | Factory profile, geofence editor, holidays, roles           |
| `/dashboard/setup`            | First-time admin onboarding (org create + LINE OA bind)     |

### LIFF (`/liff/*`)

| Route                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `/liff`                | Worker home (cards: Clock, Leave, OT, Payslip, AI)     |
| `/liff/checkin`        | GPS clock-in/out with configurable server-side geofence |
| `/liff/my-attendance`  | Personal weekly + monthly history                      |
| `/liff/request-leave`  | Leave request form + balance                           |
| `/liff/request-ot`     | OT request form + Thai labor-law calc                  |
| `/liff/payslip`        | Latest + past payroll snapshots and Thai tax/SSO detail |
| `/liff/ai-chat`        | Chat with EC AIHR Assistant inside LINE                |
| `/liff/team`           | Supervisor view: team attendance today                 |
| `/liff/analytics`      | Supervisor/HR/executive team or organization analytics |
| `/liff/onboard`        | Bind LINE user ID to an `employees` row                |

### API

| Route                  | Method | Description                                          |
| ---------------------- | ------ | ---------------------------------------------------- |
| `/api/line/webhook`    | POST   | LINE Messaging API webhook (signature-verified)      |
| `/api/mastra/agent`    | POST   | `{ message, employeeId?, channel? }` → agent reply   |
| `/api/analytics/export`| GET    | Authorized Excel export by dataset and date window    |
| `/api/liff/session`    | POST   | Verify LINE ID token and issue signed HttpOnly session |
| `/api/workforce-assistant` | POST | Authorized streamed OpenAI/fallback workforce answer |

---

## EC AIHR Assistant

The web assistant receives the validated workforce context and the `Asia/Bangkok` timezone. Live
tenants use the current Bangkok date per request; the frozen JSON demo uses its latest source date
`2026-07-15`. It resolves phrases such as “เมื่อวาน” and “เมื่อ 2 วันที่แล้ว”, streams a concise
answer, and can link to a safe report page with charts.
Attendance signals are described neutrally; they are not used to label character, diligence, or
employee quality.

### Legacy LINE agent tools

Defined in `src/lib/mastra/tools.ts`. All eight tools are registered with the Anthropic API as
tool definitions, so Claude can call them autonomously. Each one reads from the same data layer
the dashboards do.

| Tool                       | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `get_employee`             | Look up by code or LINE user ID                          |
| `list_attendance`          | Recent clock-in/out records                              |
| `get_leave_balance`        | Annual / sick / personal balance                         |
| `list_pending_approvals`   | Leave + OT awaiting decision                             |
| `get_payroll_summary`      | Monthly base / OT / SSF / tax / net                      |
| `suggest_shift_schedule`   | AI-generated rotation suggestions                        |
| `predict_absenteeism`      | Risk score for next-day no-shows                         |
| `draft_announcement`       | Compose a LINE broadcast in EN/TH/ZH                     |

### Example prompts

Try these in the dashboard's `Ask AI` page or in the LIFF chat:

```text
- What is EMP001's leave balance?
- Show me today's attendance.
- Who is late today?
- Generate the May payroll for EMP001.
- Suggest a shift schedule for Production next week.
- Are there any pending approvals right now?
- Draft a Songkran holiday announcement in Thai.
```

The legacy fallback agent (no Anthropic key) handles its supported prompts deterministically.
With an Anthropic key, Claude calls the tools and synthesizes natural-language answers in the
user's language. The web workforce assistant uses `OPENAI_API_KEY` independently.

### Test cases

```text
1. "What is EMP001's leave balance?"
   → Tool: get_leave_balance(employee_code: "EMP001")
   → Reply mentions Annual remaining, Sick remaining, Personal remaining.

2. "Who is late today?"
   → Tool: list_attendance(date: "2026-05-09")
   → Reply lists 1–3 employees with status: late.

3. "Generate the May payroll for EMP001."
   → Tool: get_payroll_summary(employee_code: "EMP001", month_year: "2026-05")
   → Reply shows base, OT, deductions, net pay in baht.

4. "Suggest a shift schedule for Production."
   → Tool: suggest_shift_schedule(department: "Production")
   → Reply lists 3 actionable suggestions.

5. "Pending approvals?"
   → Tool: list_pending_approvals
   → Reply: "X leave + Y overtime requests waiting".

6. "Draft a Songkran message in Thai."
   → Tool: draft_announcement(topic: "Songkran holiday", language: "th")
   → Reply with full Thai broadcast text.
```

---

## Design principles enforced in code

- **No emojis anywhere** — Lucide icons only, in navy with orange accents
- **Strict palette** — `#FFFFFF` background, `#0F172A` text, `#FB923C` accents
- **8px grid** — Tailwind spacing locked to multiples of 4
- **Subtle shadows only** — `shadow-soft` and `shadow-card` defined in Tailwind config
- **Inter** for Latin, **Noto Sans Thai** for Thai, **Noto Sans SC** for Chinese
- **Generous white space** — All cards padded `p-5`/`p-6`, generous section padding
- **Mobile-first LIFF** — Max-width `420px`, bottom nav always visible

---

## Internationalization

Three languages, switchable from the top-right dropdown on every page:

- `EN` — English
- `TH` — ไทย
- `ZH` — 中文

The selected locale is persisted in a cookie. All translations live in `src/messages/{en,th,zh}.json`.

---

## Project layout

```
src/
  app/
    layout.tsx                  # Root layout (fonts, i18n provider, toaster)
    page.tsx                    # Landing page
    dashboard/                  # Manager / HR web dashboard
      layout.tsx                # Sidebar + main shell
      page.tsx                  # Overview
      attendance/
      shifts/
      employees/
      leave/
      payroll/
      reports/
      ai-assistant/
      ai-reports/
      settings/
      setup/
    liff/                       # LINE LIFF mobile pages
      layout.tsx                # Bottom nav + max-width
      page.tsx                  # Worker home
      checkin/                  # GPS clock-in
      my-attendance/
      request-leave/
      request-ot/
      payslip/
      ai-chat/
      team/
      analytics/
      onboard/                  # LINE → employee binding
    api/
      line/webhook/             # LINE Messaging API webhook
      liff/session/             # LINE ID-token verification + signed cookie
      mastra/agent/             # Mastra agent endpoint
      workforce-assistant/      # OpenAI Responses + deterministic fallback
  components/
    landing/                    # Hero, features, how, compliance, etc.
    dashboard/                  # Sidebar, topbar, charts, AI chat
    liff/                       # Bottom nav, checkin client, leave/OT forms
    ui/                         # shadcn/ui primitives
  i18n/
    config.ts
    request.ts
    actions.ts
  messages/
    en.json
    th.json
    zh.json
  lib/
    demo-data.ts                # In-memory mock data for demo mode
    demo-workforce.ts           # Validated two-month JSON analytics adapter
    workforce-assistant/        # Context, date resolution, OpenAI, reports
    data.ts                     # Data access layer
    types.ts                    # Domain types
    utils.ts
    supabase/                   # Browser + server clients
    mastra/                     # Agent + tools
    line/                       # Webhook signature, reply, push helpers
    liff-client.ts              # LIFF init wrapper with demo fallback
supabase/
  schema.sql                    # Full DB schema
  seed.sql                      # Seed / mock data
```

---

## Security checklist

- LINE webhook signature verified (HMAC-SHA256 + timing-safe compare)
- Dashboard owner session signed in an HttpOnly cookie; production fails closed if auth env is incomplete
- LIFF ID token verified server-side against its LINE Login channel before issuing an HttpOnly cookie
- Supabase RLS enabled on `employees`, `attendance_logs`, `leave_requests`,
  `overtime_requests`, `payrolls`, `notifications`
- Geofence + IP whitelist enforced server-side
- Photo verification toggle in factory settings
- VPN/proxy detection toggle
- PDPA-compliant data residency (Singapore region)
- Right-to-export and right-to-delete UI hooks (Settings → Roles)

---

## License

Proprietary. © 2026 eCloudtec Thailand.
