# EC AIHR

> The LINE-First HR SaaS by **eCloudtec Thailand** — designed to fit any Thai business: restaurants,
> retail, clinics, factories, offices, logistics, construction, and more.
> Clock-in, leave, payroll, shifts, and an AI assistant — all running inside the LINE app your team
> already uses every day.

**Status:** v1.1 reference implementation. Ships with mock data and a fallback agent so the entire
app — landing page, dashboard, LIFF flows, AI chat, LINE webhook — works locally without
configuring Supabase, LINE, or Anthropic.

---

## Stack

| Layer            | Choice                                          |
| ---------------- | ----------------------------------------------- |
| Framework        | Next.js 15 (App Router, Server Components, Server Actions, RSC streaming) |
| UI               | Tailwind CSS + shadcn/ui (Radix primitives)     |
| Charts           | Recharts                                        |
| Maps             | Leaflet + react-leaflet (geofence visualization) |
| i18n             | next-intl (EN / TH / ZH)                        |
| Database         | Supabase Postgres (RLS-enforced)                |
| Auth             | Supabase Auth + LINE Login via LIFF             |
| LINE             | Messaging API + Rich Menu + LIFF v2 + Webhook   |
| AI agent         | Mastra-style tool runtime + Claude Sonnet 4.6   |
| Deployment       | Vercel + Supabase                               |

---

## Quick start

```bash
# 1. Install
pnpm install   # or: npm install / yarn

# 2. Copy env (optional in demo mode)
cp .env.example .env.local

# 3. Run
pnpm dev
```

Open:

- **Landing page:** http://localhost:3000/
- **Dashboard:** http://localhost:3000/dashboard
- **LIFF demo (mobile-shaped):** http://localhost:3000/liff
- **AI assistant:** http://localhost:3000/dashboard/ai-assistant

The app boots in **demo mode** by default (`DEMO_MODE=true`). All data is in-memory mock data
(see `src/lib/demo-data.ts`) so you can explore every feature without external services.

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

Run the schema and seed in the Supabase SQL Editor:

```sql
\i supabase/schema.sql
\i supabase/seed.sql
```

Or copy-paste each file's contents into the SQL editor.

Then in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
DEMO_MODE=false
```

The schema enables Row Level Security on all sensitive tables. Define policies in the Supabase
Dashboard following these patterns:

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

Set the webhook URL to:

```
https://<your-domain>/api/line/webhook
```

The webhook auto-verifies signatures with `LINE_CHANNEL_SECRET`.

### 3. LIFF apps

Create eight LIFF apps under your LINE Login channel. Each app maps to one of the LIFF routes:

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

Each LIFF app needs the `profile` and `openid` scopes.

### 4. Rich Menus

Build two Rich Menus:

- **Employee menu**: Clock In · Leave · OT · Payslip · My Attendance · AI
- **Management menu**: Today · Approvals · Team · Reports · AI · Settings

Switch menus per user with the LINE `richmenu/<menuId>/user/<userId>` API after binding completes
in `/liff/onboard`.

### 5. Anthropic / Mastra agent

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

### Dashboard (`/dashboard/*`)

| Route                         | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `/dashboard`                  | Overview — KPIs, attendance trend, AI insight, activity    |
| `/dashboard/attendance`       | Calendar + geofence map + live clock-in feed                |
| `/dashboard/shifts`           | Drag-and-drop shift planner + AI Suggest Schedule           |
| `/dashboard/employees`        | Searchable roster + CSV import/export                       |
| `/dashboard/leave`            | Leave + OT approval queue                                   |
| `/dashboard/payroll`          | Monthly run + previews + Thai-compliant calculation         |
| `/dashboard/reports`          | Punctuality, OT, KPI trends + PDF/Excel export              |
| `/dashboard/ai-assistant`     | Full-page EC AIHR chat with tool-call inspection            |
| `/dashboard/settings`         | Factory profile, geofence editor, holidays, roles           |
| `/dashboard/setup`            | First-time admin onboarding (org create + LINE OA bind)     |

### LIFF (`/liff/*`)

| Route                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `/liff`                | Worker home (cards: Clock, Leave, OT, Payslip, AI)     |
| `/liff/checkin`        | GPS + IP + photo clock-in / clock-out                  |
| `/liff/my-attendance`  | Personal weekly + monthly history                      |
| `/liff/request-leave`  | Leave request form + balance                           |
| `/liff/request-ot`     | OT request form + Thai labor-law calc                  |
| `/liff/payslip`        | Latest + past payslips, PDF viewer                     |
| `/liff/ai-chat`        | Chat with EC AIHR Assistant inside LINE                |
| `/liff/team`           | Supervisor view: team attendance today                 |
| `/liff/onboard`        | Bind LINE user ID to an `employees` row                |

### API

| Route                  | Method | Description                                          |
| ---------------------- | ------ | ---------------------------------------------------- |
| `/api/line/webhook`    | POST   | LINE Messaging API webhook (signature-verified)      |
| `/api/mastra/agent`    | POST   | `{ message, employeeId?, channel? }` → agent reply   |

---

## EC AIHR Assistant — agent tools

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
- Predict absenteeism for tomorrow.
- Draft a Songkran holiday announcement in Thai.
```

The fallback agent (no API key) handles every prompt deterministically. With a key, Claude calls
the tools and synthesizes natural-language answers in the user's language.

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
      onboard/                  # LINE → employee binding
    api/
      line/webhook/             # LINE Messaging API webhook
      mastra/agent/             # Mastra agent endpoint
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
