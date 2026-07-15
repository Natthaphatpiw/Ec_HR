const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MILLISECONDS = 86_400_000;

export const MAX_WORKFORCE_ANALYTICS_DAYS = 180;

export interface WorkforceAnalyticsRangeInput {
  defaultEndDate: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface WorkforceAnalyticsRange {
  rangeStart: string;
  rangeEnd: string;
  days: number;
}

function clampDays(value: number | undefined): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(MAX_WORKFORCE_ANALYTICS_DAYS, Math.max(7, Math.round(value ?? 30)));
}

function dateAt(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = dateAt(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function datePlus(date: string, days: number): string {
  const value = dateAt(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Resolves either an explicit inclusive date window or the existing trailing
 * dashboard window. Explicit windows may be one day but remain capped at the
 * same 180-day query boundary as trailing ranges.
 */
export function resolveWorkforceAnalyticsRange({
  defaultEndDate,
  days: requestedDays,
  startDate,
  endDate,
}: WorkforceAnalyticsRangeInput): WorkforceAnalyticsRange {
  const hasStartDate = startDate !== undefined;
  const hasEndDate = endDate !== undefined;
  if (hasStartDate !== hasEndDate) {
    throw new Error("Workforce analytics requires both startDate and endDate.");
  }

  if (startDate !== undefined && endDate !== undefined) {
    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      throw new Error("Workforce analytics dates must use YYYY-MM-DD.");
    }
    const days =
      Math.floor(
        (dateAt(endDate).getTime() - dateAt(startDate).getTime()) / DAY_MILLISECONDS,
      ) + 1;
    if (days < 1) {
      throw new Error("Workforce analytics startDate must not be after endDate.");
    }
    if (days > MAX_WORKFORCE_ANALYTICS_DAYS) {
      throw new Error(
        `Workforce analytics date range cannot exceed ${MAX_WORKFORCE_ANALYTICS_DAYS} days.`,
      );
    }
    return { rangeStart: startDate, rangeEnd: endDate, days };
  }

  if (!isIsoDate(defaultEndDate)) {
    throw new Error("Workforce analytics default end date must use YYYY-MM-DD.");
  }
  const days = clampDays(requestedDays);
  return {
    rangeStart: datePlus(defaultEndDate, -(days - 1)),
    rangeEnd: defaultEndDate,
    days,
  };
}
