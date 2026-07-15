import { WORKFORCE_ASSISTANT_TIMEZONE } from "./schema";

export interface ResolvedDateWindow {
  startDate: string;
  endDate: string;
  label: string;
  resolution: "explicit" | "relative" | "default";
}

export interface WorkforceAssistantClock {
  currentDate: string;
  timezone: typeof WORKFORCE_ASSISTANT_TIMEZONE;
}

/** Returns an ISO date in Bangkok without depending on the server's timezone. */
export function currentBangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKFORCE_ASSISTANT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getWorkforceAssistantClock(frozenDate?: string): WorkforceAssistantClock {
  return {
    currentDate: frozenDate ?? currentBangkokDate(),
    timezone: WORKFORCE_ASSISTANT_TIMEZONE,
  };
}

function dateAt(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function shiftDate(value: string, days: number): string {
  const date = dateAt(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(value: string, offset: number): [string, string] {
  const date = dateAt(value);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset + 1, 0));
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

function weekBounds(value: string, offsetWeeks: number): [string, string] {
  const date = dateAt(value);
  const day = date.getUTCDay() || 7;
  const monday = shiftDate(value, 1 - day + offsetWeeks * 7);
  return [monday, shiftDate(monday, 6)];
}

function label(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} ถึง ${endDate}`;
}

export function enumerateDates(startDate: string, endDate: string, limit = 31): string[] {
  const result: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate && result.length < limit) {
    result.push(cursor);
    cursor = shiftDate(cursor, 1);
  }
  return result;
}

export function resolveRequestedDateWindow(
  message: string,
  currentDate = currentBangkokDate(),
): ResolvedDateWindow {
  const normalized = message.toLowerCase();
  const explicitDates = Array.from(message.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)).map(
    (match) => match[1],
  );
  if (explicitDates.length > 0) {
    const sorted = explicitDates.sort();
    const startDate = sorted[0];
    const endDate = sorted.at(-1) ?? startDate;
    return { startDate, endDate, label: label(startDate, endDate), resolution: "explicit" };
  }

  const daysAgo =
    normalized.match(/\b(\d{1,3})\s*days?\s*ago\b/i) ??
    normalized.match(/(?:เมื่อ\s*)?(\d{1,3})\s*วัน(?:ที่)?แล้ว/i) ??
    normalized.match(/(?:เมื่อ\s*)?(\d{1,3})\s*วันก่อน/i) ??
    normalized.match(/(\d{1,3})\s*天前/i);
  if (daysAgo) {
    const date = shiftDate(currentDate, -Math.min(180, Math.max(0, Number(daysAgo[1]))));
    return { startDate: date, endDate: date, label: date, resolution: "relative" };
  }

  const relativeDays = normalized.match(/(?:last|ย้อนหลัง|ที่ผ่านมา|过去)\s*(\d{1,3})\s*(?:days?|วัน|天)/i);
  if (relativeDays) {
    const days = Math.min(180, Math.max(1, Number(relativeDays[1])));
    const startDate = shiftDate(currentDate, -(days - 1));
    return {
      startDate,
      endDate: currentDate,
      label: label(startDate, currentDate),
      resolution: "relative",
    };
  }

  if (/\b(last week)\b|สัปดาห์ที่แล้ว|上周/.test(normalized)) {
    const [startDate, endDate] = weekBounds(currentDate, -1);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }
  if (/\b(next week)\b|สัปดาห์หน้า|下周/.test(normalized)) {
    const [startDate, endDate] = weekBounds(currentDate, 1);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }
  if (/\b(this week)\b|สัปดาห์นี้|本周/.test(normalized)) {
    const [startDate, endDate] = weekBounds(currentDate, 0);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }
  if (/\b(last month)\b|เดือนที่แล้ว|上个月/.test(normalized)) {
    const [startDate, endDate] = monthBounds(currentDate, -1);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }
  if (/\b(next month)\b|เดือนหน้า|下个月/.test(normalized)) {
    const [startDate, endDate] = monthBounds(currentDate, 1);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }
  if (/\b(this month)\b|เดือนนี้|本月/.test(normalized)) {
    const [startDate, endDate] = monthBounds(currentDate, 0);
    return { startDate, endDate, label: label(startDate, endDate), resolution: "relative" };
  }

  if (/\byesterday\b|เมื่อวาน|昨天/.test(normalized)) {
    const date = shiftDate(currentDate, -1);
    return { startDate: date, endDate: date, label: date, resolution: "relative" };
  }
  if (/\btomorrow\b|พรุ่งนี้|明天/.test(normalized)) {
    const date = shiftDate(currentDate, 1);
    return { startDate: date, endDate: date, label: date, resolution: "relative" };
  }
  if (/\btoday\b|วันนี้|今天/.test(normalized)) {
    return {
      startDate: currentDate,
      endDate: currentDate,
      label: currentDate,
      resolution: "relative",
    };
  }

  const startDate = shiftDate(currentDate, -29);
  return {
    startDate,
    endDate: currentDate,
    label: label(startDate, currentDate),
    resolution: "default",
  };
}

const deterministicRelativeDateChecks = [
  ["today", "2026-07-15"],
  ["yesterday", "2026-07-14"],
  ["เมื่อ 2 วันที่แล้ว", "2026-07-13"],
] as const;

for (const [phrase, expected] of deterministicRelativeDateChecks) {
  const actual = resolveRequestedDateWindow(phrase, "2026-07-15");
  if (actual.startDate !== expected || actual.endDate !== expected) {
    throw new Error(`Relative-date check failed for ${phrase}.`);
  }
}
