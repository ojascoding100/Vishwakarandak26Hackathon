'use client';

import React, { useEffect, useState } from 'react';
import { fetchCompanies, fetchCompanyClaims, fetchCompanyMetrics } from '@/lib/api';
import { AuditClaim, BrsrMetric, Company, Verdict } from '@/lib/types';
import PdfHighlighter from './PdfHighlighter';
import {
  FileSearch,
  ExternalLink,
  ChevronDown,
  Calculator,
  Brain,
  Quote,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface SplitAuditorProps {
  initialCompanyId?: string;
}

export default function SplitAuditor({ initialCompanyId }: SplitAuditorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    initialCompanyId || 'reliance'
  );
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [claims, setClaims] = useState<AuditClaim[]>([]);
  const [metrics, setMetrics] = useState<BrsrMetric[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active PDF citation state
  const [activePage, setActivePage] = useState<number>(92);
  const [activeBbox, setActiveBbox] = useState<[number, number, number, number] | null>([
    52, 180, 558, 225,
  ]);
  const [activeMetricKey, setActiveMetricKey] = useState<string>('scope1_tco2e');

  useEffect(() => {
    const loadCompanies = async () => {
      const data = await fetchCompanies();
      setCompanies(data);
      if (data.length > 0 && !initialCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    };
    loadCompanies();
  }, [initialCompanyId]);

  useEffect(() => {
    if (initialCompanyId) {
      setSelectedCompanyId(initialCompanyId);
    }
  }, [initialCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;

    const loadCompanyData = async () => {
      setIsLoading(true);
      const matched = companies.find((c) => c.id === selectedCompanyId) || null;
      setSelectedCompany(matched);

      const [claimsData, metricsData] = await Promise.all([
        fetchCompanyClaims(selectedCompanyId),
        fetchCompanyMetrics(selectedCompanyId),
      ]);

      setClaims(claimsData);
      setMetrics(metricsData);

      // Default active citation to the first claim
      if (claimsData.length > 0) {
        const first = claimsData[0];
        setActiveClaimId(first.id);
        setActivePage(first.page_number || 87);
        setActiveBbox(first.bbox || [52, 180, 558, 225]);
        setActiveMetricKey(first.metric_key || 'scope1_tco2e');
      }

      setIsLoading(false);
    };

    loadCompanyData();
  }, [selectedCompanyId, companies]);

  const handleSelectCitation = (claim: AuditClaim) => {
    setActiveClaimId(claim.id);
    if (claim.page_number) {
      setActivePage(claim.page_number);
    }
    if (claim.bbox) {
      setActiveBbox(claim.bbox);
    }
    if (claim.metric_key) {
      setActiveMetricKey(claim.metric_key);
    }
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
    <div id="auditor" className="max-w-7xl mx-auto px-6 py-20">
      {/* Section Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#6F6F6F]">
          <FileSearch className="w-4 h-4 text-black" />
          <span>Neuro-Symbolic Verification Engine</span>
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl text-black mt-1">
          Forensic Auditor & Evidence Vault
        </h2>
        <p className="text-sm text-[#6F6F6F] mt-2 max-w-2xl">
          Split-screen audit matrix cross-referencing public narrative claims with deterministic
          re-calculations and pixel-level PDF bounding-box citations from official BRSR filings.
        </p>
      </div>

      {/* Company Selector Dropdown Bar */}
      <div className="bg-zinc-50 border border-[#E5E7EB] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label htmlFor="company-select" className="text-xs font-semibold uppercase text-zinc-500">
            Target Company:
          </label>
          <div className="relative">
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="appearance-none bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 pr-9 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black cursor-pointer shadow-xs"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.ticker})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {selectedCompany && (
          <div className="flex items-center space-x-4 text-xs text-zinc-600">
            <span>
              Sector: <strong className="text-zinc-900">{selectedCompany.sector}</strong>
            </span>
            <span>•</span>
            <span>
              Filing: <strong className="text-zinc-900">{selectedCompany.brsr_fy}</strong>
            </span>
            <span>•</span>
            <span>
              Credibility Grade:{' '}
              <span className="font-bold text-black px-1.5 py-0.5 rounded bg-zinc-200">
                {selectedCompany.credibility_grade}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Split-Screen Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Stream of Audited Claim Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-5 max-h-[880px] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 bg-white border border-[#E5E7EB] rounded-2xl">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
              <p>Auditing claims against BRSR Principle 6 tables...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-white border border-[#E5E7EB] rounded-2xl">
              No claims audited yet for this company. Use the Sandbox below to run an audit.
            </div>
          ) : (
            claims.map((claim) => {
              const isActive = activeClaimId === claim.id;
              return (
                <div
                  key={claim.id}
                  onClick={() => handleSelectCitation(claim)}
                  className={`border rounded-2xl p-6 transition-all cursor-pointer bg-white ${
                    isActive
                      ? 'border-black shadow-lg ring-1 ring-black/5'
                      : 'border-[#E5E7EB] hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  {/* Top Bar: Verdict Badge & Indicator */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    {renderVerdictBadge(claim.verdict)}
                    <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">
                      Principle 6 • {claim.indicator || 'EI-7'}
                    </span>
                  </div>

                  {/* Public Claim Quotation */}
                  <div className="relative pl-6 mb-4">
                    <Quote className="w-4 h-4 text-zinc-400 absolute left-0 top-0.5" />
                    <p className="text-base text-zinc-900 font-medium italic leading-relaxed">
                      &ldquo;{claim.claim_text}&rdquo;
                    </p>
                    {claim.source && (
                      <div className="text-xs text-[#6F6F6F] mt-1.5 font-normal">
                        Source: {claim.source}
                      </div>
                    )}
                  </div>

                  {/* Deterministic Math Discrepancy Breakdown */}
                  {claim.actual_value && (
                    <div className="mb-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex items-start gap-2.5">
                      <Calculator className="w-4 h-4 text-zinc-700 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-zinc-900">Deterministic Math Re-Check: </span>
                        <span className="text-zinc-700">{claim.actual_value}</span>
                      </div>
                    </div>
                  )}

                  {/* Causal Analysis / Explanation */}
                  <div className="mb-4 bg-zinc-50/50 rounded-xl p-3 border border-zinc-100 flex items-start gap-2.5">
                    <Brain className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-zinc-600 leading-relaxed">
                      <span className="font-semibold text-zinc-900">Forensic Explanation: </span>
                      {claim.explanation}
                    </div>
                  </div>

                  {/* Jump to Citation Button */}
                  <div className="flex justify-end pt-2 border-t border-zinc-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCitation(claim);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-800 hover:bg-black hover:text-white'
                      }`}
                    >
                      <span>
                        Jump to Citation → Page {claim.page_number || 1}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Panel: Embedded Interactive PDF Evidence Viewer (5 cols) */}
        <div className="lg:col-span-5 sticky top-28 h-[880px]">
          <PdfHighlighter
            companyName={selectedCompany?.name || 'Company BRSR Filing'}
            ticker={selectedCompany?.ticker || 'NSE'}
            pageNumber={activePage}
            totalPages={selectedCompany?.filing_pages || 140}
            bbox={activeBbox}
            tableIndex={activePage % 2 === 0 ? 1 : 2}
            activeMetricKey={activeMetricKey}
            metrics={metrics}
            onPageChange={(p) => setActivePage(p)}
          />
        </div>
      </div>
    </div>
  );
}
