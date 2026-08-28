"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, SwitchCamera, Zap, ZapOff, AlertCircle, Sparkles, X, Sun, CheckCircle2 } from "lucide-react";
import { ScannerReticle, ReticleFormat } from "./ScannerReticle";

interface CameraViewfinderProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  initialFormat?: ReticleFormat;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  onCapture,
  onClose,
  initialFormat = "A4",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [format, setFormat] = useState<ReticleFormat>(initialFormat);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Guidance states
  const [lightingState, setLightingState] = useState<"LOW" | "OPTIMAL" | "GLARE">("OPTIMAL");
  const [isSteady, setIsSteady] = useState<boolean>(true);

  // Stop camera helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    setIsReady(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // If ideal environment failed, fallback to any available camera (e.g. desktop webcam)
        console.warn("[CameraViewfinder] Preferred facingMode failed, falling back to default video device:", err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() as any) || {};
        if (capabilities.torch) {
          setIsTorchSupported(true);
        }
      }
    } catch (err: any) {
      console.error("[CameraViewfinder] Camera init error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please enable camera access in your browser settings to scan documents."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was detected on your system.");
      } else {
        setCameraError(err.message || "Failed to initialize camera.");
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !isTorchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn("[CameraViewfinder] Torch toggle failed:", err);
    }
  };

  // Flip Camera Toggle
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Video Frame Guidance Analyzer (Luminance & Stability loop)
  useEffect(() => {
    if (!isReady || !videoRef.current) return;

    const canvas = analysisCanvasRef.current || document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    analysisCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastLuminance = 128;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      ctx.drawImage(video, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      const data = imgData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuminance = totalBrightness / (32 * 32);

      // Lighting classification
      if (avgLuminance < 40) {
        setLightingState("LOW");
      } else if (avgLuminance > 220) {
        setLightingState("GLARE");
      } else {
        setLightingState("OPTIMAL");
      }

      // Stability detection (delta from previous sample)
      const diff = Math.abs(avgLuminance - lastLuminance);
      setIsSteady(diff < 20);
      lastLuminance = avgLuminance;
    }, 250);

    return () => clearInterval(interval);
  }, [isReady]);

  // Capture High-Res Snapshot
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setIsCapturing(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    // Subtle capture flash effect delay
    setTimeout(() => {
      setIsCapturing(false);
      onCapture(dataUrl);
    }, 150);
  };

  return (
    <div className="relative w-full h-full bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* ─── Top Control Bar ─── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
          title="Exit Camera"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Reticle Format Switcher (A4 vs Rx) */}
        <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setFormat("A4")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              format === "A4"
                ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            A4 Report
          </button>
          <button
            type="button"
            onClick={() => setFormat("RX")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              format === "RX"
                ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Rx Slip
          </button>
        </div>

        {/* Torch & Flip Toggles */}
        <div className="flex items-center gap-2">
          {isTorchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                isTorchOn
                  ? "bg-amber-400 text-slate-950 font-bold"
                  : "bg-black/40 text-white/80 hover:bg-black/60"
              }`}
              title={isTorchOn ? "Turn Torch Off" : "Turn Torch On"}
            >
              {isTorchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={flipCamera}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            title="Flip Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Live Video Stage ─── */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-black">
        {cameraError ? (
          <div className="max-w-md p-6 mx-4 rounded-3xl bg-slate-900/90 border border-rose-500/40 text-center space-y-4 shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white">Camera Access Required</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Retry Camera Access
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Close &amp; Use File Upload
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Real Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Shutter flash animation layer */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150" />
            )}

            {/* Scanner Reticle HUD Overlay */}
            {isReady && (
              <ScannerReticle
                format={format}
                isSteady={isSteady}
                lightingState={lightingState}
              />
            )}
          </>
        )}
      </div>

      {/* ─── Real-Time Guidance Pill & Capture Controls ─── */}
      <div className="relative z-20 flex flex-col items-center pb-8 pt-4 px-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-4">
        {/* Dynamic Guidance Pill */}
        {isReady && !cameraError && (
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
              !isSteady
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                : lightingState === "LOW"
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                : lightingState === "GLARE"
                ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {!isSteady ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Hold steady for sharp OCR text...</span>
              </>
            ) : lightingState === "LOW" ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Low light — turn on torch or move to light</span>
              </>
            ) : lightingState === "GLARE" ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Glare detected — angle slightly away</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lighting &amp; framing optimal — ready to scan!</span>
              </>
            )}
          </div>
        )}

        {/* Shutter Button Ring */}
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={captureSnapshot}
            disabled={!isReady || Boolean(cameraError) || isCapturing}
            className="group relative p-1 rounded-full border-4 border-white/60 hover:border-cyan-400 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            title="Snap Document"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white group-hover:bg-cyan-400 transition-all flex items-center justify-center shadow-2xl">
              <Camera className="w-7 h-7 text-slate-900 group-hover:scale-110 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
