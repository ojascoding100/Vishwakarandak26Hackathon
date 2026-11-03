'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  exportAuditDossier,
  fetchCompanies,
  fetchCompanyClaims,
  fetchCompanyMetrics,
  fetchUploadedReport,
  runWebVerifyClaim,
} from '@/lib/api';
import { AuditClaim, BrsrMetric, Company, Verdict, WebArticleCitation } from '@/lib/types';
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
  Globe,
  Download,
  Newspaper,
  ChevronUp,
  RotateCw,
  Search,
} from 'lucide-react';

interface SplitAuditorProps {
  initialCompanyId?: string;
}

export default function SplitAuditor({ initialCompanyId }: SplitAuditorProps) {
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams.get('companyId');
  const urlUploadId = searchParams.get('uploadId');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(urlUploadId || null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    urlCompanyId || initialCompanyId || 'reliance'
  );

  const [companyName, setCompanyName] = useState<string>('Reliance Industries Limited');
  const [ticker, setTicker] = useState<string>('RELIANCE.NS');
  const [totalPages, setTotalPages] = useState<number>(142);
  const [filingStatus, setFilingStatus] = useState<string>('FY2024-25');
  const [credibilityGrade, setCredibilityGrade] = useState<string>('B');

  const [claims, setClaims] = useState<AuditClaim[]>([]);
  const [metrics, setMetrics] = useState<BrsrMetric[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Web search state per claim
  const [expandedWebCardId, setExpandedWebCardId] = useState<number | null>(null);
  const [verifyingWebClaimId, setVerifyingWebClaimId] = useState<number | null>(null);

  // Active PDF citation state
  const [activePage, setActivePage] = useState<number>(92);
  const [activeBbox, setActiveBbox] = useState<[number, number, number, number] | null>([
    52, 180, 558, 225,
  ]);
  const [activeMetricKey, setActiveMetricKey] = useState<string>('scope1_tco2e');

  // Load initial companies list
  useEffect(() => {
    const load = async () => {
      const data = await fetchCompanies();
      setCompanies(data);
    };
    load();
  }, []);

  // Sync with URL parameters
  useEffect(() => {
    if (urlUploadId) {
      setActiveUploadId(urlUploadId);
    } else if (urlCompanyId) {
      setSelectedCompanyId(urlCompanyId);
      setActiveUploadId(null);
    }
  }, [urlUploadId, urlCompanyId]);

  // Load either Uploaded Report or Pre-Indexed Company
  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);

      if (activeUploadId) {
        // Load uploaded report
        const rep = await fetchUploadedReport(activeUploadId);
        if (rep) {
          setCompanyName(rep.company_name);
          setTicker('CUSTOM UPLOAD');
          setTotalPages(rep.total_pages);
          setFilingStatus('Live Uploaded BRSR');
          setCredibilityGrade(rep.flags_count === 0 ? 'A' : rep.flags_count < 2 ? 'B' : 'C');
          setMetrics(rep.metrics);
          setClaims(rep.claims);

          if (rep.claims.length > 0) {
            const first = rep.claims[0];
            setActiveClaimId(first.id);
            setActivePage(first.page_number || 1);
            setActiveBbox(first.bbox || [50, 200, 550, 250]);
            setActiveMetricKey(first.metric_key || 'scope1_tco2e');
            setExpandedWebCardId(first.id);
          }
        }
      } else {
        // Load standard pre-indexed company
        const matched = companies.find((c) => c.id === selectedCompanyId);
        if (matched) {
          setCompanyName(matched.name);
          setTicker(matched.ticker);
          setTotalPages(matched.filing_pages);
          setFilingStatus(matched.brsr_fy);
          setCredibilityGrade(matched.credibility_grade);
        }

        const [claimsData, metricsData] = await Promise.all([
          fetchCompanyClaims(selectedCompanyId),
          fetchCompanyMetrics(selectedCompanyId),
        ]);

        setClaims(claimsData);
        setMetrics(metricsData);

        if (claimsData.length > 0) {
          const first = claimsData[0];
          setActiveClaimId(first.id);
          setActivePage(first.page_number || 87);
          setActiveBbox(first.bbox || [52, 180, 558, 225]);
          setActiveMetricKey(first.metric_key || 'scope1_tco2e');
          setExpandedWebCardId(first.id);
        }
      }

      setIsLoading(false);
    };

    loadReportData();
  }, [activeUploadId, selectedCompanyId, companies]);

  const handleSelectCitation = (claim: AuditClaim) => {
    setActiveClaimId(claim.id);
    if (claim.page_number) setActivePage(claim.page_number);
    if (claim.bbox) setActiveBbox(claim.bbox);
    if (claim.metric_key) setActiveMetricKey(claim.metric_key);
  };

  const handleTriggerWebSearch = async (claimId: number) => {
    setVerifyingWebClaimId(claimId);
    try {
      const updatedClaim = await runWebVerifyClaim(claimId);
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, web_verification: updatedClaim.web_verification } : c))
      );
      setExpandedWebCardId(claimId);
    } catch (err) {
      console.error('Web verify failed:', err);
    } finally {
      setVerifyingWebClaimId(null);
    }
  };

  const handleExportDossier = async () => {
    const entityId = activeUploadId || selectedCompanyId;
    try {
      const dossier = await exportAuditDossier(entityId);
      const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VeritasESG_Audit_Dossier_${companyName.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export audit dossier. Please try again.');
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

  const renderWebStatusBadge = (status: string) => {
    switch (status) {
      case 'EXTERNALLY_CORROBORATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Media Corroborated
          </span>
        );
      case 'EXTERNAL_DISCREPANCY_FOUND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Watchdog Discrepancy Flagged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Search className="w-3 h-3 text-zinc-500" />
            Unverified in Press
          </span>
        );
    }
  };

  const renderStanceBadge = (stance: string) => {
    switch (stance) {
      case 'CORROBORATES':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            CORROBORATES
          </span>
        );
      case 'CONTRADICTS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
            CONTRADICTS
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">
            NEUTRAL
          </span>
        );
    }
  };

  return (
    <div id="auditor" className="max-w-7xl mx-auto px-6 py-12">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-[#E5E7EB] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#6F6F6F]">
            <FileSearch className="w-4 h-4 text-black" />
            <span>Multi-Layer Forensic Verification Studio</span>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl text-black mt-1">
            Split-Screen Auditor &amp; Evidence Vault
          </h2>
          <p className="text-sm text-[#6F6F6F] mt-2 max-w-2xl">
            Cross-referencing corporate claims against audited internal SEBI BRSR Principle 6 data
            tables and autonomous external web investigations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportDossier}
            className="rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium bg-white text-black border border-[#E5E7EB] hover:bg-zinc-50 active:scale-95 transition-all flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-zinc-600" />
            <span>Export Audit Dossier</span>
          </button>
        </div>
      </div>

      {/* Target Selector Bar */}
      <div className="bg-zinc-50 border border-[#E5E7EB] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label htmlFor="company-select" className="text-xs font-semibold uppercase text-zinc-500">
            Report Target:
          </label>
          <div className="relative">
            {activeUploadId ? (
              <div className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm font-semibold text-black flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Uploaded: {companyName}</span>
                <button
                  onClick={() => setActiveUploadId(null)}
                  className="text-xs text-blue-600 hover:underline ml-2"
                >
                  (Switch to Index)
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="company-select"
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setActiveUploadId(null);
                  }}
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
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs text-zinc-600">
          <span>
            Target: <strong className="text-zinc-900">{companyName}</strong>
          </span>
          <span>•</span>
          <span>
            Filing: <strong className="text-zinc-900">{filingStatus}</strong>
          </span>
          <span>•</span>
          <span>
            Credibility Grade:{' '}
            <span className="font-bold text-black px-1.5 py-0.5 rounded bg-zinc-200">
              {credibilityGrade}
            </span>
          </span>
        </div>
      </div>

      {/* Split-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Stream of Audited Claim Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6 max-h-[920px] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 bg-white border border-[#E5E7EB] rounded-2xl">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
              <p>Auditing claims against BRSR Principle 6 tables &amp; media records...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-white border border-[#E5E7EB] rounded-2xl">
              No claims audited for this document. Upload a report in the Upload Studio to view claims.
            </div>
          ) : (
            claims.map((claim) => {
              const isActive = activeClaimId === claim.id;
              const hasWebData = Boolean(claim.web_verification);
              const isWebExpanded = expandedWebCardId === claim.id;

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

                  {/* LAYER 1: Internal PDF Table Re-Check */}
                  {claim.actual_value && (
                    <div className="mb-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex items-start gap-2.5">
                      <Calculator className="w-4 h-4 text-zinc-700 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-zinc-900">
                          Layer 1 (Internal Table Math):{' '}
                        </span>
                        <span className="text-zinc-700">{claim.actual_value}</span>
                      </div>
                    </div>
                  )}

                  {/* Causal Analysis */}
                  <div className="mb-4 bg-zinc-50/50 rounded-xl p-3 border border-zinc-100 flex items-start gap-2.5">
                    <Brain className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-zinc-600 leading-relaxed">
                      <span className="font-semibold text-zinc-900">Forensic Causal Logic: </span>
                      {claim.explanation}
                    </div>
                  </div>

                  {/* LAYER 2: External Web Search Footprint */}
                  <div className="mb-4 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedWebCardId(isWebExpanded ? null : claim.id);
                      }}
                      className="p-3 bg-zinc-50 flex items-center justify-between text-xs cursor-pointer hover:bg-zinc-100/70 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Globe className="w-3.5 h-3.5 text-zinc-700" />
                        <span className="font-semibold text-zinc-900">
                          Layer 2: External Media &amp; News Footprint
                        </span>
                        {hasWebData && renderWebStatusBadge(claim.web_verification!.web_corroboration_status)}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!hasWebData && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerWebSearch(claim.id);
                            }}
                            disabled={verifyingWebClaimId === claim.id}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-1"
                          >
                            {verifyingWebClaimId === claim.id ? (
                              <>
                                <RotateCw className="w-3 h-3 animate-spin" />
                                <span>Searching...</span>
                              </>
                            ) : (
                              <>
                                <Search className="w-3 h-3" />
                                <span>Check Public Media</span>
                              </>
                            )}
                          </button>
                        )}
                        {hasWebData && (isWebExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />)}
                      </div>
                    </div>

                    {/* Collapsible Drawer Content */}
                    {hasWebData && isWebExpanded && (
                      <div className="p-4 space-y-3 border-t border-zinc-200 bg-white">
                        <p className="text-xs text-zinc-700 leading-relaxed italic bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-200">
                          {claim.web_verification!.web_summary}
                        </p>

                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Retrieved Investigative Articles ({claim.web_verification!.articles.length}):
                          </span>
                          {claim.web_verification!.articles.map((art: WebArticleCitation, aIdx: number) => (
                            <div
                              key={aIdx}
                              className="p-2.5 rounded-lg border border-zinc-200 hover:border-black/40 transition-colors bg-white text-xs flex flex-col space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] text-zinc-500 font-semibold truncate">
                                  {art.source_name}
                                </span>
                                {renderStanceBadge(art.stance)}
                              </div>

                              <a
                                href={art.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-black hover:underline flex items-center gap-1.5"
                              >
                                <span>{art.title}</span>
                                <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                              </a>

                              <p className="text-[11px] text-zinc-600 line-clamp-2">
                                {art.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
        <div className="lg:col-span-5 sticky top-28 h-[920px]">
          <PdfHighlighter
            companyName={companyName}
            ticker={ticker}
            pageNumber={activePage}
            totalPages={totalPages}
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
