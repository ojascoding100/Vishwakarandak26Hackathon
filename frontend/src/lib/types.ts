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

export interface WebArticleCitation {
  title: string;
  url: string;
  source_name: string;
  published_date: string | null;
  snippet: string;
  stance: 'CORROBORATES' | 'CONTRADICTS' | 'NEUTRAL_MENTION';
}

export interface WebVerificationResult {
  web_corroboration_status:
    | 'EXTERNALLY_CORROBORATED'
    | 'EXTERNAL_DISCREPANCY_FOUND'
    | 'NO_PUBLIC_RECORDS_FOUND';
  web_summary: string;
  articles: WebArticleCitation[];
}

export interface BrsrMetric {
  id: number;
  company_id?: string | null;
  upload_id?: string | null;
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
  company_id?: string | null;
  upload_id?: string | null;
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
  web_verification?: WebVerificationResult | null;
  created_at: string | null;
}

export interface UploadedReport {
  id: string;
  filename: string;
  company_name: string;
  total_pages: number;
  file_url: string;
  status: string;
  claims_count: number;
  flags_count: number;
  metrics: BrsrMetric[];
  claims: AuditClaim[];
}

export interface UploadResponse {
  upload_id: string;
  filename: string;
  company_name: string;
  total_pages: number;
  file_url: string;
  claims_audited: number;
  flags_raised: number;
  claims: AuditClaim[];
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

export interface AuditDossier {
  title: string;
  entity_id: string;
  company_name: string;
  audited_standard: string;
  summary: {
    total_claims: number;
    contradicted: number;
    cherry_picked: number;
    unsubstantiated: number;
    supported: number;
    credibility_score: number;
  };
  claims: Array<{
    claim_text: string;
    verdict: string;
    indicator: string;
    metric_key: string;
    math_recheck: string | null;
    explanation: string;
    pdf_citation: string;
    web_corroboration: string;
    web_articles_count: number;
  }>;
}
