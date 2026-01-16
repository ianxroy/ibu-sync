import React, { useState } from "react";
import {
  IoBook,
  IoChevronDown,
  IoShieldCheckmarkOutline,
  IoLockClosedOutline,
  IoEyeOffOutline,
  IoServerOutline,
  IoChatboxEllipsesOutline,
  IoCheckmarkCircle,
  IoSend,
  IoSyncOutline,
} from "react-icons/io5";
import { GlassCard } from "./components/ui/GlassCard";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { StatusModal } from "./components/StatusModal";
import { useScraper } from "./hooks/useScraper";
import { GRADING_SCALE } from "./utils/constants";

const App: React.FC = () => {
  const [studentId, setStudentId] = useState<string>("");
  const [showGradingScale, setShowGradingScale] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] =
    useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [formKey, setFormKey] = useState<number>(0);

  // Custom Hooks
  const {
    status,
    grades,
    units,
    setUnits,
    errorMessage,
    statusMessage,
    elapsedTime,
    activeServer,
    queuePosition,
    isModalOpen,
    loginAndScrape,
    reset,
    activeServerUrl,
  } = useScraper();

  const handleLogin = (
    id: string,
    pass: string,
    captchaToken: string | null
  ) => {
    setStudentId(id);
    loginAndScrape(id, pass, captchaToken);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const baseUrl = activeServerUrl || "";
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

  const handleReset = () => {
    reset();
    setStudentId("");
    setFormKey((p) => p + 1);
  };

  return (
    <div className="min-h-screen w-full flex items-start md:items-center justify-center p-4 relative overflow-y-auto font-sans">
      <div className="fixed top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <GlassCard className="w-full max-w-5xl h-auto md:h-[85vh] min-h-0 md:min-h-[600px] flex flex-col md:flex-row overflow-hidden md:overflow-hidden relative z-10 border border-white shadow-xl rounded-[24px] my-4 md:my-0">
        <Sidebar
          status={status}
          errorMessage={errorMessage}
          onLogin={handleLogin}
          onShowGradingScale={() => setShowGradingScale(true)}
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowFeedback={() => setShowFeedback(true)}
          formKey={formKey}
        />

        <Dashboard
          status={status}
          grades={grades}
          units={units}
          studentId={studentId}
          onUnitsChange={setUnits}
          onReset={handleReset}
        />

        {/* --- MODALS (Consider moving these to separate files if they grow larger) --- */}

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

      {isModalOpen && (
        <StatusModal
          queuePosition={queuePosition}
          elapsedTime={elapsedTime}
          statusMessage={statusMessage}
          activeServer={activeServer}
        />
      )}
    </div>
  );
};

export default App;
