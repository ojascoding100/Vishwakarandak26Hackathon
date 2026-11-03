'use client';

import React, { useEffect, useState } from 'react';
import { fetchEngineStatus } from '@/lib/api';
import { EngineStatus } from '@/lib/types';
import { ShieldCheck, Cpu, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await fetchEngineStatus();
      setEngineStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getBadgeStyle = () => {
    if (!engineStatus || !engineStatus.healthy) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (engineStatus.mode === 'LOCAL') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (engineStatus.mode === 'CLOUD') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-zinc-100 text-zinc-700 border-zinc-300';
  };

  const getStatusIcon = () => {
    if (!engineStatus || !engineStatus.healthy) {
      return <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />;
    }
    if (engineStatus.mode === 'LOCAL') {
      return <Cpu className="w-3 h-3 text-emerald-600" />;
    }
    return <ShieldCheck className="w-3 h-3 text-zinc-600" />;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-4">
          <a
            href="#"
            className="font-serif text-3xl tracking-tight text-black hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <span>VeritasESG</span>
            <span className="text-xs align-super font-sans font-semibold tracking-normal text-[#6F6F6F]">
              ®
            </span>
          </a>

          {/* Engine Status Micro-Pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()}`}
            title={engineStatus?.detail || 'Audit Engine'}
          >
            {getStatusIcon()}
            <span>
              {engineStatus
                ? `Engine: ${engineStatus.label}`
                : 'Engine: Probing local Ollama...'}
            </span>
          </div>
        </div>

        {/* Editorial Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <button
            onClick={() => scrollTo('hero')}
            className="text-[#6F6F6F] hover:text-black transition-colors"
          >
            Platform
          </button>
          <button
            onClick={() => scrollTo('leaderboard')}
            className="text-[#6F6F6F] hover:text-black transition-colors"
          >
            20-Company Index
          </button>
          <button
            onClick={() => scrollTo('auditor')}
            className="text-[#6F6F6F] hover:text-black transition-colors"
          >
            Live Auditor
          </button>
          <button
            onClick={() => scrollTo('benchmark')}
            className="text-[#6F6F6F] hover:text-black transition-colors"
          >
            Benchmark & Accuracy
          </button>
          <button
            onClick={() => scrollTo('sandbox')}
            className="text-[#6F6F6F] hover:text-black transition-colors"
          >
            Ad-Hoc Sandbox
          </button>
        </nav>

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => scrollTo('auditor')}
            className="rounded-full px-6 py-2.5 text-sm font-medium bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            <span>Audit Filing</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
