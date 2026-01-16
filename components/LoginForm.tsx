import React, { useState } from "react";
import {
  IoPerson,
  IoKey,
  IoRocket,
  IoSyncOutline,
  IoCloseCircle,
} from "react-icons/io5";
import ReCAPTCHA from "react-google-recaptcha";
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // CRITICAL RECAPTCHA CONFIGURATION
  // ---------------------------------------------------------------------------
  // The error "Invalid key type" occurs if you use a V3 key with a V2 widget.
  // This component renders a V2 Checkbox widget.
  //
  // 1. Google Standard Test Key (V2 Checkbox): "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
  //    - This ALWAYS works for development. It shows a warning overlay but functions correctly.
  //
  // 2. If using your own key:
  //    - Go to https://www.google.com/recaptcha/admin
  //    - Select "v2" -> "I'm not a robot" Checkbox.
  //    - DO NOT select v3.
  // ---------------------------------------------------------------------------

  const SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localStudentId && localPassword && captchaToken) {
      onSubmit(localStudentId, localPassword, captchaToken);
    }
  };

  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
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

      <div className="flex justify-center py-2">
        <ReCAPTCHA
          sitekey={SITE_KEY}
          onChange={onCaptchaChange}
          size="compact"
          theme="light"
        />
      </div>

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
        disabled={
          isLoading || !localStudentId || !localPassword || !captchaToken
        }
        className={`
          w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm 
          transition-all flex items-center justify-center gap-2 
          shadow-lg shadow-blue-500/30 active:scale-[0.97]
          ${
            isLoading || !localStudentId || !localPassword || !captchaToken
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
