import React from "react";
import {
  IoRocket,
  IoClose,
  IoCheckmarkCircle,
  IoFlash,
  IoShieldCheckmark,
  IoDownload,
} from "react-icons/io5";
import { LATEST_VERSION } from "../utils/versions";

interface WhatsNewModalProps {
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose }) => {
  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("speed")) return <IoFlash className="text-amber-500" />;
    if (l.includes("security"))
      return <IoShieldCheckmark className="text-emerald-500" />;
    if (l.includes("features")) return <IoDownload className="text-blue-500" />;
    return <IoCheckmarkCircle className="text-indigo-500" />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden border border-white/50 relative animate-in zoom-in-95 duration-300">
        {/* Header Graphic */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-24 h-24 bg-blue-400/30 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                What's New !
              </div>
              <div className="bg-indigo-500/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                v{LATEST_VERSION.version}
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              {LATEST_VERSION.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            {LATEST_VERSION.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm shrink-0">
                  {getIcon(feat.label)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-0.5">
                    {feat.label}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
          >
            Got it <IoRocket />
          </button>
        </div>

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <IoClose size={20} />
        </button>
      </div>
    </div>
  );
};
