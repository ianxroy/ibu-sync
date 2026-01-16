import React, { useState } from "react";
import {
  IoSchool,
  IoBook,
  IoShieldCheckmarkOutline,
  IoChatboxEllipsesOutline,
  IoChevronForward,
  IoGlobeOutline,
  IoGitBranchOutline,
} from "react-icons/io5";
import { LoginForm } from "./LoginForm";
import { AppStatus } from "../types";

interface SidebarProps {
  status: AppStatus;
  errorMessage: string;
  onLogin: (id: string, pass: string, captchaToken: string | null) => void;
  onShowGradingScale: () => void;
  onShowPrivacy: () => void;
  onShowFeedback: () => void;
  onShowVersions: () => void;
  formKey: number; // Used to reset form
}

export const Sidebar: React.FC<SidebarProps> = ({
  status,
  errorMessage,
  onLogin,
  onShowGradingScale,
  onShowPrivacy,
  onShowFeedback,
  onShowVersions,
  formKey,
}) => {
  return (
    <div className="w-full md:w-[360px] p-6 border-b md:border-b-0 md:border-r border-white/40 flex flex-col bg-white/40 backdrop-blur-xl shrink-0">
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

      <LoginForm
        key={formKey}
        onSubmit={onLogin}
        status={status}
        errorMessage={errorMessage}
      />

      <div className="mt-auto pt-6 border-t border-white/40 space-y-2">
        <button
          onClick={onShowGradingScale}
          className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
        >
          <span className="flex items-center gap-2">
            <IoBook size={14} /> Grading Scale
          </span>
          <IoChevronForward />
        </button>
        <button
          onClick={onShowPrivacy}
          className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
        >
          <span className="flex items-center gap-2">
            <IoShieldCheckmarkOutline size={14} /> Data Privacy
          </span>
          <IoChevronForward />
        </button>
        <button
          onClick={onShowFeedback}
          className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
        >
          <span className="flex items-center gap-2">
            <IoChatboxEllipsesOutline size={14} /> Send Feedback
          </span>
          <IoChevronForward />
        </button>
        <button
          onClick={onShowVersions}
          className="w-full py-3 px-4 rounded-xl bg-white/60 border border-white text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-between hover:bg-white shadow-sm transition-all"
        >
          <span className="flex items-center gap-2">
            <IoGitBranchOutline size={14} /> Version History
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
  );
};
