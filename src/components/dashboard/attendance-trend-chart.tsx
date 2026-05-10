"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AttendanceTrendChart({
  data,
}: {
  data: { date: string; present: number; late: number; absent: number }[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB923C" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FB923C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F172A" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: "#FB923C", strokeWidth: 1, strokeDasharray: "4" }}
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="present"
            stroke="#FB923C"
            strokeWidth={2}
            fill="url(#presentGradient)"
            name="Present"
          />
          <Area
            type="monotone"
            dataKey="late"
            stroke="#0F172A"
            strokeWidth={2}
            fill="url(#lateGradient)"
            name="Late"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
