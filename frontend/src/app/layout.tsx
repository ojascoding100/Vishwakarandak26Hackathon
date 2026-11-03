import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'VeritasESG® — Autonomous Sustainability Claim & BRSR Audit Platform',
  description:
    'Forensic verification of corporate ESG claims against audited SEBI BRSR Principle 6 filings with pixel-level PDF bounding-box certainty.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-white text-black font-sans antialiased selection:bg-black selection:text-white min-h-screen flex flex-col">
        {/* Global Navigation Header */}
        <Navbar />

        {/* Multi-Page Route Content */}
        <main className="flex-grow">{children}</main>

        {/* Global Editorial Footer */}
        <footer className="border-t border-[#E5E7EB] bg-white py-12 px-6 mt-16">
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
                Triple-Tier: Ollama Qwen3-8B local &bull; Gemini 2.5 Flash cloud &bull; Deterministic Heuristic Fallback &bull; Web Search Sub-Agent
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
