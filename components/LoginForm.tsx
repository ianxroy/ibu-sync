import React, { useState, useCallback } from "react";
import {
  IoPerson,
  IoKey,
  IoRocket,
  IoSyncOutline,
  IoCloseCircle,
} from "react-icons/io5";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Input } from "./ui/Input";
import { AppStatus } from "../types";

interface LoginFormProps {
  onSubmit: (
    studentId: string,
    password: string,
    captchaToken: string | null
  ) => void;
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

  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!localStudentId || !localPassword) return;

      if (!executeRecaptcha) {
        console.error("ReCAPTCHA not available");
        // Optionally handle this case, but usually we just wait or fail
        onSubmit(localStudentId, localPassword, null);
        return;
      }

      try {
        const token = await executeRecaptcha("login");
        onSubmit(localStudentId, localPassword, token);
      } catch (err) {
        console.error("ReCAPTCHA Execution Failed:", err);
        // Pass null token to let backend handle the error/rejection
        onSubmit(localStudentId, localPassword, null);
      }
    },
    [executeRecaptcha, localStudentId, localPassword, onSubmit]
  );

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

      <div className="text-[10px] text-slate-400 text-center opacity-60 px-4 leading-tight">
        This site is protected by reCAPTCHA and the Google
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline"
        >
          {" "}
          Privacy Policy
        </a>{" "}
        and
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline"
        >
          {" "}
          Terms of Service
        </a>{" "}
        apply.
      </div>
    </form>
  );
};
