'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import LeaderboardTable from '@/components/LeaderboardTable';
import SplitAuditor from '@/components/SplitAuditor';
import LiveSandbox from '@/components/LiveSandbox';
import BenchmarkModal from '@/components/BenchmarkModal';
import { ShieldCheck, Award } from 'lucide-react';

export default function Home() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('reliance');

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar />

      <main className="flex-grow">
        {/* View 1: Cinematic Hero Landing Page */}
        <HeroSection />

        {/* View 2: 20-Company Macro Leaderboard & Filter Matrix */}
        <section className="border-t border-[#E5E7EB] bg-white">
          <LeaderboardTable onSelectCompany={handleSelectCompany} />
        </section>

        {/* View 3: Split-Screen Forensic Auditor & Interactive PDF Evidence Viewer */}
        <section className="border-t border-[#E5E7EB] bg-zinc-50/50">
          <SplitAuditor initialCompanyId={selectedCompanyId} />
        </section>

        {/* View 4: Live Ad-Hoc Sandbox Auditor */}
        <section className="border-t border-[#E5E7EB] bg-white">
          <LiveSandbox />
        </section>

        {/* View 5: Empirical Benchmark & Evaluation Engine */}
        <section className="border-t border-[#E5E7EB] bg-zinc-50/30">
          <BenchmarkModal />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-14 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[#6F6F6F]">
          <div className="flex items-center space-x-3">
            <span className="font-serif text-2xl text-black font-normal tracking-tight">
              VeritasESG®
            </span>
            <span className="text-zinc-300">|</span>
            <div className="flex items-center space-x-1.5 text-xs text-zinc-600">
              <Award className="w-4 h-4 text-black" />
              <span>Vishwakarandak &apos;26 Sustainability Track (SUS-12)</span>
            </div>
          </div>

          <div className="text-xs text-center md:text-right text-[#6F6F6F] space-y-1">
            <p>
              Autonomous forensic verification platform for corporate ESG disclosures under SEBI BRSR guidelines.
            </p>
            <p className="font-mono text-[11px] text-zinc-400">
              Dual-Engine: Ollama Qwen3-8B local &bull; Gemini 2.5 Flash cloud &bull; Deterministic Python Rule Fallback
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
