'use client';

import React, { useEffect, useState } from 'react';
import { fetchCompanies, verifyText } from '@/lib/api';
import { AuditClaim, Company, Verdict } from '@/lib/types';
import {
  Send,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  FileText,
  ChevronDown,
  Calculator,
  Brain,
  Quote,
} from 'lucide-react';

export default function LiveSandbox() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('reliance');
  const [inputText, setInputText] = useState<string>(
    'In FY25, Reliance successfully achieved an 18% absolute reduction in our total greenhouse gas emissions, underscoring our aggressive net-zero 2035 timeline. Simultaneously, our renewable energy share expanded by 44%.'
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResults, setAuditResults] = useState<AuditClaim[]>([]);
  const [activeEngineMode, setActiveEngineMode] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const data = await fetchCompanies();
      setCompanies(data);
      if (data.length > 0) setSelectedCompanyId(data[0].id);
    };
    load();
  }, []);

  const handleRunAudit = async () => {
    if (!inputText.trim()) return;

    setIsAuditing(true);
    try {
      const response = await verifyText(inputText, selectedCompanyId);
      setAuditResults(response.claims);
      setActiveEngineMode(response.engine_mode);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const loadPreset = (companyId: string, text: string) => {
    setSelectedCompanyId(companyId);
    setInputText(text);
  };

  const renderVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'CONTRADICTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B]">
            <AlertOctagon className="w-3.5 h-3.5" />
            CONTRADICTED
          </span>
        );
      case 'CHERRY_PICKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E]">
            <AlertTriangle className="w-3.5 h-3.5" />
            CHERRY-PICKED
          </span>
        );
      case 'UNSUBSTANTIATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F4F5] border border-[#D4D4D8] text-[#3F3F46]">
            <HelpCircle className="w-3.5 h-3.5" />
            UNSUBSTANTIATED
          </span>
        );
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] border border-[#6EE7B7] text-[#065F46]">
            <CheckCircle className="w-3.5 h-3.5" />
            SUPPORTED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700">
            {verdict}
          </span>
        );
    }
  };

  return (
    <div id="sandbox" className="max-w-7xl mx-auto px-6 py-24">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 mb-3 border border-[#E5E7EB]">
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>Interactive Judge & Evaluator Sandbox</span>
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl text-black">
          Ad-Hoc Claim Verification Console
        </h2>
        <p className="text-sm text-[#6F6F6F] mt-2">
          Paste any arbitrary sustainability press release, tweet, or annual report excerpt.
          The neuro-symbolic engine parses claims, executes deterministic Python YoY calculations, and cross-references against indexed SEBI filings in &lt;2.5 seconds.
        </p>
      </div>

      {/* Preset Quick Demo Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
        <span className="text-xs font-medium text-zinc-500 mr-1">Judge Quick-Loads:</span>
        <button
          onClick={() =>
            loadPreset(
              'reliance',
              'Reliance has achieved an 18% absolute reduction in greenhouse gas emissions year-over-year. Renewable energy adoption grew by 44%.'
            )
          }
          className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] hover:border-black transition-colors"
        >
          Reliance — 18% GHG Claim (Contradicted)
        </button>
        <button
          onClick={() =>
            loadPreset(
              'tata_steel',
              'We have halved our water consumption footprint compared to last year across all manufacturing facilities.'
            )
          }
          className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] hover:border-black transition-colors"
        >
          Tata Steel — Water Claim (Contradicted)
        </button>
        <button
          onClick={() =>
            loadPreset(
              'infosys',
              'Infosys reduced total energy consumption by 5.4% while growing revenue, proving decoupled growth.'
            )
          }
          className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] hover:border-black transition-colors"
        >
          Infosys — Energy Decoupling (Supported)
        </button>
      </div>

      {/* Input Console Box */}
      <div className="max-w-4xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-700 uppercase">
              Target Audited Company:
            </span>
            <div className="relative">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="appearance-none bg-zinc-50 border border-[#E5E7EB] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.ticker})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {activeEngineMode && (
            <div className="text-[11px] font-mono text-zinc-500">
              Verified by: <strong className="text-zinc-800">{activeEngineMode}</strong>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste corporate sustainability claim or press release statement here..."
          className="w-full p-4 border border-[#E5E7EB] rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all font-sans leading-relaxed"
        />

        {/* Run Button Bar */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-zinc-400">
            {inputText.length} characters • SEBI Principle 6 indicators supported
          </span>
          <button
            onClick={handleRunAudit}
            disabled={isAuditing || !inputText.trim()}
            className="rounded-full px-6 py-2.5 text-sm font-medium bg-black text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 shadow-sm"
          >
            {isAuditing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Neuro-Symbolic Verification...</span>
              </>
            ) : (
              <>
                <span>Run Live Audit</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Live Audit Cards */}
      {auditResults.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="font-serif text-2xl text-black">
              Forensic Results ({auditResults.length} Claims Verified)
            </h3>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Math Zero-Hallucination Assured
            </span>
          </div>

          {auditResults.map((claim, idx) => (
            <div
              key={claim.id || idx}
              className="border border-[#E5E7EB] rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow animate-fade-rise"
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                {renderVerdictBadge(claim.verdict)}
                <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">
                  SEBI Principle 6 • {claim.indicator || 'EI-7'}
                </span>
              </div>

              <div className="relative pl-6 mb-4">
                <Quote className="w-4 h-4 text-zinc-400 absolute left-0 top-0.5" />
                <p className="text-base text-zinc-900 font-medium italic leading-relaxed">
                  &ldquo;{claim.claim_text}&rdquo;
                </p>
              </div>

              {claim.actual_value && (
                <div className="mb-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex items-start gap-2.5">
                  <Calculator className="w-4 h-4 text-zinc-700 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-900">BRSR Ground Math: </span>
                    <span className="text-zinc-700">{claim.actual_value}</span>
                  </div>
                </div>
              )}

              <div className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-100 flex items-start gap-2.5">
                <Brain className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-600 leading-relaxed">
                  <span className="font-semibold text-zinc-900">Forensic Causal Analysis: </span>
                  {claim.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

