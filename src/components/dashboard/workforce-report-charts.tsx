"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkforceReportPayload } from "@/lib/workforce-assistant/schema";

const SERIES_COLORS = ["#FB923C", "#0F172A", "#475569", "#FED7AA"] as const;
const GRID_COLOR = "#E2E8F0";
const AXIS_COLOR = "#64748B";

export function WorkforceReportCharts({
  charts,
}: {
  charts: WorkforceReportPayload["charts"];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {charts.map((chart, chartIndex) => {
        const data = chart.labels.map((label, index) => {
          const row: Record<string, string | number> = { label };
          chart.series.forEach((series, seriesIndex) => {
            row[`series_${seriesIndex}`] = series.values[index] ?? 0;
          });
          return row;
        });
        const Chart = chart.type === "bar" ? BarChart : LineChart;

        return (
          <section
            key={`${chart.title}-${chartIndex}`}
            className="rounded-xl border border-navy-100 bg-white p-5 shadow-card"
          >
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-navy-900">{chart.title}</h2>
              {chart.unit && <p className="mt-1 text-xs text-navy-500">หน่วย: {chart.unit}</p>}
            </div>
            <div className="h-72 w-full" role="img" aria-label={chart.title}>
              <ResponsiveContainer width="100%" height="100%">
                <Chart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={GRID_COLOR} vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    stroke={AXIS_COLOR}
                    fontSize={10}
                    minTickGap={18}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={AXIS_COLOR}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: `1px solid ${GRID_COLOR}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => {
                      const index = Number(name.replace("series_", ""));
                      return [Number(value).toLocaleString(), chart.series[index]?.name ?? name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }}
                    formatter={(value: string) => {
                      const index = Number(value.replace("series_", ""));
                      return chart.series[index]?.name ?? value;
                    }}
                  />
                  {chart.series.map((series, seriesIndex) =>
                    chart.type === "bar" ? (
                      <Bar
                        key={`${series.name}-${seriesIndex}`}
                        dataKey={`series_${seriesIndex}`}
                        fill={SERIES_COLORS[seriesIndex % SERIES_COLORS.length]}
                        radius={[5, 5, 0, 0]}
                        maxBarSize={28}
                      />
                    ) : (
                      <Line
                        key={`${series.name}-${seriesIndex}`}
                        type="monotone"
                        dataKey={`series_${seriesIndex}`}
                        stroke={SERIES_COLORS[seriesIndex % SERIES_COLORS.length]}
                        strokeWidth={seriesIndex === 0 ? 2.5 : 2}
                        dot={false}
                        activeDot={{ r: 4, stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    ),
                  )}
                </Chart>
              </ResponsiveContainer>
            </div>
          </section>
        );
      })}
    </div>
  );
}
