export type Verdict = 'SUPPORTED' | 'CONTRADICTED' | 'CHERRY_PICKED' | 'UNSUBSTANTIATED';

export interface Company {
  id: string;
  name: string;
  sector: string;
  ticker: string;
  brsr_fy: string;
  brsr_status: string;
  filing_pages: number;
  credibility_grade: string;
  logo_initial: string;
  claims_audited?: number;
  discrepancy_flags?: number;
}

export interface BrsrMetric {
  id: number;
  company_id: string;
  indicator: string;
  indicator_name: string;
  category: string;
  metric_key: string;
  fy_current: number;
  fy_previous: number;
  unit: string;
  page_number: number;
  table_index: number;
  bbox: [number, number, number, number] | null;
}

export interface AuditClaim {
  id: number;
  company_id: string;
  claim_text: string;
  source: string;
  indicator: string;
  metric_key: string;
  verdict: Verdict;
  explanation: string;
  claimed_value: string | null;
  actual_value: string | null;
  yoy_change_pct: number | null;
  page_number: number | null;
  bbox: [number, number, number, number] | null;
  created_at: string | null;
}

export interface BenchmarkItem {
  id: number;
  company_id: string;
  claim_text: string;
  source: string;
  indicator: string;
  metric_key: string;
  ground_truth: Verdict;
  predicted: Verdict;
  agreed: boolean;
  flag_agreement: boolean;
  explanation: string;
}

export interface BenchmarkResult {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
  total_items: number;
  engine_mode: string;
  items: BenchmarkItem[];
}

export interface EngineStatus {
  mode: string;
  label: string;
  healthy: boolean;
  detail: string;
  model: string;
}

export interface VerifyResponse {
  claims: AuditClaim[];
  engine_mode: string;
}
