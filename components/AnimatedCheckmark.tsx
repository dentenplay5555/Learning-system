"use client";

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

export default function AnimatedCheckmark({
  size = 56,
  className = "",
}: AnimatedCheckmarkProps) {
  return (
    <div
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Soft background pulse aura */}
        <circle
          cx="28"
          cy="28"
          r="26"
          className="fill-emerald-500/10 stroke-emerald-500/20"
          strokeWidth="1.5"
        />

        {/* Animated outer stroke circle */}
        <circle
          cx="28"
          cy="28"
          r="22"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-emerald-400 stroke-circle-animate"
          style={{
            strokeDasharray: 140,
            strokeDashoffset: 140,
            transformOrigin: "center",
            transform: "rotate(-90deg)",
          }}
        />

        {/* Animated checkmark icon */}
        <path
          d="M18 28.5L25 35.5L38 21.5"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400 stroke-check-animate"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
          }}
        />
      </svg>
    </div>
  );
}
