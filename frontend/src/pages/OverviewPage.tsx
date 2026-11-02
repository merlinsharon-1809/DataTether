import React from 'react';
import {
  Database,
  Lock,
  AlertOctagon,
  Clock,
  ArrowRight,
  HardDrive,
  Bot,
  Activity,
  Layers
} from 'lucide-react';
import type { NavItem } from '../components/layout/Sidebar.tsx';
import {
  MOCK_DATASETS,
  MOCK_RISK_FINDINGS,
  MOCK_ACTIVITIES,
  MOCK_STORAGE_CONNECTIONS,
  MOCK_INVESTIGATIONS
} from '../data/mockData.ts';

interface OverviewPageProps {
  onNavigate: (tab: NavItem) => void;
  onSelectDatasetForPassport: (datasetId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onSelectDatasetForPassport
}) => {
  const totalDatasets = MOCK_DATASETS.length;
  const restrictedDatasets = MOCK_DATASETS.filter(
    (d) => d.classification === 'RESTRICTED' || d.classification === 'CONFIDENTIAL'
  ).length;
  const openRiskFindings = MOCK_RISK_FINDINGS.filter((r) => r.status === 'OPEN' || r.status === 'INVESTIGATING').length;
  const pendingReviews = 2;

  const classificationCounts = {
    RESTRICTED: MOCK_DATASETS.filter((d) => d.classification === 'RESTRICTED').length,
    CONFIDENTIAL: MOCK_DATASETS.filter((d) => d.classification === 'CONFIDENTIAL').length,
    INTERNAL: MOCK_DATASETS.filter((d) => d.classification === 'INTERNAL').length,
    PUBLIC: MOCK_DATASETS.filter((d) => d.classification === 'PUBLIC').length
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
              Data Governance Overview
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              TELEMETRY LIVE
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Understand, monitor and control how organisational data is used across storage and compute.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('combination-lab')}>
            <Layers size={14} />
            <span>Open Combination Lab</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('usage-evaluator')}>
            <Bot size={14} />
            <span>Evaluate New Usage</span>
          </button>
        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid-4">
        <div className="terminal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle">TOTAL DATASETS</span>
            <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-bright)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {totalDatasets}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across 2 storage buckets (Local MinIO)
          </div>
        </div>

        <div className="terminal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle">RESTRICTED & CONFIDENTIAL</span>
            <Lock size={15} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-red)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {restrictedDatasets}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Require strict purpose verification
          </div>
        </div>

        <div className="terminal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle">ACTIVE RISK FINDINGS</span>
            <AlertOctagon size={15} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-amber)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {openRiskFindings}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            1 Privacy correlation, 1 Reuse violation
          </div>
        </div>

        <div className="terminal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle">PENDING REVIEWS</span>
            <Clock size={15} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-bright)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {pendingReviews}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            DPO sign-off required for training DAG
          </div>
        </div>
      </div>

      {/* Main Grid: Data Governance Posture & Storage Connections */}
      <div className="grid-2">
        {/* SECTION A: DATA GOVERNANCE POSTURE */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Layers size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Data Governance Posture</span>
              </div>
              <div className="card-subtitle">Policy compliance & classification distribution</div>
            </div>
            <span className="badge badge-green">89.4% HEALTHY</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Visual Classification Distribution Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Classification Inventory Distribution</span>
                <span>{totalDatasets} Datasets</span>
              </div>
              <div style={{ display: 'flex', height: '10px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
                <div style={{ width: `${(classificationCounts.RESTRICTED / totalDatasets) * 100}%`, backgroundColor: 'var(--accent-red)' }} title={`Restricted: ${classificationCounts.RESTRICTED}`} />
                <div style={{ width: `${(classificationCounts.CONFIDENTIAL / totalDatasets) * 100}%`, backgroundColor: 'var(--accent-amber)' }} title={`Confidential: ${classificationCounts.CONFIDENTIAL}`} />
                <div style={{ width: `${(classificationCounts.INTERNAL / totalDatasets) * 100}%`, backgroundColor: 'var(--accent-cyan)' }} title={`Internal: ${classificationCounts.INTERNAL}`} />
                <div style={{ width: `${(classificationCounts.PUBLIC / totalDatasets) * 100}%`, backgroundColor: 'var(--accent-green)' }} title={`Public: ${classificationCounts.PUBLIC}`} />
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-red)' }} />
                  Restricted ({classificationCounts.RESTRICTED})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-amber)' }} />
                  Confidential ({classificationCounts.CONFIDENTIAL})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-cyan)' }} />
                  Internal ({classificationCounts.INTERNAL})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-green)' }} />
                  Public ({classificationCounts.PUBLIC})
                </span>
              </div>
            </div>

            {/* Compliance Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-bright)' }}>Data Passports Issued & Signed</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>6 / 6 (100%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-bright)' }}>Unconsented Training Safeguard</span>
                <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>1 BLOCK ACTIVE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-bright)' }}>Cross-Border Egress Check</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>COMPLIANT</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: STORAGE CONNECTIONS */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <HardDrive size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Connected Storage Systems</span>
              </div>
              <div className="card-subtitle">Active data lakes and storage buckets</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('settings')}>
              Manage
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_STORAGE_CONNECTIONS.map((storage) => {
              const isConnected = storage.status === 'CONNECTED';
              return (
                <div
                  key={storage.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: isConnected ? 'var(--border-active)' : 'var(--border-subtle)',
                    background: isConnected ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HardDrive size={14} style={{ color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                        {storage.name}
                      </span>
                      {storage.isLocal && <span className="badge badge-neutral" style={{ fontSize: '9.5px' }}>LOCAL</span>}
                    </div>
                    <span className={`badge ${isConnected ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                      {storage.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Endpoint: {storage.endpoint}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>
                    {storage.notes}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION B: RECENT RISK FINDINGS TABLE */}
      <div className="terminal-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <AlertOctagon size={14} style={{ color: 'var(--accent-amber)' }} />
              <span>Recent Risk Findings</span>
            </div>
            <div className="card-subtitle">Identified privacy correlations and unauthorized reuse flags</div>
          </div>
          <button className="btn btn-outline-cyan btn-sm" onClick={() => onNavigate('combination-lab')}>
            Investigate Combinations <ArrowRight size={12} />
          </button>
        </div>

        <div className="terminal-table-container">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Finding ID</th>
                <th>Dataset</th>
                <th>Risk Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Detection Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RISK_FINDINGS.map((finding) => (
                <tr key={finding.id}>
                  <td>
                    <span className="tech-id">{finding.id}</span>
                  </td>
                  <td>
                    <span
                      style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => onSelectDatasetForPassport(finding.datasetId)}
                      title="Inspect Data Passport"
                    >
                      {finding.datasetName}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px' }}>
                      {finding.category === 'PRIVACY_CORRELATION' ? 'Privacy Correlation (Inference)' :
                       finding.category === 'UNAUTHORIZED_REUSE' ? 'Unauthorized Reuse (Purpose Gap)' :
                       finding.category}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                          ? 'badge-red'
                          : finding.severity === 'MEDIUM'
                          ? 'badge-amber'
                          : 'badge-neutral'
                      }`}
                    >
                      {finding.severity}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        finding.status === 'OPEN'
                          ? 'badge-red'
                          : finding.status === 'INVESTIGATING'
                          ? 'badge-amber'
                          : 'badge-green'
                      }`}
                    >
                      {finding.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {finding.detectedAt}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onNavigate('investigation')}
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column: Recent Activity & Recent Investigations */}
      <div className="grid-2">
        {/* SECTION C: RECENT DATA ACTIVITY */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Activity size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Recent Data Activity</span>
              </div>
              <div className="card-subtitle">Discovery, Passport creation & evaluation events</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('audit-logs')}>
              All Logs
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MOCK_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    marginTop: '6px',
                    backgroundColor:
                      act.status === 'ALERT'
                        ? 'var(--accent-red)'
                        : act.status === 'WARNING'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-green)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-bright)' }}>
                    {act.title}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    <span>{act.actor}</span>
                    <span>•</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION E: RECENT AI INVESTIGATIONS */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Bot size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Recent AI Investigations</span>
              </div>
              <div className="card-subtitle">Meta AI risk analysis and decision records</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('investigation')}>
              Investigation Room
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_INVESTIGATIONS.map((inv) => (
              <div
                key={inv.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tech-id">{inv.id}</span>
                  <span className="badge badge-amber">{inv.status}</span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)' }}>
                  {inv.objective}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Datasets: {inv.datasets.join(' + ')}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>Confidence Score: {inv.confidenceScore}%</span>
                  </div>
                  <button className="btn btn-outline-cyan btn-sm" onClick={() => onNavigate('investigation')}>
                    Review Findings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
