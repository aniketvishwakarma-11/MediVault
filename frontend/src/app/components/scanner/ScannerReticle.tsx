"use client";

import React from "react";

export type ReticleFormat = "A4" | "RX";

interface ScannerReticleProps {
  format: ReticleFormat;
  isSteady: boolean;
  lightingState: "LOW" | "OPTIMAL" | "GLARE";
}

export const ScannerReticle: React.FC<ScannerReticleProps> = ({
  format,
  isSteady,
  lightingState,
}) => {
  // A4 aspect ratio is 1:1.414 (width:height in portrait)
  // Rx slip aspect ratio is approx 1.3:1 (slightly wider)
  const isA4 = format === "A4";

  // Reticle border color depending on steady / lighting state
  const borderColor =
    !isSteady
      ? "border-amber-400"
      : lightingState === "OPTIMAL"
      ? "border-emerald-400"
      : "border-cyan-400";

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6 sm:p-10">
      {/* Outer Dark Vignette / Dimmed Mask */}
      <div
        className={`relative w-full max-w-sm sm:max-w-md transition-all duration-300 ${
          isA4 ? "aspect-[1/1.414]" : "aspect-[1.3/1]"
        }`}
      >
        {/* Subtle inner box shadow to mask around the reticle */}
        <div className="absolute -inset-100 bg-black/40 backdrop-blur-[1px] pointer-events-none" />

        {/* The Document Framing Box */}
        <div
          className={`relative w-full h-full rounded-2xl border-2 border-dashed ${
            isSteady ? "border-white/40" : "border-amber-400/60"
          } bg-transparent overflow-hidden shadow-2xl transition-colors duration-200`}
        >
          {/* Neon Corner Brackets (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
          <div
            className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-200 ${borderColor}`}
          />
          <div
            className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-200 ${borderColor}`}
          />
          <div
            className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-200 ${borderColor}`}
          />
          <div
            className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl transition-colors duration-200 ${borderColor}`}
          />

          {/* Center Crosshair / Alignment Guide */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            <div className="w-12 h-[1px] bg-white" />
            <div className="h-12 w-[1px] bg-white absolute" />
          </div>

          {/* Animated Clinical Scanner Line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />

          {/* Watermark Framing Note */}
          <div className="absolute bottom-3 inset-x-0 text-center">
            <span className="px-3 py-1 rounded-full bg-black/60 text-white/80 text-[10px] font-mono uppercase tracking-wider backdrop-blur-md">
              {isA4 ? "Fit A4 Document Page" : "Fit Prescription Slip"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
