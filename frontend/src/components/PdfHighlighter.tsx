'use client';

import React, { useState } from 'react';
import { BrsrMetric } from '@/lib/types';
import { ZoomIn, ZoomOut, FileText, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface PdfHighlighterProps {
  companyName: string;
  ticker: string;
  pageNumber: number;
  totalPages: number;
  bbox: [number, number, number, number] | null;
  tableIndex?: number;
  activeMetricKey?: string;
  metrics: BrsrMetric[];
  onPageChange?: (newPage: number) => void;
}

export default function PdfHighlighter({
  companyName,
  ticker,
  pageNumber,
  totalPages,
  bbox,
  tableIndex = 1,
  activeMetricKey,
  metrics,
  onPageChange,
}: PdfHighlighterProps) {
  const [zoom, setZoom] = useState(1.0);

  // Normalize bbox coordinates: default to sample box if none provided
  const activeBbox = bbox || [52, 200, 548, 250];
  const [x0, y0, x1, y1] = activeBbox;

  // Calculate percentage positions for responsive container
  // Assume standard PDF width 600pt and height 800pt
  const PDF_WIDTH = 600;
  const PDF_HEIGHT = 800;

  const leftPct = (x0 / PDF_WIDTH) * 100;
  const topPct = (y0 / PDF_HEIGHT) * 100;
  const widthPct = ((x1 - x0) / PDF_WIDTH) * 100;
  const heightPct = ((y1 - y0) / PDF_HEIGHT) * 100;

  const relevantMetrics = metrics.filter(
    (m) => m.page_number === pageNumber || !m.page_number
  );

  return (
    <div className="flex flex-col h-full bg-zinc-100 rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-inner">
      {/* Top Document Toolbar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between text-xs text-zinc-700">
        <div className="flex items-center space-x-2 truncate">
          <FileText className="w-4 h-4 text-black shrink-0" />
          <span className="font-semibold text-black truncate">{companyName}</span>
          <span className="text-[#6F6F6F]">({ticker})</span>
          <span className="text-zinc-400">|</span>
          <span className="text-zinc-600 font-medium">BRSR_P6_FY2024-25.pdf</span>
        </div>

        {/* Page navigation & Zoom */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1 bg-zinc-50 border border-[#E5E7EB] rounded-md px-1.5 py-0.5">
            <button
              onClick={() => onPageChange && onPageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="p-1 hover:bg-zinc-200 rounded disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-medium text-black">
              Page {pageNumber} / {totalPages || 120}
            </span>
            <button
              onClick={() =>
                onPageChange && onPageChange(Math.min(totalPages || 120, pageNumber + 1))
              }
              disabled={pageNumber >= (totalPages || 120)}
              className="p-1 hover:bg-zinc-200 rounded disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1 border border-[#E5E7EB] rounded-md px-1 py-0.5 bg-zinc-50">
            <button
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
              className="p-1 hover:bg-zinc-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1 hover:bg-zinc-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center bg-zinc-200/70">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          className="relative w-[600px] min-h-[800px] bg-white shadow-2xl rounded-sm p-10 font-sans text-xs text-zinc-800 transition-transform duration-200 border border-zinc-300"
        >
          {/* Watermark / Header */}
          <div className="border-b-2 border-zinc-900 pb-3 mb-6 flex justify-between items-start">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                SEBI (LODR) Regulations, 2015 — Annexure I
              </div>
              <div className="text-base font-bold text-black mt-0.5">
                BUSINESS RESPONSIBILITY & SUSTAINABILITY REPORT (BRSR)
              </div>
              <div className="text-xs text-zinc-600 font-medium">
                SECTION C: PRINCIPLE-WISE PERFORMANCE DISCLOSURE — PRINCIPLE 6
              </div>
            </div>
            <div className="text-right text-[10px] text-zinc-500">
              <div>Page {pageNumber}</div>
              <div className="font-semibold text-zinc-800">{ticker}</div>
            </div>
          </div>

          {/* Principle 6 Subheading */}
          <div className="bg-zinc-100 p-2.5 rounded font-semibold text-zinc-900 text-[11px] mb-4 border border-zinc-200">
            Principle 6: Businesses should respect and make efforts to protect and restore the environment.
          </div>

          {/* Table Container */}
          <div className="mb-6">
            <div className="font-bold text-zinc-900 text-xs mb-1.5 flex items-center justify-between">
              <span>
                Essential Indicator {tableIndex === 2 ? 'EI-7: Scope 1 & 2 GHG Emissions' : 'EI-1: Energy & Environmental Metrics'}
              </span>
              <span className="text-[10px] font-normal text-zinc-500">
                Table {tableIndex} — Audited Quantities
              </span>
            </div>

            {/* Simulated Official Filing Table */}
            <table className="w-full border-collapse border border-zinc-300 text-[10px]">
              <thead>
                <tr className="bg-zinc-200/80 font-bold text-zinc-900 border-b border-zinc-300">
                  <th className="border border-zinc-300 p-2 text-left w-1/2">
                    Parameter / Metric Category
                  </th>
                  <th className="border border-zinc-300 p-2 text-center">Unit</th>
                  <th className="border border-zinc-300 p-2 text-right">FY 2024-25 (Current)</th>
                  <th className="border border-zinc-300 p-2 text-right">FY 2023-24 (Previous)</th>
                </tr>
              </thead>
              <tbody>
                {relevantMetrics.length > 0 ? (
                  relevantMetrics.map((m, idx) => {
                    const isRowTarget = m.metric_key === activeMetricKey;
                    return (
                      <tr
                        key={m.id || idx}
                        className={`border-b border-zinc-300 transition-colors ${
                          isRowTarget ? 'bg-amber-100/70 font-semibold' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <td className="border border-zinc-300 p-2">
                          <div className="font-medium text-zinc-900">{m.indicator_name}</div>
                          <div className="text-[9px] text-zinc-500 font-mono">{m.metric_key}</div>
                        </td>
                        <td className="border border-zinc-300 p-2 text-center text-zinc-600 font-mono">
                          {m.unit}
                        </td>
                        <td className="border border-zinc-300 p-2 text-right font-mono font-medium text-zinc-900">
                          {m.fy_current ? m.fy_current.toLocaleString() : 'N/A'}
                        </td>
                        <td className="border border-zinc-300 p-2 text-right font-mono text-zinc-700">
                          {m.fy_previous ? m.fy_previous.toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr className="border-b border-zinc-300">
                      <td className="border border-zinc-300 p-2 font-medium">
                        Total Energy Consumption (GJ)
                      </td>
                      <td className="border border-zinc-300 p-2 text-center font-mono">GJ</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">812,500,000</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">778,200,000</td>
                    </tr>
                    <tr className="border-b border-zinc-300 bg-amber-50">
                      <td className="border border-zinc-300 p-2 font-medium">
                        Gross Scope 1 GHG Emissions (Metric tonnes CO2 equivalent)
                      </td>
                      <td className="border border-zinc-300 p-2 text-center font-mono">tCO2e</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono font-bold">54,200,000</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">51,800,000</td>
                    </tr>
                    <tr className="border-b border-zinc-300">
                      <td className="border border-zinc-300 p-2 font-medium">
                        Gross Scope 2 GHG Emissions (Location-based)
                      </td>
                      <td className="border border-zinc-300 p-2 text-center font-mono">tCO2e</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">8,350,000</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">8,120,000</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Assurance Statement Stamp */}
          <div className="mt-8 border border-dashed border-zinc-300 p-3 rounded text-[9px] text-zinc-500 bg-zinc-50/50 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-800">INDEPENDENT THIRD-PARTY ASSURANCE:</span>
              <p className="mt-0.5">
                Standard: ISAE 3000 (Revised) & AA1000AS v3. Reasonable assurance confirmed for Principle 6 tables.
              </p>
            </div>
            <div className="border border-zinc-400 px-2 py-1 rounded text-center text-[8px] font-bold text-zinc-700 bg-white shadow-xs">
              SEBI COMPLIANT
              <br />
              ASSURED FY25
            </div>
          </div>

          {/* DYNAMIC FORENSIC BOUNDING-BOX HIGHLIGHT OVERLAY */}
          {bbox && (
            <div
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              className="absolute pointer-events-none rounded border-2 border-amber-500 bg-amber-400/25 animate-bbox-pulse transition-all duration-300 z-20 flex items-start justify-end p-1"
            >
              <span className="bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                <span>Citation Box: [{x0}, {y0}, {x1}, {y1}]</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
