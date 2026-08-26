import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showWordmark = true,
  className = "",
}) => {
  const dimensions = {
    sm: { icon: 22, text: "text-base" },
    md: { icon: 28, text: "text-xl" },
    lg: { icon: 36, text: "text-2xl" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200 hover:scale-105"
        >
          {/* Outer glowing background ring */}
          <rect
            width="36"
            height="36"
            rx="10"
            className="fill-accent text-accent"
          />
          {/* Stylized 'B' + Neural Node + Knowledge Spark lines */}
          <path
            d="M10 9H18.5C21 9 22.5 10.2 22.5 12.2C22.5 13.8 21.4 14.8 19.8 15.3C21.8 15.8 23 17 23 19C23 21.3 21.2 22.5 18.2 22.5H10V9Z"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 15.5H18.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Knowledge spark / neural node */}
          <circle cx="26" cy="10" r="2.5" fill="#F43F5E" />
          <path
            d="M23 12L25 10.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <span
          className={`font-semibold tracking-tight ${dimensions.text} font-sans`}
        >
          Bodh<span className="text-accent font-bold">AI</span>
        </span>
      )}
    </div>
  );
};
