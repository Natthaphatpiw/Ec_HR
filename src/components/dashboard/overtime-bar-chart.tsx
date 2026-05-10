"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function OvertimeBarChart({ data }: { data: { dept: string; hours: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="dept" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(251, 146, 60, 0.06)" }}
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="hours" fill="#FB923C" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
