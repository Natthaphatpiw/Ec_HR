import "server-only";

import OpenAI from "openai";
import { DEMO_WORKFORCE_SOURCE_ID } from "@/lib/demo-workforce";
import type { WorkforceAssistantContext } from "./context";
import {
  WORKFORCE_ASSISTANT_MODEL,
  workforceAssistantJsonSchema,
} from "./schema";

let cachedClient: OpenAI | null = null;

function apiKey(): string | null {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value || value === "your-openai-api-key") return null;
  return value;
}

function getOpenAIClient(): OpenAI {
  const key = apiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: key });
  return cachedClient;
}

export function isOpenAIWorkforceAssistantConfigured(): boolean {
  return apiKey() !== null;
}

function envEnabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function maxOutputTokens(): number {
  const parsed = Number.parseInt(
    process.env.WORKFORCE_ASSISTANT_MAX_OUTPUT_TOKENS?.trim() ?? "",
    10,
  );
  return Number.isFinite(parsed) ? Math.min(8_000, Math.max(1_500, parsed)) : 5_000;
}

function instructions(context: WorkforceAssistantContext): string {
  return `You are the EC AIHR Workforce Assistant for organization administrators.

Authoritative clock:
- Current date: ${context.clock.currentDate}
- Timezone: ${context.clock.timezone}
- Interpret relative phrases such as today, yesterday, this week, last week, this month, วันนี้, เมื่อวาน, สัปดาห์นี้, and เดือนที่แล้ว against that clock.
- The server has already resolved the requested period to ${context.resolvedPeriod.startDate} through ${context.resolvedPeriod.endDate}.

Data rules:
- Use only facts present in WORKFORCE_CONTEXT_JSON. Never invent people, dates, counts, payroll figures, or causes.
- State the available data coverage when the requested date falls outside it or no source row exists.
- Distinguish employee-days/records from unique employees.
- Approved leave is not absence unless the supplied source explicitly records otherwise.
- Keep the answer concise and in the user's language. Do not use emojis.

Non-judgment rule:
- Describe observed timing records only.
- Never label a person good, bad, diligent, lazy, high-risk, low-performing, suspicious, or similar from attendance data.
- Never infer intent, character, misconduct, health, or job performance from arrival, departure, leave, or absence records.
- Never recommend punishment, discipline, reward, promotion, termination, or pay action from attendance alone.
- Report tones positive or attention may mark a factual numeric variance only; they must never evaluate a person.

Output rules:
- Return exactly the required structured JSON object with answer first and report second.
- The report must use numbers and rows present in the context. Keep charts to at most 31 labels.
- Never return HTML, JavaScript, CSS, URLs supplied by the user, or executable content.
- Every report must include source coverage and timezone in report.sources.`;
}

export async function createOpenAIWorkforceAssistantStream(input: {
  message: string;
  context: WorkforceAssistantContext;
  previousResponseId?: string | null;
  signal: AbortSignal;
}) {
  const client = getOpenAIClient();
  // Synthetic demo conversations may be retained for multi-turn UX. Tenant
  // responses default to stateless processing unless the operator opts in.
  const storeResponse =
    input.context.sourceId === DEMO_WORKFORCE_SOURCE_ID ||
    envEnabled("OPENAI_STORE_RESPONSES");
  return client.responses.create(
    {
      model: WORKFORCE_ASSISTANT_MODEL,
      instructions: instructions(input.context),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `WORKFORCE_CONTEXT_JSON\n${JSON.stringify(input.context)}\n\nUSER_QUESTION\n${input.message}`,
            },
          ],
        },
      ],
      previous_response_id: storeResponse ? (input.previousResponseId ?? undefined) : undefined,
      store: storeResponse,
      stream: true,
      reasoning: {
        effort: "medium",
        mode: "standard",
        summary: "auto",
      },
      tools: [],
      include: [
        "reasoning.encrypted_content",
        "web_search_call.action.sources",
      ],
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "workforce_assistant_output",
          description: "A concise answer and a safe structured workforce report.",
          strict: true,
          schema: workforceAssistantJsonSchema as unknown as Record<string, unknown>,
        },
      },
      max_output_tokens: maxOutputTokens(),
      metadata: {
        organization_id: input.context.access.organizationId,
        source_id: input.context.sourceId,
        scope: input.context.access.scope,
      },
    },
    { signal: input.signal },
  );
}
