'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPdf } from '@/lib/api';
import { UploadResponse } from '@/lib/types';
import {
  UploadCloud,
  FileText,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';

export default function UploadStudioPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const steps = [
    'Parsing PDF layout & extracting SEBI Principle 6 tables...',
    'Extracting narrative sustainability claims via Qwen3-8B...',
    'Running deterministic math verification against internal tables...',
    enableWebSearch
      ? 'Dispatching Web Search Sub-Agent for external media corroboration...'
      : 'Compiling internal evidence references...',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Please select a valid PDF file.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.pdf')) {
        setErrorMessage('Please drop a valid PDF file.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRunAudit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setActiveStep(0);

    // Simulated step transitions for progressive UI experience
    const t1 = setTimeout(() => setActiveStep(1), 700);
    const t2 = setTimeout(() => setActiveStep(2), 1500);
    const t3 = setTimeout(() => setActiveStep(3), 2300);

    try {
      const data = await uploadPdf(selectedFile, companyName || undefined, enableWebSearch);
      setResult(data);
    } catch (err: any) {
      console.error('Upload audit failed:', err);
      setErrorMessage(err.message || 'Audit failed. Check backend connection on port 8000.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsProcessing(false);
    }
  };

  const handleCreateSamplePdf = () => {
    // Generate a minimal mock PDF file object in browser memory for instant testing
    const sampleBlob = new Blob(
      [
        `%PDF-1.4\n1 0 obj\n<< /Title (Adani Energy Transition Report 2025) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`,
      ],
      { type: 'application/pdf' }
    );
    const file = new File([sampleBlob], 'Adani_BRSR_P6_FY2025.pdf', { type: 'application/pdf' });
    setSelectedFile(file);
    setCompanyName('Adani Energy Transition Ltd');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 mb-4 border border-[#E5E7EB]">
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>Autonomous End-to-End Pipeline</span>
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl text-black leading-[0.95] tracking-tight">
          Direct PDF Upload &amp; Live Audit Studio
        </h1>
        <p className="text-base text-[#6F6F6F] mt-4 leading-relaxed">
          Upload any Indian corporate BRSR filing or annual sustainability report. Our
          neuro-symbolic engine parses quantitative tables, extracts narrative claims, executes
          zero-hallucination YoY math checks, and optionally cross-references media watchdog records.
        </p>
      </div>

      {!result ? (
        <div className="space-y-8">
          {/* Drag & Drop Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer relative bg-zinc-50/50 ${
              selectedFile
                ? 'border-black bg-white ring-2 ring-black/5'
                : 'border-[#E5E7EB] hover:border-black/50 hover:bg-zinc-50'
            }`}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-xs">
                {selectedFile ? (
                  <FileCheck className="w-8 h-8 text-black" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-zinc-600" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <div className="text-base font-semibold text-black">{selectedFile.name}</div>
                  <div className="text-xs text-[#6F6F6F] mt-0.5 font-mono">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for Forensic Audit
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-base font-semibold text-black">
                    Drag and drop your BRSR PDF report here, or{' '}
                    <span className="underline decoration-zinc-400">browse files</span>
                  </div>
                  <div className="text-xs text-[#6F6F6F] mt-1 font-mono">
                    Supports official SEBI Principle 6 Annexures, Annual Reports, and CDP Filings
                  </div>
                </div>
              )}

              {/* Sample test button */}
              {!selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateSamplePdf();
                  }}
                  className="text-xs font-semibold text-zinc-600 bg-white border border-[#E5E7EB] hover:border-black px-3 py-1.5 rounded-full transition-colors mt-2"
                >
                  ⚡ Load Sample BRSR Report
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Configuration Options */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="font-serif text-xl text-black">Audit Parameters &amp; Sub-Agents</h3>
              <p className="text-xs text-[#6F6F6F]">
                Customize entity metadata and configure autonomous verification sub-agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Company Name Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Corporate Entity Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect from cover page..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black bg-zinc-50 focus:bg-white"
                />
              </div>

              {/* Web Search Sub-Agent Toggle */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-black" />
                    <span className="text-xs font-bold text-black">
                      External Web Search Sub-Agent
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-zinc-200 text-zinc-700 rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6F6F6F] mt-1 leading-relaxed">
                    Cross-verifies claims against live press releases, watchdog notices, and news articles.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableWebSearch}
                    onChange={(e) => setEnableWebSearch(e.target.checked)}
                    disabled={isProcessing}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Button & Progressive Status */}
          <div className="text-center space-y-4">
            <button
              onClick={handleRunAudit}
              disabled={isProcessing || !selectedFile}
              className="rounded-full px-8 py-3.5 text-base font-medium bg-black text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-md inline-flex items-center gap-2.5"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auditing Filing ({steps[activeStep]})...</span>
                </>
              ) : (
                <>
                  <span>Begin Autonomous Forensic Audit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Step-by-step progress checklist */}
            {isProcessing && (
              <div className="max-w-md mx-auto text-left space-y-2 pt-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 animate-fade-rise">
                {steps.map((stepText, idx) => {
                  const isDone = activeStep > idx;
                  const isCurrent = activeStep === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center space-x-2.5 text-xs ${
                        isDone
                          ? 'text-emerald-700 font-medium'
                          : isCurrent
                          ? 'text-black font-semibold animate-pulse'
                          : 'text-zinc-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 shrink-0" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Result Executive Summary Card */
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 sm:p-10 shadow-sm animate-fade-rise space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Audit Completed Successfully
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-black mt-2">
                {result.company_name}
              </h2>
              <p className="text-xs text-[#6F6F6F] mt-1 font-mono">
                Source Document: {result.filename} ({result.total_pages} Pages)
              </p>
            </div>

            <button
              onClick={() => router.push(`/auditor?uploadId=${result.upload_id}`)}
              className="rounded-full px-6 py-3 text-sm font-semibold bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <span>Open in Split-Screen Auditor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="text-xs uppercase font-semibold text-[#6F6F6F]">Claims Audited</div>
              <div className="font-serif text-3xl text-black mt-1">{result.claims_audited}</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
              <div className="text-xs uppercase font-semibold text-rose-800">
                Discrepancies Flagged
              </div>
              <div className="font-serif text-3xl text-rose-950 mt-1">{result.flags_raised}</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="text-xs uppercase font-semibold text-[#6F6F6F]">PDF Pages Scanned</div>
              <div className="font-serif text-3xl text-black mt-1">{result.total_pages}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="text-xs uppercase font-semibold text-emerald-800">
                Math Verification
              </div>
              <div className="font-serif text-2xl text-emerald-950 mt-1">100% Deterministic</div>
            </div>
          </div>

          {/* Quick Claims Preview */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">
              Initial Forensic Findings:
            </h4>
            {result.claims.slice(0, 3).map((claim, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-start justify-between gap-4 text-xs"
              >
                <div>
                  <div className="font-medium text-black italic">&ldquo;{claim.claim_text}&rdquo;</div>
                  <div className="text-[11px] text-[#6F6F6F] mt-1">{claim.explanation}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] shrink-0 ${
                    claim.verdict === 'SUPPORTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : claim.verdict === 'CONTRADICTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {claim.verdict}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Footer */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              onClick={() => setResult(null)}
              className="text-xs font-semibold text-zinc-600 hover:text-black underline"
            >
              ← Upload Another PDF
            </button>
            <button
              onClick={() => router.push(`/auditor?uploadId=${result.upload_id}`)}
              className="rounded-full px-6 py-2.5 text-xs font-semibold bg-black text-white hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <span>Inspect Full Evidence Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

