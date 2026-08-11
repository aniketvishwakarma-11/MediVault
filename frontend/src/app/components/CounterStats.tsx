"use client";

import { useEffect, useRef, useState } from "react";

interface CounterStatsProps {
  stats?: {
    value: number;
    suffix: string;
    label: string;
  }[];
}

const defaultStats = [
  { value: 100, suffix: "K+", label: "Encrypted Records" },
  { value: 99, suffix: ".99%", label: "Uptime & Availability" },
  { value: 50, suffix: "ms", label: "ZKP Verification Time" },
  { value: 100, suffix: "%", label: "HIPAA & FHIR Compliant" },
];

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function CounterStats({ stats = defaultStats }: CounterStatsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<number[]>(stats.map(() => 0));
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateCounters();
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function animateCounters() {
    const duration = 2000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setCounts(stats.map((stat) => Math.round(stat.value * easedProgress)));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center"
    >
      {stats.map((stat, i) => (
        <div key={i} className="space-y-1.5 p-4 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="font-heading text-3xl sm:text-4xl font-extrabold text-[#0891B2] tracking-tight">
            {counts[i].toLocaleString()}
            {stat.suffix}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
