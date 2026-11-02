import type { Dataset, ClassificationLevel } from '../types/index.ts';

export interface HealthResponse {
  project: string;
  status: string;
  environment: string;
}

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';

export interface HealthCheckResult {
  status: ConnectionStatus;
  data?: HealthResponse;
  error?: string;
  checkedAt: string;
  endpoint: string;
}

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Backend Dataset representation from /api/datasets/
 */
export interface BackendDataset {
  id: string;
  name: string;
  source: string;
  classification: string;
  owner: string | null;
  allowed_purposes: string[];
  restricted_purposes: string[];
  region: string | null;
  encrypted: boolean;
  retention_days: number | null;
  sharing_allowed: boolean;
  columns: string[];
  sensitive_attributes: string[];
  data_description: string | null;
  created_at: string;
}

/**
 * Combination Engine API response
 */
export interface CombinationFinding {
  category: string;
  detail: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PrivacyRiskFinding {
  risk_type: string;
  status: 'DETECTED' | 'POTENTIAL' | 'UNKNOWN';
  detail: string;
  evidence: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CombinationAnalysisResponse {
  proposed_purpose: string;
  decision: 'PERMITTED' | 'RESTRICTED' | 'REQUIRES_REVIEW';
  reason: string;
  datasets: Array<{
    id: string;
    name: string;
    classification: string;
    allowed_purposes: string[];
    restricted_purposes: string[];
    region: string | null;
    encrypted: boolean;
    sharing_allowed: boolean;
  }>;
  findings: CombinationFinding[];
  privacy_risks: PrivacyRiskFinding[];
  privacy_overall_risk: 'NO_CONCERNS' | 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Intended Usage Policy Evaluation response
 */
export interface PolicyEvaluationResponse {
  dataset_id: string;
  dataset_name: string;
  proposed_purpose: string;
  decision: 'PERMITTED' | 'RESTRICTED' | 'REQUIRES_REVIEW';
  reason: string;
  policy_notes: string[];
  violated_rules: string[];
  missing_information: string[];
  recommendations: string[];
  evaluated_at: string;
}

/**
 * AI Investigation response matching backend InvestigationResponse
 */
export interface BackendInvestigationResponse {
  id: string;
  objective: string;
  datasets: string[];
  createdAt: string;
  status: 'UNDER_REVIEW' | 'ESCALATED' | 'APPROVED' | 'BLOCKED';
  humanReviewStatus: 'PENDING_DPO_APPROVAL' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'NOT_REQUIRED';
  stages: Array<{
    stage: number;
    name: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
    summary: string;
    timestamp: string;
  }>;
  observedFacts: string[];
  toolAnalysis: string[];
  aiInterpretation: string[];
  unknownInformation: string[];
  recommendations: string[];
  dpoAuditNotes: {
    investigationScope: string;
    datasetsInvolved: string[];
    policiesEvaluated: string[];
    verifiedEvidence: string[];
    aiInterpretationSummary: string;
    uncertaintiesAndGaps: string[];
    humanApprovalRequired: boolean;
    recommendedDisposition: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'ESCALATE_TO_BOARD';
  };
  aiModelInfo: {
    provider: 'META_AI' | 'DETERMINISTIC_FALLBACK';
    modelName: string;
    isLiveCall: boolean;
    fallbackReason: string | null;
  };
}

/**
 * Perform a live health check to the FastAPI backend using fetch().
 */
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const endpoint = `${API_BASE_URL}/api/health`;
  const checkedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'DISCONNECTED',
        error: `HTTP ${response.status}: ${response.statusText}`,
        checkedAt,
        endpoint
      };
    }

    const data: HealthResponse = await response.json();

    if (data && data.status === 'healthy') {
      return {
        status: 'CONNECTED',
        data,
        checkedAt,
        endpoint
      };
    }

    return {
      status: 'DISCONNECTED',
      error: `Unexpected payload: status is '${data?.status}'`,
      checkedAt,
      endpoint
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Connection timed out (4s)'
          : err.message
        : 'Network error';

    return {
      status: 'DISCONNECTED',
      error: errorMsg,
      checkedAt,
      endpoint
    };
  }
}

/**
 * Fetch all registered datasets from the backend.
 */
export async function fetchDatasets(): Promise<BackendDataset[]> {
  const res = await fetch(`${API_BASE_URL}/api/datasets/`);
  if (!res.ok) {
    throw new Error(`Failed to fetch datasets: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a single dataset by ID.
 */
export async function fetchDatasetById(id: string): Promise<BackendDataset> {
  const res = await fetch(`${API_BASE_URL}/api/datasets/${id}`);
  if (!res.ok) {
    throw new Error(`Dataset not found: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Convert a backend dataset into the frontend Dataset model for UI components.
 */
export function mapBackendDatasetToFrontend(ds: BackendDataset): Dataset {
  const isRestricted = ds.classification.toUpperCase() === 'RESTRICTED';
  const isConfidential = ds.classification.toUpperCase() === 'CONFIDENTIAL';
  const level: ClassificationLevel = (
    isRestricted ? 'RESTRICTED' :
    isConfidential ? 'CONFIDENTIAL' :
    ds.classification.toUpperCase() === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL'
  );

  return {
    id: ds.id,
    name: ds.name,
    storageSource: ds.source,
    storageType: (ds.source.toLowerCase().includes('minio') ? 'MinIO' : 'LocalFS') as 'MinIO' | 'S3' | 'LocalFS',
    classification: level,
    owner: ds.owner || 'Unassigned Steward',
    department: 'Corporate Governance',
    lastUpdated: ds.created_at ? new Date(ds.created_at).toLocaleString() : 'Recently indexed',
    governanceStatus: (isRestricted ? 'RESTRICTED' : isConfidential ? 'FLAGGED' : 'COMPLIANT') as 'COMPLIANT' | 'NEEDS_REVIEW' | 'FLAGGED' | 'RESTRICTED',
    sizeBytes: 15461888,
    recordCount: 120000,
    format: ds.name.endsWith('.parquet') ? 'PARQUET' : 'CSV',
    description: ds.data_description || `Authoritative registered dataset from ${ds.source}`,
    fields: (ds.columns || []).map((col) => ({
      name: col,
      type: 'VARCHAR(120)',
      isIdentifier: col.includes('id') || col.includes('email') || col.includes('ssn'),
      sensitivity: (
        (ds.sensitive_attributes || []).includes(col) ? 'Critical' :
        col.includes('id') ? 'High' : 'Medium'
      ) as 'Low' | 'Medium' | 'High' | 'Critical',
      description: `Attribute field ${col}`
    }))
  };
}


/**
 * Run Dataset Combination Governance & Privacy Analysis
 */
export async function analyzeCombination(datasetIds: string[], proposedPurpose: string): Promise<CombinationAnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/combination/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_ids: datasetIds,
      proposed_purpose: proposedPurpose
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || `Combination analysis failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Evaluate Intended Usage Policy against a single dataset's Data Passport
 */
export async function evaluatePolicy(payload: {
  datasetId: string;
  proposedPurpose: string;
  operation?: 'READ' | 'AGGREGATE' | 'EXPORT' | 'RETRAIN_MODEL';
  requesterRole?: string;
  targetRegion?: string;
}): Promise<PolicyEvaluationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/policy/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: payload.datasetId,
      proposed_purpose: payload.proposedPurpose,
      operation: payload.operation || 'READ',
      requester_role: payload.requesterRole,
      target_region: payload.targetRegion
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Policy evaluation failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Run a multi-vector AI Investigation
 */
export async function runAIInvestigation(payload: {
  objective: string;
  datasetIds: string[];
  proposedPurpose: string;
  operation?: string;
  requesterRole?: string;
  targetRegion?: string;
}): Promise<BackendInvestigationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/investigation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objective: payload.objective,
      datasetIds: payload.datasetIds,
      proposedPurpose: payload.proposedPurpose,
      operation: payload.operation || 'READ',
      requesterRole: payload.requesterRole,
      targetRegion: payload.targetRegion
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || err.detail || `Investigation failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch Lineage topology graph for a dataset
 */
export async function fetchDatasetLineage(datasetId: string, direction: 'upstream' | 'downstream' | 'both' = 'both') {
  const res = await fetch(`${API_BASE_URL}/api/lineage/${datasetId}?direction=${direction}`);
  if (!res.ok) {
    throw new Error(`Failed to load lineage: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch all storage connections
 */
export async function fetchStorageConnections() {
  const res = await fetch(`${API_BASE_URL}/api/storage/connections`);
  if (!res.ok) {
    throw new Error(`Failed to load storage connections: HTTP ${res.status}`);
  }
  return res.json();
}
