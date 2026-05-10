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

There is no test runner configured. To verify changes, hit routes with `curl` against the dev server and inspect responses (the agent endpoint is `/api/mastra/agent`, the webhook is `/api/line/webhook`). The README has a list of agent test prompts.

## Big-picture architecture

The app has **three rendered surfaces** plus an API:

- `/` — public multilingual landing page (`src/app/page.tsx` + `src/components/landing/*`)
- `/dashboard/*` — web dashboard for HR/managers/executives, sidebar layout
- `/liff/*` — LINE LIFF mobile pages, max-width 420px, bottom nav, runs inside LINE in-app browser
- `/api/line/webhook` and `/api/mastra/agent` — server endpoints

### Dual-mode data layer (the central abstraction)

`src/lib/data.ts` is the only thing pages and the agent should call for HR data. It checks `DEMO_MODE` / Supabase env and either reads from in-memory mocks (`src/lib/demo-data.ts`) or — in the production swap-in — the real Supabase tables defined in `supabase/schema.sql`.

The schema (11 tables, RLS-enabled) and the mock data **mirror each other 1:1**, including UUIDs:
- Organization: `11111111-1111-1111-1111-111111111111`
- Employees: `33333333-…-333301` through `…-333310` (EMP001–EMP010). The trailing `30N` pattern is load-bearing — typos like `…-333009` will silently break FK constraints when seeding.

When adding a new entity, update **all three**: `schema.sql`, `seed.sql`, and `demo-data.ts` (plus a query helper in `data.ts`).

### Frozen "today" = 2026-05-09

All mock timestamps are anchored to `2026-05-09` via `todayMinus` / `timestampMinus` in `src/lib/demo-data.ts`. Dashboard stats, attendance trends, leave-balance math, and the "Today's Records" pages all assume this date. **Don't introduce `new Date()` into demo-mode logic** — use the anchor or stats won't line up. Production replaces this when wired to Supabase.

### Mastra-style agent with deterministic fallback

`src/lib/mastra/agent.ts` exposes `runAgent(message, { employeeCode, channel })` and has two paths returning the same `{ response, tools_used }` shape:

1. `runAnthropic` — full Claude Sonnet 4.6 tool-use loop (when `ANTHROPIC_API_KEY` is set). Calls `https://api.anthropic.com/v1/messages` directly.
2. `runFallback` — keyword intent detection that picks one tool, runs it, and formats the result via `fallbackFormat`. Used in CI/demos without an API key.

`src/lib/mastra/tools.ts` registers 8 tools with JSONSchema `input_schema` shaped to be drop-in compatible with both Anthropic's tool-use API and `@mastra/core` (if formally swapped in later).

**When adding a tool**, update three places:
- The `TOOLS` array in `tools.ts` (definition + `run` impl)
- The `detectIntent` switch in `agent.ts` (so the fallback path can route to it)
- A branch in `fallbackFormat` (so the fallback returns nice text instead of raw JSON)

The same agent serves three callers: `/api/mastra/agent` (dashboard + LIFF chat), `/api/line/webhook` (LINE messages), and any future channel.

### LIFF demo fallback

`src/lib/liff-client.ts` `initLiff()` **never throws** to the UI. If no LIFF ID is configured or `liff.init()` fails (e.g. running in a regular browser), it returns a fake LINE profile bound to EMP001. Every LIFF page must continue to work in a normal browser for demos — don't gate UI on `liff.isInClient()`. The hardcoded `DEMO_EMPLOYEE_ID` (`…-333301`) appears in several LIFF pages and is the contract.

### i18n is cookie-based, not route-based

There is no `/[locale]` segment. `src/i18n/request.ts` reads a `locale` cookie (default `en`); `src/i18n/actions.ts` `setLocale()` server action writes it and `revalidatePath()`s. Server pages use `getTranslations`; client components use `useTranslations`. The three message files (`src/messages/{en,th,zh}.json`) must stay key-aligned — adding a key in one means adding it in all three. Never hardcode UI strings.

### Map components must be dynamic-imported

`src/components/dashboard/geofence-map.tsx` is a thin wrapper that `dynamic()`-imports `geofence-map-inner.tsx` with `ssr: false`. Leaflet touches `window` at module load and breaks SSR. Always import the wrapper, never the inner.

### LINE webhook signature

`src/lib/line/client.ts` `verifyLineSignature` uses HMAC-SHA256 + `crypto.timingSafeEqual`. The webhook handler **only skips verification when `LINE_CHANNEL_SECRET` is unset** (dev). In any environment that has the secret, an invalid signature returns 401.

## Strict design conventions (enforced across all surfaces)

These are not preferences — the spec calls them out and reviewers will reject deviations:

- **Palette only**: `#FFFFFF` background, `#0F172A` (`navy-900`) text, `#FB923C` (`orange-400`) accents. The Tailwind config exposes `navy-{50..900}` and `orange-{50..700}` ramps; use these, not arbitrary hex.
- **No emojis anywhere** — in code, copy, comments, or commit messages. Use Lucide icons (always navy or orange).
- **Fonts**: Inter for Latin, Noto Sans Thai, Noto Sans SC. Loaded in `src/app/layout.tsx` as CSS variables; `font-sans` already cascades correctly.
- **Shadows**: `shadow-soft` (controls) and `shadow-card` (cards) only. No arbitrary `shadow-lg` etc.
- **Spacing**: 8px grid. Card padding is `p-5` or `p-6`. Sections are `py-20 sm:py-24`.
- **Use the primitives** in `src/components/ui/` (Button, Card, Input, Badge, Tabs, Table, Dialog, Select, Switch, Avatar, Dropdown, Popover, ScrollArea, Skeleton, Separator, Label, Textarea). Don't reach for raw HTML buttons or roll new variants.
- **Toaster**: `sonner` is mounted in the root layout with custom classNames matching the palette; just `import { toast } from "sonner"` and call.

## Layout boundaries

- Root layout (`src/app/layout.tsx`) installs fonts, the i18n provider, and the toaster. Don't add a top-level header here — each surface has its own.
- `/dashboard/*` shares `src/app/dashboard/layout.tsx` (sidebar + content shell). Each page renders its own `<DashboardTopbar>`.
- `/liff/*` shares `src/app/liff/layout.tsx` (max-w-md, bottom nav). Each page renders its own `<LiffHeader>`.

## Production swap-in (high-level)

The README has detailed steps. Briefly: set Supabase env vars and `DEMO_MODE=false`, run `supabase/schema.sql` then `supabase/seed.sql`, replace the mock-array reads in `src/lib/data.ts` with `supabase.from(...).select(...)`. The 8 LIFF apps each map to one `/liff/*` route; their IDs go into the `NEXT_PUBLIC_LIFF_ID_*` env vars referenced in `.env.example`.
