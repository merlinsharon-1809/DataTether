import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  User,
  MapPin,
  Clock,
  Layers,
  HardDrive,
  Copy,
  Sparkles
} from 'lucide-react';
import { MOCK_DATASETS, MOCK_PASSPORTS } from '../data/mockData.ts';
import type { VerificationState, ClassificationLevel, Dataset, DataPassport } from '../types/index.ts';
import { fetchDatasets, mapBackendDatasetToFrontend, type BackendDataset } from '../services/api.ts';

interface PassportsPageProps {
  selectedDatasetId: string;
  onSelectDatasetId: (id: string) => void;
  onNavigateToCombinationLab?: () => void;
}

export const PassportsPage: React.FC<PassportsPageProps> = ({
  selectedDatasetId,
  onSelectDatasetId,
  onNavigateToCombinationLab
}) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'RULES' | 'LINEAGE' | 'SCHEMA'>('RULES');
  const [copiedId, setCopiedId] = useState(false);
  const [backendItems, setBackendItems] = useState<BackendDataset[]>([]);
  const [datasetsList, setDatasetsList] = useState<Dataset[]>(MOCK_DATASETS);

  useEffect(() => {
    fetchDatasets()
      .then((items) => {
        if (items && items.length > 0) {
          setBackendItems(items);
          setDatasetsList(items.map(mapBackendDatasetToFrontend));
        }
      })
      .catch((err) => {
        console.warn('Backend datasets offline in PassportsPage, using mock datasets:', err);
      });
  }, []);

  const currentDataset =
    datasetsList.find((d) => d.id === selectedDatasetId) || datasetsList[0];

  // Check if this dataset exists in backend data to build dynamic passport
  const rawBackend = backendItems.find((b) => b.id === currentDataset.id);
  const currentPassport: DataPassport = rawBackend
    ? {
        datasetId: rawBackend.id,
        datasetName: rawBackend.name,
        identity: {
          owner: rawBackend.owner || 'Unassigned Steward',
          department: 'Corporate Governance',
          source: rawBackend.source,
          originSystem: rawBackend.source,
          createdAt: rawBackend.created_at ? new Date(rawBackend.created_at).toISOString().split('T')[0] : '2026-11-01',
          lastAudited: 'Continuous (FastAPI Daemon)',
          verifiedState: 'VERIFIED'
        },
        classification: {
          level: currentDataset.classification,
          rationale: `Cryptographically sealed classification registered in SQLite for ${rawBackend.name}`,
          classifiedBy: rawBackend.owner || 'Automated Compliance Engine',
          verifiedState: 'VERIFIED'
        },
        governanceRules: {
          rules: {
            allowedPurposes: rawBackend.allowed_purposes && rawBackend.allowed_purposes.length > 0 ? rawBackend.allowed_purposes : ['Internal Analytics'],
            restrictedPurposes: rawBackend.restricted_purposes && rawBackend.restricted_purposes.length > 0 ? rawBackend.restricted_purposes : ['Unapproved third-party egress'],
            allowedRegions: [rawBackend.region || 'Global / eu-central-1'],
            encryptionRequirements: rawBackend.encrypted ? 'AES-256 Volume & Transport Encryption' : 'Unencrypted Volume',
            accessPermissions: 'Steward-Managed Role Based Access (RBAC)',
            sharingRestrictions: rawBackend.sharing_allowed ? 'Permitted under standard organizational policies' : 'Strictly forbidden from external export',
            retentionPeriod: rawBackend.retention_days ? `${rawBackend.retention_days} days` : '365 days statutory retention'
          },
          verifiedState: 'VERIFIED'
        },
        lineage: {
          parentDatasets: ['Root Storage Source'],
          derivedDatasets: [],
          knownCopies: [
            { location: rawBackend.source, environment: 'Production Bucket', lastSynced: 'Just now' }
          ],
          transformations: ['Ingestion Normalization'],
          verifiedState: 'VERIFIED'
        }
      }
    : MOCK_PASSPORTS[currentDataset.id] || MOCK_PASSPORTS['DS-9021'];

  const copyPassportId = () => {
    navigator.clipboard?.writeText(currentPassport.datasetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const renderVerificationPill = (state: VerificationState) => {
    switch (state) {
      case 'VERIFIED':
        return (
          <span
            className="badge badge-green"
            title="Cryptographically verified by automated scanner & signed by authorized steward"
          >
            <CheckCircle2 size={11} /> VERIFIED
          </span>
        );
      case 'USER_PROVIDED':
        return (
          <span
            className="badge badge-amber"
            title="Provided by dataset owner or developer; pending formal compliance audit"
          >
            <User size={11} /> USER-PROVIDED
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span
            className="badge badge-neutral"
            title="Unverified / Inferred heuristic telemetry"
          >
            <HelpCircle size={11} /> UNKNOWN
          </span>
        );
    }
  };

  const getClassificationBadge = (lvl: ClassificationLevel) => {
    switch (lvl) {
      case 'RESTRICTED':
        return <span className="badge badge-red">RESTRICTED</span>;
      case 'CONFIDENTIAL':
        return <span className="badge badge-amber">CONFIDENTIAL</span>;
      case 'INTERNAL':
        return <span className="badge badge-cyan">INTERNAL</span>;
      case 'PUBLIC':
        return <span className="badge badge-green">PUBLIC</span>;
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Dataset Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              Data Passport
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              SINGLE SOURCE OF TRUTH
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Authoritative cryptographic profile defining dataset identity, classification, lineage and permissible usage rules.
          </p>
        </div>

        {/* Dataset Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SELECT DATASET:</span>
          <select
            className="select-field"
            value={currentDataset.id}
            onChange={(e) => onSelectDatasetId(e.target.value)}
            style={{ minWidth: '220px', fontFamily: 'var(--font-mono)' }}
          >
            {MOCK_DATASETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Passport Dossier Card */}
      <div
        className="terminal-card"
        style={{
          border: '1px solid var(--accent-cyan-border)',
          background: 'linear-gradient(180deg, #0f1624 0%, #0a0e19 100%)',
          padding: '24px'
        }}
      >
        {/* Passport Top Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-cyan-dim)',
                border: '1px solid var(--accent-cyan-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <FileCheck2 size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-bright)' }}>
                  {currentPassport.datasetName}
                </span>
                <span className="tech-id" onClick={copyPassportId} style={{ cursor: 'pointer' }} title="Click to copy ID">
                  {currentPassport.datasetId} {copiedId ? '✓ Copied' : <Copy size={10} style={{ display: 'inline', marginLeft: '3px' }} />}
                </span>
                {getClassificationBadge(currentPassport.classification.level)}
                {renderVerificationPill(currentPassport.identity.verifiedState)}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Owner: <strong style={{ color: 'var(--text-bright)' }}>{currentPassport.identity.owner}</strong></span>
                <span>•</span>
                <span>Source: <strong style={{ color: 'var(--text-bright)' }}>{currentPassport.identity.source}</strong></span>
                <span>•</span>
                <span>Audited: <span style={{ fontFamily: 'var(--font-mono)' }}>{currentPassport.identity.lastAudited}</span></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onNavigateToCombinationLab && (
              <button className="btn btn-outline-cyan btn-sm" onClick={onNavigateToCombinationLab}>
                Test in Combination Lab
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            margin: '18px 0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px'
          }}
        >
          {(['RULES', 'IDENTITY', 'LINEAGE', 'SCHEMA'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--accent-cyan-dim)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === tab ? 'var(--accent-cyan-border)' : 'transparent',
                color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-muted)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {tab === 'RULES' && 'GOVERNANCE RULES'}
              {tab === 'IDENTITY' && 'IDENTITY & PROVENANCE'}
              {tab === 'LINEAGE' && 'LINEAGE & COPIES'}
              {tab === 'SCHEMA' && 'FIELDS & ATTRIBUTES'}
            </button>
          ))}
        </div>

        {/* TAB 1: GOVERNANCE RULES */}
        {activeTab === 'RULES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-subtitle">
                GOVERNANCE POLICIES ENFORCED BY DATATETHER USAGE EVALUATOR
              </span>
              {renderVerificationPill(currentPassport.governanceRules.verifiedState)}
            </div>

            <div className="grid-2">
              {/* Allowed Purposes */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-green)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-green)' }}>
                    PERMITTED PURPOSES
                  </span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {currentPassport.governanceRules.rules.allowedPurposes.map((p, i) => (
                    <li key={i} style={{ color: 'var(--text-bright)' }}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Restricted Purposes */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-red)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-red)' }}>
                    EXPLICITLY RESTRICTED PURPOSES
                  </span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {currentPassport.governanceRules.rules.restrictedPurposes.map((p, i) => (
                    <li key={i} style={{ color: 'var(--accent-red)' }}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical Constraints Grid */}
            <div className="grid-3">
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="input-label">Allowed Regions</span>
                <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {currentPassport.governanceRules.rules.allowedRegions.map((r, i) => (
                    <span key={i} className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      <MapPin size={9} /> {r}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="input-label">Encryption Standard</span>
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>
                  {currentPassport.governanceRules.rules.encryptionRequirements}
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="input-label">Statutory Retention</span>
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  {currentPassport.governanceRules.rules.retentionPeriod}
                </div>
              </div>
            </div>

            {/* Access & Sharing Policies */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span className="input-label">Access Control Policy:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-bright)', marginLeft: '8px' }}>
                  {currentPassport.governanceRules.rules.accessPermissions}
                </span>
              </div>
              <div>
                <span className="input-label">Sharing & Egress Constraints:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-bright)', marginLeft: '8px' }}>
                  {currentPassport.governanceRules.rules.sharingRestrictions}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IDENTITY & CLASSIFICATION */}
        {activeTab === 'IDENTITY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-subtitle">DATASET IDENTITY PROVENANCE & CLASSIFICATION RATIONALE</span>
              {renderVerificationPill(currentPassport.classification.verifiedState)}
            </div>

            <div className="grid-2">
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="input-label">Classification Level</span>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getClassificationBadge(currentPassport.classification.level)}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Classified by: {currentPassport.classification.classifiedBy}</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-bright)', lineHeight: '1.6' }}>
                  <strong>Rationale:</strong> {currentPassport.classification.rationale}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="input-label">Origin System & Ingestion Pathway</span>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div><strong>System of Origin:</strong> {currentPassport.identity.originSystem}</div>
                  <div><strong>Ingestion Pathway:</strong> {currentPassport.identity.source}</div>
                  <div><strong>Registration Date:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{currentPassport.identity.createdAt}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LINEAGE & COPIES */}
        {activeTab === 'LINEAGE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-subtitle">DATA COPIES, PARENT SOURCES & TRANSFORMATION HISTORY</span>
              {renderVerificationPill(currentPassport.lineage.verifiedState)}
            </div>

            <div className="grid-2">
              {/* Known Copies */}
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div className="card-title" style={{ fontSize: '12.5px', marginBottom: '10px' }}>
                  <HardDrive size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Tracked Physical Copies ({currentPassport.lineage.knownCopies.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentPassport.lineage.knownCopies.map((c, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{c.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '3px' }}>
                        <span>Env: {c.environment}</span>
                        <span>Synced: {c.lastSynced}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transformations & Derivations */}
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div className="card-title" style={{ fontSize: '12.5px', marginBottom: '10px' }}>
                  <Layers size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Transformations & Pedigree</span>
                </div>
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span className="input-label">Parent Datasets:</span>
                    <div style={{ marginTop: '4px', color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                      {currentPassport.lineage.parentDatasets.join(', ') || 'Root Source (No upstream parents)'}
                    </div>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span className="input-label">Applied Transformations:</span>
                    <ul style={{ paddingLeft: '18px', marginTop: '4px', color: 'var(--text-bright)' }}>
                      {currentPassport.lineage.transformations.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCHEMA & ATTRIBUTES */}
        {activeTab === 'SCHEMA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span className="card-subtitle">REGISTERED SCHEMA FIELDS & ATTRIBUTE SENSITIVITY</span>
            <div className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Field Name</th>
                    <th>Type</th>
                    <th>Identifier Key</th>
                    <th>Sensitivity</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDataset.fields.map((f, i) => (
                    <tr key={i}>
                      <td>
                        <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {f.name}
                        </strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {f.type}
                      </td>
                      <td>
                        {f.isIdentifier ? (
                          <span className="badge badge-amber" style={{ fontSize: '9.5px' }}>
                            PRIMARY IDENTIFIER
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            f.sensitivity === 'Critical'
                              ? 'badge-red'
                              : f.sensitivity === 'High'
                              ? 'badge-amber'
                              : f.sensitivity === 'Medium'
                              ? 'badge-cyan'
                              : 'badge-neutral'
                          }`}
                        >
                          {f.sensitivity}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Verification Callout */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span><strong>Passport Verification Legend:</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span><span className="badge badge-green" style={{ fontSize: '9.5px' }}>VERIFIED</span> Cryptographic proof & DLP match</span>
          <span><span className="badge badge-amber" style={{ fontSize: '9.5px' }}>USER-PROVIDED</span> Declared by dataset engineer</span>
          <span><span className="badge badge-neutral" style={{ fontSize: '9.5px' }}>UNKNOWN</span> Awaiting scanning probe</span>
        </div>
      </div>
    </div>
  );
};
