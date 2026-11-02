export type ClassificationLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type GovernanceStatus = 'COMPLIANT' | 'NEEDS_REVIEW' | 'FLAGGED' | 'RESTRICTED';

export type VerificationState = 'VERIFIED' | 'USER_PROVIDED' | 'UNKNOWN';

export interface Dataset {
  id: string;
  name: string;
  storageSource: string;
  storageType: 'MinIO' | 'S3' | 'LocalFS';
  classification: ClassificationLevel;
  owner: string;
  department: string;
  lastUpdated: string;
  governanceStatus: GovernanceStatus;
  sizeBytes: number;
  recordCount: number;
  format: string;
  description: string;
  fields: {
    name: string;
    type: string;
    isIdentifier?: boolean;
    sensitivity: 'Low' | 'Medium' | 'High' | 'Critical';
    description?: string;
  }[];
}

export interface GovernanceRule {
  allowedPurposes: string[];
  restrictedPurposes: string[];
  allowedRegions: string[];
  encryptionRequirements: string;
  accessPermissions: string;
  sharingRestrictions: string;
  retentionPeriod: string;
}

export interface DataPassport {
  datasetId: string;
  datasetName: string;
  identity: {
    owner: string;
    department: string;
    source: string;
    originSystem: string;
    createdAt: string;
    lastAudited: string;
    verifiedState: VerificationState;
  };
  classification: {
    level: ClassificationLevel;
    rationale: string;
    classifiedBy: string;
    verifiedState: VerificationState;
  };
  governanceRules: {
    rules: GovernanceRule;
    verifiedState: VerificationState;
  };
  lineage: {
    parentDatasets: string[];
    derivedDatasets: string[];
    knownCopies: {
      location: string;
      environment: string;
      lastSynced: string;
    }[];
    transformations: string[];
    verifiedState: VerificationState;
  };
}

export interface RiskFinding {
  id: string;
  datasetId: string;
  datasetName: string;
  category: 'PRIVACY_CORRELATION' | 'UNAUTHORIZED_REUSE' | 'CROSS_BORDER' | 'RETENTION_EXCEEDED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  detectedAt: string;
  summary: string;
  details: string;
  heuristicOnly: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'DISCOVERY' | 'PASSPORT_CREATED' | 'COMBINATION_ANALYSIS' | 'USAGE_EVALUATION' | 'INVESTIGATION_RUN';
  title: string;
  dataset: string;
  actor: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
}

export interface StorageConnection {
  id: string;
  name: string;
  provider: 'MinIO' | 'AWS S3' | 'Google Cloud Storage' | 'Azure Blob';
  endpoint: string;
  bucketCount: number;
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED';
  isLocal: boolean;
  notes: string;
}

export interface EvaluationRequest {
  datasetId: string;
  intendedPurpose: string;
  operation: 'READ' | 'AGGREGATE' | 'EXPORT' | 'RETRAIN_MODEL';
  requesterRole: string;
  targetRegion: string;
}

export interface EvaluationResult {
  decision: 'PERMITTED' | 'RESTRICTED' | 'REQUIRES_REVIEW';
  datasetName: string;
  proposedPurpose: string;
  policyNotes: string[];
  violatedRules: string[];
  missingInformation: string[];
  recommendations: string[];
  evaluatedAt: string;
}

export interface InvestigationStage {
  stage: number;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  summary: string;
  timestamp: string;
}

export interface Investigation {
  id: string;
  objective: string;
  datasets: string[];
  createdAt: string;
  status: 'UNDER_REVIEW' | 'ESCALATED' | 'APPROVED' | 'BLOCKED';
  stages: InvestigationStage[];
  observedFacts: string[];
  toolAnalysis: string[];
  aiInterpretation: string[];
  recommendations: string[];
  unknownInformation: string[];
  confidenceScore: number; // 0 - 100
  humanReviewStatus: 'PENDING_DPO_APPROVAL' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED';
}

export interface LineageNode {
  id: string;
  label: string;
  type: 'SOURCE' | 'PROCESSED' | 'DERIVED' | 'AI_MODEL';
  classification: ClassificationLevel;
  governanceStatus: GovernanceStatus;
  x: number;
  y: number;
  storage: string;
  recordCount: string;
  copiesCount: number;
}

export interface LineageEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  transformationType: 'ETL_CLEANSE' | 'IDENTITY_JOIN' | 'FEATURE_ENGINEERING';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  dataset: string;
  actor: string;
  operation: string;
  result: 'SUCCESS' | 'DENIED' | 'FLAGGED';
  ipAddress: string;
}
