import React from 'react';
import { Grade } from '../types';
import { IoBookOutline, IoTimeOutline } from 'react-icons/io5';

interface GradeItemProps {
  grade: Grade;
}

export const GradeItem: React.FC<GradeItemProps> = ({ grade }) => {
  // Determine color based on grade (assuming numerical 1.0 - 5.0 or similar)
  // Just a visual touch
  const getGradeColor = (g: string) => {
    const num = parseFloat(g);
    if (isNaN(num)) return 'text-slate-800'; // Non-numeric
    if (num <= 1.5) return 'text-emerald-600'; // Excellence
    if (num <= 2.5) return 'text-blue-600'; // Good
    if (num <= 3.0) return 'text-amber-600'; // Pass
    return 'text-red-600'; // Fail/Low
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/40 mb-3 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform duration-300">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
          <IoTimeOutline />
          <span>{grade.semester}</span>
        </div>
        <div className="flex items-start space-x-2">
          <div className="mt-1 text-slate-400 shrink-0">
             <IoBookOutline />
          </div>
          <h3 className="font-semibold text-slate-800 truncate leading-tight">
            {grade.subject}
          </h3>
        </div>
      </div>
      <div className={`
        flex items-center justify-center 
        w-14 h-14 
        rounded-2xl 
        bg-white/80 
        shadow-inner 
        text-lg font-bold 
        ${getGradeColor(grade.grade)}
      `}>
        {grade.grade}
      </div>
    </div>
  );
};