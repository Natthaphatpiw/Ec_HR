import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale: "en" | "th" | "zh" = "en"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "th" ? "th-TH" : "zh-CN", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale: "en" | "th" | "zh" = "en"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "th" ? "th-TH" : "zh-CN").format(
    value,
  );
}

export function formatDate(value: string | Date, locale: "en" | "th" | "zh" = "en"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "th" ? "th-TH" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatTime(value: string | Date, locale: "en" | "th" | "zh" = "en"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "th" ? "th-TH" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
