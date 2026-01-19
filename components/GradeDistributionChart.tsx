import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Grade } from "../types";

interface GradeDistributionChartProps {
  grades: Grade[];
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
  grades,
}) => {
  const data = useMemo(() => {
    const buckets = [
      { name: "1.0 - 1.2", min: 1.0, max: 1.25, count: 0, color: "#4f46e5" }, // Indigo
      { name: "1.3 - 1.7", min: 1.26, max: 1.75, count: 0, color: "#06b6d4" }, // Cyan
      { name: "1.8 - 2.2", min: 1.76, max: 2.25, count: 0, color: "#10b981" }, // Emerald
      { name: "2.3 - 2.7", min: 2.26, max: 2.75, count: 0, color: "#f59e0b" }, // Amber
      { name: "2.8 - 3.0", min: 2.76, max: 3.0, count: 0, color: "#f43f5e" }, // Rose
      { name: "Below 3.0", min: 3.01, max: 5.0, count: 0, color: "#64748b" }, // Slate
    ];

    grades.forEach((g) => {
      const val = parseFloat(g.grade);
      if (!isNaN(val)) {
        const bucket = buckets.find((b) => val >= b.min && val <= b.max);
        if (bucket) bucket.count++;
      }
    });

    return buckets.filter((b) => b.count > 0);
  }, [grades]);

  // Cast Recharts components
  const ChartWrapper = ResponsiveContainer as any;
  const ChartPieChart = PieChart as any;
  const ChartPie = Pie as any;
  const ChartCell = Cell as any;
  const ChartTooltip = Tooltip as any;
  const ChartLegend = Legend as any;

  if (data.length === 0) return null;

  return (
    <div className="w-full h-[250px] mt-2 relative">
      <ChartWrapper width="100%" height="100%">
        <ChartPieChart>
          <ChartPie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
            stroke="none"
          >
            {data.map((entry, index) => (
              <ChartCell key={`cell-${index}`} fill={entry.color} />
            ))}
          </ChartPie>
          <ChartTooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const pt = payload[0].payload;
                return (
                  <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white shadow-xl text-center">
                    <p
                      className="text-[10px] uppercase font-black mb-1"
                      style={{ color: pt.color }}
                    >
                      {pt.name}
                    </p>
                    <p className="text-lg font-black text-slate-800 leading-none">
                      {pt.count}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                      Subjects
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ChartLegend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "10px", fontWeight: 700, opacity: 0.7 }}
          />
        </ChartPieChart>
      </ChartWrapper>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-20">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Total
        </span>
        <span className="text-2xl font-black text-slate-700">
          {grades.filter((g) => !isNaN(parseFloat(g.grade))).length}
        </span>
      </div>
    </div>
  );
};
