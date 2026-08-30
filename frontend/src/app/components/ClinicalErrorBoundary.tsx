"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  traceId: string;
  copied: boolean;
}

export class ClinicalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      traceId: `ERR-UI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      traceId: `ERR-UI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ClinicalErrorBoundary caught an unhandled UI error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyTrace = () => {
    navigator.clipboard.writeText(this.state.traceId);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-4 font-body text-[#0F172A]">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-8 sm:p-10 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-200 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200 text-[11px] font-bold font-mono">
                {this.state.traceId}
              </span>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
                {this.props.fallbackTitle || "Clinical Portal Interruption"}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {this.props.fallbackMessage ||
                  "A display error occurred while rendering this clinical screen. To protect patient safety, this view was paused. No healthcare records were affected."}
              </p>
            </div>

            {/* Trace copy box */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Incident Reference</div>
                <div className="font-mono font-bold text-slate-800">{this.state.traceId}</div>
              </div>
              <button
                type="button"
                onClick={this.handleCopyTrace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Reference</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Clinical View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
