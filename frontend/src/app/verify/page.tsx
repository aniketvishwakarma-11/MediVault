"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  QrCode,
  Search,
  FileCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Building2,
  RefreshCw,
  Zap,
  HelpCircle,
} from "lucide-react";
import jsQR from "jsqr";

export default function PublicVerifyHubPage() {
  const router = useRouter();
  const [rxInput, setRxInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"id" | "camera" | "upload">("id");
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when leaving tab
  useEffect(() => {
    if (activeTab !== "camera" && isScanningCamera) {
      stopCamera();
    }
  }, [activeTab]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = rxInput.trim();
    if (!clean) {
      setErrorMsg("Please enter a valid Prescription ID or QR token.");
      return;
    }
    router.push(`/verify/rx/${encodeURIComponent(clean)}`);
  };

  const handleDemoClick = (demoId: string) => {
    router.push(`/verify/rx/${demoId}`);
  };

  // ── Camera Scanner ──────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError("");
    setIsScanningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Camera permission denied or camera not found. Please enter Prescription ID manually or upload a screenshot."
      );
      setIsScanningCamera(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningCamera(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        // QR detected!
        stopCamera();
        const extracted = code.data.trim();
        // Check if full URL or raw ID
        if (extracted.includes("/verify/rx/")) {
          const parts = extracted.split("/verify/rx/");
          const id = parts[1]?.split("?")[0]?.split("#")[0];
          if (id) {
            router.push(`/verify/rx/${encodeURIComponent(id)}`);
            return;
          }
        }
        router.push(`/verify/rx/${encodeURIComponent(extracted)}`);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // ── File QR Upload ──────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const extracted = code.data.trim();
          if (extracted.includes("/verify/rx/")) {
            const parts = extracted.split("/verify/rx/");
            const id = parts[1]?.split("?")[0]?.split("#")[0];
            if (id) {
              router.push(`/verify/rx/${encodeURIComponent(id)}`);
              return;
            }
          }
          router.push(`/verify/rx/${encodeURIComponent(extracted)}`);
        } else {
          setErrorMsg("No valid QR code found in this image. Please try another image or enter ID manually.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-cyan-100 selection:text-cyan-900 relative overflow-hidden flex flex-col justify-between font-sans">
      {/* 2px brand accent topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#0891B2]" />

      {/* ── Header ── */}
      <header className="relative z-20 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-[#0891B2] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[1.15rem] tracking-tight text-slate-900">
                Medi<span className="text-[#0891B2]">Vault</span>
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200 shadow-2xs">
                Verification Gateway
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-[#0891B2] transition-colors"
            >
              Home
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/auth"
              className="px-3.5 py-1.5 rounded-lg bg-[#0891B2] text-white text-xs font-bold shadow-sm hover:bg-[#0e7490] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full my-auto">
        
        {/* Title & Badge */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Public Pharmacy &amp; Patient Verification Hub</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Verify Digital <span className="text-[#0891B2]">Prescription Authenticity</span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Protect against counterfeit medicines, unverified doctors, and prescription double-dispensation. Cryptographically validated with NMC doctor registration and blockchain notarization.
          </p>
        </div>

        {/* ── Verification Box ── */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 max-w-2xl mx-auto">
          
          {/* Mode Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("id")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "id"
                  ? "bg-white text-[#0891B2] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Enter Rx ID</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "camera"
                  ? "bg-white text-[#0891B2] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan with Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "upload"
                  ? "bg-white text-[#0891B2] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Image</span>
            </button>
          </div>

          {/* TAB 1: ENTER RX ID */}
          {activeTab === "id" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Prescription Identifier or Blockchain Token
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rxInput}
                    onChange={(e) => {
                      setRxInput(e.target.value);
                      setErrorMsg("");
                    }}
                    placeholder="e.g. RX-882410 or alphanumeric prescription ID"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 text-sm font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-[#0891B2] shadow-2xs transition-colors"
                  />
                  <FileCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
                {errorMsg && <p className="text-xs font-medium text-rose-600 mt-1.5">{errorMsg}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-sm shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verify Prescription Authenticity</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: LIVE CAMERA QR SCANNER */}
          {activeTab === "camera" && (
            <div className="space-y-4 text-center">
              {!isScanningCamera ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-[#0891B2] flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Scan QR Code with Device Camera</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Position the QR code printed on the patient's prescription paper or mobile pass in front of your camera.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-72 border border-slate-800 shadow-inner flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* High-Tech Scan Reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] relative animate-pulse">
                        <div className="w-4 h-4 border-t-4 border-l-4 border-cyan-400 absolute -top-1 -left-1" />
                        <div className="w-4 h-4 border-t-4 border-r-4 border-cyan-400 absolute -top-1 -right-1" />
                        <div className="w-4 h-4 border-b-4 border-l-4 border-cyan-400 absolute -bottom-1 -left-1" />
                        <div className="w-4 h-4 border-b-4 border-r-4 border-cyan-400 absolute -bottom-1 -right-1" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel Camera
                  </button>
                </div>
              )}

              {cameraError && <p className="text-xs font-medium text-rose-600 mt-2">{cameraError}</p>}
            </div>
          )}

          {/* TAB 3: UPLOAD QR IMAGE */}
          {activeTab === "upload" && (
            <div className="space-y-4 text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-cyan-400 bg-slate-50 hover:bg-cyan-50/40 transition-all cursor-pointer space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-[#0891B2] flex items-center justify-center mx-auto shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Upload Prescription QR Code Screenshot</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Click to browse or drag and drop any PNG, JPG, or screenshot containing the MediVault prescription QR code.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {errorMsg && <p className="text-xs font-medium text-rose-600 mt-2">{errorMsg}</p>}
            </div>
          )}

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">Quick Demo Verification:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick("RX-DEMO-VALID")}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Test Sample Prescription</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4 Security Pillars Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 text-left">
          
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-[#0891B2] flex items-center justify-center border border-cyan-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">NMC Doctor Signature</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every digital prescription is cryptographically bound to an NMC-registered, verified doctor profile.
            </p>
          </div>

          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">One-Time Dispensation</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pharmacists lock dispensed medications to prevent patients reusing the same prescription across multiple shops.
            </p>
          </div>

          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Blockchain Hash Audit</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              SHA-256 digital fingerprint is recorded on Polygon Amoy ledger, proving zero post-issuance drug alteration.
            </p>
          </div>

          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Pill className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Jan Aushadhi Generics</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Provides instant cost-comparison with government generic medicines saving up to 80% on medical expenses.
            </p>
          </div>

        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="relative z-20 w-full bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Public Pharmacy Gateway · Zero-Knowledge Cryptography</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-medium text-[11.5px]">
            <Link href="/privacy" className="hover:text-[#0891B2] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#0891B2] transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <span className="text-slate-400">DPDPA 2023 &amp; ABDM V3 Certified</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
