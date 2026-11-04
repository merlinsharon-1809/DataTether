import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Bot,
  Shield,
  CheckCircle2,
  Save,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  FlaskConical,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  fetchStorageConnections,
  scanStorageConnection,
} from '../services/api.ts';
import type { StorageConnection, StorageScanResult, DiscoveredDataset } from '../types/index.ts';

// ── Helper: classification badge colour ────────────────────────────────────────
function classificationClass(level: string): string {
  switch (level.toUpperCase()) {
    case 'RESTRICTED':   return 'badge-red';
    case 'CONFIDENTIAL': return 'badge-amber';
    case 'INTERNAL':     return 'badge-cyan';
    default:             return 'badge-neutral';
  }
}

// ── Helper: format bytes ───────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ── Status badge renderer ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'CONNECTED':
      return (
        <span className="badge badge-green">
          <Wifi size={10} /> Connected
        </span>
      );
    case 'CONFIGURED':
      return (
        <span className="badge badge-cyan">
          <Wifi size={10} /> Credentials Set
        </span>
      );
    case 'SIMULATED':
      return (
        <span className="badge badge-amber">
          <FlaskConical size={10} /> Demo Mode
        </span>
      );
    case 'DISCONNECTED':
      return (
        <span className="badge badge-neutral">
          <WifiOff size={10} /> Not Connected
        </span>
      );
    case 'ERROR':
      return (
        <span className="badge badge-red">
          <XCircle size={10} /> Error
        </span>
      );
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

// ── Scan result status banner ──────────────────────────────────────────────────
function ScanStatusBanner({ result }: { result: StorageScanResult }) {
  if (result.status === 'CONNECTED') {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-green-dim)',
        border: '1px solid var(--accent-green-border)',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '12px', color: 'var(--accent-green)',
      }}>
        <CheckCircle2 size={13} />
        <span>{result.status_detail}</span>
      </div>
    );
  }
  if (result.status === 'SIMULATED') {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-amber-dim)',
        border: '1px solid var(--accent-amber-border)',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
        fontSize: '12px', color: 'var(--accent-amber)',
      }}>
        <FlaskConical size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong>Demo dataset index</strong> — {result.status_detail}
        </div>
      </div>
    );
  }
  if (result.status === 'DISCONNECTED') {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
        fontSize: '12px', color: 'var(--text-muted)',
      }}>
        <WifiOff size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>{result.status_detail}</span>
      </div>
    );
  }
  // ERROR
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--accent-red-dim)',
      border: '1px solid var(--accent-red-border)',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      fontSize: '12px', color: 'var(--accent-red)',
    }}>
      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div>
        <strong>Scan failed:</strong> {result.status_detail}
      </div>
    </div>
  );
}

// ── Single connection card ─────────────────────────────────────────────────────
interface ConnectionCardProps {
  conn: StorageConnection;
}

function ConnectionCard({ conn }: ConnectionCardProps) {
  const [scanResult, setScanResult] = useState<StorageScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const result = await scanStorageConnection(conn.id);
      setScanResult(result);
      setExpanded(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed unexpectedly.');
    } finally {
      setScanning(false);
    }
  }, [conn.id]);

  const canScan = conn.status !== 'DISCONNECTED';
  const isDisconnected = conn.status === 'DISCONNECTED';

  return (
    <div style={{
      padding: '14px',
      backgroundColor: 'var(--bg-card-subtle)',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${isDisconnected ? 'var(--border-subtle)' : 'var(--border-active)'}`,
      opacity: isDisconnected ? 0.7 : 1,
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <HardDrive size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
            {conn.name}
          </span>
          <StatusBadge status={conn.status} />
          <span className="badge badge-neutral" style={{ fontSize: '9px' }}>
            {conn.provider}
          </span>
          {conn.is_local && (
            <span className="badge badge-neutral" style={{ fontSize: '9px' }}>
              LOCAL
            </span>
          )}
        </div>

        {/* Scan button */}
        <button
          id={`btn-scan-${conn.id}`}
          className={`btn btn-sm ${canScan ? 'btn-outline-cyan' : 'btn-secondary'}`}
          onClick={handleScan}
          disabled={!canScan || scanning}
          title={isDisconnected ? 'Configure credentials to enable scanning' : 'Scan this storage connection'}
        >
          <RefreshCw size={11} className={scanning ? 'spin' : ''} />
          {scanning ? 'Scanning…' : 'Scan Objects'}
        </button>
      </div>

      {/* Endpoint + notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          {conn.endpoint}
        </span>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {conn.notes}
        </span>
      </div>

      {/* Scan error (fetch-level failure) */}
      {scanError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-red-dim)',
          border: '1px solid var(--accent-red-border)',
          fontSize: '12px', color: 'var(--accent-red)',
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <XCircle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
          {scanError}
        </div>
      )}

      {/* Scan result */}
      {scanResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ScanStatusBanner result={scanResult} />

          {scanResult.items.length > 0 && (
            <>
              {/* Result summary */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '6px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11.5px',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Objects found: </span>
                  <span style={{ color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {scanResult.files_found}
                  </span>
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11.5px',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Unregistered: </span>
                  <span style={{ color: scanResult.new_unregistered_count > 0 ? 'var(--accent-amber)' : 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {scanResult.new_unregistered_count}
                  </span>
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11.5px',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Scanned: </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(scanResult.scanned_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Expand/collapse table */}
              <button
                id={`btn-toggle-results-${conn.id}`}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setExpanded(e => !e)}
              >
                <FileSearch size={11} />
                {expanded ? 'Hide' : 'Show'} discovered objects
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {expanded && (
                <div className="terminal-table-container">
                  <table className="terminal-table">
                    <thead>
                      <tr>
                        <th>Object Key / Path</th>
                        <th>Format</th>
                        <th>Size</th>
                        <th>Classification</th>
                        <th>Source</th>
                        <th>Registry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.items.map((item: DiscoveredDataset) => (
                        <tr key={item.file_path}>
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-bright)' }}>
                              {item.file_name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {item.bucket} / {item.file_path.split('/').slice(1).join('/')}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-cyan" style={{ fontSize: '9px' }}>
                              {item.file_format}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatBytes(item.size_bytes)}
                          </td>
                          <td>
                            <span className={`badge ${classificationClass(item.suggested_classification)}`} style={{ fontSize: '9px' }}>
                              {item.suggested_classification}
                            </span>
                          </td>
                          <td>
                            {item.is_simulated ? (
                              <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                                <FlaskConical size={8} /> Demo Index
                              </span>
                            ) : (
                              <span className="badge badge-green" style={{ fontSize: '9px' }}>
                                <Wifi size={8} /> Live Scan
                              </span>
                            )}
                          </td>
                          <td>
                            {item.is_already_registered ? (
                              <span className="badge badge-green" style={{ fontSize: '9px' }}>
                                <CheckCircle2 size={8} /> Registered
                              </span>
                            ) : (
                              <span className="badge badge-neutral" style={{ fontSize: '9px' }}>
                                Unregistered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main SettingsPage ──────────────────────────────────────────────────────────
export const SettingsPage: React.FC = () => {
  // Storage connections — loaded live from backend
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);

  // Governance policy local state
  const [enforceConsentChecks, setEnforceConsentChecks] = useState(true);
  const [strictKAnonymity, setStrictKAnonymity] = useState(true);
  const [kThreshold, setKThreshold] = useState('5');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load storage connections from backend on mount
  useEffect(() => {
    setConnectionsLoading(true);
    fetchStorageConnections()
      .then(data => {
        setConnections(data);
        setConnectionsError(null);
      })
      .catch(err => {
        setConnectionsError(err instanceof Error ? err.message : 'Failed to load storage connections.');
      })
      .finally(() => setConnectionsLoading(false));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              System Connections &amp; Governance Rulesets
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              CONFIG REPOSITORY
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Manage storage clusters, AI service integrations, classification parameters, and automated policy gates.
          </p>
        </div>

        {savedSuccess && (
          <div className="badge badge-green" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <CheckCircle2 size={13} /> Settings saved to local state
          </div>
        )}
      </div>

      {/* ── Section 1: Storage Connections (live from backend) ──────────────── */}
      <div className="terminal-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <HardDrive size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Storage System Connections</span>
            </div>
            <div className="card-subtitle">
              Live connection index — status reflects backend credential configuration
            </div>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '9.5px' }}>
            {connectionsLoading ? 'LOADING…' : `${connections.length} REGISTERED`}
          </span>
        </div>

        {/* Loading state */}
        {connectionsLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            <RefreshCw size={13} className="spin" style={{ marginRight: '8px' }} />
            Loading storage connections…
          </div>
        )}

        {/* Error loading connections */}
        {!connectionsLoading && connectionsError && (
          <div style={{
            padding: '14px',
            background: 'var(--accent-red-dim)',
            border: '1px solid var(--accent-red-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px', color: 'var(--accent-red)',
            display: 'flex', gap: '8px',
          }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Could not load storage connections.</strong>{' '}
              {connectionsError} Check that the backend is running.
            </div>
          </div>
        )}

        {/* Connection cards */}
        {!connectionsLoading && !connectionsError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {connections.map(conn => (
              <ConnectionCard key={conn.id} conn={conn} />
            ))}

            {/* How to enable live scanning */}
            <div style={{
              padding: '10px 14px',
              background: 'rgba(0, 229, 201, 0.04)',
              border: '1px solid var(--accent-cyan-border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5,
            }}>
              <Info size={12} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '1px' }} />
              <span>
                To enable live MinIO scanning: set <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>MINIO_ENDPOINT</code>,{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>MINIO_ACCESS_KEY</code>, and{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>MINIO_SECRET_KEY</code>{' '}
                in <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>backend/.env</code> and restart the backend.
                Credentials are never sent to or stored in the frontend.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: AI Configuration ─────────────────────────────────────── */}
      <div className="terminal-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Bot size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Meta AI Integration (muse-spark-1.3)</span>
            </div>
            <div className="card-subtitle">AI reasoning engine for evidence synthesis and risk explanation</div>
          </div>
          <span className="badge badge-green" style={{ fontSize: '9.5px' }}>
            <Wifi size={9} /> LIVE — MODEL_API_KEY
          </span>
        </div>

        <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
            <strong style={{ fontSize: '13px', color: 'var(--accent-green)' }}>
              Connected — live AI interpretation active
            </strong>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-bright)', lineHeight: '1.5' }}>
            The investigation workflow calls <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>api.meta.ai/v1/chat/completions</code>{' '}
            using model <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent-cyan)' }}>muse-spark-1.3</code>.
            If the live call fails for any reason, the platform falls back to deterministic heuristic reasoning,
            which is always clearly labelled in the investigation report.
            The API key is stored only in the backend environment and is never exposed to the frontend.
          </p>
        </div>
      </div>

      {/* ── Section 3: Governance Rulesets ──────────────────────────────────── */}
      <form onSubmit={handleSave}>
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Shield size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Automated Governance Rulesets</span>
              </div>
              <div className="card-subtitle">Policy enforcement gates executed during data combination and usage</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-bright)' }}>
              <input
                type="checkbox"
                id="chk-consent"
                checked={enforceConsentChecks}
                onChange={e => setEnforceConsentChecks(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span><strong>Enforce Strict Negative Covenant Matching:</strong> Automatically block operations where the target purpose matches a restricted purpose in the Data Passport.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-bright)' }}>
              <input
                type="checkbox"
                id="chk-kanon"
                checked={strictKAnonymity}
                onChange={e => setStrictKAnonymity(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span><strong>Require Quasi-Identifier Anonymization:</strong> Mandate minimum k-anonymity for multi-source combinations containing location or demographic attributes.</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span className="input-label">Minimum k-anonymity threshold:</span>
              <input
                type="number"
                id="input-kthreshold"
                className="input-field"
                value={kThreshold}
                onChange={e => setKThreshold(e.target.value)}
                style={{ width: '80px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="submit" className="btn btn-primary" id="btn-save-settings">
              <Save size={13} />
              <span>Save Configuration</span>
            </button>
            <button
              type="button"
              id="btn-reset-settings"
              className="btn btn-secondary"
              onClick={() => {
                setEnforceConsentChecks(true);
                setStrictKAnonymity(true);
                setKThreshold('5');
              }}
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>
      </form>

    </div>
  );
};
