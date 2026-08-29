"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { CameraViewfinder } from "./CameraViewfinder";
import { ImageEnhancementCanvas } from "./ImageEnhancementCanvas";
import { MultiPageThumbnailBar } from "./MultiPageThumbnailBar";
import { ReticleFormat } from "./ScannerReticle";
import { X, Sparkles, AlertCircle } from "lucide-react";

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (file: File, previewUrls: string[]) => void;
  initialFormat?: ReticleFormat;
  defaultDocTitle?: string;
}

type ScannerStep = "VIEWFINDER" | "ENHANCE" | "REVIEW";

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialFormat = "A4",
  defaultDocTitle = "Scanned_Medical_Record",
}) => {
  const [step, setStep] = useState<ScannerStep>("VIEWFINDER");
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [pendingSnap, setPendingSnap] = useState<string | null>(null);
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep("VIEWFINDER");
      setCapturedPages([]);
      setPendingSnap(null);
      setSelectedReviewIndex(0);
      setIsGeneratingPdf(false);
      setErrorNotice(null);

      // Register mobile back button history state
      if (typeof window !== "undefined") {
        window.history.pushState({ scanner_modal: true }, "");
      }
    }
  }, [isOpen]);

  // Intercept mobile back button to close scanner cleanly
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, onClose]);

  // Handle snap from viewfinder
  const handleCaptureSnapshot = useCallback((dataUrl: string) => {
    setPendingSnap(dataUrl);
    setStep("ENHANCE");
  }, []);

  // Handle page enhancement confirmation
  const handleConfirmEnhancedPage = useCallback((processedDataUrl: string) => {
    setCapturedPages((prev) => {
      const updated = [...prev, processedDataUrl];
      setSelectedReviewIndex(updated.length - 1);
      return updated;
    });
    setPendingSnap(null);
    setStep("REVIEW");
  }, []);

  // Retake current pending snap
  const handleRetake = useCallback(() => {
    setPendingSnap(null);
    setStep("VIEWFINDER");
  }, []);

  // Add next page
  const handleAddAnotherPage = useCallback(() => {
    setStep("VIEWFINDER");
  }, []);

  // Delete an existing page from review
  const handleDeletePage = useCallback((indexToDelete: number) => {
    setCapturedPages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToDelete);
      if (updated.length === 0) {
        setStep("VIEWFINDER");
        return [];
      }
      setSelectedReviewIndex(Math.max(0, Math.min(indexToDelete, updated.length - 1)));
      return updated;
    });
  }, []);

  // Convert DataURL to Blob helper (synchronous & immune to fetch errors)
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const byteString = atob(parts[1]);
    const u8arr = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      u8arr[i] = byteString.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Convert DataURL to Uint8Array helper
  const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const parts = dataUrl.split(",");
    const byteString = atob(parts[1]);
    const u8arr = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      u8arr[i] = byteString.charCodeAt(i);
    }
    return u8arr;
  };

  // Compile final document (single image or multi-page PDF)
  const handleFinishScan = async () => {
    if (capturedPages.length === 0) return;

    setIsGeneratingPdf(true);
    setErrorNotice(null);

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const sanitizedTitle = defaultDocTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (capturedPages.length === 1) {
        // Single Page -> Export as high-res JPEG
        const blob = dataUrlToBlob(capturedPages[0]);
        const fileName = `${sanitizedTitle}_${timestamp}.jpg`;
        const file = new File([blob], fileName, { type: "image/jpeg" });
        onComplete(file, capturedPages);
        onClose();
      } else {
        // Multi-Page -> Compile into standardized A4 PDF using pdf-lib
        const pdfDoc = await PDFDocument.create();

        for (let i = 0; i < capturedPages.length; i++) {
          const pageDataUrl = capturedPages[i];
          const imageBytes = dataUrlToUint8Array(pageDataUrl);
          const embeddedImage = await pdfDoc.embedJpg(imageBytes);

          // Standard A4 dimensions in points (595.28 x 841.89)
          const imgWidth = embeddedImage.width;
          const imgHeight = embeddedImage.height;

          // Scale image to fit A4 page while preserving aspect ratio
          const page = pdfDoc.addPage([595.28, 841.89]);
          const pageWidth = page.getWidth();
          const pageHeight = page.getHeight();

          const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;

          page.drawImage(embeddedImage, {
            x: (pageWidth - scaledWidth) / 2,
            y: (pageHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
        const fileName = `${sanitizedTitle}_${timestamp}.pdf`;
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });

        onComplete(file, capturedPages);
        onClose();
      }
    } catch (err: any) {
      console.error("[CameraScannerModal] Document generation failed:", err);
      setErrorNotice(err.message || "Failed to compile document. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* ─── Error Notification Toast (if any) ─── */}
      {errorNotice && (
        <div className="absolute top-4 inset-x-4 z-50 flex items-center justify-between p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="p-1 rounded-lg hover:bg-rose-900/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Mode 1: Live Viewfinder ─── */}
      {step === "VIEWFINDER" && (
        <CameraViewfinder
          onCapture={handleCaptureSnapshot}
          onClose={onClose}
          initialFormat={initialFormat}
        />
      )}

      {/* ─── Mode 2: Enhance & Review Current Page ─── */}
      {step === "ENHANCE" && pendingSnap && (
        <ImageEnhancementCanvas
          rawImageDataUrl={pendingSnap}
          onConfirm={handleConfirmEnhancedPage}
          onRetake={handleRetake}
        />
      )}

      {/* ─── Mode 3: Multi-Page Gallery Review ─── */}
      {step === "REVIEW" && capturedPages.length > 0 && (
        <div className="flex flex-col h-full bg-slate-950 text-white select-none">
          {/* Top Review Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-400">
                PAGE {selectedReviewIndex + 1} OF {capturedPages.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Main Preview Stage */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 bg-black min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPages[selectedReviewIndex]}
              alt={`Page ${selectedReviewIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          {/* Bottom Thumbnails & PDF Actions */}
          <MultiPageThumbnailBar
            pages={capturedPages}
            selectedPageIndex={selectedReviewIndex}
            onSelectPage={setSelectedReviewIndex}
            onDeletePage={handleDeletePage}
            onAddAnotherPage={handleAddAnotherPage}
            onFinishScan={handleFinishScan}
            isGeneratingPdf={isGeneratingPdf}
          />
        </div>
      )}
    </div>
  );
};
