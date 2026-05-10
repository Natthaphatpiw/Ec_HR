"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#FB923C", "#0F172A", "#94A3B8", "#FED7AA", "#475569"];

export function DepartmentChart({ data }: { data: { department: string; count: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  return (
    <div className="flex h-72 w-full items-center gap-6">
      <div className="relative h-full w-1/2 min-w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="department"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              strokeWidth={0}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold tracking-tight text-navy-900">{total}</div>
          <div className="text-[11px] uppercase tracking-wider text-navy-400">Total</div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.department} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-navy-700">{d.department}</span>
            </div>
            <span className="font-medium tabular-nums text-navy-900">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
