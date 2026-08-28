"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles, RotateCw, Check, Undo2, Contrast, SunMedium, FileText, Image as ImageIcon } from "lucide-react";

export type FilterMode = "BINARIZED" | "MAGIC_COLOR" | "GRAYSCALE" | "ORIGINAL";

interface ImageEnhancementCanvasProps {
  rawImageDataUrl: string;
  onConfirm: (processedDataUrl: string) => void;
  onRetake: () => void;
}

export const ImageEnhancementCanvas: React.FC<ImageEnhancementCanvasProps> = ({
  rawImageDataUrl,
  onConfirm,
  onRetake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterMode>("BINARIZED");
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedUrl, setProcessedUrl] = useState<string>(rawImageDataUrl);

  const applyFilters = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = rawImageDataUrl;
    img.onload = () => {
      // Calculate rotated dimensions
      const isSideways = rotationDegrees === 90 || rotationDegrees === 270;
      const width = isSideways ? img.height : img.width;
      const height = isSideways ? img.width : img.height;

      canvas.width = width;
      canvas.height = height;

      // Apply rotation transformation
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotationDegrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      if (currentFilter === "ORIGINAL") {
        const out = canvas.toDataURL("image/jpeg", 0.92);
        setProcessedUrl(out);
        setIsProcessing(false);
        return;
      }

      // Read pixel data for digital signal processing
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const len = data.length;

      if (currentFilter === "GRAYSCALE") {
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      } else if (currentFilter === "MAGIC_COLOR") {
        // High contrast + color enhancement (removes paper grayness, keeps colored stamps)
        const contrast = 1.35; // +35% contrast
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < len; i += 4) {
          // Normalize and contrast stretch
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 140));
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 140));
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 140));
        }
      } else if (currentFilter === "BINARIZED") {
        // Clinical Binarization: High-Contrast Document Binarizer for OCR
        // Converts faded ballpoint/pencil ink into sharp black text while turning background shadows pure white
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Adaptive thresholding curve
          let val = gray;
          if (gray > 145) {
            // Light background / shadows -> push to pure paper white
            val = 255;
          } else if (gray < 115) {
            // Dark ink / pen strokes -> push to deep ink black
            val = 0;
          } else {
            // Mid-tones: steep gradient transition
            val = ((gray - 115) / 30) * 255;
          }

          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const out = canvas.toDataURL("image/jpeg", 0.92);
      setProcessedUrl(out);
      setIsProcessing(false);
    };
  }, [rawImageDataUrl, currentFilter, rotationDegrees]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleRotate = () => {
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Retake</span>
        </button>

        <span className="text-xs font-bold font-mono tracking-wide text-cyan-400">
          ENHANCE &amp; REVIEW
        </span>

        <button
          type="button"
          onClick={handleRotate}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Image Preview Stage */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 min-h-0 bg-black">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-400 text-xs font-bold shadow-xl animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Applying Clinical OCR Filter...</span>
            </div>
          </div>
        )}

        {/* Rendered Enhanced Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={processedUrl}
          alt="Scanned page preview"
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-200"
        />
      </div>

      {/* Filter Selection Tabs */}
      <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-t border-white/10 shrink-0 z-20 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
          <span>SELECT OCR ENHANCEMENT FILTER:</span>
          {currentFilter === "BINARIZED" && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Recommended for TrOCR &amp; AI
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            {
              id: "BINARIZED" as FilterMode,
              label: "B&W Clean",
              desc: "For OCR AI",
              icon: FileText,
            },
            {
              id: "MAGIC_COLOR" as FilterMode,
              label: "Magic Color",
              desc: "Stamps & Letterheads",
              icon: Sparkles,
            },
            {
              id: "GRAYSCALE" as FilterMode,
              label: "Grayscale",
              desc: "Radiology & Scans",
              icon: Contrast,
            },
            {
              id: "ORIGINAL" as FilterMode,
              label: "Original",
              desc: "Raw Photo",
              icon: ImageIcon,
            },
          ].map((f) => {
            const Icon = f.icon;
            const isSelected = currentFilter === f.id;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setCurrentFilter(f.id)}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-bold leading-tight">{f.label}</span>
                <span className="text-[9px] text-slate-400 leading-none truncate max-w-full">
                  {f.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Confirm / Keep Page Button */}
        <button
          type="button"
          onClick={() => onConfirm(processedUrl)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold tracking-wide hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Keep This Page &amp; Proceed</span>
        </button>
      </div>
    </div>
  );
};
