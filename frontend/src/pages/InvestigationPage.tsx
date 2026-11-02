import React, { useState, useEffect } from 'react';
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Cpu,
  UserCheck,
  Info,
  RefreshCw,
  Play,
  XCircle,
  Database
} from 'lucide-react';
import { MOCK_INVESTIGATIONS } from '../data/mockData.ts';
import type { Dataset } from '../types/index.ts';
import {
  fetchDatasets,
  runAIInvestigation,
  mapBackendDatasetToFrontend,
  type BackendInvestigationResponse
} from '../services/api.ts';

export const InvestigationPage: React.FC = () => {
  // Form state for triggering a new investigation
  const [datasetsList, setDatasetsList] = useState<Dataset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [objective, setObjective] = useState('Can these datasets be safely combined for AI model training?');
  const [purpose, setPurpose] = useState('AI model training');
  const [operation, setOperation] = useState('RETRAIN_MODEL');
  const [requesterRole, setRequesterRole] = useState('Data Science Team');
  const [targetRegion, setTargetRegion] = useState('EU (Frankfurt)');

  // Result state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BackendInvestigationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dpoNote, setDpoNote] = useState('');
  const [dpoStatus, setDpoStatus] = useState<string>('PENDING_DPO_APPROVAL');
  const [showForm, setShowForm] = useState(true);

  // Load live datasets for selection
  useEffect(() => {
    fetchDatasets()
      .then((items) => {
        if (items && items.length > 0) {
          const mapped = items.map(mapBackendDatasetToFrontend);
          setDatasetsList(mapped);
          if (mapped.length >= 2) {
            setSelectedIds([mapped[0].id, mapped[1].id]);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend datasets offline in InvestigationPage:', err);
      });
  }, []);

  const toggleDataset = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((i) => i !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRunInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length < 1) return;
    setIsRunning(true);
    setErrorMessage(null);
    setResult(null);
    setShowForm(false);

    try {
      const response = await runAIInvestigation({
        objective,
        datasetIds: selectedIds,
        proposedPurpose: purpose,
        operation,
        requesterRole,
        targetRegion
      });
      setResult(response);
      setDpoStatus(response.humanReviewStatus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Investigation failed. Please try again.';
      setErrorMessage(msg);
      setShowForm(true);
    } finally {
      setIsRunning(false);
    }
  };

  const [simulationAction, setSimulationAction] = useState<string | null>(null);

  const handleSimulateApprove = () => setSimulationAction('APPROVED_WITH_CONDITIONS');
  const handleSimulateReject = () => setSimulationAction('REJECTED');
  const handleResetSimulation = () => setSimulationAction(null);

  // Fallback to mock if no result yet
  const displayData = result
    ? {
        id: result.id,
        objective: result.objective,
        datasets: result.datasets,
        createdAt: new Date(result.createdAt).toLocaleString(),
        status: result.status,
        stages: result.stages,
        observedFacts: result.observedFacts,
        toolAnalysis: result.toolAnalysis,
        aiInterpretation: result.aiInterpretation,
        unknownInformation: result.unknownInformation,
        recommendations: result.recommendations,
        aiProvider: result.aiModelInfo?.provider,
        isLiveCall: result.aiModelInfo?.isLiveCall,
        dpoAuditNotes: result.dpoAuditNotes
      }
    : null;

  const mockDisplay = MOCK_INVESTIGATIONS[0];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              AI Investigation Dossier
            </h2>
            <span
              className={displayData ? (displayData.isLiveCall ? 'badge badge-green' : 'badge badge-cyan') : 'badge badge-amber'}
              style={{ fontSize: '10px' }}
            >
              {displayData
                ? (displayData.isLiveCall ? 'LIVE META AI' : 'DETERMINISTIC ENGINE')
                : 'MOCK DEMO — CLICK RUN TO INVESTIGATE'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Structured multi-stage inquiry synthesizing observed facts, automated entropy tooling, and AI reasoning to explain complex data risks.
          </p>
        </div>

        {displayData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tech-id">{displayData.id}</span>
            <span className={`badge ${displayData.status === 'BLOCKED' ? 'badge-red' : displayData.status === 'ESCALATED' ? 'badge-amber' : 'badge-cyan'}`}>
              {displayData.status}
            </span>
            <button
              className="btn btn-outline-cyan btn-sm"
              onClick={() => { setShowForm(true); setResult(null); }}
            >
              <RefreshCw size={12} /> New Investigation
            </button>
          </div>
        )}
      </div>

      {/* Investigation Form */}
      {showForm && (
        <div className="terminal-card">
          <div className="card-header">
            <div className="card-title">
              <Play size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Run AI Investigation</span>
            </div>
            <div className="card-subtitle">Select datasets, define objective, and launch the multi-stage investigation pipeline</div>
          </div>

          <form onSubmit={handleRunInvestigation} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Dataset Selection */}
            {datasetsList.length > 0 && (
              <div className="input-group">
                <label className="input-label">Target Datasets (select 1 or more)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {datasetsList.map((ds) => {
                    const sel = selectedIds.includes(ds.id);
                    return (
                      <div
                        key={ds.id}
                        onClick={() => toggleDataset(ds.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${sel ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                          backgroundColor: sel ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: sel ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Database size={11} />
                        {ds.name} <span style={{ opacity: 0.6 }}>({ds.id})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Objective */}
            <div className="input-group">
              <label className="input-label">Investigation Objective</label>
              <input
                type="text"
                className="input-field"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Describe the compliance question being investigated..."
              />
            </div>

            <div className="grid-2" style={{ gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Proposed Purpose</label>
                <select className="select-field" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="Internal analytics">Internal analytics</option>
                  <option value="AI model training">AI model training</option>
                  <option value="Marketing">Marketing campaigns</option>
                  <option value="Third-party sharing">Third-party sharing</option>
                  <option value="Customer segmentation">Customer segmentation</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Operation Type</label>
                <select className="select-field" value={operation} onChange={(e) => setOperation(e.target.value)}>
                  <option value="READ">READ</option>
                  <option value="AGGREGATE">AGGREGATE</option>
                  <option value="EXPORT">EXPORT</option>
                  <option value="RETRAIN_MODEL">RETRAIN_MODEL</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Requester Role</label>
                <input type="text" className="input-field" value={requesterRole} onChange={(e) => setRequesterRole(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Target Region</label>
                <select className="select-field" value={targetRegion} onChange={(e) => setTargetRegion(e.target.value)}>
                  <option value="EU (Frankfurt)">EU (Frankfurt)</option>
                  <option value="US-East (Virginia)">US-East (Virginia)</option>
                  <option value="APAC (Singapore)">APAC (Singapore)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isRunning || selectedIds.length === 0} style={{ alignSelf: 'flex-start' }}>
              {isRunning ? (
                <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /><span>Running 5-Stage Investigation...</span></>
              ) : (
                <><Play size={14} /><span>Launch Investigation</span></>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {isRunning && (
        <div className="terminal-card" style={{ padding: '32px', textAlign: 'center' }}>
          <RefreshCw size={28} style={{ color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)' }}>Running Multi-Stage Investigation Pipeline...</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Evidence ingestion → Policy check → Heuristic engine → AI synthesis → DPO dossier</div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="terminal-card" style={{ border: '1px solid var(--accent-red-border)', backgroundColor: 'var(--accent-red-dim)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <XCircle size={16} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-red)' }}>Investigation Failed</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{errorMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results - use live if available, otherwise show mock as demo */}
      {(displayData || (!result && !isRunning && !showForm)) && (() => {
        const inv = displayData || {
          id: mockDisplay.id,
          objective: mockDisplay.objective,
          datasets: mockDisplay.datasets,
          createdAt: mockDisplay.createdAt,
          status: mockDisplay.status,
          stages: mockDisplay.stages,
          observedFacts: mockDisplay.observedFacts,
          toolAnalysis: mockDisplay.toolAnalysis,
          aiInterpretation: mockDisplay.aiInterpretation,
          unknownInformation: mockDisplay.unknownInformation,
          recommendations: mockDisplay.recommendations,
          aiProvider: null,
          isLiveCall: false,
          dpoAuditNotes: null
        };

        return (
          <>
            {/* Investigation Objective Card */}
            <div className="terminal-card" style={{ border: '1px solid var(--accent-cyan-border)', backgroundColor: 'var(--bg-card-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ maxWidth: '850px' }}>
                  <span className="input-label">Investigation Objective</span>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '4px' }}>
                    "{inv.objective}"
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
                    <span>Target: {Array.isArray(inv.datasets) ? inv.datasets.join(' + ') : inv.datasets}</span>
                    <span>•</span>
                    <span>Opened: {inv.createdAt}</span>
                    {inv.aiProvider && <span>• Engine: {inv.aiProvider}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Stage Progression Pipeline */}
            <div className="terminal-card">
              <div className="card-header">
                <div className="card-title">
                  <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Investigation Stages &amp; Audit Trail</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                {inv.stages.map((stg) => {
                  const isCompleted = stg.status === 'COMPLETED';
                  const isInProgress = stg.status === 'IN_PROGRESS';
                  const isFailed = stg.status === 'FAILED';
                  return (
                    <div
                      key={stg.stage}
                      style={{
                        flex: '1 1 200px',
                        minWidth: '190px',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isInProgress ? 'var(--bg-card-hover)' : 'var(--bg-card-subtle)',
                        border: '1px solid',
                        borderColor: isFailed ? 'var(--accent-red-border)' : isInProgress ? 'var(--accent-amber)' : isCompleted ? 'var(--border-active)' : 'var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          STAGE 0{stg.stage}
                        </span>
                        <span className={`badge ${isFailed ? 'badge-red' : isCompleted ? 'badge-green' : isInProgress ? 'badge-amber' : 'badge-neutral'}`} style={{ fontSize: '9px' }}>
                          {stg.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '6px' }}>
                        {stg.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                        {stg.summary}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4-Quadrant Evidence & Reasoning Matrix */}
            <div className="grid-2">
              {/* Q1: Observed Facts */}
              <div className="terminal-card">
                <div className="card-header">
                  <div className="card-title">
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                    <span>1. Observed Facts (Verified Truth)</span>
                  </div>
                  <span className="badge badge-green">DETERMINISTIC</span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {inv.observedFacts.map((fact, i) => (
                    <li key={i} style={{ color: 'var(--text-bright)' }}>{fact}</li>
                  ))}
                </ul>
              </div>

              {/* Q2: Tool Analysis */}
              <div className="terminal-card">
                <div className="card-header">
                  <div className="card-title">
                    <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span>2. Tool-Generated Analysis</span>
                  </div>
                  <span className="badge badge-cyan">STATIC SCANNER</span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {inv.toolAnalysis.map((tool, i) => (
                    <li key={i} style={{ color: 'var(--text-bright)' }}>{tool}</li>
                  ))}
                </ul>
              </div>

              {/* Q3: AI Interpretation */}
              <div className="terminal-card" style={{ border: '1px solid var(--accent-amber-border)' }}>
                <div className="card-header">
                  <div className="card-title">
                    <Bot size={14} style={{ color: 'var(--accent-amber)' }} />
                    <span>3. AI Interpretation &amp; Reasoning</span>
                  </div>
                  <span className="badge badge-amber">
                    {inv.isLiveCall ? 'LIVE META AI' : 'DETERMINISTIC SYNTHESIS'}
                  </span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {inv.aiInterpretation.map((interp, i) => (
                    <li key={i} style={{ color: 'var(--text-bright)' }}>{interp}</li>
                  ))}
                </ul>
              </div>

              {/* Q4: Unknowns */}
              <div className="terminal-card">
                <div className="card-header">
                  <div className="card-title">
                    <Info size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>4. Unknown Information &amp; Residual Ambiguity</span>
                  </div>
                  <span className="badge badge-neutral">UNCERTAINTY</span>
                </div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {inv.unknownInformation.map((unk, i) => (
                    <li key={i} style={{ color: 'var(--text-muted)' }}>{unk}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations & Human DPO Review Desk */}
            <div className="grid-2">
              {/* Recommendations */}
              <div className="terminal-card" style={{ border: '1px solid var(--accent-cyan-border)' }}>
                <div className="card-header">
                  <div className="card-title">
                    <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span>AI Prescriptive Recommendations</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {inv.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        color: 'var(--text-bright)',
                        lineHeight: '1.5'
                      }}
                    >
                      {rec}
                    </div>
                  ))}
                </div>

                {/* DPO Audit Notes (if available from backend) */}
                {inv.dpoAuditNotes && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>DPO Audit Package</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-bright)', lineHeight: '1.6' }}>
                      <strong>Scope:</strong> {inv.dpoAuditNotes.investigationScope}
                    </div>
                    {inv.dpoAuditNotes.uncertaintiesAndGaps.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--accent-amber)' }}>
                        <strong>Gaps:</strong> {inv.dpoAuditNotes.uncertaintiesAndGaps.join('; ')}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                      <strong>Human Approval Required:</strong>{' '}
                      <span style={{ color: inv.dpoAuditNotes.humanApprovalRequired ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                        {inv.dpoAuditNotes.humanApprovalRequired ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                      <strong>Recommended Disposition:</strong>{' '}
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {inv.dpoAuditNotes.recommendedDisposition}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Human Review Desk */}
              <div className="terminal-card">
                <div className="card-header">
                  <div className="card-title">
                    <UserCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Official Human Review Status</span>
                  </div>
                  <span
                    className={`badge ${
                      dpoStatus === 'APPROVED_WITH_CONDITIONS'
                        ? 'badge-green'
                        : dpoStatus === 'REJECTED'
                        ? 'badge-red'
                        : dpoStatus === 'NOT_REQUIRED'
                        ? 'badge-neutral'
                        : 'badge-amber'
                    }`}
                  >
                    {dpoStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    An AI investigation produces evidence and recommendations. Official determinations require formal review by the designated Data Protection Officer.
                  </p>

                  {/* Transparency Notice */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255, 179, 0, 0.08)',
                      border: '1px solid var(--accent-amber)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      color: 'var(--text-bright)'
                    }}
                  >
                    <strong>Demonstration Notice:</strong> Backend decision persistence for DPO sign-offs is not enabled in this build. Interactive buttons below simulate review determinations in local screen state only and do not modify official backend records.
                  </div>

                  {simulationAction && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-card-hover)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Simulated Local Action:{' '}
                        <strong style={{ color: simulationAction === 'REJECTED' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                          {simulationAction.replace(/_/g, ' ')}
                        </strong>
                      </span>
                      <button
                        className="btn"
                        onClick={handleResetSimulation}
                        style={{ fontSize: '10px', padding: '2px 8px' }}
                      >
                        Reset Simulation
                      </button>
                    </div>
                  )}

                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Add demonstration review note or compliance stipulation..."
                    value={dpoNote}
                    onChange={(e) => setDpoNote(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSimulateApprove}
                      disabled={simulationAction === 'APPROVED_WITH_CONDITIONS'}
                      title="Simulate approval in local session only"
                    >
                      <CheckCircle2 size={13} />
                      <span>Simulate Conditional Approval</span>
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleSimulateReject}
                      disabled={simulationAction === 'REJECTED'}
                      title="Simulate rejection in local session only"
                    >
                      <AlertTriangle size={13} />
                      <span>Simulate Rejection</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Default state: show mock demo if no result & not running & form is hidden */}
      {!displayData && !isRunning && !errorMessage && !showForm && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Configure an investigation above and click Launch.
        </div>
      )}
    </div>
  );
};
