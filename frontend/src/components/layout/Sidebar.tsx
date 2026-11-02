import React from 'react';
import {
  LayoutDashboard,
  Database,
  FileCheck2,
  GitMerge,
  ShieldCheck,
  Bot,
  Network,
  ScrollText,
  Settings,
  HardDrive,
  UserCheck
} from 'lucide-react';

export type NavItem =
  | 'overview'
  | 'inventory'
  | 'passports'
  | 'combination-lab'
  | 'usage-evaluator'
  | 'investigation'
  | 'lineage'
  | 'audit-logs'
  | 'settings';

import type { ConnectionStatus } from '../../services/api.ts';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  openFindingsCount?: number;
  backendStatus?: ConnectionStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openFindingsCount = 2,
  backendStatus = 'CONNECTED'
}) => {
  const navItems = [
    { id: 'overview' as NavItem, label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory' as NavItem, label: 'Dataset Inventory', icon: Database, badge: '5' },
    { id: 'passports' as NavItem, label: 'Data Passports', icon: FileCheck2 },
    { id: 'combination-lab' as NavItem, label: 'Combination Lab', icon: GitMerge, badge: 'New', badgeColor: 'cyan' },
    { id: 'usage-evaluator' as NavItem, label: 'Usage Evaluator', icon: ShieldCheck },
    { id: 'investigation' as NavItem, label: 'AI Investigation', icon: Bot, badge: openFindingsCount > 0 ? `${openFindingsCount} Open` : undefined, badgeColor: 'red' },
    { id: 'lineage' as NavItem, label: 'Data Lineage', icon: Network },
    { id: 'audit-logs' as NavItem, label: 'Audit Logs', icon: ScrollText },
    { id: 'settings' as NavItem, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '68px',
          padding: '0 8px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={() => onSelectTab('overview')}
        title="DataTether - Intelligent Data Governance"
      >
        <img
          src="/datatether-logo.png"
          alt="DataTether - Intelligent Data Governance"
          style={{
            width: '244px',
            height: 'auto',
            maxWidth: 'none',
            transform: 'scale(1.18)',
            transformOrigin: 'center center',
            display: 'block'
          }}
        />
      </div>

      {/* Nav list */}
      <nav
        style={{
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          flex: 1,
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            padding: '4px 10px 8px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}
        >
          Operations & Control
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'var(--bg-card-hover)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-main)',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent-cyan-border)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.12s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-subtle)';
                  e.currentTarget.style.color = 'var(--text-bright)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={16}
                  style={{
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'
                  }}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`badge ${
                    item.badgeColor === 'cyan'
                      ? 'badge-cyan'
                      : item.badgeColor === 'red'
                      ? 'badge-red'
                      : 'badge-neutral'
                  }`}
                  style={{ fontSize: '10px', padding: '1px 5px' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '14px 16px',
          backgroundColor: 'rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {/* Storage & Backend live status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={13} style={{ color: 'var(--accent-green)' }} />
            <span>MinIO (Local)</span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent-green)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-green)',
                boxShadow: '0 0 6px var(--accent-green)'
              }}
            />
            ONLINE
          </span>
        </div>

        {/* FastAPI Server Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '2px',
                border: '1px solid',
                borderColor: backendStatus === 'CONNECTED' ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8.5px',
                fontFamily: 'var(--font-mono)',
                color: backendStatus === 'CONNECTED' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}
            >
              py
            </span>
            <span>FastAPI Server</span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color:
                backendStatus === 'CONNECTED'
                  ? 'var(--accent-green)'
                  : backendStatus === 'CHECKING'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px'
            }}
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
                    : 'none'
              }}
            />
            {backendStatus}
          </span>
        </div>

        {/* Environment Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            padding: '4px 8px',
            backgroundColor: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>ENV</span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>LOCAL DEV</span>
        </div>

        {/* User profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '6px'
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--border-active)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-bright)'
            }}
          >
            <UserCheck size={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-bright)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}
            >
              SecOps Lead
            </span>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              operator@local.corp
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
