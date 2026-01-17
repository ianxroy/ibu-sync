import React, { useMemo, useState, useEffect } from "react";
import {
  IoClose,
  IoTrophy,
  IoStar,
  IoTrendingUp,
  IoHeart,
  IoSparkles,
  IoChevronForward,
  IoChevronBack,
  IoSchool,
  IoFlame,
  IoStatsChart,
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
  const { groupedGrades, calculateGWA, distinctions, overallStats } =
    useAcademicStats(grades, units);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Stats Logic
  const stats = useMemo(() => {
    let presidentsList = 0;
    let deansList = 0;

    Object.entries(groupedGrades).forEach(([_, items]) => {
      const gwaStr = calculateGWA(items, units, false);
      if (gwaStr !== "---") {
        const gwa = parseFloat(gwaStr);
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

    const validGrades = grades.filter((g) => !isNaN(parseFloat(g.grade)));
    const sorted = [...validGrades].sort(
      (a, b) => parseFloat(a.grade) - parseFloat(b.grade),
    );

    return {
      presidentsList,
      deansList,
      consecutiveAwards: distinctions.length,
      bestGrade:
        sorted.length > 0
          ? { val: parseFloat(sorted[0].grade), subj: sorted[0].subject }
          : { val: 0, subj: "N/A" },
      worstGrade:
        sorted.length > 0
          ? {
              val: parseFloat(sorted[sorted.length - 1].grade),
              subj: sorted[sorted.length - 1].subject,
            }
          : { val: 0, subj: "N/A" },
      totalSubjects: validGrades.length,
    };
  }, [groupedGrades, calculateGWA, distinctions, grades, units]);

  const slides = [
    {
      id: "intro",
      title: "Academic Recap",
      subtitle: "Your journey by the numbers.",
      icon: <IoSparkles className="text-yellow-400" />,
      content: (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="w-24 h-24 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 animate-bounce">
            <IoSchool size={48} className="text-indigo-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-white">
              {stats.totalSubjects}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Subjects Conquered
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "awards",
      title: "Hall of Fame",
      subtitle: "The recognition you earned.",
      icon: <IoTrophy className="text-amber-400" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <IoTrophy className="text-yellow-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-black text-white">
                {stats.presidentsList}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                President's List
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <IoStar className="text-blue-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-black text-white">
                {stats.deansList}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                Dean's List
              </div>
            </div>
          </div>
          {stats.consecutiveAwards > 0 && (
            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 flex items-center gap-4">
              <IoFlame className="text-amber-500" size={24} />
              <div className="text-left">
                <div className="text-lg font-black text-amber-100">
                  {stats.consecutiveAwards}x Streak
                </div>
                <div className="text-[9px] text-amber-200/60 font-bold uppercase">
                  Consecutive Honors
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "highlights",
      title: "The Highlights",
      subtitle: "Peaks and valleys of the sem.",
      icon: <IoStatsChart className="text-emerald-400" />,
      content: (
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
              {stats.bestGrade.val.toFixed(1)}
            </div>
            <div className="text-left min-w-0">
              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                Highest Achievement
              </div>
              <div className="text-xs text-white font-medium truncate">
                {stats.bestGrade.subj}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
            <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-rose-500/20">
              {stats.worstGrade.val.toFixed(1)}
            </div>
            <div className="text-left min-w-0">
              <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider">
                Lowest Point
              </div>
              <div className="text-xs text-white font-medium truncate">
                {stats.worstGrade.subj}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "final",
      title: "Keep Going",
      subtitle: "A message for you.",
      icon: <IoHeart className="text-rose-400" />,
      content: (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 relative">
            <IoHeart
              className="absolute -top-3 -right-3 text-rose-400 animate-ping"
              size={24}
            />
            <p className="text-sm font-bold leading-relaxed italic">
              "{getEncouragement(stats.worstGrade.val)}"
            </p>
          </div>
          <div className="mt-8">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">
              Current GWA
            </div>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
              {overallStats.totalGWA}
            </div>
          </div>
        </div>
      ),
    },
  ];

  function getEncouragement(worstGrade: number) {
    if (worstGrade <= 1.5)
      return "Unstoppable! Even your 'lowest' is a dream for many.";
    if (worstGrade <= 2.0)
      return "Solid consistency! You're holding the line perfectly.";
    if (worstGrade <= 2.5)
      return "You're doing well! A few bumps just make the journey real.";
    if (worstGrade <= 3.0)
      return "Diamonds are made under pressure. Keep pushing!";
    return "Grades don't define you. Your resilience does. Bounce back stronger!";
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide((prev) => prev - 1);
  };

  useEffect(() => {
    if (currentSlide === slides.length - 1) {
      const t = setTimeout(() => setShowConfetti(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowConfetti(false);
    }
  }, [currentSlide, slides.length]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
      <div className="relative w-full max-w-sm">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1.5 px-2 z-20">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${i <= currentSlide ? "opacity-100" : "opacity-0"}`}
                style={{
                  width:
                    i === currentSlide
                      ? "100%"
                      : i < currentSlide
                        ? "100%"
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <Confetti
            active={showConfetti}
            config={{ elementCount: 100, spread: 360, startVelocity: 40 }}
          />
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative min-h-[500px] flex flex-col">
          {/* Decorative Background */}
          <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>

          {/* Header */}
          <div className="relative z-10 p-8 text-center pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-4">
              {slides[currentSlide].icon}
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {slides[currentSlide].id === "final" ? "Conclusion" : "Recap"}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-indigo-200/60 text-xs font-medium mt-1">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Dynamic Content Area */}
          <div className="relative z-10 p-6 flex-1 flex flex-col justify-center animate-in slide-in-from-right-4 duration-300 key={currentSlide}">
            {slides[currentSlide].content}
          </div>

          {/* Controls */}
          <div className="relative z-10 p-6 pt-0 flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`p-4 rounded-2xl border border-white/10 transition-all ${currentSlide === 0 ? "opacity-0 pointer-events-none" : "bg-white/5 text-white hover:bg-white/10"}`}
            >
              <IoChevronBack size={20} />
            </button>

            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-white text-indigo-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/10"
            >
              {currentSlide === slides.length - 1 ? "Finish" : "Next"}
              {currentSlide !== slides.length - 1 && <IoChevronForward />}
            </button>
          </div>
        </div>

        {/* External Close */}
        <button
          onClick={onClose}
          className="absolute -top-14 right-0 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/10"
        >
          <IoClose size={20} />
        </button>
      </div>
    </div>
  );
};
