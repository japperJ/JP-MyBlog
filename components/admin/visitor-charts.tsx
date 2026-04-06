"use client";

// Import ALL recharts components together — splitting them across separate dynamic()
// calls breaks internal React context and causes fills to render grey.
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChartSlice = { name: string; value: number };

interface VisitorChartsProps {
  browserData: ChartSlice[];
  countryData: ChartSlice[];
  deviceData: ChartSlice[];
  pathData: ChartSlice[];
}

const COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#a855f7", // purple
  "#84cc16", // lime
];

function formatTooltip(value: number, name: string, props: { payload?: { value?: number }; total?: number }) {
  const total = props?.total ?? 0;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  return [`${value} (${pct}%)`, name];
}

interface DonutChartProps {
  title: string;
  data: ChartSlice[];
}

function DonutChart({ title, data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const isEmpty = total === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : 0;
                  const label = typeof name === "string" ? name : String(name);
                  return formatTooltip(num, label, { total });
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconSize={10}
                iconType="circle"
                formatter={(value) =>
                  value.length > 18 ? `${value.slice(0, 17)}…` : value
                }
                wrapperStyle={{ fontSize: "11px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function VisitorCharts({ browserData, countryData, deviceData, pathData }: VisitorChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <DonutChart title="Browser Distribution" data={browserData} />
      <DonutChart title="Country / GEO Distribution" data={countryData} />
      <DonutChart title="Device & Bot Type" data={deviceData} />
      <DonutChart title="Top Paths (Page Views)" data={pathData} />
    </div>
  );
}
