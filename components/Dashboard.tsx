import React, { useState } from "react";
import {
  IoDownloadOutline,
  IoRefresh,
  IoInformationCircleOutline,
  IoTrendingUp,
  IoLayers,
  IoRibbon,
  IoAnalytics,
  IoOptions,
  IoMedal,
  IoSchool,
  IoCalculator,
  IoChevronDown,
  IoChevronForward,
  IoSyncOutline,
  IoSparklesOutline,
  IoStatsChart,
  IoPieChart,
  IoSearchOutline,
  IoCloseCircle,
} from "react-icons/io5";
import { AppStatus, Grade } from "../types";
import { useAcademicStats } from "../hooks/useAcademicStats";
import { AcademicChart } from "./AcademicChart";
import { GradeDistributionChart } from "./GradeDistributionChart.tsx";

interface DashboardProps {
  status: AppStatus;
  grades: Grade[];
  units: Record<string, string>;
  studentId: string;
  onUnitsChange: (newUnits: Record<string, string>) => void;
  onReset: () => void;
  onTriggerWrapUp: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  status,
  grades,
  units,
  studentId,
  onUnitsChange,
  onReset,
  onTriggerWrapUp,
}) => {
  const {
    overallStats,
    distinctions,
    honorForecasts,
    remainingUnits,
    setRemainingUnits,
    sortedSemesterEntries,
    calculateGWA,
  } = useAcademicStats(grades, units);

  const [expandedSemesters, setExpandedSemesters] = useState<
    Record<string, boolean>
  >({});
  const [searchTerm, setSearchTerm] = useState("");

  const handleUnitChange = (semester: string, subject: string, val: string) => {
    onUnitsChange({ ...units, [`${semester}-${subject}`]: val });
  };

  const handleExport = () => {
    const csvRows = [["Semester", "Subject", "Grade", "Equivalent", "Units"]];
    sortedSemesterEntries.forEach(([semester, items]) => {
      items.forEach((g) => {
        const unit = units[`${g.semester}-${g.subject}`] || "0";
        const safeSubject = `"${g.subject.replace(/"/g, '""')}"`;
        const safeSemester = `"${g.semester}"`;
        csvRows.push([
          safeSemester,
          safeSubject,
          g.grade,
          g.equivalent || "",
          unit,
        ]);
      });
    });
    const csvContent = csvRows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ibu_grade_export_${studentId || "history"}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredEntries = sortedSemesterEntries
    .map(([sem, items]) => {
      // If term matches semester name, show all items
      if (sem.toLowerCase().includes(searchTerm.toLowerCase())) {
        return [sem, items] as [string, Grade[]];
      }
      // Otherwise, filter items by subject name
      const matchingItems = items.filter((item) =>
        item.subject.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      return [sem, matchingItems] as [string, Grade[]];
    })
    .filter(([_, items]) => items.length > 0);

  return (
    <div className="flex-1 p-6 md:p-8 bg-white/20 md:overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          Academic History
        </h2>
        {status === AppStatus.SUCCESS && (
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerWrapUp}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:brightness-110 text-white shadow-lg active:scale-[0.97] transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-wider"
              title="View Wrap-Up"
            >
              <IoSparklesOutline size={14} />
              Wrap Up
            </button>
            <button
              onClick={handleExport}
              className="p-3 rounded-xl bg-white hover:bg-slate-50 text-blue-600 shadow-md active:scale-[0.97] transition-all"
              title="Export to Excel/CSV"
            >
              <IoDownloadOutline size={18} />
            </button>
            <button
              onClick={onReset}
              className="p-3 rounded-xl bg-white hover:bg-slate-50 text-rose-500 shadow-md active:scale-[0.97]"
              title="Reset All Data"
            >
              <IoRefresh size={18} />
            </button>
          </div>
        )}
      </div>

      {status === AppStatus.SUCCESS && (
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
          <div className="text-blue-600 mt-0.5 shrink-0 bg-white rounded-full p-1 shadow-sm">
            <IoInformationCircleOutline size={22} />
          </div>
          <div>
            <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide mb-1">
              Action Required
            </h4>
            <p className="text-xs text-blue-800/80 font-medium leading-relaxed">
              Manually <strong>enter the units</strong> for each subject in the
              list below to generate your GWA. All data is processed locally.
            </p>
          </div>
        </div>
      )}

      {status === AppStatus.SUCCESS && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 mb-6 space-y-6">
          {/* Main Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
              <div className="absolute top-[-50%] right-[-10%] w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <IoTrendingUp size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Overall GWA
                </span>
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-black tracking-tight leading-none">
                  {overallStats.totalGWA}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-white/60 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <IoLayers size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Total Units
                </span>
              </div>
              <div className="text-2xl font-black text-slate-700">
                {overallStats.totalUnits}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-white/60 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <IoRibbon size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Best Sem
                </span>
              </div>
              <div className="text-sm font-black text-slate-700 truncate">
                {overallStats.bestSem}
              </div>
              <div className="text-[10px] font-bold text-emerald-500">
                GWA: {overallStats.bestGWA}
              </div>
            </div>
          </div>

          {/* Charts Grid - NEW LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GWA Trend Chart */}
            <div className="bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <IoStatsChart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Performance Trend
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Your GWA over time (Higher is Better).
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <AcademicChart
                  sortedEntries={sortedSemesterEntries}
                  units={units}
                  calculateGWA={calculateGWA}
                />
              </div>
            </div>

            {/* Distribution Chart - NEW COMPONENT */}
            <div className="bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <IoPieChart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Grade Spectrum
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Distribution by grade range.
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <GradeDistributionChart grades={grades} />
              </div>
            </div>
          </div>

          {/* Latin Honor Forecast Section */}
          <div className="bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <IoAnalytics size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Latin Honor Forecast
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Prediction based on remaining load.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Units Remaining
                </span>
                <div className="flex items-center gap-2">
                  <IoOptions className="text-slate-300" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={remainingUnits}
                    onChange={(e) =>
                      setRemainingUnits(parseInt(e.target.value))
                    }
                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-black text-blue-600 w-6 text-center">
                    {remainingUnits}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {honorForecasts.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${h.bg}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-xl ${h.color}`}>
                      <IoMedal />
                    </div>
                    <div>
                      <div className={`text-xs font-black ${h.color}`}>
                        {h.name}
                      </div>
                      <div className="text-[10px] font-bold opacity-70 text-slate-600">
                        {h.msg}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${
                        h.status.includes("Impossible") ||
                        h.status.includes("Disqualified")
                          ? "bg-red-100 text-red-600"
                          : h.status.includes("Likely") ||
                              h.status.includes("Possible")
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {h.status}
                    </div>
                    {h.probability > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              h.probability > 75
                                ? "bg-emerald-500"
                                : h.probability > 40
                                  ? "bg-orange-400"
                                  : "bg-red-400"
                            }`}
                            style={{ width: `${h.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">
                          {h.probability}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Award Streak Section */}
          {distinctions.length > 0 && (
            <div className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
              <div className="flex items-center gap-2 mb-3 px-1">
                <IoRibbon size={18} className="text-yellow-500" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Academic Award Streak
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x custom-scrollbar">
                {distinctions.map((d, i) => (
                  <div
                    key={i}
                    className={`snap-center shrink-0 w-[260px] p-5 rounded-2xl text-white shadow-lg relative overflow-hidden bg-gradient-to-br ${d.color}`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                          <IoRibbon size={20} className="text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                            Comb. GWA
                          </div>
                          <div className="text-2xl font-black tracking-tighter leading-none">
                            {d.gwa}
                          </div>
                        </div>
                      </div>
                      <h4 className="font-black text-lg leading-tight mb-1">
                        {d.title}
                      </h4>
                      <p className="text-[10px] font-medium opacity-80 truncate">
                        {d.period}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH BAR - NEW FEATURE */}
      {status === AppStatus.SUCCESS && (
        <div className="sticky top-0 z-20 bg-white/10 backdrop-blur-xl py-2 mb-4 -mx-2 px-2 rounded-b-2xl">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <IoSearchOutline size={18} />
            </div>
            <input
              type="text"
              placeholder="Filter by Subject or Semester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/70 backdrop-blur-md border border-white/60 rounded-xl pl-12 pr-10 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <IoCloseCircle size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Semester Breakdown Table */}
      <div className="space-y-4">
        {filteredEntries.map(([semester, items]) => {
          const semGWAStr = calculateGWA(items, units, true);
          const strictSemGWA = calculateGWA(items, units, false);
          const isSemPartial = strictSemGWA === "---" && semGWAStr !== "---";

          let semDistinction = null;
          if (semGWAStr !== "---") {
            const gwa = parseFloat(semGWAStr);
            const hasLowGrade = items.some((g) => {
              const v = parseFloat(g.grade);
              return !isNaN(v) && v > 3.0;
            });

            if (!hasLowGrade) {
              if (gwa <= 1.45)
                semDistinction = {
                  label: "President's Lister Qualifier",
                  color: "bg-yellow-100 text-yellow-700 border-yellow-200",
                };
              else if (gwa <= 1.75)
                semDistinction = {
                  label: "Dean's Lister Qualifier",
                  color: "bg-blue-100 text-blue-700 border-blue-200",
                };
            }
          }

          // Force expand if searching
          const isExpanded = expandedSemesters[semester] || searchTerm !== "";

          return (
            <div
              key={semester}
              className="rounded-[1.5rem] bg-white/40 border border-white/60 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() =>
                  setExpandedSemesters((p) => ({
                    ...p,
                    [semester]: !p[semester],
                  }))
                }
                className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-black text-slate-800 flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <IoSchool size={16} />
                    </div>
                    {semester}
                  </span>
                  {semDistinction && (
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ml-10 border ${semDistinction.color}`}
                    >
                      {semDistinction.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
                      <IoCalculator size={12} className="opacity-50" />
                      <span className="text-[10px] font-medium opacity-70 uppercase tracking-wide">
                        GWA
                      </span>
                      <span className="text-xs font-bold">{semGWAStr}</span>
                    </div>
                    {isSemPartial && (
                      <span className="text-[8px] font-bold text-orange-500 mt-1 uppercase tracking-wide">
                        Running
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <IoChevronDown size={18} className="text-slate-400" />
                  ) : (
                    <IoChevronForward size={18} className="text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex text-[10px] font-bold text-slate-400 px-4 uppercase tracking-widest">
                    <div className="flex-1">Subject</div>
                    <div className="w-14 text-center">Unit</div>
                    <div className="w-20 text-center">Grade / Equiv</div>
                  </div>
                  {items.map((g, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-xl bg-white border border-white shadow-sm hover:translate-x-1 transition-transform"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-slate-700 font-bold text-xs block truncate leading-tight">
                          {g.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          className="w-12 h-9 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs font-bold text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="-"
                          value={units[`${g.semester}-${g.subject}`] || ""}
                          onChange={(e) =>
                            handleUnitChange(
                              g.semester,
                              g.subject,
                              e.target.value,
                            )
                          }
                        />
                        <div className="flex flex-col items-center justify-center text-white bg-blue-600 w-20 h-9 rounded-lg shadow-md shadow-blue-500/20">
                          <span className="text-xs font-black tracking-tight leading-none">
                            {g.grade}
                          </span>
                          {g.equivalent && g.equivalent !== "N/A" && (
                            <span className="text-[8px] font-medium opacity-80 leading-none mt-0.5">
                              {g.equivalent}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Data Privacy Policy Mention */}
                  <div className="mt-2 px-2 py-2 border-t border-slate-100">
                    <p className="text-[8px] text-slate-400 leading-tight">
                      <strong>Data Privacy Policy:</strong> All grades and unit
                      inputs are processed locally in your browser. No academic
                      data is stored on external servers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEntries.length === 0 &&
          status === AppStatus.SUCCESS &&
          searchTerm && (
            <div className="text-center py-10">
              <p className="text-slate-500 font-bold">
                No subjects found matching "{searchTerm}"
              </p>
            </div>
          )}

        {status === AppStatus.IDLE && (
          <div className="h-[350px] flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-inner">
              <IoSyncOutline size={32} className="opacity-20 animate-pulse" />
            </div>
            <p className="font-black text-lg text-slate-600 uppercase tracking-widest">
              Ready to Sync
            </p>
            <p className="text-xs font-medium opacity-50 mt-1 max-w-[200px] text-center">
              Enter your credentials in the sidebar to load your history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
