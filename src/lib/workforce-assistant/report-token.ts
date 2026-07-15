import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { deflateRawSync, inflateRawSync } from "zlib";
import { z } from "zod";
import { workforceReportPayloadSchema, type WorkforceReportPayload } from "./schema";

const TOKEN_PREFIX = "rt1";
const CONTINUATION_PREFIX = "ct1";
const MAX_INFLATED_BYTES = 80_000;

const reportTokenDataSchema = z.object({
  orgId: z.string().min(1).max(80),
  responseId: z.string().min(1).max(160),
  model: z.string().min(1).max(80),
  source: z.enum(["openai", "deterministic"]),
  answer: z.string().max(2400),
  report: workforceReportPayloadSchema,
  createdAt: z.string().datetime(),
});

const continuationDataSchema = z.object({
  orgId: z.string().min(1).max(80),
  responseId: z.string().min(1).max(160),
  createdAt: z.string().datetime(),
});

export interface WorkforceReportTokenData {
  orgId: string;
  responseId: string;
  model: string;
  source: "openai" | "deterministic";
  answer: string;
  report: WorkforceReportPayload;
  createdAt: string;
}

function signingSecret(): string {
  return (
    process.env.WORKFORCE_REPORT_SIGNING_SECRET ??
    process.env.DASHBOARD_SESSION_SECRET ??
    process.env.LIFF_SESSION_SECRET ??
    "ec-aihr-local-demo-report-signing-v1"
  );
}

function signature(prefix: string, body: string): string {
  return createHmac("sha256", signingSecret()).update(`${prefix}.${body}`).digest("base64url");
}

function signaturesMatch(expected: string, actual: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function encode(prefix: string, value: unknown): string {
  const compressed = deflateRawSync(Buffer.from(JSON.stringify(value)), { level: 9 });
  const body = compressed.toString("base64url");
  return `${prefix}.${body}.${signature(prefix, body)}`;
}

function decode(token: string, prefix: string): unknown {
  const [actualPrefix, body, actualSignature, extra] = token.split(".");
  if (actualPrefix !== prefix || !body || !actualSignature || extra) {
    throw new Error("Invalid report token.");
  }
  if (!signaturesMatch(signature(prefix, body), actualSignature)) {
    throw new Error("Invalid report token signature.");
  }
  const inflated = inflateRawSync(Buffer.from(body, "base64url"), {
    maxOutputLength: MAX_INFLATED_BYTES,
  });
  return JSON.parse(inflated.toString("utf8")) as unknown;
}

export function createWorkforceReportToken(input: WorkforceReportTokenData): string {
  return encode(TOKEN_PREFIX, reportTokenDataSchema.parse(input));
}

export function readWorkforceReportToken(token: string): WorkforceReportTokenData {
  return reportTokenDataSchema.parse(decode(token, TOKEN_PREFIX));
}

export function isWorkforceReportToken(value: string): boolean {
  return value.startsWith(`${TOKEN_PREFIX}.`);
}

export function createWorkforceContinuationToken(orgId: string, responseId: string): string {
  return encode(CONTINUATION_PREFIX, {
    orgId,
    responseId,
    createdAt: new Date().toISOString(),
  });
}

export function verifyWorkforceContinuationToken(
  token: string,
  orgId: string,
  responseId: string,
): boolean {
  try {
    const value = continuationDataSchema.parse(decode(token, CONTINUATION_PREFIX));
    return value.orgId === orgId && value.responseId === responseId;
  } catch {
    return false;
  }
}
