import type {
  Dataset,
  DataPassport,
  RiskFinding,
  ActivityEvent,
  StorageConnection,
  Investigation,
  LineageNode,
  LineageEdge,
  AuditLogEntry
} from '../types/index.ts';

export const MOCK_DATASETS: Dataset[] = [
  {
    id: 'DS-9021',
    name: 'customer_profiles.csv',
    storageSource: 'minio-local/data-raw/crm',
    storageType: 'MinIO',
    classification: 'CONFIDENTIAL',
    owner: 'Sarah Jenkins (Customer Ops)',
    department: 'Customer Relations',
    lastUpdated: '2026-10-30 14:22:10 UTC',
    governanceStatus: 'COMPLIANT',
    sizeBytes: 44236800, // ~42.2 MB
    recordCount: 125000,
    format: 'CSV',
    description: 'Direct customer contact data and baseline demographics collected via user account creation.',
    fields: [
      { name: 'customer_id', type: 'UUID', isIdentifier: true, sensitivity: 'Critical', description: 'Primary customer key' },
      { name: 'name', type: 'VARCHAR(120)', isIdentifier: true, sensitivity: 'High', description: 'Full legal name' },
      { name: 'email', type: 'VARCHAR(255)', isIdentifier: true, sensitivity: 'Critical', description: 'Contact email' },
      { name: 'location', type: 'VARCHAR(80)', sensitivity: 'Medium', description: 'City, Country' },
      { name: 'signup_timestamp', type: 'TIMESTAMP', sensitivity: 'Low', description: 'Account registration time' }
    ]
  },
  {
    id: 'DS-9022',
    name: 'purchase_history.csv',
    storageSource: 'minio-local/data-raw/ecom',
    storageType: 'MinIO',
    classification: 'INTERNAL',
    owner: 'Markus Zhao (FinOps)',
    department: 'E-Commerce Platform',
    lastUpdated: '2026-11-01 09:15:44 UTC',
    governanceStatus: 'COMPLIANT',
    sizeBytes: 154618880, // ~147.4 MB
    recordCount: 1480000,
    format: 'CSV',
    description: 'Transaction log of all checkout purchases, cart totals, and payment gateway categories.',
    fields: [
      { name: 'transaction_id', type: 'UUID', isIdentifier: true, sensitivity: 'Low', description: 'Unique order identifier' },
      { name: 'customer_id', type: 'UUID', isIdentifier: true, sensitivity: 'High', description: 'Customer reference key' },
      { name: 'product', type: 'VARCHAR(100)', sensitivity: 'Low', description: 'SKU product title' },
      { name: 'purchase_date', type: 'DATE', sensitivity: 'Low', description: 'Date of checkout' },
      { name: 'amount', type: 'DECIMAL(10,2)', sensitivity: 'Medium', description: 'Total charge in USD' }
    ]
  },
  {
    id: 'DS-9023',
    name: 'employee_records.csv',
    storageSource: 'minio-local/hr-secure/vault',
    storageType: 'MinIO',
    classification: 'RESTRICTED',
    owner: 'Elena Rostova (People VP)',
    department: 'Human Resources',
    lastUpdated: '2026-10-15 11:00:00 UTC',
    governanceStatus: 'RESTRICTED',
    sizeBytes: 8192000, // ~7.8 MB
    recordCount: 3200,
    format: 'CSV',
    description: 'Confidential employee compensation, emergency contact, tax identifiers, and performance ratings.',
    fields: [
      { name: 'employee_id', type: 'VARCHAR(20)', isIdentifier: true, sensitivity: 'High', description: 'Internal employee badge' },
      { name: 'tax_identifier', type: 'VARCHAR(30)', isIdentifier: true, sensitivity: 'Critical', description: 'National tax ID / SSN' },
      { name: 'salary_bracket', type: 'VARCHAR(20)', sensitivity: 'Critical', description: 'Compensation tier' },
      { name: 'department', type: 'VARCHAR(50)', sensitivity: 'Low', description: 'Assigned division' },
      { name: 'performance_band', type: 'INT', sensitivity: 'High', description: 'Annual review band' }
    ]
  },
  {
    id: 'DS-9024',
    name: 'product_catalog.csv',
    storageSource: 'minio-local/public-assets/catalog',
    storageType: 'MinIO',
    classification: 'PUBLIC',
    owner: 'David Kim (Product Lead)',
    department: 'Merchandising',
    lastUpdated: '2026-10-28 18:40:02 UTC',
    governanceStatus: 'COMPLIANT',
    sizeBytes: 12582912, // ~12 MB
    recordCount: 45000,
    format: 'CSV',
    description: 'Public-facing item specifications, prices, descriptions, and manufacturer warranty terms.',
    fields: [
      { name: 'sku', type: 'VARCHAR(30)', isIdentifier: true, sensitivity: 'Low', description: 'Product stock code' },
      { name: 'title', type: 'VARCHAR(150)', sensitivity: 'Low', description: 'Public item title' },
      { name: 'retail_price', type: 'DECIMAL(8,2)', sensitivity: 'Low', description: 'MSRP price' },
      { name: 'category', type: 'VARCHAR(60)', sensitivity: 'Low', description: 'Category taxonomy' }
    ]
  },
  {
    id: 'DS-9025',
    name: 'website_events.csv',
    storageSource: 'minio-local/telemetry/web',
    storageType: 'MinIO',
    classification: 'INTERNAL',
    owner: 'Alex Rivera (Growth Analytics)',
    department: 'Digital Marketing',
    lastUpdated: '2026-11-01 16:02:18 UTC',
    governanceStatus: 'NEEDS_REVIEW',
    sizeBytes: 884736000, // ~843 MB
    recordCount: 9200000,
    format: 'CSV',
    description: 'Clickstream telemetry including user-agent strings, session duration, and referrers.',
    fields: [
      { name: 'event_id', type: 'UUID', isIdentifier: true, sensitivity: 'Low', description: 'Event identifier' },
      { name: 'session_id', type: 'VARCHAR(64)', isIdentifier: true, sensitivity: 'Medium', description: 'Browser session hash' },
      { name: 'ip_address_hash', type: 'VARCHAR(64)', sensitivity: 'Medium', description: 'Pseudonymized client IP' },
      { name: 'page_url', type: 'VARCHAR(500)', sensitivity: 'Low', description: 'Visited path' },
      { name: 'referrer', type: 'VARCHAR(500)', sensitivity: 'Low', description: 'Inbound source' }
    ]
  },
  {
    id: 'DS-9029',
    name: 'customer_behaviour_dataset.parquet',
    storageSource: 'minio-local/analytics/derived',
    storageType: 'MinIO',
    classification: 'CONFIDENTIAL',
    owner: 'Dr. Anita Patel (Data Science)',
    department: 'AI & Data Science',
    lastUpdated: '2026-11-01 12:30:00 UTC',
    governanceStatus: 'FLAGGED',
    sizeBytes: 24500000,
    recordCount: 118000,
    format: 'PARQUET',
    description: 'Derived dataset combining customer profiles with aggregate spend, generated for behavioral modeling.',
    fields: [
      { name: 'customer_id', type: 'UUID', isIdentifier: true, sensitivity: 'Critical', description: 'Joined customer key' },
      { name: 'location', type: 'VARCHAR(80)', sensitivity: 'Medium', description: 'Region of residence' },
      { name: 'lifetime_spend', type: 'DECIMAL(12,2)', sensitivity: 'High', description: 'Inferred purchasing capacity' },
      { name: 'frequent_category', type: 'VARCHAR(60)', sensitivity: 'Medium', description: 'Dominant purchase category' },
      { name: 'churn_probability', type: 'FLOAT', sensitivity: 'Medium', description: 'Predicted churn probability' }
    ]
  }
];

export const MOCK_PASSPORTS: Record<string, DataPassport> = {
  'DS-9021': {
    datasetId: 'DS-9021',
    datasetName: 'customer_profiles.csv',
    identity: {
      owner: 'Sarah Jenkins (Customer Ops)',
      department: 'Customer Relations',
      source: 'PostgreSQL Production Cluster (crm_users_v2)',
      originSystem: 'Direct Customer Registration Portal (Consent Form v4.1)',
      createdAt: '2025-04-12 10:00:00 UTC',
      lastAudited: '2026-10-15 08:30:00 UTC',
      verifiedState: 'VERIFIED'
    },
    classification: {
      level: 'CONFIDENTIAL',
      rationale: 'Contains direct Personally Identifiable Information (PII) including real names, emails, and home locations.',
      classifiedBy: 'Automated DLP Scanner (Pattern Rule #802) + Confirmed by Data Protection Officer',
      verifiedState: 'VERIFIED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: [
          'Direct customer support communications',
          'Account security verification',
          'Legal warranty servicing',
          'Internal billing reconciliations'
        ],
        restrictedPurposes: [
          'External advertising networks (ad-tech tracking)',
          'Commercial resale or data brokering',
          'Unconsented generative AI training',
          'Public demographic profiling'
        ],
        allowedRegions: ['EU (Frankfurt)', 'US-East (Virginia)', 'UK (London)'],
        encryptionRequirements: 'AES-256 at rest, TLS 1.3 in transit, KMS key rotation 90 days',
        accessPermissions: 'Role-Based Access Control (RBAC): tier_support_lead, compliance_officer',
        sharingRestrictions: 'Strictly prohibited from third-party egress without Data Transfer Agreement (DTA)',
        retentionPeriod: '24 months after account termination (Right-to-be-Forgotten enforced)'
      },
      verifiedState: 'VERIFIED'
    },
    lineage: {
      parentDatasets: ['prod-db-crm.public.users (PostgreSQL Primary)'],
      derivedDatasets: ['customer_behaviour_dataset.parquet (DS-9029)'],
      knownCopies: [
        { location: 'minio-local/data-raw/crm/customer_profiles.csv', environment: 'Local Staging', lastSynced: '2026-10-30 14:22 UTC' },
        { location: 'backup-cold-store/us-east-1/crm_snapshot_q3.csv', environment: 'Production Cold Storage', lastSynced: '2026-09-30 23:59 UTC' }
      ],
      transformations: [
        'Deduplication script (v2.1)',
        'Phone number international E.164 normalization'
      ],
      verifiedState: 'USER_PROVIDED'
    }
  },
  'DS-9022': {
    datasetId: 'DS-9022',
    datasetName: 'purchase_history.csv',
    identity: {
      owner: 'Markus Zhao (FinOps)',
      department: 'E-Commerce Platform',
      source: 'Stripe & Shopify Order Webhooks ETL',
      originSystem: 'Checkout Pipeline v3',
      createdAt: '2025-01-01 00:00:00 UTC',
      lastAudited: '2026-10-20 16:45:00 UTC',
      verifiedState: 'VERIFIED'
    },
    classification: {
      level: 'INTERNAL',
      rationale: 'Contains transactional financial volumes and product SKU interactions. No cleartext names or credit cards.',
      classifiedBy: 'FinOps Data Steward',
      verifiedState: 'VERIFIED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: [
          'Financial audits & tax filing',
          'Inventory demand forecasting',
          'Aggregate e-commerce revenue reporting',
          'Internal platform performance analytics'
        ],
        restrictedPurposes: [
          'External unmasked publication',
          'Correlation with third-party tracking cookies without consent',
          'Credit score determination'
        ],
        allowedRegions: ['Global (Corporate intranet)'],
        encryptionRequirements: 'Standard Volume Encryption (XTS-AES-256)',
        accessPermissions: 'Internal analytics engineering team, FinOps team',
        sharingRestrictions: 'Aggregated summaries allowed with Finance VP approval',
        retentionPeriod: '7 years (statutory tax compliance requirement)'
      },
      verifiedState: 'VERIFIED'
    },
    lineage: {
      parentDatasets: ['event_bus.orders_completed (Kafka topic)'],
      derivedDatasets: ['customer_behaviour_dataset.parquet (DS-9029)', 'monthly_sales_ledger.parquet'],
      knownCopies: [
        { location: 'minio-local/data-raw/ecom/purchase_history.csv', environment: 'Local Staging', lastSynced: '2026-11-01 09:15 UTC' }
      ],
      transformations: ['Currency exchange conversion to USD', 'Cancelled order stripping'],
      verifiedState: 'VERIFIED'
    }
  },
  'DS-9023': {
    datasetId: 'DS-9023',
    datasetName: 'employee_records.csv',
    identity: {
      owner: 'Elena Rostova (People VP)',
      department: 'Human Resources',
      source: 'Workday HRIS Integration',
      originSystem: 'Human Resources Management Information System',
      createdAt: '2024-03-15 00:00:00 UTC',
      lastAudited: '2026-10-01 12:00:00 UTC',
      verifiedState: 'VERIFIED'
    },
    classification: {
      level: 'RESTRICTED',
      rationale: 'Contains sensitive HR data, compensation tiers, performance rankings, and tax identification numbers.',
      classifiedBy: 'Chief Legal Officer & HR Compliance Director',
      verifiedState: 'VERIFIED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: [
          'Payroll processing and tax remittance',
          'Statutory employment reporting',
          'Health insurance carrier administration'
        ],
        restrictedPurposes: [
          'All commercial, marketing, and public applications',
          'Machine learning or LLM model training without explicit Board authorization',
          'Cross-departmental browsing or unauthenticated querying'
        ],
        allowedRegions: ['Designated HR enclave only (Frankfurt dedicated VPC)'],
        encryptionRequirements: 'Field-level tokenization + Envelope encryption with dedicated HSM hardware module',
        accessPermissions: 'Strict least-privilege: hr_lead_officers only with MFA hardware token',
        sharingRestrictions: 'Never exportable outside secure HR enclave without written legal clearance',
        retentionPeriod: 'Duration of employment + 5 years'
      },
      verifiedState: 'VERIFIED'
    },
    lineage: {
      parentDatasets: ['workday_core_employees (Encrypted replica)'],
      derivedDatasets: ['q4_payroll_summary.csv (Aggregated, masked)'],
      knownCopies: [
        { location: 'minio-local/hr-secure/vault/employee_records.csv', environment: 'Isolated Local Enclave', lastSynced: '2026-10-15 11:00 UTC' }
      ],
      transformations: ['SSN hashing', 'Field encryption filter'],
      verifiedState: 'UNKNOWN'
    }
  },
  'DS-9024': {
    datasetId: 'DS-9024',
    datasetName: 'product_catalog.csv',
    identity: {
      owner: 'David Kim (Product Lead)',
      department: 'Merchandising',
      source: 'PIM (Product Information Management System)',
      originSystem: 'Merchandising PIM v4',
      createdAt: '2025-06-01 00:00:00 UTC',
      lastAudited: '2026-10-25 00:00:00 UTC',
      verifiedState: 'VERIFIED'
    },
    classification: {
      level: 'PUBLIC',
      rationale: 'Public marketing descriptions and pricing intended for customer display on public storefront.',
      classifiedBy: 'Merchandising Catalog System',
      verifiedState: 'VERIFIED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: ['Public distribution', 'Marketing', 'Search indexing', 'Partner syndication'],
        restrictedPurposes: ['Tampering with official SKU pricing records'],
        allowedRegions: ['Worldwide (CDN cached)'],
        encryptionRequirements: 'Standard storage encryption',
        accessPermissions: 'Open read access across organization',
        sharingRestrictions: 'Unrestricted public distribution',
        retentionPeriod: 'Indefinite catalog history'
      },
      verifiedState: 'VERIFIED'
    },
    lineage: {
      parentDatasets: ['pim_master_catalog (PostgreSQL)'],
      derivedDatasets: ['algolia_search_index.json'],
      knownCopies: [
        { location: 'minio-local/public-assets/catalog/product_catalog.csv', environment: 'Local Staging', lastSynced: '2026-10-28 18:40 UTC' }
      ],
      transformations: ['HTML markdown rendering'],
      verifiedState: 'VERIFIED'
    }
  },
  'DS-9025': {
    datasetId: 'DS-9025',
    datasetName: 'website_events.csv',
    identity: {
      owner: 'Alex Rivera (Growth Analytics)',
      department: 'Digital Marketing',
      source: 'Snowplow Telemetry Collector',
      originSystem: 'Client JavaScript Tracker SDK',
      createdAt: '2025-09-01 00:00:00 UTC',
      lastAudited: '2026-10-29 00:00:00 UTC',
      verifiedState: 'USER_PROVIDED'
    },
    classification: {
      level: 'INTERNAL',
      rationale: 'Telemetry stream with hashed IP addresses. Potential re-identification risk if joined with session logs.',
      classifiedBy: 'Automated Heuristic Classifier',
      verifiedState: 'USER_PROVIDED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: ['Website performance monitoring', 'Conversion funnel optimization', 'A/B testing analytics'],
        restrictedPurposes: ['Targeted profiling without consent cookie banner acceptance', 'Selling clickstream to third-party brokers'],
        allowedRegions: ['EU, US'],
        encryptionRequirements: 'AES-256 at rest',
        accessPermissions: 'Marketing analytics team, Site reliability engineers',
        sharingRestrictions: 'Aggregated analytics permitted',
        retentionPeriod: '90 days raw, 365 days rolling aggregate'
      },
      verifiedState: 'USER_PROVIDED'
    },
    lineage: {
      parentDatasets: ['kinesis.telemetry_stream (AWS Kinesis)'],
      derivedDatasets: ['weekly_traffic_report.csv'],
      knownCopies: [
        { location: 'minio-local/telemetry/web/website_events.csv', environment: 'Local Staging', lastSynced: '2026-11-01 16:02 UTC' }
      ],
      transformations: ['IP octet masking', 'Bot traffic filtering'],
      verifiedState: 'UNKNOWN'
    }
  },
  'DS-9029': {
    datasetId: 'DS-9029',
    datasetName: 'customer_behaviour_dataset.parquet',
    identity: {
      owner: 'Dr. Anita Patel (Data Science)',
      department: 'AI & Data Science',
      source: 'Spark Transformation Job (Job #8821)',
      originSystem: 'Airflow Orchestrator DAG: crm_ecom_synthesis',
      createdAt: '2026-11-01 12:30:00 UTC',
      lastAudited: '2026-11-01 13:00:00 UTC',
      verifiedState: 'USER_PROVIDED'
    },
    classification: {
      level: 'CONFIDENTIAL',
      rationale: 'Inherits CONFIDENTIAL from customer_profiles.csv plus introduces sensitive purchasing power inference.',
      classifiedBy: 'DataTether Governance Engine (Policy Rule #INHERIT-04)',
      verifiedState: 'VERIFIED'
    },
    governanceRules: {
      rules: {
        allowedPurposes: ['Internal retention modeling', 'Customer churn analytics within authorized boundaries'],
        restrictedPurposes: [
          'External AI model fine-tuning without DPO sign-off',
          'Third-party marketing campaigns',
          'Unconsented customer profiling'
        ],
        allowedRegions: ['EU (Frankfurt)'],
        encryptionRequirements: 'Encrypted Parquet column encryption (KMS managed)',
        accessPermissions: 'Approved Data Science project members only',
        sharingRestrictions: 'Restricted; no exports outside analytics VPC',
        retentionPeriod: '12 months from generation'
      },
      verifiedState: 'VERIFIED'
    },
    lineage: {
      parentDatasets: ['customer_profiles.csv (DS-9021)', 'purchase_history.csv (DS-9022)'],
      derivedDatasets: ['AI Training Dataset (churn_predictor_v1)'],
      knownCopies: [
        { location: 'minio-local/analytics/derived/customer_behaviour_dataset.parquet', environment: 'Local Staging', lastSynced: '2026-11-01 12:30 UTC' }
      ],
      transformations: ['Inner join on customer_id', 'Sum(amount) aggregation', 'Churn probability scoring model'],
      verifiedState: 'USER_PROVIDED'
    }
  }
};

export const MOCK_RISK_FINDINGS: RiskFinding[] = [
  {
    id: 'RSK-1049',
    datasetId: 'DS-9029',
    datasetName: 'customer_behaviour_dataset.parquet',
    category: 'PRIVACY_CORRELATION',
    severity: 'HIGH',
    status: 'OPEN',
    detectedAt: '2026-11-01 12:45:10 UTC',
    summary: 'Correlated PII with spending amount enables personal financial tier re-identification.',
    details: 'Combining customer_profiles (location, name) with purchase_history (exact transaction amounts) enables heuristic inference of household income bracket, escalating the privacy footprint beyond original customer consent scope.',
    heuristicOnly: true
  },
  {
    id: 'RSK-1048',
    datasetId: 'DS-9021',
    datasetName: 'customer_profiles.csv',
    category: 'UNAUTHORIZED_REUSE',
    severity: 'MEDIUM',
    status: 'INVESTIGATING',
    detectedAt: '2026-10-31 18:20:00 UTC',
    summary: 'Proposed usage for external LLM fine-tuning conflicts with Passport restricted purpose.',
    details: 'Dataset Passport explicitly restricts generative AI training without separate consent clause v4.2. Request logged by Marketing Engineering.',
    heuristicOnly: false
  },
  {
    id: 'RSK-1045',
    datasetId: 'DS-9025',
    datasetName: 'website_events.csv',
    category: 'RETENTION_EXCEEDED',
    severity: 'LOW',
    status: 'RESOLVED',
    detectedAt: '2026-10-25 04:12:00 UTC',
    summary: 'Raw telemetry partition exceeded standard 90-day retention window.',
    details: 'Automated retention policy purged raw events older than 90 days; aggregates retained per policy.',
    heuristicOnly: false
  },
  {
    id: 'RSK-1042',
    datasetId: 'DS-9023',
    datasetName: 'employee_records.csv',
    category: 'UNAUTHORIZED_REUSE',
    severity: 'CRITICAL',
    status: 'OPEN',
    detectedAt: '2026-10-20 11:05:00 UTC',
    summary: 'Cross-boundary query attempt detected from non-HR staging environment.',
    details: 'An ad-hoc analytics script in staging attempted to select compensation tiers without required HSM authorization token.',
    heuristicOnly: false
  }
];

export const MOCK_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'ACT-501',
    type: 'COMBINATION_ANALYSIS',
    title: 'Combination Lab evaluated Customer Profiles + Purchase History',
    dataset: 'customer_profiles.csv & purchase_history.csv',
    actor: 'Dr. Anita Patel (Data Science)',
    timestamp: '15 mins ago',
    status: 'WARNING'
  },
  {
    id: 'ACT-502',
    type: 'USAGE_EVALUATION',
    title: 'Usage Evaluator checked AI Model Training request',
    dataset: 'customer_behaviour_dataset.parquet',
    actor: 'Governance Policy Engine',
    timestamp: '42 mins ago',
    status: 'ALERT'
  },
  {
    id: 'ACT-503',
    type: 'PASSPORT_CREATED',
    title: 'Data Passport issued and signed for customer_behaviour_dataset',
    dataset: 'customer_behaviour_dataset.parquet',
    actor: 'DataTether Governance Daemon',
    timestamp: '2 hours ago',
    status: 'SUCCESS'
  },
  {
    id: 'ACT-504',
    type: 'DISCOVERY',
    title: 'Storage Scanner indexed 5 datasets from Local MinIO bucket',
    dataset: 'minio-local/*',
    actor: 'Storage Scanner Worker #1',
    timestamp: '4 hours ago',
    status: 'SUCCESS'
  },
  {
    id: 'ACT-505',
    type: 'INVESTIGATION_RUN',
    title: 'AI Investigation initialized for Churn Predictor Training request',
    dataset: 'customer_profiles.csv',
    actor: 'Compliance Officer (Automated)',
    timestamp: 'Yesterday',
    status: 'WARNING'
  }
];

export const MOCK_STORAGE_CONNECTIONS: StorageConnection[] = [
  {
    id: 'STR-01',
    name: 'Local MinIO Storage',
    provider: 'MinIO',
    endpoint: 'http://localhost:9000 (Local Docker / Service)',
    bucketCount: 5,
    status: 'CONNECTED',
    isLocal: true,
    notes: 'Primary local development bucket cluster. Contains 5 synthetic datasets.'
  },
  {
    id: 'STR-02',
    name: 'AWS S3 Enterprise Lake',
    provider: 'AWS S3',
    endpoint: 's3://datatether-corp-data-lake-prod',
    bucketCount: 0,
    status: 'DISCONNECTED',
    isLocal: false,
    notes: 'Production cloud connection disabled in local development mode. Credentials not configured.'
  }
];

export const MOCK_INVESTIGATIONS: Investigation[] = [
  {
    id: 'INV-2026-001',
    objective: 'Can customer profiles and purchase history be combined for AI model training?',
    datasets: ['customer_profiles.csv (DS-9021)', 'purchase_history.csv (DS-9022)'],
    createdAt: '2026-11-01 11:00:00 UTC',
    status: 'UNDER_REVIEW',
    confidenceScore: 88,
    humanReviewStatus: 'PENDING_DPO_APPROVAL',
    stages: [
      { stage: 1, name: 'Evidence Ingestion', status: 'COMPLETED', summary: 'Parsed schema, consent clauses, and Passport governance metadata from both candidate datasets.', timestamp: '11:01 UTC' },
      { stage: 2, name: 'Static Policy Check', status: 'COMPLETED', summary: 'Evaluated against Enterprise Data Ethics Rulebook v2.4 (Rule #AI-09: Unconsented Training Prohibited).', timestamp: '11:03 UTC' },
      { stage: 3, name: 'Heuristic Inference Engine', status: 'COMPLETED', summary: 'Simulated multi-attribute join on customer_id; detected potential purchasing power re-identification.', timestamp: '11:06 UTC' },
      { stage: 4, name: 'AI Reasoning & Synthesis', status: 'COMPLETED', summary: 'Meta AI synthesized risk vectors, highlighted ambiguities, and formulated mitigation recommendations.', timestamp: '11:08 UTC' },
      { stage: 5, name: 'Human Review & DPO Sign-Off', status: 'IN_PROGRESS', summary: 'Awaiting final determination from Data Protection Officer regarding pseudonymization tier.', timestamp: 'Pending' }
    ],
    observedFacts: [
      'customer_profiles.csv is classified as CONFIDENTIAL and holds direct customer PII (name, email, city).',
      'purchase_history.csv is classified as INTERNAL and contains financial transactional values.',
      'Both datasets share customer_id as an exact matchable UUID foreign key.',
      'Customer Profiles Passport specifies allowed purposes as: "Customer support, warranty servicing, billing reconciliations".',
      'The proposed operation targets "AI Model Training" for churn prediction.'
    ],
    toolAnalysis: [
      'Schema Join Analysis: 125,000 unique records match with 100% overlap on customer_id.',
      'Entropy & Uniqueness Metric: Combining Location (city) + Total Spending creates unique quasi-identifiers for 91.4% of users.',
      'Static Policy Scanner: Detected direct violation of Restricted Purpose clause: "Unconsented generative AI training" on customer_profiles.csv.'
    ],
    aiInterpretation: [
      'Heuristic Risk Assessment: While purchase history on its own is benign operational telemetry, joining it to contact identities creates an enriched economic profile.',
      'Consent Gap: Customers consented to account servicing, not to algorithmic behavioral classification or training deep learning weights.',
      'Uncertainty Note: It is unknown whether the proposed AI model will be deployed strictly for internal aggregate reporting or external personalization.'
    ],
    recommendations: [
      'Recommendation 1: Reject the raw combination for AI training in its current schema configuration.',
      'Recommendation 2 (Permissible Alternative): Apply k-anonymity (k>=5) and differential privacy, strip customer_id, and hash location to regional administrative zones.',
      'Recommendation 3: Require explicit Data Protection Officer (DPO) countersignature prior to executing any model weight updates.'
    ],
    unknownInformation: [
      'Exact AI model architecture (LLM fine-tuning vs. shallow gradient boosted tree).',
      'Whether data will be cached in external weights or ephemeral GPU memory.',
      'Whether model explanations will expose individual training instances via inversion attacks.'
    ]
  }
];

export const MOCK_LINEAGE_NODES: LineageNode[] = [
  {
    id: 'node-1',
    label: 'Customer Profiles',
    type: 'SOURCE',
    classification: 'CONFIDENTIAL',
    governanceStatus: 'COMPLIANT',
    x: 80,
    y: 120,
    storage: 'minio-local/data-raw/crm',
    recordCount: '125K rows',
    copiesCount: 2
  },
  {
    id: 'node-2',
    label: 'Purchase History',
    type: 'SOURCE',
    classification: 'INTERNAL',
    governanceStatus: 'COMPLIANT',
    x: 80,
    y: 280,
    storage: 'minio-local/data-raw/ecom',
    recordCount: '1.48M rows',
    copiesCount: 1
  },
  {
    id: 'node-3',
    label: 'Customer Behaviour Dataset',
    type: 'DERIVED',
    classification: 'CONFIDENTIAL',
    governanceStatus: 'FLAGGED',
    x: 420,
    y: 200,
    storage: 'minio-local/analytics/derived',
    recordCount: '118K rows',
    copiesCount: 1
  },
  {
    id: 'node-4',
    label: 'AI Training Dataset',
    type: 'AI_MODEL',
    classification: 'RESTRICTED',
    governanceStatus: 'RESTRICTED',
    x: 760,
    y: 200,
    storage: 'minio-local/models/training-cache',
    recordCount: '118K features',
    copiesCount: 0
  }
];

export const MOCK_LINEAGE_EDGES: LineageEdge[] = [
  {
    id: 'edge-1-3',
    from: 'node-1',
    to: 'node-3',
    label: 'Inner Join [customer_id]',
    transformationType: 'IDENTITY_JOIN'
  },
  {
    id: 'edge-2-3',
    from: 'node-2',
    to: 'node-3',
    label: 'Agg Spend & Categories',
    transformationType: 'ETL_CLEANSE'
  },
  {
    id: 'edge-3-4',
    from: 'node-3',
    to: 'node-4',
    label: 'Feature Extraction & Normalization',
    transformationType: 'FEATURE_ENGINEERING'
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-8891',
    timestamp: '2026-11-01 16:40:12 UTC',
    action: 'POLICY_EVALUATION',
    dataset: 'customer_behaviour_dataset.parquet',
    actor: 'Dr. Anita Patel (Data Science)',
    operation: 'USAGE_EVALUATE [AI Model Training]',
    result: 'DENIED',
    ipAddress: '192.168.1.104'
  },
  {
    id: 'AUD-8890',
    timestamp: '2026-11-01 16:02:18 UTC',
    action: 'TELEMETRY_INGEST',
    dataset: 'website_events.csv',
    actor: 'Snowplow Worker Daemon',
    operation: 'WRITE_APPEND',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'AUD-8889',
    timestamp: '2026-11-01 12:45:10 UTC',
    action: 'COMBINATION_SCAN',
    dataset: 'customer_profiles.csv + purchase_history.csv',
    actor: 'Combination Lab Service',
    operation: 'ANALYSE_PRIVACY_CORRELATION',
    result: 'FLAGGED',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'AUD-8888',
    timestamp: '2026-11-01 12:30:00 UTC',
    action: 'DATA_TRANSFORMATION',
    dataset: 'customer_behaviour_dataset.parquet',
    actor: 'Spark Job #8821 (Airflow)',
    operation: 'JOIN_WRITE',
    result: 'SUCCESS',
    ipAddress: '10.0.4.12'
  },
  {
    id: 'AUD-8887',
    timestamp: '2026-11-01 11:00:00 UTC',
    action: 'INVESTIGATION_INITIATED',
    dataset: 'DS-9021, DS-9022',
    actor: 'Security Operations Agent',
    operation: 'AI_INVESTIGATION_START',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1'
  },
  {
    id: 'AUD-8886',
    timestamp: '2026-10-31 18:20:00 UTC',
    action: 'ACCESS_REQUEST',
    dataset: 'customer_profiles.csv',
    actor: 'Marketing Engineering Bot',
    operation: 'EXPORT_REQUEST',
    result: 'FLAGGED',
    ipAddress: '10.0.8.91'
  },
  {
    id: 'AUD-8885',
    timestamp: '2026-10-30 14:22:10 UTC',
    action: 'PASSPORT_VERIFICATION',
    dataset: 'customer_profiles.csv',
    actor: 'Sarah Jenkins (Owner)',
    operation: 'SIGN_PASSPORT_METADATA',
    result: 'SUCCESS',
    ipAddress: '192.168.1.45'
  }
];
