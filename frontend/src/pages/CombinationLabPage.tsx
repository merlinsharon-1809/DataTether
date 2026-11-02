import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { MOCK_DATASETS } from '../data/mockData.ts';
import type { ClassificationLevel, Dataset } from '../types/index.ts';
import {
  fetchDatasets,
  analyzeCombination,
  mapBackendDatasetToFrontend,
  type CombinationAnalysisResponse,
  type BackendDataset
} from '../services/api.ts';

export const CombinationLabPage: React.FC = () => {
  const [datasetsList, setDatasetsList] = useState<Dataset[]>(MOCK_DATASETS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [proposedPurpose, setProposedPurpose] = useState('analytics');
  const [outputDatasetName, setOutputDatasetName] = useState('Customer Analytics Derived View');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CombinationAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available datasets from backend
  useEffect(() => {
    fetchDatasets()
      .then((items: BackendDataset[]) => {
        if (items && items.length > 0) {
          const mapped = items.map(mapBackendDatasetToFrontend);
          setDatasetsList(mapped);
          // Auto-select first two datasets
          if (mapped.length >= 2) {
            setSelectedIds([mapped[0].id, mapped[1].id]);
          }
        } else {
          setSelectedIds([MOCK_DATASETS[0].id, MOCK_DATASETS[1].id]);
        }
      })
      .catch(() => {
        setSelectedIds([MOCK_DATASETS[0].id, MOCK_DATASETS[1].id]);
      });
  }, []);

  const toggleDatasetSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedDatasets = datasetsList.filter((d) => selectedIds.includes(d.id));

  // Determine shared identifiers
  const allFieldNames = selectedDatasets.map((d) => d.fields.map((f) => f.name));
  const sharedFields = allFieldNames.length > 1
    ? allFieldNames.reduce((acc, curr) => acc.filter((name) => curr.includes(name)))
    : [];

  const handleRunAnalysis = async () => {
    if (selectedIds.length < 2) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await analyzeCombination(selectedIds, proposedPurpose);
      setAnalysisResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
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
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              Privacy Risk Combination Lab
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              RE-IDENTIFICATION RISK ENGINE
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Evaluate compound privacy risks and governance conflicts when independently registered datasets are joined.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || selectedIds.length < 2}
          style={{ minWidth: '180px' }}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Analyzing Vectors...</span>
            </>
          ) : (
            <>
              <Cpu size={14} />
              <span>Analyse Combination</span>
            </>
          )}
        </button>
      </div>

      {/* Step 1: Select Source Datasets */}
      <div className="terminal-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Layers size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>1. Select Candidate Datasets to Combine ({selectedIds.length} Selected)</span>
            </div>
            <div className="card-subtitle">Choose two or more datasets from the catalog to model cross-source risk</div>
          </div>
        </div>

        <div className="grid-3">
          {datasetsList.map((dataset) => {
            const isSelected = selectedIds.includes(dataset.id);
            return (
              <div
                key={dataset.id}
                onClick={() => toggleDatasetSelection(dataset.id)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tech-id">{dataset.id.slice(0, 8)}...</span>
                  {getClassificationBadge(dataset.classification)}
                </div>

                <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                  {dataset.name}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Fields: {dataset.fields.map((f) => f.name).join(', ') || 'No schema columns registered'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>{dataset.recordCount.toLocaleString()} rows</span>
                  <span style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                    {isSelected ? '✓ Selected' : '+ Add to analysis'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purpose Configuration */}
      <div
        className="terminal-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="input-label">Proposed Activity / Purpose:</span>
          <input
            type="text"
            className="input-field"
            value={proposedPurpose}
            onChange={(e) => setProposedPurpose(e.target.value)}
            style={{ width: '260px', fontFamily: 'var(--font-mono)' }}
            placeholder="e.g. analytics, marketing, profiling"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="input-label">Derived View Name:</span>
          <input
            type="text"
            className="input-field"
            value={outputDatasetName}
            onChange={(e) => setOutputDatasetName(e.target.value)}
            style={{ width: '260px', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="input-label">Shared Join Keys:</span>
          {sharedFields.length > 0 ? (
            sharedFields.map((f, i) => (
              <span key={i} className="badge badge-amber">
                {f} (Join Key)
              </span>
            ))
          ) : (
            <span className="badge badge-neutral">No exact identifier match</span>
          )}
        </div>
      </div>

      {/* Error alert if backend call failed */}
      {errorMessage && (
        <div style={{ padding: '14px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red-border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-red)', fontSize: '13px' }}>
          <AlertOctagon size={16} style={{ display: 'inline', marginRight: '6px' }} />
          <strong>Analysis Error:</strong> {errorMessage}
        </div>
      )}

      {/* Live Analysis Results */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Decision Banner */}
          <div
            className="terminal-card"
            style={{
              border: `1px solid ${
                analysisResult.decision === 'PERMITTED' ? 'var(--accent-green-border)' :
                analysisResult.decision === 'RESTRICTED' ? 'var(--accent-red-border)' : 'var(--accent-amber-border)'
              }`,
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {analysisResult.decision === 'PERMITTED' && <CheckCircle2 size={20} style={{ color: 'var(--accent-green)' }} />}
                {analysisResult.decision === 'RESTRICTED' && <AlertOctagon size={20} style={{ color: 'var(--accent-red)' }} />}
                {analysisResult.decision === 'REQUIRES_REVIEW' && <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-bright)' }}>
                    GOVERNANCE DECISION: {analysisResult.decision}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {analysisResult.reason}
                  </div>
                </div>
              </div>
              <span
                className={`badge ${
                  analysisResult.privacy_overall_risk === 'HIGH' ? 'badge-red' :
                  analysisResult.privacy_overall_risk === 'MEDIUM' ? 'badge-amber' : 'badge-green'
                }`}
              >
                PRIVACY RISK: {analysisResult.privacy_overall_risk}
              </span>
            </div>
          </div>

          {/* Findings Grid */}
          <div className="grid-2">
            {/* Left: Privacy Risks */}
            <div className="terminal-card" style={{ border: '1px solid var(--accent-red-border)' }}>
              <div className="card-header">
                <div className="card-title">
                  <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />
                  <span>Privacy & Re-Identification Risks ({analysisResult.privacy_risks.length})</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analysisResult.privacy_risks.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    No critical privacy risks or quasi-identifier accumulation detected.
                  </div>
                ) : (
                  analysisResult.privacy_risks.map((risk, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: risk.severity === 'HIGH' ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                          {risk.risk_type}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '9px' }}>{risk.status}</span>
                          <span className={`badge ${risk.severity === 'HIGH' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '9px' }}>
                            {risk.severity}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-bright)', marginTop: '6px', lineHeight: '1.4' }}>
                        {risk.detail}
                      </p>
                      {risk.evidence && risk.evidence.length > 0 && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                          Evidence fields: {risk.evidence.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Governance Findings */}
            <div className="terminal-card" style={{ border: '1px solid var(--accent-cyan-border)' }}>
              <div className="card-header">
                <div className="card-title">
                  <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Governance Policy Findings ({analysisResult.findings.length})</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analysisResult.findings.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    No classification or sharing rule conflicts detected.
                  </div>
                ) : (
                  analysisResult.findings.map((finding, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {finding.category}
                        </span>
                        <span className={`badge ${finding.severity === 'HIGH' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '9px' }}>
                          {finding.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-bright)', marginTop: '6px', lineHeight: '1.4' }}>
                        {finding.detail}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
