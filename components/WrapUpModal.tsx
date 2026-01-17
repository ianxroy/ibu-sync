import React, { useMemo, useState, useEffect } from "react";
import {
  IoClose,
  IoTrophy,
  IoStar,
  IoTrendingUp,
  IoRocket,
  IoHeart,
  IoSparkles,
} from "react-icons/io5";
import { Grade } from "../types";
import { useAcademicStats } from "../hooks/useAcademicStats";
import Confetti from "react-dom-confetti";

interface WrapUpModalProps {
  grades: Grade[];
  units: Record<string, string>;
  onClose: () => void;
}

export const WrapUpModal: React.FC<WrapUpModalProps> = ({
  grades,
  units,
  onClose,
}) => {
  const { groupedGrades, calculateGWA, distinctions } = useAcademicStats(
    grades,
    units,
  );
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti on mount
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    let presidentsList = 0;
    let deansList = 0;

    // 1. Calculate Awards Count (President's/Dean's List per Semester)
    Object.entries(groupedGrades).forEach(([_, items]) => {
      const gwaStr = calculateGWA(items, units, false); // Strict calculation
      if (gwaStr !== "---") {
        const gwa = parseFloat(gwaStr);
        // Ensure no disqualifying grades (usually > 2.4 or > 3.0 depending on handbook, using 2.4 safe limit for PL/DL)
        const hasLowGrade = items.some((g) => {
          const v = parseFloat(g.grade);
          return !isNaN(v) && v > 2.4;
        });

        if (!hasLowGrade) {
          if (gwa <= 1.45) presidentsList++;
          else if (gwa <= 1.75) deansList++;
        }
      }
    });

    // 2. Highs and Lows
    let highestGradeVal = 5.0; // Numerically high (e.g. 5.0 is bad)
    let lowestGradeVal = 0; // Numerically low (e.g. 1.0 is good)
    let highestGradeSubject = "N/A";
    let lowestGradeSubject = "N/A"; // "Lowest" here refers to the lowest numerical value (Best Grade)
    let worstGradeSubject = "N/A"; // "Worst" refers to highest numerical value

    const validGrades = grades.filter((g) => !isNaN(parseFloat(g.grade)));

    // Find BEST grade (Numerically Lowest, e.g. 1.0)
    validGrades.forEach((g) => {
      const val = parseFloat(g.grade);
      // Check for best grade (min value)
      if (val > 0 && (lowestGradeVal === 0 || val < lowestGradeVal)) {
        lowestGradeVal = val;
        lowestGradeSubject = g.subject;
      }
    });

    // Find WORST grade (Numerically Highest, e.g. 3.0 or 5.0)
    validGrades.forEach((g) => {
      const val = parseFloat(g.grade);
      if (val > 0 && (highestGradeVal === 5.0 || val > highestGradeVal)) {
        // Logic fix: initialize tracking properly
        // Actually, just sorting is safer
      }
    });

    // Sort to be sure
    const sorted = [...validGrades].sort(
      (a, b) => parseFloat(a.grade) - parseFloat(b.grade),
    );
    if (sorted.length > 0) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      lowestGradeVal = parseFloat(best.grade);
      lowestGradeSubject = best.subject;

      highestGradeVal = parseFloat(worst.grade);
      worstGradeSubject = worst.subject;
    }

    return {
      presidentsList,
      deansList,
      consecutiveAwards: distinctions.length,
      bestGrade: { val: lowestGradeVal, subj: lowestGradeSubject },
      worstGrade: { val: highestGradeVal, subj: worstGradeSubject },
    };
  }, [groupedGrades, calculateGWA, distinctions, grades]);

  const getEncouragement = (worstGrade: number) => {
    if (worstGrade <= 1.5)
      return "Unstoppable! Even your 'lowest' is a dream for many.";
    if (worstGrade <= 2.0)
      return "Solid consistency! You're holding the line perfectly.";
    if (worstGrade <= 2.5)
      return "You're doing well! A few bumps just make the journey real.";
    if (worstGrade <= 3.0)
      return "Diamonds are made under pressure. Keep pushing!";
    return "Grades don't define you. Your resilience does. Bounce back stronger!";
  };

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 70,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"],
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <div className="relative w-full max-w-sm">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>

        {/* Card Container */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative animate-in zoom-in-95 duration-500 delay-100">
          {/* Decorative Globs */}
          <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-fuchsia-500/20 rounded-full blur-[60px] pointer-events-none"></div>

          {/* Header */}
          <div className="relative z-10 p-8 text-center border-b border-white/5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
              <IoSparkles className="text-yellow-400" size={12} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                BU Wrap-Up
              </span>
            </div>
            <h2 className="text-3xl font-black text-white leading-none tracking-tight mb-2">
              Academic
              <br />
              Recap
            </h2>
            <p className="text-indigo-200 text-xs font-medium">
              Your journey by the numbers.
            </p>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 space-y-6">
            {/* Awards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <IoTrophy className="text-yellow-400 mb-2" size={24} />
                <div className="text-2xl font-black text-white">
                  {stats.presidentsList}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  President's List
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <IoStar className="text-blue-400 mb-2" size={24} />
                <div className="text-2xl font-black text-white">
                  {stats.deansList}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Dean's List
                </div>
              </div>
            </div>

            {/* Consecutive */}
            {stats.consecutiveAwards > 0 && (
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 backdrop-blur-md rounded-2xl p-4 border border-amber-500/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                  <IoTrendingUp size={24} />
                </div>
                <div>
                  <div className="text-xl font-black text-amber-100">
                    {stats.consecutiveAwards}x Streak
                  </div>
                  <div className="text-[10px] text-amber-200/80 font-bold uppercase tracking-wider">
                    Consecutive Awards
                  </div>
                </div>
              </div>
            )}

            {/* Best & Worst */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="font-black text-sm">
                    {stats.bestGrade.val}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
                    Highest Grade
                  </div>
                  <div className="text-xs text-white font-medium truncate">
                    {stats.bestGrade.subj}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <span className="font-black text-sm">
                    {stats.worstGrade.val}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">
                    Lowest Grade
                  </div>
                  <div className="text-xs text-white font-medium truncate">
                    {stats.worstGrade.subj}
                  </div>
                </div>
              </div>
            </div>

            {/* Motivation */}
            <div className="p-4 rounded-2xl bg-indigo-600 text-white text-center shadow-lg shadow-indigo-600/30">
              <div className="mb-2 inline-block">
                <IoHeart className="animate-pulse" />
              </div>
              <p className="text-xs font-bold leading-relaxed opacity-90">
                "{getEncouragement(stats.worstGrade.val)}"
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-black/20 text-center">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Close Wrap-Up
            </button>
          </div>
        </div>

        {/* External Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all"
        >
          <IoClose size={20} />
        </button>
      </div>
    </div>
  );
};
