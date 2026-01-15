import React, { InputHTMLAttributes } from 'react';
import { IoAlertCircle } from 'react-icons/io5';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ icon, error, className = '', ...props }) => {
  return (
    <div className="relative w-full group">
      <div className={`
        absolute left-4 top-1/2 -translate-y-1/2 
        text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300
        text-xl
      `}>
        {icon}
      </div>
      <input
        className={`
          w-full 
          bg-white/50 backdrop-blur-md
          border 
          ${error ? 'border-red-400 focus:border-red-500' : 'border-white/40 focus:border-blue-500/50'}
          rounded-2xl 
          pl-12 pr-4 py-4
          text-slate-800 placeholder-slate-400 font-medium
          outline-none
          transition-all duration-300
          focus:bg-white/80 focus:scale-[1.01]
          text-base md:text-sm
          ${className}
        `}
        style={{ fontSize: '16px' }} // Explicit inline style to guarantee no zoom on iOS
        {...props}
      />
      {error && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
          <IoAlertCircle size={20} />
        </div>
      )}
    </div>
  );
};