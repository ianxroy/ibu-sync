import React from "react";
import {
  IoSyncOutline,
  IoTimeOutline,
  IoCheckmarkCircle,
  IoServerOutline,
  IoFlashOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { ServerNode } from "../hooks/useScraper";
import { formatDuration } from "../utils/helpers";

interface StatusModalProps {
  queuePosition: number | null;
  elapsedTime: number;
  statusMessage: string;
  activeServer: ServerNode | null;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  queuePosition,
  elapsedTime,
  statusMessage,
  activeServer,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
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
        <div className="mb-6 p-3 bg-blue-50 rounded-xl border border-blue-100 min-h-[60px] flex items-center justify-center">
          <p className="text-xs font-bold text-blue-600 tracking-wide animate-pulse leading-snug">
            {statusMessage}
          </p>
        </div>

        {/* Long Wait Hint */}
        {elapsedTime > 15 && (
          <div className="mb-6 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-left animate-in slide-in-from-top-2">
            <IoRefreshOutline className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 font-medium leading-tight">
              Taking longer than usual? Try{" "}
              <span
                className="font-bold underline cursor-pointer"
                onClick={() => window.location.reload()}
              >
                refreshing
              </span>{" "}
              the page if it gets stuck.
            </p>
          </div>
        )}

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
  );
};

const Step: React.FC<{ label: string; active: boolean; done: boolean }> = ({
  label,
  active,
  done,
}) => (
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
