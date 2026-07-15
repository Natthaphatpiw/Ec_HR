import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { resolveAnalyticsAccess } from "@/lib/analytics-access";
import { isDashboardOwnerAuthorized } from "@/lib/dashboard-session";
import {
  hasWorkforceAssistantResponse,
  saveWorkforceAssistantReport,
} from "@/lib/data";
import { DEMO_WORKFORCE_SOURCE_ID } from "@/lib/demo-workforce";
import { buildWorkforceAssistantContext } from "@/lib/workforce-assistant/context";
import { runDeterministicWorkforceAssistant } from "@/lib/workforce-assistant/fallback";
import { validateWorkforceAssistantOutput } from "@/lib/workforce-assistant/guardrails";
import {
  createOpenAIWorkforceAssistantStream,
  isOpenAIWorkforceAssistantConfigured,
} from "@/lib/workforce-assistant/openai";
import {
  acquireWorkforceAssistantConcurrency,
  checkWorkforceAssistantRateLimit,
  WorkforceAssistantRateLimitUnavailableError,
  workforceAssistantClientKey,
} from "@/lib/workforce-assistant/rate-limit";
import {
  createWorkforceContinuationToken,
  createWorkforceReportToken,
  verifyWorkforceContinuationToken,
} from "@/lib/workforce-assistant/report-token";
import {
  WORKFORCE_ASSISTANT_MODEL,
  workforceAssistantOutputSchema,
  workforceAssistantRequestSchema,
  type WorkforceAssistantOutput,
} from "@/lib/workforce-assistant/schema";
import {
  chunkText,
  encodeStreamEvent,
} from "@/lib/workforce-assistant/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envEnabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

async function previousResponseIsAllowed(input: {
  orgId: string;
  responseId: string;
  continuationToken?: string | null;
}): Promise<boolean> {
  if (
    input.continuationToken &&
    verifyWorkforceContinuationToken(
      input.continuationToken,
      input.orgId,
      input.responseId,
    )
  ) {
    return true;
  }
  try {
    return await hasWorkforceAssistantResponse(input.orgId, input.responseId);
  } catch {
    return false;
  }
}

async function finalizeOutput(input: {
  output: WorkforceAssistantOutput;
  orgId: string;
  employeeId?: string | null;
  userMessage: string;
  responseId: string;
  source: "openai" | "deterministic";
  allowSyntheticTokenFallback: boolean;
}) {
  const createdAt = new Date().toISOString();
  const reportSlug = `workforce-${randomUUID()}`;
  const model = input.source === "openai" ? WORKFORCE_ASSISTANT_MODEL : "deterministic-json";

  // Synthetic demo reports are self-contained signed URLs and deliberately do
  // not accumulate AI_AGENT_INTERACTIONS. Tenant audit persistence is opt-in.
  let persisted = false;
  if (!input.allowSyntheticTokenFallback && envEnabled("WORKFORCE_ASSISTANT_AUDIT_ENABLED")) {
    try {
      await saveWorkforceAssistantReport({
        orgId: input.orgId,
        employeeId: input.employeeId,
        userMessage: input.userMessage,
        agentResponse: input.output.answer,
        openaiResponseId: input.responseId,
        model,
        reportSlug,
        reportPayload: input.output.report,
        responseSource: input.source,
      });
      persisted = true;
    } catch (error) {
      console.warn(
        "[workforce-assistant] optional report audit persistence unavailable",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  const reportUrl = input.allowSyntheticTokenFallback
    ? `/dashboard/ai-reports/${encodeURIComponent(
        createWorkforceReportToken({
          orgId: input.orgId,
          responseId: input.responseId,
          model,
          source: input.source,
          answer: input.output.answer,
          report: input.output.report,
          createdAt,
        }),
      )}`
    : persisted
      ? `/dashboard/ai-reports/${reportSlug}`
      : null;
  return {
    reportUrl,
    continuationToken: createWorkforceContinuationToken(input.orgId, input.responseId),
  };
}

export async function POST(request: Request) {
  if (!(await isDashboardOwnerAuthorized())) {
    return NextResponse.json({ error: "Dashboard owner authorization is required." }, { status: 401 });
  }

  const parsed = workforceAssistantRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid message is required." }, { status: 400 });
  }

  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: "You are not authorized to use the workforce assistant." },
      { status: 403 },
    );
  }

  const clientKey = workforceAssistantClientKey(request);
  let rateLimit;
  try {
    rateLimit = await checkWorkforceAssistantRateLimit({
      organizationId: access.orgId,
      clientKey,
    });
  } catch (error) {
    if (error instanceof WorkforceAssistantRateLimitUnavailableError) {
      return NextResponse.json(
        { error: "The workforce assistant quota service is temporarily unavailable." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    throw error;
  }
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.resetAtSeconds),
  };
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many workforce assistant requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const previousResponseId = parsed.data.previousResponseId ?? null;
  if (
    previousResponseId &&
    !(await previousResponseIsAllowed({
      orgId: access.orgId,
      responseId: previousResponseId,
      continuationToken: parsed.data.continuationToken,
    }))
  ) {
    return NextResponse.json(
      { error: "The previous conversation could not be verified. Start a new chat." },
      { status: 400 },
    );
  }

  const context = await buildWorkforceAssistantContext(access, parsed.data.message);
  const concurrency = acquireWorkforceAssistantConcurrency({
    organizationId: access.orgId,
    clientKey,
  });
  const concurrencyHeaders = {
    "X-Concurrency-Limit": String(concurrency.limit),
    "X-Concurrency-Remaining": String(concurrency.remaining),
  };
  if (!concurrency.allowed) {
    return NextResponse.json(
      { error: "The workforce assistant is busy. Please try again shortly." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          ...concurrencyHeaders,
          "Retry-After": String(concurrency.retryAfterSeconds),
        },
      },
    );
  }

  const upstreamAbort = new AbortController();
  const abortUpstream = () => upstreamAbort.abort();
  request.signal.addEventListener("abort", abortUpstream, { once: true });

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let output: WorkforceAssistantOutput;
        let responseId: string;
        let source: "openai" | "deterministic";

        if (!isOpenAIWorkforceAssistantConfigured()) {
          output = workforceAssistantOutputSchema.parse(
            runDeterministicWorkforceAssistant(parsed.data.message, context),
          );
          responseId = `demo_${randomUUID()}`;
          source = "deterministic";
        } else {
          const stream = await createOpenAIWorkforceAssistantStream({
            message: parsed.data.message,
            context,
            previousResponseId:
              previousResponseId?.startsWith("resp_") ? previousResponseId : undefined,
            signal: upstreamAbort.signal,
          });
          let openAIResponseId = "";
          let structuredJson = "";

          for await (const event of stream) {
            if (upstreamAbort.signal.aborted) return;
            if (event.type === "response.created") {
              openAIResponseId = event.response.id;
            } else if (event.type === "response.output_text.delta") {
              // Buffer the complete structured payload. No model-authored text is
              // streamed to the browser until schema and context guards pass.
              structuredJson += event.delta;
            } else if (event.type === "response.completed") {
              openAIResponseId ||= event.response.id;
              structuredJson ||= event.response.output_text;
            } else if (event.type === "error" || event.type === "response.failed") {
              throw new Error("OpenAI could not complete the workforce response.");
            } else if (event.type === "response.incomplete") {
              throw new Error("OpenAI returned an incomplete workforce response.");
            }
          }

          const parsedOutput = (() => {
            try {
              return workforceAssistantOutputSchema.safeParse(JSON.parse(structuredJson));
            } catch {
              return { success: false } as const;
            }
          })();
          const guardrail = parsedOutput.success
            ? validateWorkforceAssistantOutput(parsedOutput.data, context)
            : { safe: false, reasons: ["schema_validation"] };

          if (parsedOutput.success && guardrail.safe && openAIResponseId) {
            output = parsedOutput.data;
            responseId = openAIResponseId;
            source = "openai";
          } else {
            console.warn(
              "[workforce-assistant] model payload rejected; using deterministic fallback",
              guardrail.reasons.join(",") || "missing_response_id",
            );
            output = workforceAssistantOutputSchema.parse(
              runDeterministicWorkforceAssistant(parsed.data.message, context),
            );
            responseId = `fallback_${randomUUID()}`;
            source = "deterministic";
          }
        }

        controller.enqueue(encodeStreamEvent({ type: "start", responseId, source }));
        for (const delta of chunkText(output.answer)) {
          if (upstreamAbort.signal.aborted) return;
          controller.enqueue(encodeStreamEvent({ type: "delta", delta }));
        }
        const finalized = await finalizeOutput({
          output,
          orgId: access.orgId,
          employeeId: access.employee?.id,
          userMessage: parsed.data.message,
          responseId,
          source,
          allowSyntheticTokenFallback: context.sourceId === DEMO_WORKFORCE_SOURCE_ID,
        });
        controller.enqueue(
          encodeStreamEvent({
            type: "done",
            answer: output.answer,
            responseId,
            continuationToken: finalized.continuationToken,
            reportUrl: finalized.reportUrl,
            source,
          }),
        );
        controller.close();
      } catch (error) {
        if (upstreamAbort.signal.aborted) return;
        console.error(
          "[workforce-assistant] response failed",
          error instanceof Error ? error.message : "unknown error",
        );
        controller.enqueue(
          encodeStreamEvent({
            type: "error",
            message: "The workforce assistant could not complete this request. Please try again.",
          }),
        );
        controller.close();
      } finally {
        concurrency.release();
        request.signal.removeEventListener("abort", abortUpstream);
      }
    },
    cancel() {
      upstreamAbort.abort();
      concurrency.release();
      request.signal.removeEventListener("abort", abortUpstream);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Accel-Buffering": "no",
      ...rateLimitHeaders,
      ...concurrencyHeaders,
    },
  });
}
