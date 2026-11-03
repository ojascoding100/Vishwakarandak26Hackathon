'use client';

import React, { Suspense } from 'react';
import SplitAuditor from '@/components/SplitAuditor';

function AuditorContent() {
  return <SplitAuditor />;
}

export default function AuditorPage() {
  return (
    <div className="min-h-screen bg-zinc-50/40">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-6 py-24 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mb-4" />
            <p className="text-sm text-zinc-600 font-medium font-mono">
              Loading Forensic Auditor &amp; Evidence Vault...
            </p>
          </div>
        }
      >
        <AuditorContent />
      </Suspense>
    </div>
  );
}

