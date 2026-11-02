import React, { useState } from 'react';
import { Search, Bell, Shield, Radio, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { NavItem } from './Sidebar.tsx';
import type { ConnectionStatus } from '../../services/api.ts';

interface TopNavProps {
  currentTab: NavItem;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTab: (tab: NavItem) => void;
  backendStatus: ConnectionStatus;
  onRefreshHealth?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  onSelectTab,
  backendStatus,
  onRefreshHealth
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'Combination Risk Flagged',
      detail: 'Customer Profiles + Purchase History joint entropy correlates sensitive income.',
      severity: 'red',
      time: '12m ago',
      tab: 'combination-lab' as NavItem
    },
    {
      id: '2',
      title: 'Usage Evaluation Blocked',
      detail: 'Attempted model retrain on unconsented PII data source rejected.',
      severity: 'amber',
      time: '45m ago',
      tab: 'usage-evaluator' as NavItem
    },
    {
      id: '3',
      title: 'Storage Catalog Synced',
      detail: '5 datasets re-indexed from local MinIO storage endpoint.',
      severity: 'green',
      time: '2h ago',
      tab: 'inventory' as NavItem
    }
  ];

  const getBreadcrumbTitle = (tab: NavItem): { title: string; section: string } => {
    switch (tab) {
      case 'overview':
        return { title: 'Security & Governance Overview', section: 'Monitoring' };
      case 'inventory':
        return { title: 'Dataset Inventory & Storage Catalog', section: 'Data Assets' };
      case 'passports':
        return { title: 'Data Passports & Governance Ledger', section: 'Compliance' };
      case 'combination-lab':
        return { title: 'Privacy Risk Combination Lab', section: 'Analysis' };
      case 'usage-evaluator':
        return { title: 'Intended Usage Policy Evaluator', section: 'Enforcement' };
      case 'investigation':
        return { title: 'Meta AI Investigation Dossier', section: 'AI Reasoning' };
      case 'lineage':
        return { title: 'Data Lineage & Transformation Topology', section: 'Topology' };
      case 'audit-logs':
        return { title: 'Cryptographic Audit & Access Logs', section: 'Audit' };
      case 'settings':
        return { title: 'System Connections & Governance Rulesets', section: 'System' };
      default:
        return { title: 'DataTether Console', section: 'Home' };
    }
  };

  const { title, section } = getBreadcrumbTitle(currentTab);

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-card-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      {/* Left: Breadcrumbs & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>DATATETHER</span>
          <span>/</span>
          <span>{section}</span>
          <span>/</span>
        </div>
        <h1
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--text-bright)',
            letterSpacing: '0.2px'
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: Global Search & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Global Search Bar */}
        <div
          style={{
            position: 'relative',
            width: '260px'
          }}
        >
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search datasets, passports, rules..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px 6px 30px',
              color: 'var(--text-bright)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Live Network & Node Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '4px 8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)'
          }}
        >
          <Radio size={11} style={{ color: 'var(--accent-cyan)' }} />
          <span>PORT 5173</span>
        </div>

        {/* Live Backend Connection Status */}
        <div
          onClick={onRefreshHealth}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '4px 9px',
            backgroundColor:
              backendStatus === 'CONNECTED'
                ? 'var(--accent-green-dim)'
                : backendStatus === 'CHECKING'
                ? 'var(--accent-amber-dim)'
                : 'var(--accent-red-dim)',
            border: '1px solid',
            borderColor:
              backendStatus === 'CONNECTED'
                ? 'var(--accent-green-border)'
                : backendStatus === 'CHECKING'
                ? 'var(--accent-amber-border)'
                : 'var(--accent-red-border)',
            borderRadius: 'var(--radius-sm)',
            color:
              backendStatus === 'CONNECTED'
                ? 'var(--accent-green)'
                : backendStatus === 'CHECKING'
                ? 'var(--accent-amber)'
                : 'var(--accent-red)',
            cursor: onRefreshHealth ? 'pointer' : 'default'
          }}
          title={
            backendStatus === 'CONNECTED'
              ? 'FastAPI Backend: CONNECTED (Click to refresh)'
              : 'FastAPI Backend: DISCONNECTED (Click to retry)'
          }
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor:
                backendStatus === 'CONNECTED'
                  ? 'var(--accent-green)'
                  : backendStatus === 'CHECKING'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)',
              boxShadow:
                backendStatus === 'CONNECTED'
                  ? '0 0 6px var(--accent-green)'
                  : backendStatus === 'CHECKING'
                  ? '0 0 6px var(--accent-amber)'
                  : '0 0 6px var(--accent-red)'
            }}
          />
          <Shield size={11} />
          <span>API: {backendStatus}</span>
        </div>

        {/* Notifications Icon with Interactive Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: showNotifications ? 'var(--bg-card-hover)' : 'var(--bg-card)',
              border: '1px solid',
              borderColor: showNotifications ? 'var(--accent-cyan-border)' : 'var(--border-subtle)',
              color: 'var(--text-bright)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Notifications"
          >
            <Bell size={14} />
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-red)',
                boxShadow: '0 0 6px var(--accent-red)'
              }}
            />
          </button>

          {/* Popover */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '320px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                zIndex: 100,
                padding: '12px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '8px'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-bright)' }}>
                  Security & Risk Alerts
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                  3 NEW
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectTab(n.tab);
                      setShowNotifications(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-subtle)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color:
                            n.severity === 'red'
                              ? 'var(--accent-red)'
                              : n.severity === 'amber'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-green)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {n.severity === 'red' ? (
                          <AlertTriangle size={12} />
                        ) : n.severity === 'amber' ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {n.title}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {n.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-mono)'
          }}
          title="Merlin (SecOps Lead)"
        >
          ML
        </div>
      </div>
    </header>
  );
};
