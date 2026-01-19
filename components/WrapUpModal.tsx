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
  IoPieChart,
  IoBookmark,
  IoCalendarOutline,
} from "react-icons/io5";
import { Grade } from "../types";
import { useAcademicStats } from "../hooks/useAcademicStats";
import Confetti from "react-confetti";

interface WrapUpModalProps {
  grades: Grade[];
  units: Record<string, string>;
  onClose: () => void;
}

// Hook to get window size for Confetti
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
};

export const WrapUpModal: React.FC<WrapUpModalProps> = ({
  grades,
  units,
  onClose,
}) => {
  const { groupedGrades, calculateGWA, distinctions, overallStats } =
    useAcademicStats(grades, units);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const stats = useMemo(() => {
    let presidentsList = 0;
    let deansList = 0;
    let totalUnits = 0;

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
    validGrades.forEach((g) => {
      totalUnits += parseFloat(units[g.subject] || "0");
    });

    const sorted = [...validGrades].sort(
      (a, b) => parseFloat(a.grade) - parseFloat(b.grade),
    );

    return {
      presidentsList,
      deansList,
      totalUnits,
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
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 animate-bounce">
              <IoSchool size={56} className="text-indigo-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
              PASSED
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 w-full">
            <div className="text-center">
              <div className="text-4xl font-black text-white">
                {stats.totalSubjects}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Subjects
              </div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-4xl font-black text-white">
                {stats.totalUnits}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Total Units
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "mastery",
      title: "Subject Master",
      subtitle: "Where you truly excelled.",
      icon: <IoBookmark className="text-fuchsia-400" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-transparent border border-fuchsia-500/20 text-center">
            <IoStar className="text-fuchsia-400 mx-auto mb-3" size={32} />
            <div className="text-xs font-black text-fuchsia-300 uppercase tracking-widest mb-1">
              Top Performance
            </div>
            <div className="text-xl font-black text-white line-clamp-2 mb-2">
              {stats.bestGrade.subj}
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-fuchsia-500 text-white rounded-full font-black text-lg">
              {stats.bestGrade.val.toFixed(1)}
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
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center group hover:bg-white/10 transition-all">
              <IoTrophy className="text-yellow-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-black text-white">
                {stats.presidentsList}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                President's List
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center group hover:bg-white/10 transition-all">
              <IoStar className="text-blue-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-black text-white">
                {stats.deansList}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                Dean's List
              </div>
            </div>
          </div>
          {stats.consecutiveAwards > 0 ? (
            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 flex items-center gap-4 animate-pulse">
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
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center">
              <p className="text-[10px] text-slate-500 font-medium">
                Consistency is the key to the next award!
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "growth",
      title: "Consistency",
      subtitle: "How you handled the load.",
      icon: <IoTrendingUp className="text-blue-400" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <IoCalendarOutline className="text-blue-400" />
              <span className="text-xs font-bold text-slate-300">
                Active Semesters
              </span>
            </div>
            <span className="text-sm font-black text-white">
              {Object.keys(groupedGrades).length}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <IoPieChart className="text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">
                Passing Rate
              </span>
            </div>
            <span className="text-sm font-black text-white">100%</span>
          </div>
        </div>
      ),
    },
    {
      id: "final",
      title: "Final Verdict",
      subtitle: "The grand total.",
      icon: <IoHeart className="text-rose-400" />,
      content: (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="p-6 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 relative mb-8">
            <IoHeart
              className="absolute -top-2 -right-2 text-rose-300 animate-ping"
              size={28}
            />
            <p className="text-sm font-bold leading-relaxed italic">
              "{getEncouragement(stats.worstGrade.val)}"
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
              OVERALL GWA
            </div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 animate-gradient-x">
              {overallStats.totalGWA}
            </div>
          </div>
        </div>
      ),
    },
  ];

  function getEncouragement(worstGrade: number) {
    if (worstGrade <= 1.5)
      return "Absolute Excellence. You're setting the gold standard!";
    if (worstGrade <= 2.0)
      return "Remarkable work! You've navigated the challenges with grace.";
    if (worstGrade <= 2.5)
      return "You're building a solid foundation. Keep that momentum!";
    if (worstGrade <= 3.0)
      return "You survived and thrived! Every challenge is a lesson.";
    return "The numbers don't define your worth. Your growth does. Onward!";
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={600}
            gravity={0.15}
          />
        )}
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Progress System */}
        <div className="absolute top-0 left-0 right-0 flex gap-2 px-4 z-20">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-indigo-400 transition-all duration-500 ease-out`}
                style={{
                  width:
                    i < currentSlide
                      ? "100%"
                      : i === currentSlide
                        ? "100%"
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.2)] border border-white/5 relative min-h-[520px] flex flex-col">
          {/* Animated Background Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-48 h-48 bg-indigo-600/20 rounded-full blur-[60px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-fuchsia-600/10 rounded-full blur-[60px]"></div>

          {/* Header */}
          <div className="relative z-10 p-10 text-center pb-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              {slides[currentSlide].icon}
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {slides[currentSlide].id}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-2">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Content Area */}
          <div className="relative z-10 p-8 flex-1 flex flex-col justify-center transform transition-all duration-500">
            {slides[currentSlide].content}
          </div>

          {/* Controls */}
          <div className="relative z-10 p-8 pt-0 flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`p-4 rounded-2xl transition-all ${currentSlide === 0 ? "opacity-0 scale-90 pointer-events-none" : "bg-white/5 text-white hover:bg-white/10"}`}
            >
              <IoChevronBack size={20} />
            </button>

            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-white text-indigo-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              {currentSlide === slides.length - 1 ? "Done" : "Continue"}
              {currentSlide !== slides.length - 1 && <IoChevronForward />}
            </button>
          </div>
        </div>

        {/* Floating Close */}
        <button
          onClick={onClose}
          className="absolute -top-16 right-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all"
        >
          <IoClose size={24} />
        </button>
      </div>
    </div>
  );
};
