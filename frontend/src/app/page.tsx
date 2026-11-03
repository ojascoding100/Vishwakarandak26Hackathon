'use client';

import React from 'react';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import {
  UploadCloud,
  FileSearch,
  Building2,
  Activity,
  Globe,
  Calculator,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function Home() {
  const modules = [
    {
      title: 'Direct PDF Upload Studio',
      description:
        'Drag-and-drop any BRSR PDF filing or sustainability report. Extracts tables, computes deltas, and dispatches external web sub-agents.',
      href: '/upload',
      badge: 'LIVE PIPELINE',
      icon: <UploadCloud className="w-6 h-6 text-black" />,
      cta: 'Upload & Audit PDF',
    },
    {
      title: '20-Company Macro Index',
      description:
        'Explore pre-indexed corporate giants across Energy, IT, Auto, and FMCG with live credibility grades and discrepancy counts.',
      href: '/directory',
      badge: 'SEBI BENCHMARK',
      icon: <Building2 className="w-6 h-6 text-black" />,
      cta: 'View 20-Company Matrix',
    },
    {
      title: 'Split-Screen Forensic Auditor',
      description:
        'Dual-panel workspace cross-referencing public claims against official filings with pixel-level PDF bounding-box highlights.',
      href: '/auditor',
      badge: 'CORE DELIVERABLE',
      icon: <FileSearch className="w-6 h-6 text-black" />,
      cta: 'Launch Auditor Console',
    },
    {
      title: 'Ad-Hoc Claim Sandbox',
      description:
        'Paste arbitrary press release text or social media sustainability claims to audit against indexed BRSR ground truth in <2.5s.',
      href: '/sandbox',
      badge: 'JUDGE DEMO',
      icon: <Calculator className="w-6 h-6 text-black" />,
      cta: 'Open Ad-Hoc Sandbox',
    },
    {
      title: 'Precision & Recall Benchmark',
      description:
        'Rigorous empirical evaluation against 60 expert-annotated ground-truth claims with interactive 2×2 confusion matrix.',
      href: '/benchmark',
      badge: '86.7% ACCURACY',
      icon: <Activity className="w-6 h-6 text-black" />,
      cta: 'Inspect Accuracy Suite',
    },
  ];

  return (
    <div className="bg-white">
      {/* 1. Cinematic Hero Section */}
      <HeroSection />

      {/* 2. Platform Modules & Direct Route Gateways */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#E5E7EB]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F]">
            Autonomous Verification Architecture
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl text-black mt-2">
            Enterprise Forensic ESG Modules
          </h2>
          <p className="text-base text-[#6F6F6F] mt-3">
            Designed to bridge the gap between corporate public-relations rhetoric and verified
            SEBI BRSR regulatory disclosures.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((m, idx) => (
            <Link
              key={idx}
              href={m.href}
              className="group p-8 rounded-3xl border border-[#E5E7EB] bg-white hover:border-black/50 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                    {m.badge}
                  </span>
                </div>

                <h3 className="font-serif text-2xl text-black group-hover:underline">
                  {m.title}
                </h3>
                <p className="text-xs text-[#6F6F6F] mt-2.5 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-black">
                <span>{m.cta}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Neuro-Symbolic Verification Layers Explained */}
      <section className="bg-zinc-50/70 border-t border-[#E5E7EB] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F]">
                Neuro-Symbolic Methodology
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl text-black leading-[1.0]">
                Zero-Hallucination Discrepancy Detection
              </h2>
              <p className="text-sm text-[#6F6F6F] leading-relaxed">
                Conventional LLMs hallucinate calculations when analyzing hundred-page filings.
                VeritasESG delegates all percentage deltas, absolute totals, and intensity
                calculations to a deterministic Python engine before qualitative causal analysis.
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3 text-xs text-zinc-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black">Layer 1 (Internal Table Audit):</strong> Exact
                    YoY percent re-calculation against audited SEBI Principle 6 metric cells.
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-zinc-700">
                  <Globe className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black">Layer 2 (External Web Sub-Agent):</strong> Cross-verifies
                    qualitative claims against live media, regulatory notices, and watchdog reports.
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-zinc-700">
                  <Layers className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black">Layer 3 (Bounding-Box Citations):</strong> Interactive
                    visual proof highlighting original tables on cited PDF pages.
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm">
              <div className="border-b border-[#E5E7EB] pb-4 mb-6 flex items-center justify-between">
                <span className="font-serif text-xl text-black">Audit Logic Breakdown</span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Verified Sample Claim
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Public PR Statement
                  </div>
                  <div className="text-zinc-900 mt-1 font-sans font-medium text-sm italic">
                    &ldquo;Achieved an 18% absolute reduction in our total greenhouse gas footprint.&rdquo;
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="text-[10px] text-rose-800 uppercase font-bold">
                      Audited BRSR Reality
                    </div>
                    <div className="text-rose-950 font-bold mt-1 text-sm font-sans">
                      Scope 1: 51.8M → 54.2M tCO2e (+4.6%)
                    </div>
                    <div className="text-[11px] text-rose-700 mt-1 font-sans">
                      Verdict: <strong>CONTRADICTED</strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[10px] text-blue-800 uppercase font-bold">
                      External Web Footprint
                    </div>
                    <div className="text-blue-950 font-bold mt-1 text-sm font-sans">
                      Watchdog Scrutiny Flagged
                    </div>
                    <div className="text-[11px] text-blue-700 mt-1 font-sans">
                      Stance: <strong>CONTRADICTS PR NARRATIVE</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
