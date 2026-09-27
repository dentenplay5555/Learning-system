"use client";

import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({
  target,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let frameId: number;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easeOutCubic curve (starts fast, settles gently)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = easeOut * target;

      setCurrentValue(val);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCurrentValue(target);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [target, duration]);

  const formatted = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue).toString();

  return (
    <span className={`inline-block tabular-nums font-bold ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
