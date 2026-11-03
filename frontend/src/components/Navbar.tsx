'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchEngineStatus } from '@/lib/api';
import { EngineStatus } from '@/lib/types';
import { ShieldCheck, Cpu, AlertTriangle, UploadCloud } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
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

  const navLinks = [
    { label: 'Platform', href: '/' },
    { label: '20-Company Index', href: '/directory' },
    { label: 'Upload Studio', href: '/upload', isNew: true },
    { label: 'Live Auditor', href: '/auditor' },
    { label: 'Sandbox', href: '/sandbox' },
    { label: 'Benchmark', href: '/benchmark' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="font-serif text-3xl tracking-tight text-black hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <span>VeritasESG</span>
            <span className="text-xs align-super font-sans font-semibold tracking-normal text-[#6F6F6F]">
              ®
            </span>
          </Link>

          {/* Engine Status Micro-Pill */}
          <div
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()}`}
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

        {/* Editorial Multi-Page Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-sm">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'text-black font-semibold border-b-2 border-black pb-0.5'
                    : 'text-[#6F6F6F] hover:text-black font-medium'
                }`}
              >
                <span>{link.label}</span>
                {link.isNew && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black text-white">
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button: Route directly to Upload Studio */}
        <div className="flex items-center space-x-3">
          <Link
            href="/upload"
            className="rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload &amp; Audit PDF</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
