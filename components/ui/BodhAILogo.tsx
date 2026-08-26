import React from "react";

interface BodhAILogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function BodhAILogo({ size = "md", showText = true, className = "" }: BodhAILogoProps) {
  const iconSizes = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Distinctive BodhAI 'B' Symbol */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-[#162033] to-[#0B1220] border border-[#263244] rounded-lg flex items-center justify-center font-bold tracking-tight text-[#F8FAFC] shadow-sm relative overflow-hidden group`}
      >
        <div className="absolute inset-0 bg-[#F59E0B]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 font-mono text-[#F59E0B]">B</span>
      </div>

      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight text-foreground`}>
          Bodh<span className="text-[#F59E0B]">AI</span>
        </span>
      )}
    </div>
  );
}
