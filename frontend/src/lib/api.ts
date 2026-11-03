import {
  AuditClaim,
  BenchmarkItem,
  BenchmarkResult,
  BrsrMetric,
  Company,
  EngineStatus,
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

export async function verifyText(text: string, companyId: string): Promise<VerifyResponse> {
  const res = await fetch(`${API_BASE}/api/audits/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, company_id: companyId }),
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
