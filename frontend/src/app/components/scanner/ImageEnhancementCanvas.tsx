"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { 
  Sparkles, 
  RotateCw, 
  Check, 
  Undo2, 
  Contrast, 
  FileText, 
  Image as ImageIcon,
  Crop as CropIcon,
  CheckCheck,
  RefreshCw,
  X
} from "lucide-react";

export type FilterMode = "BINARIZED" | "MAGIC_COLOR" | "GRAYSCALE" | "ORIGINAL";

interface CropRect {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
}

interface ImageEnhancementCanvasProps {
  rawImageDataUrl: string;
  onConfirm: (processedDataUrl: string) => void;
  onRetake: () => void;
}

const DEFAULT_CROP: CropRect = { x: 5, y: 5, width: 90, height: 90 };

export const ImageEnhancementCanvas: React.FC<ImageEnhancementCanvasProps> = ({
  rawImageDataUrl,
  onConfirm,
  onRetake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // Current active base image (can be modified by crop)
  const [baseImageUrl, setBaseImageUrl] = useState<string>(rawImageDataUrl);
  const [currentFilter, setCurrentFilter] = useState<FilterMode>("BINARIZED");
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedUrl, setProcessedUrl] = useState<string>(rawImageDataUrl);

  // Crop State
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP);
  const [hasCropped, setHasCropped] = useState<boolean>(false);

  // Dragging state for crop handles
  const dragInfoRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  // Apply rotation and digital filters on the current base image
  const applyFilters = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = baseImageUrl;
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

      // Digital Signal Processing for Filters
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
        const contrast = 1.35; // +35% contrast
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < len; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 140));
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 140));
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 140));
        }
      } else if (currentFilter === "BINARIZED") {
        // High-Contrast Document Binarizer for OCR
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let val = gray;
          if (gray > 145) {
            val = 255;
          } else if (gray < 115) {
            val = 0;
          } else {
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
  }, [baseImageUrl, currentFilter, rotationDegrees]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Rotate 90°
  const handleRotate = () => {
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  // ─── Interactive Crop Logic (Pointer Events) ───
  const handlePointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragInfoRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropRect },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfoRef.current || !imageContainerRef.current) return;
    e.preventDefault();

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragInfoRef.current.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragInfoRef.current.startY) / rect.height) * 100;

    const { handle, startCrop } = dragInfoRef.current;
    let newCrop = { ...startCrop };

    const minSize = 10; // Minimum 10% width/height

    if (handle === "move") {
      newCrop.x = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + deltaXPercent));
      newCrop.y = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + deltaYPercent));
    } else {
      // Corner & Edge adjustments
      if (handle.includes("w")) {
        const rightEdge = startCrop.x + startCrop.width;
        const proposedX = Math.max(0, Math.min(rightEdge - minSize, startCrop.x + deltaXPercent));
        newCrop.x = proposedX;
        newCrop.width = rightEdge - proposedX;
      }
      if (handle.includes("e")) {
        newCrop.width = Math.max(minSize, Math.min(100 - startCrop.x, startCrop.width + deltaXPercent));
      }
      if (handle.includes("n")) {
        const bottomEdge = startCrop.y + startCrop.height;
        const proposedY = Math.max(0, Math.min(bottomEdge - minSize, startCrop.y + deltaYPercent));
        newCrop.y = proposedY;
        newCrop.height = bottomEdge - proposedY;
      }
      if (handle.includes("s")) {
        newCrop.height = Math.max(minSize, Math.min(100 - startCrop.y, startCrop.height + deltaYPercent));
      }
    }

    setCropRect(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragInfoRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragInfoRef.current = null;
    }
  };

  // Apply Crop: Crops the displayed image according to cropRect coordinates
  const handleApplyCrop = () => {
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    // We crop from the currently displayed processed canvas/image
    img.src = processedUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Convert percentage coordinates to real image pixel coordinates
      const pixelX = Math.round((cropRect.x / 100) * img.width);
      const pixelY = Math.round((cropRect.y / 100) * img.height);
      const pixelW = Math.round((cropRect.width / 100) * img.width);
      const pixelH = Math.round((cropRect.height / 100) * img.height);

      canvas.width = Math.max(50, pixelW);
      canvas.height = Math.max(50, pixelH);

      // Draw cropped slice
      ctx.drawImage(
        img,
        pixelX,
        pixelY,
        pixelW,
        pixelH,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

      // Set cropped image as new base, reset crop box and rotation
      setBaseImageUrl(croppedDataUrl);
      setRotationDegrees(0);
      setCropRect(DEFAULT_CROP);
      setIsCropping(false);
      setHasCropped(true);
      setIsProcessing(false);
    };
  };

  // Reset to original uncropped photo
  const handleResetToFull = () => {
    setBaseImageUrl(rawImageDataUrl);
    setRotationDegrees(0);
    setCropRect(DEFAULT_CROP);
    setHasCropped(false);
    setIsCropping(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── Top Action Bar ─── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-white/10 shrink-0 z-30">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Retake</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono tracking-wide text-cyan-400">
            {isCropping ? "DRAG TO CROP" : "ENHANCE &amp; CROP"}
          </span>
          {hasCropped && !isCropping && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold">
              Cropped
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Crop Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCropping(!isCropping)}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isCropping
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40"
                : "bg-white/10 hover:bg-white/20 text-slate-200"
            }`}
            title="Crop Document Margins"
          >
            <CropIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{isCropping ? "Done" : "Crop"}</span>
          </button>

          {/* Rotate Button */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={isCropping}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Image Preview & Crop Stage ─── */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 min-h-0 bg-black">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-400 text-xs font-bold shadow-xl animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Processing Image...</span>
            </div>
          </div>
        )}

        {/* Constrained Image Wrapper for Accurate Crop Coordinates */}
        <div
          ref={imageContainerRef}
          className="relative max-h-full max-w-full flex items-center justify-center"
        >
          {/* Rendered Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgElementRef}
            src={processedUrl}
            alt="Scanned document preview"
            className="max-h-[62vh] sm:max-h-[68vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-150 pointer-events-none select-none"
          />

          {/* ─── Interactive Crop Overlay ─── */}
          {isCropping && (
            <div
              className="absolute inset-0 z-30 touch-none select-none overflow-hidden"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Dimmed backdrop panels around crop rectangle */}
              <div
                className="absolute bg-black/60 top-0 inset-x-0"
                style={{ height: `${cropRect.y}%` }}
              />
              <div
                className="absolute bg-black/60 bottom-0 inset-x-0"
                style={{ height: `${100 - (cropRect.y + cropRect.height)}%` }}
              />
              <div
                className="absolute bg-black/60"
                style={{
                  top: `${cropRect.y}%`,
                  height: `${cropRect.height}%`,
                  left: 0,
                  width: `${cropRect.x}%`,
                }}
              />
              <div
                className="absolute bg-black/60"
                style={{
                  top: `${cropRect.y}%`,
                  height: `${cropRect.height}%`,
                  right: 0,
                  width: `${100 - (cropRect.x + cropRect.width)}%`,
                }}
              />

              {/* The Active Crop Box */}
              <div
                className="absolute border-2 border-cyan-400 shadow-2xl cursor-move"
                style={{
                  top: `${cropRect.y}%`,
                  left: `${cropRect.x}%`,
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "move")}
              >
                {/* 3x3 Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-cyan-300/40" />
                  <div className="border-r border-b border-cyan-300/40" />
                  <div className="border-b border-cyan-300/40" />
                  <div className="border-r border-b border-cyan-300/40" />
                  <div className="border-r border-b border-cyan-300/40" />
                  <div className="border-b border-cyan-300/40" />
                  <div className="border-r border-cyan-300/40" />
                  <div className="border-r border-cyan-300/40" />
                  <div />
                </div>

                {/* 4 Corner Drag Handles */}
                <div
                  className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg cursor-nwse-resize z-40 hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, "nw")}
                />
                <div
                  className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg cursor-nesw-resize z-40 hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, "ne")}
                />
                <div
                  className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg cursor-nesw-resize z-40 hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, "sw")}
                />
                <div
                  className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg cursor-nwse-resize z-40 hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, "se")}
                />

                {/* 4 Edge Drag Bars */}
                <div
                  className="absolute top-0 inset-x-8 h-2 -translate-y-1/2 cursor-ns-resize z-30"
                  onPointerDown={(e) => handlePointerDown(e, "n")}
                />
                <div
                  className="absolute bottom-0 inset-x-8 h-2 translate-y-1/2 cursor-ns-resize z-30"
                  onPointerDown={(e) => handlePointerDown(e, "s")}
                />
                <div
                  className="absolute left-0 inset-y-8 w-2 -translate-x-1/2 cursor-ew-resize z-30"
                  onPointerDown={(e) => handlePointerDown(e, "w")}
                />
                <div
                  className="absolute right-0 inset-y-8 w-2 translate-x-1/2 cursor-ew-resize z-30"
                  onPointerDown={(e) => handlePointerDown(e, "e")}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Floating Crop Action Bar (Shown when Cropping) ─── */}
        {isCropping && (
          <div className="absolute bottom-4 inset-x-4 z-40 flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={() => setCropRect(DEFAULT_CROP)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Reset crop selection to full area"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Box</span>
              </button>

              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold shadow-md shadow-cyan-500/30 hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Filter Selection & Confirmation Bar ─── */}
      {!isCropping && (
        <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-t border-white/10 shrink-0 z-20 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span>SELECT OCR ENHANCEMENT FILTER:</span>
            {hasCropped && (
              <button
                type="button"
                onClick={handleResetToFull}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Reset to Full Photo
              </button>
            )}
            {currentFilter === "BINARIZED" && !hasCropped && (
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
                desc: "Stamps & Colors",
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
      )}
    </div>
  );
};
