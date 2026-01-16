import React, { useState } from "react";
import {
  IoPerson,
  IoKey,
  IoRocket,
  IoSyncOutline,
  IoCloseCircle,
} from "react-icons/io5";
import { Input } from "./ui/Input";
import { AppStatus } from "../types";

interface LoginFormProps {
  onSubmit: (studentId: string, password: string) => void;
  status: AppStatus;
  errorMessage?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  status,
  errorMessage,
}) => {
  const [localStudentId, setLocalStudentId] = useState("");
  const [localPassword, setLocalPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localStudentId && localPassword) {
      onSubmit(localStudentId, localPassword);
    }
  };

  const isLoading = status === AppStatus.LOADING;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Student Number"
        icon={<IoPerson size={16} />}
        value={localStudentId}
        onChange={(e) => setLocalStudentId(e.target.value)}
        disabled={isLoading}
      />
      <Input
        type="password"
        placeholder="Password"
        icon={<IoKey size={16} />}
        value={localPassword}
        onChange={(e) => setLocalPassword(e.target.value)}
        disabled={isLoading}
      />

      {status === AppStatus.ERROR && errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <IoCloseCircle size={16} />
            <span className="text-[10px] font-bold leading-tight">
              {errorMessage}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !localStudentId || !localPassword}
        className={`
          w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm 
          transition-all flex items-center justify-center gap-2 
          shadow-lg shadow-blue-500/30 active:scale-[0.97]
          ${
            isLoading || !localStudentId || !localPassword
              ? "opacity-70 cursor-not-allowed"
              : "hover:bg-blue-700"
          }
        `}
      >
        {isLoading ? (
          <IoSyncOutline className="animate-spin" size={18} />
        ) : (
          <>
            SYNC NOW <IoRocket />
          </>
        )}
      </button>
    </form>
  );
};
