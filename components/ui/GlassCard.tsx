import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  transparency?: 'high' | 'medium' | 'low';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  transparency = 'high' 
}) => {
  const bgMap = {
    high: 'bg-white/85',
    medium: 'bg-white/70',
    low: 'bg-white/40'
  };

  return (
    <div className={`
      backdrop-blur-xl 
      ${bgMap[transparency]} 
      border border-white/40 
      shadow-2xl shadow-black/5
      rounded-[32px] 
      ${className}
    `}>
      {children}
    </div>
  );
};