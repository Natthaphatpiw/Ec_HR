import assert from "node:assert/strict";
import { resolveWorkforceAnalyticsRange } from "../src/lib/analytics-range.ts";
import { isExactDemoWorkforceOrg } from "../src/lib/demo-workforce-source.ts";

assert.equal(
  isExactDemoWorkforceOrg({
    enabled: true,
    configuredOrgId: "org-demo",
    requestedOrgId: "org-demo",
  }),
  true,
);
assert.equal(
  isExactDemoWorkforceOrg({
    enabled: true,
    configuredOrgId: "11111111-1111-1111-1111-111111111111",
    requestedOrgId: "org-live",
  }),
  false,
);
assert.equal(
  isExactDemoWorkforceOrg({ enabled: true, requestedOrgId: "org-live" }),
  false,
);

assert.deepEqual(
  resolveWorkforceAnalyticsRange({
    defaultEndDate: "2026-07-15",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
  }),
  { rangeStart: "2026-06-01", rangeEnd: "2026-06-30", days: 30 },
);
assert.deepEqual(
  resolveWorkforceAnalyticsRange({
    defaultEndDate: "2026-07-15",
    startDate: "2026-07-14",
    endDate: "2026-07-14",
  }),
  { rangeStart: "2026-07-14", rangeEnd: "2026-07-14", days: 1 },
);
assert.deepEqual(
  resolveWorkforceAnalyticsRange({ defaultEndDate: "2026-07-15", days: 7 }),
  { rangeStart: "2026-07-09", rangeEnd: "2026-07-15", days: 7 },
);
assert.throws(
  () =>
    resolveWorkforceAnalyticsRange({
      defaultEndDate: "2026-07-15",
      startDate: "2026-07-16",
      endDate: "2026-07-15",
    }),
  /startDate must not be after endDate/,
);

process.stdout.write("Workforce analytics boundary checks passed.\n");
