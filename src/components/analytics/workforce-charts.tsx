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

const COLORS = {
  navy900: "#0F172A",
  navy600: "#475569",
  navy400: "#94A3B8",
  navy200: "#E2E8F0",
  orange400: "#FB923C",
  orange200: "#FED7AA",
  white: "#FFFFFF",
} as const;

const tooltipStyle = {
  background: COLORS.white,
  border: `1px solid ${COLORS.navy200}`,
  borderRadius: 8,
  fontSize: 12,
};

interface AttendanceChartRow {
  date: string;
  attendanceRate: number;
  onTime: number;
  present: number;
}

export function WorkforceAttendanceChart({
  data,
  locale,
  labels,
  compact = false,
}: {
  data: AttendanceChartRow[];
  locale: string;
  labels: { attendance: string; punctuality: string };
  compact?: boolean;
}) {
  const formatted = data.map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(
      new Date(`${row.date}T00:00:00Z`),
    ),
    punctualityRate: row.present > 0 ? Math.round((row.onTime / row.present) * 1000) / 10 : 0,
  }));

  return (
    <div
      className={compact ? "h-56 w-full" : "h-72 w-full"}
      role="img"
      aria-label={`${labels.attendance} / ${labels.punctuality}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: compact ? -26 : -12, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.navy200} vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke={COLORS.navy400}
            fontSize={10}
            interval={compact ? "preserveStartEnd" : Math.max(0, Math.floor(data.length / 8) - 1)}
            minTickGap={18}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke={COLORS.navy400}
            fontSize={10}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: COLORS.navy400, strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}%`, name]}
          />
          {!compact && <Legend wrapperStyle={{ fontSize: 11, color: COLORS.navy600 }} />}
          <Line
            type="monotone"
            dataKey="attendanceRate"
            name={labels.attendance}
            stroke={COLORS.orange400}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.orange400, stroke: COLORS.white, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="punctualityRate"
            name={labels.punctuality}
            stroke={COLORS.navy900}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.navy900, stroke: COLORS.white, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DepartmentChartRow {
  department: string;
  attendanceRate: number;
}

export function DepartmentAttendanceChart({
  data,
  attendanceLabel,
}: {
  data: DepartmentChartRow[];
  attendanceLabel: string;
}) {
  const height = Math.max(240, data.length * 42);
  return (
    <div
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={attendanceLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={COLORS.navy200} horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={COLORS.navy400}
            fontSize={10}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="department"
            width={96}
            stroke={COLORS.navy600}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: COLORS.navy200, fillOpacity: 0.35 }}
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`${Number(value).toFixed(1)}%`, attendanceLabel]}
          />
          <Bar
            dataKey="attendanceRate"
            name={attendanceLabel}
            fill={COLORS.orange400}
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PayrollChartRow {
  month: string;
  grossPay: number;
  netPay: number;
}

export function PayrollTrendChart({
  data,
  locale,
  labels,
}: {
  data: PayrollChartRow[];
  locale: string;
  labels: { gross: string; net: string };
}) {
  const compactNumber = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" });
  const formatted = data.map((row) => ({
    ...row,
    label: monthFormatter.format(new Date(`${row.month}-01T00:00:00Z`)),
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label={`${labels.gross} / ${labels.net}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 14, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.navy200} vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke={COLORS.navy400}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={COLORS.navy400}
            fontSize={10}
            tickFormatter={(value: number) => compactNumber.format(value)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: COLORS.navy400, strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value)),
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: COLORS.navy600 }} />
          <Line
            type="monotone"
            dataKey="grossPay"
            name={labels.gross}
            stroke={COLORS.orange400}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS.orange400, stroke: COLORS.white, strokeWidth: 1.5 }}
          />
          <Line
            type="monotone"
            dataKey="netPay"
            name={labels.net}
            stroke={COLORS.navy900}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.navy900, stroke: COLORS.white, strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LeaveChartRow {
  type: string;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
}

export function LeaveStatusChart({
  data,
  labels,
}: {
  data: LeaveChartRow[];
  labels: { approved: string; pending: string; rejected: string };
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label={`${labels.approved} / ${labels.pending}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.navy200} vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="type"
            stroke={COLORS.navy400}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke={COLORS.navy400} fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: COLORS.navy200, fillOpacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: COLORS.navy600 }} />
          <Bar
            dataKey="approvedDays"
            stackId="leave"
            name={labels.approved}
            fill={COLORS.navy900}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pendingDays"
            stackId="leave"
            name={labels.pending}
            fill={COLORS.orange400}
          />
          <Bar
            dataKey="rejectedDays"
            stackId="leave"
            name={labels.rejected}
            fill={COLORS.orange200}
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
