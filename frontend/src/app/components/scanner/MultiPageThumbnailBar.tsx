"use client";

import React from "react";
import { Plus, Trash2, FileCheck2, ArrowRight, Layers } from "lucide-react";

interface MultiPageThumbnailBarProps {
  pages: string[];
  selectedPageIndex: number;
  onSelectPage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onAddAnotherPage: () => void;
  onFinishScan: () => void;
  isGeneratingPdf?: boolean;
}

export const MultiPageThumbnailBar: React.FC<MultiPageThumbnailBarProps> = ({
  pages,
  selectedPageIndex,
  onSelectPage,
  onDeletePage,
  onAddAnotherPage,
  onFinishScan,
  isGeneratingPdf = false,
}) => {
  return (
    <div className="flex flex-col bg-slate-900 border-t border-white/10 p-3 sm:p-4 space-y-3 shrink-0 z-20">
      {/* Top status line */}
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">
            Document Pages ({pages.length})
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          {pages.length === 1
            ? "Single Page Document"
            : `Multi-Page Bundle (${pages.length} Pages)`}
        </span>
      </div>

      {/* Thumbnails Scrollable Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {pages.map((pageUrl, idx) => {
          const isSelected = selectedPageIndex === idx;
          return (
            <div
              key={idx}
              onClick={() => onSelectPage(idx)}
              className={`relative shrink-0 w-16 sm:w-20 aspect-[1/1.4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer group bg-black ${
                isSelected
                  ? "border-cyan-400 ring-2 ring-cyan-400/40 scale-105"
                  : "border-white/20 opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageUrl}
                alt={`Page ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Page Number Badge */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-mono font-bold text-white">
                #{idx + 1}
              </div>

              {/* Delete Page Button */}
              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(idx);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700"
                  title="Remove this page"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Another Page Button */}
        <button
          type="button"
          onClick={onAddAnotherPage}
          className="shrink-0 w-16 sm:w-20 aspect-[1/1.4] rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400 bg-white/5 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
          title="Scan Next Page"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-bold text-center leading-tight">
            Add Page
          </span>
        </button>
      </div>

      {/* Bottom Primary Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onAddAnotherPage}
          className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Next Page (+)</span>
        </button>

        <button
          type="button"
          onClick={onFinishScan}
          disabled={isGeneratingPdf}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>
            {isGeneratingPdf
              ? "Stitching Document..."
              : pages.length > 1
              ? `Compile & Use ${pages.length} Pages`
              : "Use Scanned Document"}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
