import { z } from "zod";

export const WORKFORCE_ASSISTANT_MODEL = "gpt-5.6-luna";
export const WORKFORCE_ASSISTANT_TIMEZONE = "Asia/Bangkok";

const metricSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.number().finite(),
  unit: z.string().trim().max(24),
  context: z.string().trim().max(160),
});

const insightSchema = z.object({
  title: z.string().trim().min(1).max(100),
  detail: z.string().trim().min(1).max(500),
  tone: z.enum(["neutral", "positive", "attention"]),
});

const chartSeriesSchema = z.object({
  name: z.string().trim().min(1).max(60),
  values: z.array(z.number().finite()).max(31),
});

const chartSchema = z
  .object({
    type: z.enum(["bar", "line"]),
    title: z.string().trim().min(1).max(120),
    unit: z.string().trim().max(24),
    labels: z.array(z.string().trim().max(40)).max(31),
    series: z.array(chartSeriesSchema).min(1).max(4),
  })
  .superRefine((chart, ctx) => {
    for (const series of chart.series) {
      if (series.values.length !== chart.labels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Every chart series must have one value per label.",
          path: ["series"],
        });
      }
    }
  });

const tableSchema = z.object({
  title: z.string().trim().max(120),
  columns: z.array(z.string().trim().max(60)).max(8),
  rows: z.array(z.array(z.string().trim().max(160)).max(8)).max(25),
});

const sourceSchema = z.object({
  label: z.string().trim().min(1).max(100),
  detail: z.string().trim().max(200),
});

export const workforceReportPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(900),
  periodLabel: z.string().trim().max(100),
  metrics: z.array(metricSchema).max(6),
  insights: z.array(insightSchema).max(8),
  charts: z.array(chartSchema).max(4),
  table: tableSchema,
  sources: z.array(sourceSchema).min(1).max(8),
});

export const workforceAssistantOutputSchema = z.object({
  answer: z.string().trim().min(1).max(2400),
  report: workforceReportPayloadSchema,
});

export type WorkforceReportPayload = z.infer<typeof workforceReportPayloadSchema>;
export type WorkforceAssistantOutput = z.infer<typeof workforceAssistantOutputSchema>;

export const workforceAssistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  previousResponseId: z.string().trim().min(1).max(160).nullable().optional(),
  continuationToken: z.string().trim().min(1).max(2000).nullable().optional(),
});

/**
 * The Responses API uses this strict schema. The application validates the
 * completed payload again with Zod before storing or rendering it.
 */
export const workforceAssistantJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "report"],
  properties: {
    answer: { type: "string" },
    report: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "summary",
        "periodLabel",
        "metrics",
        "insights",
        "charts",
        "table",
        "sources",
      ],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        periodLabel: { type: "string" },
        metrics: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value", "unit", "context"],
            properties: {
              label: { type: "string" },
              value: { type: "number" },
              unit: { type: "string" },
              context: { type: "string" },
            },
          },
        },
        insights: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "detail", "tone"],
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              tone: { type: "string", enum: ["neutral", "positive", "attention"] },
            },
          },
        },
        charts: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "title", "unit", "labels", "series"],
            properties: {
              type: { type: "string", enum: ["bar", "line"] },
              title: { type: "string" },
              unit: { type: "string" },
              labels: {
                type: "array",
                maxItems: 31,
                items: { type: "string" },
              },
              series: {
                type: "array",
                minItems: 1,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "values"],
                  properties: {
                    name: { type: "string" },
                    values: {
                      type: "array",
                      maxItems: 31,
                      items: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        table: {
          type: "object",
          additionalProperties: false,
          required: ["title", "columns", "rows"],
          properties: {
            title: { type: "string" },
            columns: {
              type: "array",
              maxItems: 8,
              items: { type: "string" },
            },
            rows: {
              type: "array",
              maxItems: 25,
              items: {
                type: "array",
                maxItems: 8,
                items: { type: "string" },
              },
            },
          },
        },
        sources: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "detail"],
            properties: {
              label: { type: "string" },
              detail: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;
