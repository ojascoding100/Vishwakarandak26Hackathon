'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LeaderboardTable from '@/components/LeaderboardTable';

export default function DirectoryPage() {
  const router = useRouter();

  const handleSelectCompany = (companyId: string) => {
    router.push(`/auditor?companyId=${companyId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <LeaderboardTable onSelectCompany={handleSelectCompany} />
    </div>
  );
}

