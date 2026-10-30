/**
 * Charts.
 *
 * Recharts, with three rules driven by what these dashboards are used for:
 *
 *  - **A flat series is drawn as a flat line, not as nothing.** Recharts omits a
 *    series entirely when every value is null, which reads as "no data" when it
 *    actually means "zero".
 *  - **`connectNulls` is on.** A gap in an hourly series is a genuine gap; joining
 *    across it would draw a line implying data that does not exist.
 *  - **Money axes are formatted as money.** An axis labelled 100000 next to a
 *    rupee figure invites a misread by a factor of 100.
 */

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { formatMoney, formatNumber } from "@/mobility-media/lib/format";

const AXIS = { stroke: "#a0a0a0", fontSize: 11 };
const GRID = { stroke: "rgba(255,255,255,0.08)", strokeDasharray: "3 3" };

/** Turns `2026-01-01T05:00:00.000Z` into a shorter axis label. */
function formatBucket(bucket, granularity) {
  if (!bucket) return "";
  if (granularity === "HOURLY") {
    const date = new Date(bucket);
    if (Number.isNaN(date.getTime())) return bucket;
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket.slice(0, 10);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: "#101012",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: "#a0a0a0" },
  };
}

/** Picks at most `max` labels so an axis stays readable over a long range. */
function tickInterval(data, max = 8) {
  if (!data?.length) return 0;
  return Math.max(0, Math.ceil(data.length / max) - 1);
}

/**
 * Multi-series line or area chart over an analytics series array.
 *
 * `seriesDefs` names the fields to plot. Each must be a plain number field on
 * `MetricSeriesPoint`; a field that does not exist plots as an empty series
 * rather than throwing.
 */
export function TimeSeriesChart({ series = [], seriesDefs = [], granularity = "DAILY", height = 260, area = true }) {
  const data = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        label: formatBucket(point.bucket, granularity),
      })),
    [series, granularity],
  );

  const Chart = area ? AreaChart : LineChart;

  if (!data.length) {
    return (
      <Box sx={{ height, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No data in this range
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          {seriesDefs.map((def) => (
            <linearGradient key={def.key} id={`fill-${def.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={def.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={def.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} interval={tickInterval(data)} tickLine={false} axisLine={false} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(value) => formatNumber(value, { notation: "compact" })} />
        <Tooltip {...tooltipStyle()} labelFormatter={(label) => label} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {seriesDefs.map((def) =>
          area ? (
            <Area
              key={def.key}
              type="monotone"
              dataKey={def.key}
              name={def.label}
              stroke={def.color}
              strokeWidth={2}
              fill={`url(#fill-${def.key})`}
              connectNulls
            />
          ) : (
            <Line key={def.key} type="monotone" dataKey={def.key} name={def.label} stroke={def.color} strokeWidth={2} connectNulls dot={false} />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

/** Money series, in minor units, on a currency axis. */
export function MoneyChart({ series = [], dataKey = "attributedRevenueMinor", color = "#62abff", height = 240, granularity }) {
  const data = useMemo(
    () => series.map((point) => ({ ...point, label: formatBucket(point.bucket, granularity) })),
    [series, granularity],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fill-money" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} interval={tickInterval(data)} tickLine={false} axisLine={false} />
        <YAxis
          {...AXIS}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(value) => formatMoney(value, "INR", { compact: true })}
        />
        <Tooltip {...tooltipStyle()} formatter={(value) => [formatMoney(value), "Revenue"]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill="url(#fill-money)" connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Ranked horizontal bars.
 *
 * `labelKey`/`valueKey` read from the API's `BreakdownRow` shape. Values are
 * sorted descending here because the API returns them in whatever order the
 * aggregate scan produced, and a ranked chart with unsorted bars is misleading.
 */
export function RankedBars({ rows = [], labelKey = "label", valueKey = "value", color = "#62abff", height = 260, valueFormatter = formatNumber }) {
  const data = useMemo(
    () =>
      [...rows]
        .filter((row) => row && row[valueKey] !== null && row[valueKey] !== undefined)
        .sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0))
        .slice(0, 10)
        .map((row) => ({ name: row[labelKey] ?? "—", value: row[valueKey] })),
    [rows, labelKey, valueKey],
  );

  if (!data.length) {
    return (
      <Box sx={{ height, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No data in this range
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} tickLine={false} axisLine={false} tickFormatter={(value) => valueFormatter(value)} />
        <YAxis type="category" dataKey="name" {...AXIS} tickLine={false} axisLine={false} width={120} />
        <Tooltip {...tooltipStyle()} formatter={(value) => [valueFormatter(value), "Total"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Proportional split, used for status and device composition. */
export function DonutChart({ rows = [], labelKey = "label", valueKey = "value", height = 220, colors }) {
  const palette = colors ?? ["#62abff", "#4ade80", "#fbbf24", "#f87171", "#a78bfa", "#94a3b8"];
  const data = useMemo(
    () =>
      rows
        .filter((row) => row && Number(row[valueKey]) > 0)
        .map((row) => ({ name: row[labelKey] ?? "—", value: Number(row[valueKey]) })),
    [rows, labelKey, valueKey],
  );

  if (!data.length) {
    return (
      <Box sx={{ height, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Nothing to break down
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle()} formatter={(value) => [formatNumber(value), "Count"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}