import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { MOCK_DATASETS } from '../data/mockData.ts';
import type { Dataset } from '../types/index.ts';
import {
  fetchDatasets,
  evaluatePolicy,
  mapBackendDatasetToFrontend,
  type PolicyEvaluationResponse
} from '../services/api.ts';

export const UsageEvaluatorPage: React.FC = () => {
  const [datasetsList, setDatasetsList] = useState<Dataset[]>(MOCK_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState(MOCK_DATASETS[0]?.id || '');
  const [purpose, setPurpose] = useState('AI model training');
  const [operation, setOperation] = useState<'READ' | 'AGGREGATE' | 'EXPORT' | 'RETRAIN_MODEL'>('RETRAIN_MODEL');
  const [requesterRole, setRequesterRole] = useState('Data Science Team');
  const [targetRegion, setTargetRegion] = useState('EU (Frankfurt)');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<PolicyEvaluationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load live datasets from backend
  useEffect(() => {
    fetchDatasets()
      .then((items) => {
        if (items && items.length > 0) {
          const mapped = items.map(mapBackendDatasetToFrontend);
          setDatasetsList(mapped);
          setSelectedDatasetId(mapped[0].id);
        }
      })
      .catch((err) => {
        console.warn('Backend datasets offline in UsageEvaluatorPage, using mock datasets:', err);
      });
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await evaluatePolicy({
        datasetId: selectedDatasetId,
        proposedPurpose: purpose,
        operation,
        requesterRole,
        targetRegion
      });
      setResult(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Policy evaluation failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getDecisionBadge = (decision: 'PERMITTED' | 'RESTRICTED' | 'REQUIRES_REVIEW') => {
    switch (decision) {
      case 'PERMITTED':
        return (
          <span className="badge badge-green" style={{ fontSize: '13px', padding: '6px 14px' }}>
            <CheckCircle2 size={14} /> POLICY PERMITTED
          </span>
        );
      case 'RESTRICTED':
        return (
          <span className="badge badge-red" style={{ fontSize: '13px', padding: '6px 14px' }}>
            <AlertTriangle size={14} /> RESTRICTED BY POLICY
          </span>
        );
      case 'REQUIRES_REVIEW':
        return (
          <span className="badge badge-amber" style={{ fontSize: '13px', padding: '6px 14px' }}>
            <HelpCircle size={14} /> REQUIRES DPO REVIEW
          </span>
        );
    }
  };

  const borderColor =
    result?.decision === 'RESTRICTED'
      ? '1px solid var(--accent-red-border)'
      : result?.decision === 'PERMITTED'
      ? '1px solid var(--accent-green-border, #1a4a2e)'
      : '1px solid var(--border-subtle)';

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
          Intended Usage Policy Evaluator
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          Evaluate whether a proposed data processing activity complies with dataset Passports, negative covenants, and organizational boundaries.
        </p>
      </div>

      <div className="grid-2">
        {/* Left: Input Form */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <FileText size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Proposed Data Processing Intent</span>
              </div>
              <div className="card-subtitle">Specify target dataset, workflow and operating environment</div>
            </div>
          </div>

          <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dataset Select */}
            <div className="input-group">
              <label className="input-label">Target Dataset / Derived Asset</label>
              <select
                className="select-field"
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
              >
                {datasetsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id}) — [{d.classification}]
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose */}
            <div className="input-group">
              <label className="input-label">Intended Purpose</label>
              <select
                className="select-field"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="Internal analytics">Internal analytics &amp; dashboards</option>
                <option value="Marketing">Marketing campaigns &amp; audience reach</option>
                <option value="AI model training">AI model training &amp; weight tuning</option>
                <option value="Customer segmentation">Customer segmentation &amp; clustering</option>
                <option value="Third-party sharing">Third-party data transfer / Partner sharing</option>
              </select>
            </div>

            {/* Operation */}
            <div className="input-group">
              <label className="input-label">Operation Type</label>
              <select
                className="select-field"
                value={operation}
                onChange={(e) => setOperation(e.target.value as any)}
              >
                <option value="READ">READ (Query / Ad-hoc inspect)</option>
                <option value="AGGREGATE">AGGREGATE (Statistical summary without individual rows)</option>
                <option value="EXPORT">EXPORT (Extract files outside local boundary)</option>
                <option value="RETRAIN_MODEL">RETRAIN_MODEL (Ingest into machine learning model)</option>
              </select>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Requester Team / Role</label>
                <input
                  type="text"
                  className="input-field"
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Target Processing Region</label>
                <select
                  className="select-field"
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value)}
                >
                  <option value="EU (Frankfurt)">EU (Frankfurt)</option>
                  <option value="US-East (Virginia)">US-East (Virginia)</option>
                  <option value="APAC (Singapore)">APAC (Singapore)</option>
                  <option value="External Cloud VPC">External Cloud VPC</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isEvaluating}
              style={{ marginTop: '10px' }}
            >
              {isEvaluating ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Evaluating Against Passports...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Run Policy Evaluation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Evaluation Decision Dossier */}
        <div className="terminal-card" style={{ border: borderColor }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Governance Decision Report</span>
              </div>
              <div className="card-subtitle">Live ruling from the Policy Engine against dataset Passport rules</div>
            </div>
            {result && getDecisionBadge(result.decision)}
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--accent-red-dim)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent-red-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--accent-red)',
              marginBottom: '8px'
            }}>
              <XCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  EVALUATED REQUEST
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '2px' }}>
                  {result.dataset_name} &rarr; {result.proposed_purpose}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {result.reason}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  Timestamp: {new Date(result.evaluated_at).toLocaleString()}
                </div>
              </div>

              {/* Policy Notes */}
              {result.policy_notes.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Policy Context
                  </div>
                  <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-bright)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.policy_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Policy Violations */}
              {result.violated_rules.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: 'var(--accent-red-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-red-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Identified Policy Violations / Purpose Mismatches
                  </div>
                  <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-bright)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.violated_rules.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Information */}
              {result.missing_information.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                    Missing Evidence / Prerequisite Filings
                  </div>
                  <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {result.missing_information.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                    Recommended Action Pathway
                  </div>
                  <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-bright)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : !isEvaluating && !errorMessage ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Configure a processing proposal on the left and click "Run Policy Evaluation".
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
