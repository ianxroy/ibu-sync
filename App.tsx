import React, { useState, useMemo, useEffect } from "react";
import {
  IoSchool,
  IoPerson,
  IoKey,
  IoRefresh,
  IoRocket,
  IoShieldCheckmarkOutline,
  IoChevronDown,
  IoChevronForward,
  IoGlobeOutline,
  IoBook,
  IoSyncOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoCalculator,
  IoTrendingUp,
  IoRibbon,
  IoLayers,
  IoTimeOutline,
  IoStar,
  IoLockClosedOutline,
  IoEyeOffOutline,
  IoServerOutline,
  IoChatboxEllipsesOutline,
  IoSend,
  IoInformationCircleOutline,
  IoFlashOutline,
  IoMedal,
  IoOptions,
  IoAlertCircleOutline,
  IoAnalytics,
  IoWarningOutline,
  IoDownloadOutline,
} from "react-icons/io5";
import { GlassCard } from "./components/ui/GlassCard";
import { Input } from "./components/ui/Input";
import { Grade, AppStatus } from "./types";
import { SUBJECT_UNITS } from "./subjects";

/* ================= CONSTANTS ================= */
const RAILWAY_PRODUCTION_URL = "https://ibu-sync-production.up.railway.app";

const GRADING_SCALE = [
  { rating: "Outstanding", grade: "1.0", eq: "99-100" },
  { rating: "Outstanding", grade: "1.1", eq: "98" },
  { rating: "Outstanding", grade: "1.2", eq: "97" },
  { rating: "Outstanding", grade: "1.3", eq: "96" },
  { rating: "Outstanding", grade: "1.4", eq: "95" },
  { rating: "Superior", grade: "1.5", eq: "94" },
  { rating: "Superior", grade: "1.6", eq: "93" },
  { rating: "Superior", grade: "1.7", eq: "92" },
  { rating: "Very Satisfactory", grade: "1.8", eq: "91" },
  { rating: "Very Satisfactory", grade: "1.9", eq: "90" },
  { rating: "Very Satisfactory", grade: "2.0", eq: "89" },
  { rating: "Very Satisfactory", grade: "2.1", eq: "88" },
  { rating: "Very Satisfactory", grade: "2.2", eq: "87" },
  { rating: "Very Satisfactory", grade: "2.3", eq: "86" },
  { rating: "Very Satisfactory", grade: "2.4", eq: "85" },
  { rating: "Very Satisfactory", grade: "2.5", eq: "84" },
  { rating: "Satisfactory", grade: "2.6", eq: "82-83" },
  { rating: "Satisfactory", grade: "2.7", eq: "80-81" },
  { rating: "Satisfactory", grade: "2.8", eq: "78-79" },
  { rating: "Fair/Average", grade: "2.9", eq: "76-77" },
  { rating: "Fair/Average", grade: "3.0", eq: "75 (Passing)" },
  { rating: "Poor", grade: "3.1-4.0", eq: "Below 75 (Conditional)" },
  { rating: "Failure", grade: "5.0", eq: "Failure" },
];

const getSemesterOrder = (semString: string) => {
  const yearMatch = semString.match(/(\d{4})/);
  const startYear = yearMatch ? parseInt(yearMatch[0]) : 0;
  let semOrder = 4;
  const lower = semString.toLowerCase();
  if (lower.includes("1st") || lower.includes("first")) semOrder = 1;
  else if (lower.includes("2nd") || lower.includes("second")) semOrder = 2;
  else if (lower.includes("3rd") || lower.includes("third")) semOrder = 3;
  else if (lower.includes("summer") || lower.includes("mid")) semOrder = 3.5;
  return { startYear, semOrder };
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ================= SERVER SELECTION LOGIC =================
interface ServerNode {
  url: string; // Empty string means relative path (same origin)
  name: string;
  latency?: number;
}

const App: React.FC = () => {
  const [studentId, setStudentId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expandedSemesters, setExpandedSemesters] = useState<
    Record<string, boolean>
  >({});
  const [showGradingScale, setShowGradingScale] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] =
    useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [units, setUnits] = useState<Record<string, string>>({});

  // Forecasting State
  const [remainingUnits, setRemainingUnits] = useState<number>(30);

  // State for Server Selection
  const [activeServer, setActiveServer] = useState<ServerNode | null>(null);

  // Queue State
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === AppStatus.LOADING) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const processGrades = (data: Grade[]) => {
    setGrades(data);
    const initialUnits: Record<string, string> = {};
    const normalizedSubjectMap = Object.keys(SUBJECT_UNITS).reduce(
      (acc, key) => {
        acc[key.toLowerCase()] = SUBJECT_UNITS[key];
        return acc;
      },
      {} as Record<string, string>
    );

    data.forEach((g: Grade) => {
      const key = `${g.semester}-${g.subject}`;
      const subjectName = g.subject.trim();
      const subjectNameLower = subjectName.toLowerCase();

      if (SUBJECT_UNITS[subjectName])
        initialUnits[key] = SUBJECT_UNITS[subjectName];
      else if (normalizedSubjectMap[subjectNameLower])
        initialUnits[key] = normalizedSubjectMap[subjectNameLower];
    });

    setUnits(initialUnits);
    setStatus(AppStatus.SUCCESS);
    setIsModalOpen(false);
  };

  // --- CONNECT TO SERVER ---
  const connectToServer = async (): Promise<ServerNode> => {
    // 1. Try Relative/Local connection first (Best for Docker/Self-Hosted)
    const startLocal = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Attempt to hit the relative API endpoint
      const res = await fetch(`/api/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const endLocal = Date.now();
        return {
          url: "", // Empty string implies relative URL
          name: "Local / Self-Hosted",
          latency: endLocal - startLocal,
        };
      }
    } catch (e) {
      // Ignore and fall back to Railway
    }

    // 2. Fallback to Railway Production
    const startRailway = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${RAILWAY_PRODUCTION_URL}/api/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Railway instance unreachable");
      const endRailway = Date.now();

      return {
        url: RAILWAY_PRODUCTION_URL,
        name: "Railway (Production)",
        latency: endRailway - startRailway,
      };
    } catch (e) {
      console.warn("Health check failed, attempting direct connection anyway");
      return {
        url: RAILWAY_PRODUCTION_URL,
        name: "Railway (Production)",
        latency: undefined,
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !password) return;

    setStatus(AppStatus.LOADING);
    setErrorMessage("");
    setElapsedTime(0);
    setActiveServer(null);
    setQueuePosition(null);
    setIsModalOpen(true);
    setStatusMessage("Connecting to Server...");

    try {
      // 1. Benchmark / Connect
      const server = await connectToServer();
      setActiveServer(server);

      // 2. Scrape with Streaming NDJSON
      const endpoint = `${server.url}/api/scrape`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        // Keep the last part if incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);

            if (msg.type === "queue") {
              setQueuePosition(msg.position);
              setStatusMessage(msg.message);
            } else if (msg.type === "status") {
              // If we get a status update, we aren't in queue anymore (or position is 0)
              setQueuePosition(null);
              setStatusMessage(msg.message);
            } else if (msg.type === "success") {
              processGrades(msg.data);
              return; // Exit loop
            } else if (msg.type === "error") {
              throw new Error(msg.error || "An error occurred");
            }
          } catch (e) {
            console.error("Error parsing stream JSON", e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (!msg || msg === "Failed to fetch") {
        msg = "Connection dropped. Please try again.";
      }
      setErrorMessage(msg);
      setStatus(AppStatus.ERROR);
      setIsModalOpen(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      // Use active server if available, else try relative
      const baseUrl = activeServer ? activeServer.url : "";
      const targetUrl = `${baseUrl}/api/feedback`;

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackMsg,
          studentId: studentId || "Anonymous",
        }),
      });

      if (res.ok) {
        setFeedbackSuccess(true);
        setFeedbackMsg("");
        setTimeout(() => {
          setFeedbackSuccess(false);
          setShowFeedback(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Feedback error:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const groupedGrades = useMemo(() => {
    const groups: Record<string, Grade[]> = {};
    grades.forEach((g: Grade) => {
      if (!groups[g.semester]) groups[g.semester] = [];
      groups[g.semester].push(g);
    });
    return groups;
  }, [grades]);

  const sortedSemesterEntries = useMemo(() => {
    return Object.entries(groupedGrades).sort(([semA], [semB]) => {
      const a = getSemesterOrder(semA);
      const b = getSemesterOrder(semB);
      // Newest first (Descending)
      if (a.startYear !== b.startYear) return b.startYear - a.startYear;
      return b.semOrder - a.semOrder;
    });
  }, [groupedGrades]);

  const calculateGWA = (
    gradeList: Grade[],
    unitMap: Record<string, string>,
    ignoreMissing: boolean = false
  ): string => {
    let totalWeightedGrades = 0;
    let totalUnits = 0;

    for (const g of gradeList) {
      const gradeStr = g.grade.trim().toUpperCase();

      // Check for missing/invalid grades
      const isInvalid = ["N/A", "INC", "INCOMPLETE", "", "-"].includes(
        gradeStr
      );

      if (isInvalid) {
        if (ignoreMissing) continue; // Skip if we are running partial calc
        return "---"; // Return empty if strict mode
      }

      const gradeVal = parseFloat(g.grade);

      if (!isNaN(gradeVal)) {
        const key = `${g.semester}-${g.subject}`;
        const unitValStr = unitMap[key];

        if (!unitValStr || unitValStr.trim() === "" || unitValStr === "-") {
          // If unit is missing, strict mode fails. Partial mode skips.
          if (ignoreMissing) continue;
          return "---";
        }

        const unitVal = parseFloat(unitValStr);

        if (isNaN(unitVal)) {
          if (ignoreMissing) continue;
          return "---";
        }

        if (unitVal > 0) {
          totalWeightedGrades += gradeVal * unitVal;
          totalUnits += unitVal;
        }
      }
    }

    if (totalUnits === 0) return "---";
    return (totalWeightedGrades / totalUnits).toFixed(4);
  };

  const overallStats = useMemo(() => {
    // 1. Calculate Running GWA (ignoring missing)
    const runningGWAStr = calculateGWA(grades, units, true);
    // 2. Calculate Strict GWA (fail on missing) to detect if incomplete
    const strictGWAStr = calculateGWA(grades, units, false);

    const isPartial = strictGWAStr === "---" && runningGWAStr !== "---";
    const totalGWA = runningGWAStr;

    let totalUnits = 0;
    let hasDisqualification = false;

    grades.forEach((g: Grade) => {
      const u = parseFloat(units[`${g.semester}-${g.subject}`] || "0");
      if (!isNaN(u) && !isNaN(parseFloat(g.grade))) totalUnits += u;

      const gradeVal = parseFloat(g.grade);
      if (!isNaN(gradeVal) && gradeVal > 3.0) {
        hasDisqualification = true;
      }
    });

    let bestSem = "N/A",
      bestGWA = 5.0;
    Object.entries(groupedGrades).forEach(([sem, items]) => {
      const semGWAStr = calculateGWA(items, units, true);
      if (semGWAStr !== "---") {
        const semGWA = parseFloat(semGWAStr);
        if (semGWA < bestGWA) {
          bestGWA = semGWA;
          bestSem = sem;
        }
      }
    });

    return {
      totalGWA: totalGWA === "---" ? "---" : parseFloat(totalGWA).toFixed(4),
      totalUnits,
      bestSem,
      bestGWA: bestGWA === 5.0 ? "---" : bestGWA.toFixed(4),
      isPartial,
      hasDisqualification,
    };
  }, [grades, units, groupedGrades]);

  // --- ACADEMIC DISTINCTION LOGIC ---
  const distinctions = useMemo(() => {
    if (grades.length === 0) return [];

    // Sort Semesters Oldest to Newest for the loop
    const sorted = Object.keys(groupedGrades).sort((a, b) => {
      const orderA = getSemesterOrder(a);
      const orderB = getSemesterOrder(b);
      if (orderA.startYear !== orderB.startYear)
        return orderA.startYear - orderB.startYear;
      return orderA.semOrder - orderB.semOrder;
    });

    const items: {
      period: string;
      gwa: string;
      title: string;
      color: string;
    }[] = [];

    // Logic: Iterate through sorted semesters. If we find a "2nd Sem Year X", check if next is "1st Sem Year X+1"
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentSem = sorted[i];
      const nextSem = sorted[i + 1];

      const orderC = getSemesterOrder(currentSem);
      const orderN = getSemesterOrder(nextSem);

      // Check if pair is (2nd Sem, 1st Sem) and Consecutive Years
      const isConsecutivePair =
        orderC.semOrder === 2 &&
        orderN.semOrder === 1 &&
        orderN.startYear === orderC.startYear + 1;

      if (isConsecutivePair) {
        const batchGrades = [
          ...(groupedGrades[currentSem] || []),
          ...(groupedGrades[nextSem] || []),
        ];

        // Disqualification Check: No grade > 2.4
        const disqualified = batchGrades.some((g) => {
          const val = parseFloat(g.grade);
          return !isNaN(val) && val > 2.4;
        });

        if (!disqualified) {
          // Strict GWA required for awards
          const gwaStr = calculateGWA(batchGrades, units, false);
          if (gwaStr !== "---") {
            const gwa = parseFloat(gwaStr);
            if (gwa <= 1.45) {
              items.push({
                period: `${currentSem} & ${nextSem}`,
                gwa: gwaStr,
                title: "President's Lister",
                color: "from-yellow-400 to-amber-600",
              });
            } else if (gwa <= 1.75) {
              items.push({
                period: `${currentSem} & ${nextSem}`,
                gwa: gwaStr,
                title: "Dean's Lister",
                color: "from-blue-400 to-indigo-600",
              });
            }
          }
        }
      }
    }

    // Reverse to show Newest First in UI
    return items.reverse();
  }, [groupedGrades, units, grades]);

  // --- LATIN HONOR FORECASTING ---
  const honorForecasts = useMemo(() => {
    if (overallStats.totalGWA === "---") return [];

    const currentGWA = parseFloat(overallStats.totalGWA);
    const currentUnits = overallStats.totalUnits;
    const totalUnitsProjected = currentUnits + remainingUnits;

    const honors = [
      {
        name: "Summa Cum Laude",
        cutoff: 1.25,
        color: "text-yellow-600",
        bg: "bg-yellow-50 border-yellow-200",
      },
      {
        name: "Magna Cum Laude",
        cutoff: 1.45,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-200",
      },
      {
        name: "Cum Laude",
        cutoff: 1.75,
        color: "text-emerald-600",
        bg: "bg-emerald-50 border-emerald-200",
      },
    ];

    return honors.map((h) => {
      if (overallStats.hasDisqualification) {
        return {
          ...h,
          status: "Disqualified",
          needed: 0,
          probability: 0,
          msg: "Grade > 3.0 detected",
        };
      }
      if (currentGWA <= h.cutoff) {
        return {
          ...h,
          status: "On Track",
          needed: h.cutoff,
          probability: 98,
          msg: "Maintain current performance",
        };
      }
      if (remainingUnits <= 0) {
        return {
          ...h,
          status: "Impossible",
          needed: 0,
          probability: 0,
          msg: "Mathematical limit reached",
        };
      }

      // Formula: (CurrentGWA * CurrentUnits + RequiredGrade * RemainingUnits) / TotalUnits <= Cutoff
      // RequiredGrade <= (Cutoff * TotalUnits - CurrentGWA * CurrentUnits) / RemainingUnits
      const maxTotalPoints = h.cutoff * totalUnitsProjected;
      const currentPoints = currentGWA * currentUnits;
      const requiredGrade = (maxTotalPoints - currentPoints) / remainingUnits;

      let prob = 0;
      let status = "";

      if (requiredGrade < 1.0) {
        (status = "Impossible"), (prob = 0);
      } else if (requiredGrade <= 1.1) {
        (status = "Near Impossible"), (prob = 5);
      } else if (requiredGrade <= 1.25) {
        (status = "Very Hard"), (prob = 25);
      } else if (requiredGrade <= 1.5) {
        (status = "Challenging"), (prob = 50);
      } else if (requiredGrade <= 1.75) {
        (status = "Possible"), (prob = 75);
      } else if (requiredGrade <= 2.25) {
        (status = "Likely"), (prob = 90);
      } else {
        (status = "Very Likely"), (prob = 99);
      }

      return {
        ...h,
        status,
        needed: requiredGrade.toFixed(2),
        probability: prob,
        msg:
          requiredGrade < 1.0
            ? "Requires > 1.0 avg"
            : `Need avg grade of ${requiredGrade.toFixed(2)}`,
      };
    });
  }, [overallStats, remainingUnits]);

  const handleUnitChange = (semester: string, subject: string, val: string) => {
    setUnits((prev) => ({ ...prev, [`${semester}-${subject}`]: val }));
  };

  const handleExport = () => {
    // CSV Header
    const csvRows = [["Semester", "Subject", "Grade", "Equivalent", "Units"]];

    // Data
    sortedSemesterEntries.forEach(([semester, items]) => {
      items.forEach((g) => {
        const unit = units[`${g.semester}-${g.subject}`] || "0";
        // Escape quotes for CSV
        const safeSubject = `"${g.subject.replace(/"/g, '""')}"`;
        // Wrap semester in quotes to prevent date parsing issues in Excel
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
      `ibu_grade_export_${studentId || "history"}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full flex items-start md:items-center justify-center p-4 relative overflow-y-auto font-sans">
      {/* Background Orbs */}
      <div className="fixed top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main GlassCard - Mobile Optimized Height */}
      <GlassCard className="w-full max-w-5xl h-auto md:h-[85vh] min-h-0 md:min-h-[600px] flex flex-col md:flex-row overflow-hidden md:overflow-hidden relative z-10 border border-white shadow-xl rounded-[24px] my-4 md:my-0">
        {/* SIDEBAR */}
        <div className="w-full md:w-[320px] p-6 border-b md:border-b-0 md:border-r border-white/40 flex flex-col bg-white/40 backdrop-blur-xl shrink-0">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-[12px] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <IoSchool size={20} />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                iBU Sync
              </h1>
            </div>
            <p className="text-xs font-bold text-slate-500 opacity-60 uppercase tracking-widest pl-1">
              Academic Hub
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="Student Number"
              icon={<IoPerson size={16} />}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={status === AppStatus.LOADING}
            />
            <Input
              type="password"
              placeholder="Password"
              icon={<IoKey size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === AppStatus.LOADING}
            />

            {status === AppStatus.ERROR && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <IoCloseCircle size={16} />
                  <span className="text-[10px] font-bold">{errorMessage}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status === AppStatus.LOADING}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-[0.97]"
            >
              {status === AppStatus.LOADING ? (
                <IoSyncOutline className="animate-spin" size={18} />
              ) : (
                <>
                  SYNC NOW <IoRocket />
                </>
              )}
            </button>
          </form>

          <div className="mt-auto pt-6 border-t border-white/40 space-y-2">
            <button
              onClick={() => setShowGradingScale(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <IoBook size={14} /> Grading Scale
              </span>
              <IoChevronForward />
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <IoShieldCheckmarkOutline size={14} /> Data Privacy
              </span>
              <IoChevronForward />
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <IoChatboxEllipsesOutline size={14} /> Send Feedback
              </span>
              <IoChevronForward />
            </button>

            <div className="flex items-center justify-between text-[10px] font-black p-3 rounded-xl bg-white/50 border border-white mt-4">
              <div className="flex flex-col">
                <span className="text-slate-400 uppercase tracking-tighter">
                  dev by
                </span>
                <span className="text-blue-600 text-xs">HANTECK</span>
              </div>
              <a
                href="https://hanteck.online"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <IoGlobeOutline size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* CONTENT AREA - Mobile: Allow Body Scroll by removing fixed height constraints from parent (above) and using md:overflow-y-auto here */}
        <div className="flex-1 p-6 md:p-8 bg-white/20 md:overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Academic History
            </h2>
            {status === AppStatus.SUCCESS && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="p-3 rounded-xl bg-white hover:bg-slate-50 text-blue-600 shadow-md active:scale-[0.97] transition-all"
                  title="Export to Excel/CSV"
                >
                  <IoDownloadOutline size={18} />
                </button>
                <button
                  onClick={() => {
                    setGrades([]);
                    setStatus(AppStatus.IDLE);
                    setStudentId("");
                    setPassword("");
                  }}
                  className="p-3 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-md active:scale-[0.97]"
                >
                  <IoRefresh size={18} />
                </button>
              </div>
            )}
          </div>

          {/* GWA Calculation Notice */}
          {status === AppStatus.SUCCESS && (
            <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
              <div className="text-blue-600 mt-0.5 shrink-0 bg-white rounded-full p-1 shadow-sm">
                <IoInformationCircleOutline size={22} />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide mb-1">
                  Calculation Required
                </h4>
                <p className="text-xs text-blue-800/80 font-medium leading-relaxed">
                  Some subjects do not have units assigned automatically. Please{" "}
                  <strong>enter the units</strong> manually for each subject in
                  the list below to generate your GWA.
                </p>
              </div>
            </div>
          )}

          {status === AppStatus.SUCCESS && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 mb-6 space-y-6">
              {/* MAIN STATS GRID */}
              <div className="grid grid-cols-3 gap-3">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
                  {/* Shine Effect */}
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
                    {overallStats.isPartial && (
                      <div className="flex items-center gap-1 text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-md mb-1 animate-pulse">
                        <IoAlertCircleOutline /> Partial
                      </div>
                    )}
                  </div>
                  {overallStats.isPartial && (
                    <p className="text-[9px] opacity-70 mt-1 font-medium">
                      Subject to change (Incomplete)
                    </p>
                  )}
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

              {/* LATIN HONOR FORECAST */}
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
                      Remaining Units
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
                      className={`flex items-center justify-between p-3 rounded-xl border ${h.bg}`}
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
                          className={`
                                     px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide
                                     ${
                                       h.status.includes("Impossible") ||
                                       h.status.includes("Disqualified")
                                         ? "bg-red-100 text-red-600"
                                         : h.status === "Possible" ||
                                           h.status === "Likely" ||
                                           h.status === "Very Likely"
                                         ? "bg-emerald-100 text-emerald-600"
                                         : "bg-orange-100 text-orange-600"
                                     }
                                 `}
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

              {/* ACADEMIC DISTINCTIONS LIST */}
              {distinctions.length > 0 && (
                <div className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <IoRibbon size={18} className="text-yellow-500" />
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Consecutive Awards
                    </h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x custom-scrollbar">
                    {distinctions.map((d, i) => (
                      <div
                        key={i}
                        className={`
                          snap-center shrink-0 w-[260px] p-5 rounded-2xl text-white shadow-lg relative overflow-hidden
                          bg-gradient-to-br ${d.color}
                        `}
                      >
                        {/* Decorative shine */}
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

          <div className="space-y-4">
            {sortedSemesterEntries.map(([semester, items]) => {
              // Semester GWA ignores missing to show current standing
              const semGWAStr = calculateGWA(items, units, true);
              const strictSemGWA = calculateGWA(items, units, false);
              const isSemPartial =
                strictSemGWA === "---" && semGWAStr !== "---";

              // Per-Semester Distinction Check (assuming no grade > 2.4 logic applies here too for consistency, or just >3.0)
              // Usually DL per sem is just based on GWA and no failing grades.
              let semDistinction = null;
              if (semGWAStr !== "---") {
                const gwa = parseFloat(semGWAStr);
                // Check for failing or low grades
                const hasLowGrade = items.some((g) => {
                  const v = parseFloat(g.grade);
                  return !isNaN(v) && v > 3.0;
                });
                if (!hasLowGrade) {
                  if (gwa <= 1.45)
                    semDistinction = {
                      label: "President's Lister Qualifier",
                      color: "bg-yellow-100 text-yellow-700",
                    };
                  else if (gwa <= 1.75)
                    semDistinction = {
                      label: "Dean's Lister Qualifier",
                      color: "bg-blue-100 text-blue-700",
                    };
                }
              }

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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ml-10 ${semDistinction.color}`}
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

                      {expandedSemesters[semester] ? (
                        <IoChevronDown size={18} className="text-slate-400" />
                      ) : (
                        <IoChevronForward
                          size={18}
                          className="text-slate-400"
                        />
                      )}
                    </div>
                  </button>

                  {expandedSemesters[semester] && (
                    <div className="px-4 pb-4 space-y-2">
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
                                  e.target.value
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
                    </div>
                  )}
                </div>
              );
            })}

            {status === AppStatus.IDLE && (
              <div className="h-[350px] flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-inner">
                  <IoSyncOutline
                    size={32}
                    className="opacity-20 animate-pulse"
                  />
                </div>
                <p className="font-black text-lg text-slate-600 uppercase tracking-widest">
                  Ready to Sync
                </p>
                <p className="text-xs font-medium opacity-50 mt-1 max-w-[200px] text-center">
                  Enter your credentials to load history and calculate GWA.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MODALS (Grading Scale, Privacy, Feedback) */}
        {showGradingScale && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-3xl z-30 p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <IoBook className="text-blue-600" /> Grading Reference
                </h2>
                <button
                  onClick={() => setShowGradingScale(false)}
                  className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-800"
                >
                  <IoChevronDown size={20} />
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-2">Rating</th>
                    <th className="py-3 px-2">Grade</th>
                    <th className="py-3 px-2 text-right">Equiv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {GRADING_SCALE.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="py-3 px-2 font-bold text-slate-700">
                        {item.rating}
                      </td>
                      <td className="py-3 px-2 font-black text-blue-600">
                        {item.grade}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-500 font-bold">
                        {item.eq}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showPrivacy && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-3xl z-30 p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <IoShieldCheckmarkOutline className="text-blue-600" /> Data
                  Privacy Policy
                </h2>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-800"
                >
                  <IoChevronDown size={20} />
                </button>
              </div>
              <div className="space-y-6 text-slate-600">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                      <IoLockClosedOutline size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-sm mb-1">
                        We respect your privacy
                      </h3>
                      <p className="text-xs text-blue-700/80 leading-relaxed">
                        Your data is handled with maximum security using
                        ephemeral sessions.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <IoEyeOffOutline
                      size={24}
                      className="text-slate-400 mt-1"
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        No Password Storage
                      </h4>
                      <p className="text-xs mt-1">
                        Passwords are never saved in any database.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <IoServerOutline
                      size={24}
                      className="text-slate-400 mt-1"
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        Data Handling
                      </h4>
                      <p className="text-xs mt-1">
                        Records exist only for the duration of your browser
                        session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFeedback && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-3xl z-30 p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <IoChatboxEllipsesOutline className="text-blue-600" /> Send
                  Feedback
                </h2>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-800"
                >
                  <IoChevronDown size={20} />
                </button>
              </div>

              {feedbackSuccess ? (
                <div className="p-8 bg-green-50 border border-green-100 rounded-3xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/30">
                    <IoCheckmarkCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-green-800 mb-2">
                    Thank You!
                  </h3>
                  <p className="text-sm text-green-700 font-medium">
                    Your feedback helps us improve iBU Sync.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                      Found a bug? Have a feature request? Or just want to say
                      hi? We'd love to hear from you.
                    </p>
                  </div>
                  <div>
                    <textarea
                      className="w-full h-40 p-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none text-sm font-medium text-slate-700"
                      placeholder="Type your message here..."
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackMsg.trim()}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                  >
                    {isSubmittingFeedback ? (
                      <IoSyncOutline className="animate-spin" size={20} />
                    ) : (
                      <>
                        Send Message <IoSend />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* SYNCING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full text-center shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                {queuePosition ? (
                  <span className="font-black text-xl">#{queuePosition}</span>
                ) : (
                  <IoSyncOutline size={32} />
                )}
              </div>
            </div>

            <h2 className="text-lg font-black text-slate-800 mb-1">
              {queuePosition ? "Queued" : "Synchronizing"}
            </h2>

            <div className="flex items-center justify-center gap-2 mb-6 text-blue-600/80">
              <IoTimeOutline size={14} />
              <span className="font-mono text-sm font-bold">
                {formatDuration(elapsedTime)}
              </span>
            </div>

            {/* Status Message */}
            <div className="mb-6 p-3 bg-blue-50 rounded-xl border border-blue-100 min-h-[60px] flex items-center justify-center">
              <p className="text-xs font-bold text-blue-600 tracking-wide animate-pulse leading-snug">
                {statusMessage}
              </p>
            </div>

            <div className="space-y-3">
              <Step
                label="Queue / Connect"
                active={elapsedTime < 3 && !queuePosition}
                done={!!queuePosition || elapsedTime >= 3}
              />
              <Step
                label="Authenticating"
                active={!queuePosition && elapsedTime >= 3 && elapsedTime < 30}
                done={elapsedTime >= 30}
              />
              <Step
                label="Extracting Grades"
                active={!queuePosition && elapsedTime >= 30}
                done={false}
              />
            </div>

            {activeServer && (
              <div className="mt-8 pt-4 border-t border-slate-100 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <IoServerOutline />
                    <span className="font-bold">{activeServer.name}</span>
                  </div>
                  {activeServer.latency && (
                    <div className="flex items-center gap-1 text-emerald-500 font-mono font-bold">
                      <IoFlashOutline />
                      {activeServer.latency}ms
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface StepProps {
  label: string;
  active: boolean;
  done: boolean;
}

const Step: React.FC<StepProps> = ({ label, active, done }) => (
  <div
    className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-500 ${
      active
        ? "bg-blue-600 text-white shadow-lg translate-x-1"
        : "bg-slate-50 opacity-40"
    }`}
  >
    {done ? (
      <IoCheckmarkCircle size={20} className="text-emerald-400" />
    ) : (
      <div
        className={`w-5 h-5 rounded-full border-2 ${
          active
            ? "border-white border-t-transparent animate-spin"
            : "border-slate-300"
        }`}
      ></div>
    )}
    <span className="text-[10px] font-black uppercase tracking-widest">
      {label}
    </span>
  </div>
);

export default App;
