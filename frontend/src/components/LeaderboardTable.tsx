'use client';

import React, { useEffect, useState } from 'react';
import { fetchCompanies } from '@/lib/api';
import { Company } from '@/lib/types';
import { Search, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LeaderboardTableProps {
  onSelectCompany?: (companyId: string) => void;
}

const SECTORS = [
  'All',
  'Energy & Materials',
  'IT & Services',
  'Automotive',
  'Consumer Goods',
];

export default function LeaderboardTable({ onSelectCompany }: LeaderboardTableProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchCompanies(search, selectedSector);
      setCompanies(data);
      setIsLoading(false);
    };

    const debounce = setTimeout(load, 250);
    return () => clearTimeout(debounce);
  }, [search, selectedSector]);

  const handleInspect = (companyId: string) => {
    if (onSelectCompany) {
      onSelectCompany(companyId);
    }
    const el = document.getElementById('auditor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'B':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'C':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'D':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-red-50 text-red-800 border-red-300';
    }
  };

  return (
    <div id="leaderboard" className="max-w-7xl mx-auto px-6 py-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F]">
            SEBI Principle 6 Benchmark
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl text-black mt-1">
            20-Company Macro Leaderboard
          </h2>
          <p className="text-sm text-[#6F6F6F] mt-2 max-w-xl">
            Live compliance index cross-referencing corporate public claims against audited BRSR
            filings submitted to NSE/BSE.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6F6F6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company or ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-[#E5E7EB] rounded-full text-sm text-black placeholder:text-[#6F6F6F] focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Sector Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setSelectedSector(sector)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedSector === sector
                ? 'bg-black text-white shadow-sm'
                : 'bg-white text-zinc-600 border border-[#E5E7EB] hover:border-black'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-zinc-50/70 text-xs font-semibold text-[#6F6F6F] uppercase tracking-wider">
              <th className="py-4 px-6">Company</th>
              <th className="py-4 px-6">Sector</th>
              <th className="py-4 px-6">BRSR Filing</th>
              <th className="py-4 px-6 text-center">Claims Audited</th>
              <th className="py-4 px-6 text-center">Flags Raised</th>
              <th className="py-4 px-6 text-center">Credibility</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#6F6F6F]">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                  Loading audited companies...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#6F6F6F]">
                  No companies matched your search criteria.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-zinc-50/80 transition-colors group"
                >
                  {/* Company Name & Ticker */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 border border-[#E5E7EB] flex items-center justify-center font-serif text-sm font-semibold text-black">
                        {company.logo_initial}
                      </div>
                      <div>
                        <div className="font-medium text-black group-hover:underline">
                          {company.name}
                        </div>
                        <div className="text-xs text-[#6F6F6F]">{company.ticker}</div>
                      </div>
                    </div>
                  </td>

                  {/* Sector */}
                  <td className="py-4 px-6 text-zinc-600">{company.sector}</td>

                  {/* BRSR Status */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-zinc-700">
                        {company.brsr_fy} ({company.filing_pages} pp)
                      </span>
                    </div>
                  </td>

                  {/* Claims Audited */}
                  <td className="py-4 px-6 text-center font-medium text-zinc-900">
                    {company.claims_audited ?? 3}
                  </td>

                  {/* Discrepancy Flags Raised */}
                  <td className="py-4 px-6 text-center">
                    {(company.discrepancy_flags ?? 1) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        {company.discrepancy_flags ?? 1}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">0 flags</span>
                    )}
                  </td>

                  {/* Credibility Grade */}
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-block w-7 h-7 rounded-full text-center leading-7 text-xs font-bold border ${getGradeBadge(
                        company.credibility_grade
                      )}`}
                    >
                      {company.credibility_grade}
                    </span>
                  </td>

                  {/* Inspect Action */}
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleInspect(company.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-xs"
                    >
                      <span>Inspect Audit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

