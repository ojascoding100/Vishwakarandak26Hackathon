import {
  AuditClaim,
  AuditDossier,
  BenchmarkItem,
  BenchmarkResult,
  BrsrMetric,
  Company,
  EngineStatus,
  UploadedReport,
  UploadResponse,
  VerifyResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCompanies(search?: string, sector?: string): Promise<Company[]> {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sector && sector !== 'All') params.append('sector', sector);
    const url = `${API_BASE}/api/companies${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    return await handleResponse<Company[]>(res);
  } catch (err) {
    console.error('Failed to fetch companies:', err);
    return [];
  }
}

export async function fetchCompany(id: string): Promise<Company | null> {
  try {
    const res = await fetch(`${API_BASE}/api/companies/${id}`, { cache: 'no-store' });
    return await handleResponse<Company>(res);
  } catch (err) {
    console.error(`Failed to fetch company ${id}:`, err);
    return null;
  }
}

export async function fetchCompanyMetrics(id: string): Promise<BrsrMetric[]> {
  try {
    const res = await fetch(`${API_BASE}/api/companies/${id}/metrics`, { cache: 'no-store' });
    return await handleResponse<BrsrMetric[]>(res);
  } catch (err) {
    console.error(`Failed to fetch metrics for company ${id}:`, err);
    return [];
  }
}

export async function fetchCompanyClaims(id: string): Promise<AuditClaim[]> {
  try {
    const res = await fetch(`${API_BASE}/api/companies/${id}/claims`, { cache: 'no-store' });
    return await handleResponse<AuditClaim[]>(res);
  } catch (err) {
    console.error(`Failed to fetch claims for company ${id}:`, err);
    return [];
  }
}

export async function uploadPdf(
  file: File,
  companyName?: string,
  enableWebSearch: boolean = false
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (companyName) {
    formData.append('company_name', companyName);
  }
  formData.append('enable_web_search', enableWebSearch ? 'true' : 'false');

  const res = await fetch(`${API_BASE}/api/upload/pdf`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<UploadResponse>(res);
}

export async function fetchUploadedReport(uploadId: string): Promise<UploadedReport | null> {
  try {
    const res = await fetch(`${API_BASE}/api/upload/${uploadId}`, { cache: 'no-store' });
    return await handleResponse<UploadedReport>(res);
  } catch (err) {
    console.error(`Failed to fetch uploaded report ${uploadId}:`, err);
    return null;
  }
}

export async function runWebVerifyClaim(claimId: number): Promise<AuditClaim> {
  const res = await fetch(`${API_BASE}/api/audits/${claimId}/web-verify`, {
    method: 'POST',
  });
  return handleResponse<AuditClaim>(res);
}

export async function exportAuditDossier(entityId: string): Promise<AuditDossier> {
  const res = await fetch(`${API_BASE}/api/audits/${entityId}/export`, { cache: 'no-store' });
  return handleResponse<AuditDossier>(res);
}

export async function fetchDemoPresets(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/audits/demo-presets`, { cache: 'no-store' });
    return await handleResponse<any[]>(res);
  } catch (err) {
    console.warn('Backend unavailable for demo presets. Using built-in offline demonstration data:', err);
    // Offline deterministic presets fallback
    return [
      {
        id: 'demo-1-contradicted',
        company_id: 'reliance',
        company_name: 'Reliance Industries Limited',
        ticker: 'RELIANCE.NS',
        sector: 'Energy & Materials',
        claim_text:
          'In FY25, Reliance achieved an 18% absolute reduction in our total greenhouse gas emissions, reflecting our net-zero operational pledge.',
        source: 'Corporate Press Release & MD&A Summary',
        indicator: 'EI-7',
        indicator_name: 'Scope 1 & 2 GHG Emissions',
        metric_key: 'scope1_tco2e',
        verdict: 'CONTRADICTED',
        claimed_value: '-18% Absolute Reduction',
        actual_value: 'Scope 1: 51.8M → 54.2M tCO2e (+4.6% YoY Increase)',
        yoy_change_pct: 4.63,
        page_number: 92,
        bbox: [52, 180, 558, 225],
        explanation:
          'Deterministic audit reveals Scope 1 GHG emissions increased from 51,800,000 to 54,200,000 tCO2e (+4.63%). The public claim of an 18% absolute reduction is mathematically contradicted by the audited BRSR Principle 6 filing.',
        web_verification: {
          web_corroboration_status: 'EXTERNAL_DISCREPANCY_FOUND',
          web_summary:
            'Environmental watchdog reports and industry analysis corroborate that gross emissions expanded at Jamnagar refining assets, disputing claims of footprint shrinkage.',
          articles: [
            {
              title: 'Watchdog Scrutiny: Decarbonization Claims vs Audited Industrial Realities',
              url: 'https://www.environmentalwatchdog.org/reports/reliance-emissions-scrutiny',
              source_name: 'Environmental Watchdog India',
              published_date: '2025-08-14',
              snippet:
                'Independent analysts questioned corporate assertions regarding emission drops after state BRSR disclosures confirmed continuous gross throughput increases.',
              stance: 'CONTRADICTS',
            },
            {
              title: 'Industrial GHG Footprint Analysis FY25: Top Indian Emitters',
              url: 'https://economictimes.indiatimes.com/industry/energy/industrial-emissions-fy25',
              source_name: 'The Economic Times',
              published_date: '2025-06-20',
              snippet:
                'Audited SEBI filings indicate emissions trajectory followed refining expansion rather than immediate absolute net decline.',
              stance: 'CONTRADICTS',
            },
          ],
        },
      },
      {
        id: 'demo-2-cherrypicked',
        company_id: 'tata_steel',
        company_name: 'Tata Steel Limited',
        ticker: 'TATASTEEL.NS',
        sector: 'Energy & Materials',
        claim_text:
          'Tata Steel achieved a benchmark carbon intensity of 2.42 tCO2e per tonne of crude steel, showcasing industry-leading decarbonization progress.',
        source: 'Annual ESG Highlights Brochure',
        indicator: 'EI-7',
        indicator_name: 'GHG Emission Intensity',
        metric_key: 'ghg_intensity_per_tonne',
        verdict: 'CHERRY_PICKED',
        claimed_value: 'Decarbonization Progress at 2.42 tCO2e/tonne',
        actual_value: 'Intensity: 2.38 → 2.42 tCO2e/tonne (+1.68% YoY Rise)',
        yoy_change_pct: 1.68,
        page_number: 78,
        bbox: [48, 310, 550, 350],
        explanation:
          "While the 2.42 intensity value exists in the report, the prior year figure was 2.38. Intensity rose by +1.68% YoY. Framing an increased emission rate as 'progress' cherry-picks the absolute number while omitting the worsening trend direction.",
        web_verification: {
          web_corroboration_status: 'EXTERNAL_DISCREPANCY_FOUND',
          web_summary:
            'Steel sector sustainability reviews confirm blast-furnace maintenance schedules temporarily increased specific emission intensity across eastern plants.',
          articles: [
            {
              title: 'Steel Decarbonization Watch: Tracking Crude Steel Specific Emissions',
              url: 'https://www.cseindia.org/ratings/steel-decarbonization-benchmark',
              source_name: 'Center for Science & Environment',
              published_date: '2025-05-19',
              snippet:
                'Blast-furnace coal blend transitions led to marginal increases in carbon intensity across domestic steel producers during the reported period.',
              stance: 'CONTRADICTS',
            },
          ],
        },
      },
      {
        id: 'demo-3-unsubstantiated',
        company_id: 'ultratech',
        company_name: 'UltraTech Cement Limited',
        ticker: 'ULTRACEMCO.NS',
        sector: 'Energy & Materials',
        claim_text:
          'UltraTech achieved the lowest clinker factor and highest circular material integration in the Indian cement manufacturing sector.',
        source: 'Investor Presentation & MD Address',
        indicator: 'EI-7',
        indicator_name: 'Cement Emission & Clinker Disclosures',
        metric_key: 'ghg_intensity_per_tonne',
        verdict: 'UNSUBSTANTIATED',
        claimed_value: 'Sector-Lowest Clinker Factor',
        actual_value: 'BRSR reports 0.548 tCO2e/tonne (No industry peer clinker data)',
        yoy_change_pct: -2.32,
        page_number: 72,
        bbox: [50, 310, 555, 350],
        explanation:
          'While intensity declined to 0.548 tCO2e/tonne, the BRSR filing provides no comparative industry clinker factor data. Sector-wide superiority assertions cannot be substantiated from the audited document alone.',
        web_verification: {
          web_corroboration_status: 'NO_PUBLIC_RECORDS_FOUND',
          web_summary:
            'No verified peer-comparative clinker index published under official regulatory oversight corroborates the claim of achieving the lowest clinker ratio.',
          articles: [
            {
              title: 'Cement Industry Decarbonization & Clinker Factor Disclosures',
              url: 'https://www.livemint.com/market/cement-sustainability-ratings',
              source_name: 'Livemint Industry Desk',
              published_date: '2025-04-11',
              snippet:
                'Clinker factor disclosures remain voluntary and unstandardized across Indian cement producers under standard BRSR guidelines.',
              stance: 'NEUTRAL_MENTION',
            },
          ],
        },
      },
      {
        id: 'demo-4-supported',
        company_id: 'infosys',
        company_name: 'Infosys Limited',
        ticker: 'INFY.NS',
        sector: 'IT & Services',
        claim_text:
          'Infosys reduced total operational energy consumption by 5.4% while growing revenue, and sourced 60% of our power from renewable assets.',
        source: 'Integrated Annual Report & ESG Factsheet',
        indicator: 'EI-1',
        indicator_name: 'Energy Consumption & Clean Energy',
        metric_key: 'total_energy_gj',
        verdict: 'SUPPORTED',
        claimed_value: '-5.4% Total Energy | 60% Renewable Share',
        actual_value: 'Total: 6.15M → 5.82M GJ (-5.37%) | Renewable: 3.49M/5.82M GJ (59.97%)',
        yoy_change_pct: -5.37,
        page_number: 52,
        bbox: [55, 280, 545, 365],
        explanation:
          'Verified with 100% mathematical precision. Energy consumption fell from 6,150,000 to 5,820,000 GJ (-5.37%, accurately stated as 5.4%). Renewable energy accounted for 3,490,000 GJ (59.97%, accurately rounded to 60%). Claim is fully supported.',
        web_verification: {
          web_corroboration_status: 'EXTERNALLY_CORROBORATED',
          web_summary:
            'RE100 annual compliance data and external solar PPA verification confirm Infosys achieved stated campus solar procurement milestones.',
          articles: [
            {
              title: 'RE100 Global Leadership: Indian IT Sector Clean Energy Milestones',
              url: 'https://www.there100.org/news/indian-it-clean-energy-procurement',
              source_name: 'RE100 Climate Group',
              published_date: '2025-07-28',
              snippet:
                'Independent solar farm power purchase agreements in Karnataka and Tamil Nadu verified 60% renewable electricity coverage for campus facilities.',
              stance: 'CORROBORATES',
            },
          ],
        },
      },
    ];
  }
}

export async function verifyText(
  text: string,
  companyId: string,
  demoMode: boolean = false
): Promise<VerifyResponse> {
  const res = await fetch(`${API_BASE}/api/audits/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, company_id: companyId, demo_mode: demoMode }),
  });
  return handleResponse<VerifyResponse>(res);
}

export async function verifySingleClaim(
  claimText: string,
  companyId: string,
  indicator?: string,
  metricKey?: string
): Promise<AuditClaim> {
  const res = await fetch(`${API_BASE}/api/audits/verify-single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claim_text: claimText,
      company_id: companyId,
      indicator,
      metric_key: metricKey,
    }),
  });
  return handleResponse<AuditClaim>(res);
}

export async function fetchEngineStatus(): Promise<EngineStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/engine-status`, { cache: 'no-store' });
    return await handleResponse<EngineStatus>(res);
  } catch {
    return {
      mode: 'OFFLINE',
      label: 'Connecting to Audit Backend...',
      healthy: false,
      detail: 'Backend server not detected on port 8000',
      model: 'none',
    };
  }
}

export async function fetchBenchmarkGroundtruth(): Promise<BenchmarkItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/benchmark/groundtruth`, { cache: 'no-store' });
    return await handleResponse<BenchmarkItem[]>(res);
  } catch (err) {
    console.error('Failed to fetch benchmark ground truth:', err);
    return [];
  }
}

export async function runBenchmarkEvaluation(): Promise<BenchmarkResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/benchmark/evaluate`, {
      method: 'POST',
      cache: 'no-store',
    });
    return await handleResponse<BenchmarkResult>(res);
  } catch (err) {
    console.error('Failed to run benchmark evaluation:', err);
    return null;
  }
}

export async function fetchBenchmarkMetrics(): Promise<BenchmarkResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/benchmark/metrics`, { cache: 'no-store' });
    return await handleResponse<BenchmarkResult>(res);
  } catch (err) {
    console.error('Failed to fetch benchmark metrics:', err);
    return null;
  }
}
