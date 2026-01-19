import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Grade } from "../types";

interface AcademicChartProps {
  sortedEntries: [string, Grade[]][];
  units: Record<string, string>;
  calculateGWA: (
    gradeList: Grade[],
    unitMap: Record<string, string>,
    ignoreMissing: boolean,
  ) => string;
}

export const AcademicChart: React.FC<AcademicChartProps> = ({
  sortedEntries,
  units,
  calculateGWA,
}) => {
  const data = useMemo(() => {
    // Reverse the sorted entries to show Oldest -> Newest on the chart (Left to Right)
    // sortedEntries comes in as Newest -> Oldest usually
    const chronological = [...sortedEntries].reverse();

    return chronological
      .map(([sem, items]) => {
        const gwaStr = calculateGWA(items, units, true);
        const gwa = gwaStr === "---" ? null : parseFloat(gwaStr);

        // Shorten semester name for the axis
        let shortName = sem.replace(" Semester", "S").replace(" Summer", "Sum");
        shortName = shortName.replace(/SY \d{4}-\d{4}/, "").trim(); // Remove SY if it makes it too long
        // Or just take the first part like "1st", "2nd"
        const parts = sem.split(" ");
        if (parts.length > 0) {
          if (parts[0] === "First" || parts[0] === "1st") shortName = "1st";
          if (parts[0] === "Second" || parts[0] === "2nd") shortName = "2nd";
          if (parts[0] === "Summer" || parts[0] === "Mid") shortName = "Sum";
          // Append year indication if needed, but keep it simple for mobile
        }

        return {
          name: shortName,
          fullName: sem,
          gwa: gwa,
          // Calculate units taken in that sem
          units: items.reduce((acc, curr) => {
            const u = parseFloat(
              units[`${curr.semester}-${curr.subject}`] || "0",
            );
            return acc + (isNaN(u) ? 0 : u);
          }, 0),
        };
      })
      .filter((d) => d.gwa !== null && d.gwa > 0 && d.gwa <= 5.0);
  }, [sortedEntries, units, calculateGWA]);

  if (data.length < 2) return null;

  // Cast Recharts components to any to avoid "cannot be used as a JSX component" error in stricter TS/React versions
  const ChartWrapper = ResponsiveContainer as any;
  const ChartAreaChart = AreaChart as any;
  const ChartArea = Area as any;
  const ChartXAxis = XAxis as any;
  const ChartYAxis = YAxis as any;
  const ChartCartesianGrid = CartesianGrid as any;
  const ChartTooltip = Tooltip as any;

  return (
    <div className="w-full h-[250px] mt-2">
      <ChartWrapper width="100%" height="100%">
        <ChartAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorGwa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ChartCartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.2)"
          />
          <ChartXAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <ChartYAxis
            reversed={true}
            domain={[1.0, 3.0]}
            hide={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
            tickCount={5}
          />
          <ChartTooltip
            cursor={{
              stroke: "#6366f1",
              strokeWidth: 2,
              strokeDasharray: "4 4",
            }}
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                const pt = payload[0].payload;
                return (
                  <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white shadow-xl text-center">
                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">
                      {pt.fullName}
                    </p>
                    <p className="text-lg font-black text-indigo-600 leading-none">
                      {pt.gwa?.toFixed(4)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                      GWA
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ChartArea
            type="monotone"
            dataKey="gwa"
            stroke="#4f46e5"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorGwa)"
            animationDuration={1500}
          />
        </ChartAreaChart>
      </ChartWrapper>
    </div>
  );
};
