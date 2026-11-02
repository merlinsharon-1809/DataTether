import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileCheck2,
  HardDrive,
  ShieldAlert
} from 'lucide-react';
import { MOCK_DATASETS } from '../data/mockData.ts';
import type { ClassificationLevel, Dataset } from '../types/index.ts';
import { fetchDatasets, mapBackendDatasetToFrontend } from '../services/api.ts';

interface InventoryPageProps {
  onSelectDatasetForPassport: (datasetId: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  onSelectDatasetForPassport
}) => {
  const [datasetsList, setDatasetsList] = useState<Dataset[]>(MOCK_DATASETS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [selectedStorage, setSelectedStorage] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'lastUpdated' | 'classification' | 'sizeBytes'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Load live datasets from backend
  useEffect(() => {
    fetchDatasets()
      .then((backendItems) => {
        if (backendItems && backendItems.length > 0) {
          const mapped = backendItems.map(mapBackendDatasetToFrontend);
          setDatasetsList(mapped);
        }
      })
      .catch((err) => {
        console.warn('Backend datasets offline or failed to fetch, using fallback datasets:', err);
      });
  }, []);

  // Filter & sort logic
  const filteredDatasets = useMemo(() => {
    return datasetsList.filter((dataset) => {
      const matchesSearch =
        dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dataset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dataset.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dataset.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass =
        selectedClassification === 'ALL' || dataset.classification === selectedClassification;

      const matchesStorage =
        selectedStorage === 'ALL' || dataset.storageType === selectedStorage;

      return matchesSearch && matchesClass && matchesStorage;
    }).sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [searchTerm, selectedClassification, selectedStorage, sortField, sortAsc]);

  const toggleSort = (field: 'name' | 'lastUpdated' | 'classification' | 'sizeBytes') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
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

  const formatBytes = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
          Dataset Inventory
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          Authoritative registry of all datasets discovered across connected storage clusters. Click any row to view its signed Data Passport.
        </p>
      </div>

      {/* Control Bar: Search & Filters */}
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
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search by dataset name, ID, owner or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>

        {/* Classification Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>
            <Filter size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
            CLASSIFICATION:
          </span>
          {(['ALL', 'RESTRICTED', 'CONFIDENTIAL', 'INTERNAL', 'PUBLIC'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedClassification(lvl)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: selectedClassification === lvl ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                backgroundColor: selectedClassification === lvl ? 'var(--accent-cyan-dim)' : 'var(--bg-card-subtle)',
                color: selectedClassification === lvl ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Storage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STORAGE:</span>
          <select
            className="select-field"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}
            value={selectedStorage}
            onChange={(e) => setSelectedStorage(e.target.value)}
          >
            <option value="ALL">All Storage</option>
            <option value="MinIO">MinIO Local</option>
            <option value="S3">AWS S3</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="terminal-table-container">
        <table className="terminal-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Dataset Name <ArrowUpDown size={11} />
                </span>
              </th>
              <th>Dataset ID</th>
              <th>Storage Source</th>
              <th onClick={() => toggleSort('classification')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Classification <ArrowUpDown size={11} />
                </span>
              </th>
              <th>Owner / Dept</th>
              <th onClick={() => toggleSort('sizeBytes')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Records / Size <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => toggleSort('lastUpdated')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Last Updated <ArrowUpDown size={11} />
                </span>
              </th>
              <th>Governance Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDatasets.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No datasets matching the filter criteria.
                </td>
              </tr>
            ) : (
              filteredDatasets.map((ds) => (
                <tr key={ds.id} style={{ cursor: 'pointer' }} onClick={() => onSelectDatasetForPassport(ds.id)}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                        {ds.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ds.description}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="tech-id">{ds.id}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      <HardDrive size={11} style={{ color: 'var(--accent-cyan)' }} />
                      <span>{ds.storageSource}</span>
                    </div>
                  </td>
                  <td>{getClassificationBadge(ds.classification)}</td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-bright)' }}>{ds.owner}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{ds.department}</div>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-bright)' }}>
                      {ds.recordCount.toLocaleString()} rows
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatBytes(ds.sizeBytes)} • {ds.format}
                    </div>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {ds.lastUpdated}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        ds.governanceStatus === 'COMPLIANT'
                          ? 'badge-green'
                          : ds.governanceStatus === 'NEEDS_REVIEW'
                          ? 'badge-amber'
                          : 'badge-red'
                      }`}
                    >
                      {ds.governanceStatus === 'FLAGGED' && <ShieldAlert size={10} />}
                      {ds.governanceStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline-cyan btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDatasetForPassport(ds.id);
                      }}
                      title="Inspect signed Data Passport"
                    >
                      <FileCheck2 size={12} />
                      <span>Passport</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Inventory Telemetry Bar */}
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
        <span>Displaying {filteredDatasets.length} of {MOCK_DATASETS.length} datasets cataloged</span>
        <span>Storage Cluster: local-docker-minio (AES-256)</span>
      </div>
    </div>
  );
};
