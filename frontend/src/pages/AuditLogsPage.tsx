import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Download
} from 'lucide-react';
import { MOCK_AUDIT_LOGS } from '../data/mockData.ts';

export const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'SUCCESS' | 'DENIED' | 'FLAGGED'>('ALL');

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.dataset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesResult = resultFilter === 'ALL' || log.result === resultFilter;
      return matchesSearch && matchesResult;
    });
  }, [searchTerm, resultFilter]);

  const exportAuditLogsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'datatether_audit_log_export.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              Audit & Governance Access Logs
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              TAMPER-EVIDENT LEDGER
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Comprehensive immutable activity record tracking policy evaluations, pipeline transformations, and permission gates.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={exportAuditLogsJSON}>
          <Download size={13} />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Demonstration Notice */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(255, 179, 0, 0.08)',
          border: '1px solid var(--accent-amber)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--text-bright)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <AlertTriangle size={15} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
        <div>
          <strong>Demonstration Mode:</strong> These audit entries are static sample data for interface demonstration. They are not persisted backend audit events.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="terminal-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ position: 'relative', minWidth: '320px', flex: 1 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search by action, dataset, actor or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RESULT:</span>
          {(['ALL', 'SUCCESS', 'DENIED', 'FLAGGED'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResultFilter(r)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: resultFilter === r ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                backgroundColor: resultFilter === r ? 'var(--accent-cyan-dim)' : 'var(--bg-card-subtle)',
                color: resultFilter === r ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="terminal-table-container">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Timestamp (UTC)</th>
              <th>Action Category</th>
              <th>Target Dataset</th>
              <th>Actor / Client</th>
              <th>Operation Details</th>
              <th>Result</th>
              <th>Client IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <span className="tech-id">{log.id}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {log.timestamp}
                </td>
                <td>
                  <strong style={{ color: 'var(--text-bright)', fontSize: '12px' }}>{log.action}</strong>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--accent-cyan)' }}>
                  {log.dataset}
                </td>
                <td>
                  <span style={{ fontSize: '12px', color: 'var(--text-bright)' }}>{log.actor}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-main)' }}>
                  {log.operation}
                </td>
                <td>
                  <span
                    className={`badge ${
                      log.result === 'SUCCESS'
                        ? 'badge-green'
                        : log.result === 'DENIED'
                        ? 'badge-red'
                        : 'badge-amber'
                    }`}
                  >
                    {log.result === 'SUCCESS' ? (
                      <CheckCircle2 size={10} />
                    ) : log.result === 'DENIED' ? (
                      <ShieldAlert size={10} />
                    ) : (
                      <AlertTriangle size={10} />
                    )}
                    {log.result}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {log.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          padding: '8px 12px',
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <span>Displaying {filteredLogs.length} audit event entries</span>
        <span>Cryptographic Hash Chain: SHA-256 Validated</span>
      </div>
    </div>
  );
};
