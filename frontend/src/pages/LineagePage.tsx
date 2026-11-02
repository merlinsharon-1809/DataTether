import React, { useState, useEffect } from 'react';
import {
  Network,
  HardDrive,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Database
} from 'lucide-react';
import { MOCK_LINEAGE_NODES, MOCK_LINEAGE_EDGES, MOCK_DATASETS } from '../data/mockData.ts';
import type { ClassificationLevel, LineageNode, LineageEdge, Dataset } from '../types/index.ts';
import { fetchDatasets, fetchDatasetLineage, mapBackendDatasetToFrontend } from '../services/api.ts';

// Layout helper: arrange nodes in a simple left-to-right DAG grid
function layoutNodes(
  nodes: Array<{ id: string; name: string; classification: string; isRoot: boolean; nodeType: string }>,
  edges: Array<{ from: string; to: string }>
): LineageNode[] {
  // BFS to assign columns
  const colMap = new Map<string, number>();
  const rootId = nodes.find((n) => n.isRoot)?.id || nodes[0]?.id;
  if (!rootId) return [];

  const queue = [rootId];
  colMap.set(rootId, 0);
  const visited = new Set<string>([rootId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const col = colMap.get(current) || 0;
    for (const edge of edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        colMap.set(edge.to, col + 1);
        visited.add(edge.to);
        queue.push(edge.to);
      }
      if (edge.to === current && !visited.has(edge.from)) {
        colMap.set(edge.from, col - 1);
        visited.add(edge.from);
        queue.push(edge.from);
      }
    }
  }

  // Group nodes by column
  const byCol = new Map<number, string[]>();
  for (const [id, col] of colMap) {
    if (!byCol.has(col)) byCol.set(col, []);
    byCol.get(col)!.push(id);
  }

  // Normalize columns to start from 0
  const minCol = Math.min(...byCol.keys());
  const normalByCol = new Map<number, string[]>();
  for (const [col, ids] of byCol) {
    normalByCol.set(col - minCol, ids);
  }

  const X_STEP = 240;
  const Y_STEP = 100;
  const X_BASE = 60;
  const Y_BASE = 80;

  const positioned: LineageNode[] = [];
  const posMap = new Map<string, { x: number; y: number }>();

  for (const [col, ids] of normalByCol) {
    ids.forEach((id, rowIdx) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const x = X_BASE + col * X_STEP;
      const y = Y_BASE + rowIdx * Y_STEP;
      posMap.set(id, { x, y });

      const classMap: Record<string, ClassificationLevel> = {
        RESTRICTED: 'RESTRICTED',
        CONFIDENTIAL: 'CONFIDENTIAL',
        INTERNAL: 'INTERNAL',
        PUBLIC: 'PUBLIC'
      };
      const cls = classMap[node.classification?.toUpperCase()] || 'INTERNAL';

      positioned.push({
        id: node.id,
        label: node.name,
        type: node.nodeType === 'DERIVED' ? 'DERIVED' : node.isRoot ? 'SOURCE' : 'PROCESSED',
        classification: cls,
        governanceStatus: cls === 'RESTRICTED' ? 'RESTRICTED' : cls === 'CONFIDENTIAL' ? 'FLAGGED' : 'COMPLIANT',
        x,
        y,
        storage: `backend/${node.id}`,
        recordCount: 'Live data',
        copiesCount: 0
      });
    });
  }

  return positioned;
}

export const LineagePage: React.FC = () => {
  const [datasetsList, setDatasetsList] = useState<Dataset[]>(MOCK_DATASETS);
  const [selectedRootId, setSelectedRootId] = useState<string>(MOCK_DATASETS[0]?.id || '');
  const [nodes, setNodes] = useState<LineageNode[]>(MOCK_LINEAGE_NODES);
  const [edges, setEdges] = useState<LineageEdge[]>(MOCK_LINEAGE_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-3');
  const [isLoading, setIsLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [direction, setDirection] = useState<'upstream' | 'downstream' | 'both'>('both');

  // Load dataset list on mount
  useEffect(() => {
    fetchDatasets()
      .then((items) => {
        if (items && items.length > 0) {
          const mapped = items.map(mapBackendDatasetToFrontend);
          setDatasetsList(mapped);
          setSelectedRootId(mapped[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Load lineage for selected root
  useEffect(() => {
    if (!selectedRootId) return;
    setIsLoading(true);

    fetchDatasetLineage(selectedRootId, direction)
      .then((graph) => {
        if (graph && graph.nodes && graph.nodes.length > 0) {
          const laidOut = layoutNodes(graph.nodes, graph.edges || []);
          setNodes(laidOut.length > 0 ? laidOut : MOCK_LINEAGE_NODES);
          const mappedEdges: LineageEdge[] = (graph.edges || []).map((e: any, i: number) => ({
            id: `edge-${i}`,
            from: e.from || e.source_dataset_id,
            to: e.to || e.target_dataset_id,
            label: e.label || e.transformation_type || 'Derived',
            transformationType: (e.transformation_type || 'ETL_CLEANSE') as LineageEdge['transformationType']
          }));
          setEdges(mappedEdges.length > 0 ? mappedEdges : MOCK_LINEAGE_EDGES);
          setUsingMock(false);
          if (laidOut.length > 0) {
            setSelectedNodeId(laidOut[0].id);
          }
        } else {
          // Backend has no lineage data yet — fall back to mock
          setNodes(MOCK_LINEAGE_NODES);
          setEdges(MOCK_LINEAGE_EDGES);
          setUsingMock(true);
          setSelectedNodeId('node-3');
        }
      })
      .catch(() => {
        setNodes(MOCK_LINEAGE_NODES);
        setEdges(MOCK_LINEAGE_EDGES);
        setUsingMock(true);
        setSelectedNodeId('node-3');
      })
      .finally(() => setIsLoading(false));
  }, [selectedRootId, direction]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const getClassificationBadge = (lvl: ClassificationLevel) => {
    switch (lvl) {
      case 'RESTRICTED':
        return <span className="badge badge-red" style={{ fontSize: '9px' }}>RESTRICTED</span>;
      case 'CONFIDENTIAL':
        return <span className="badge badge-amber" style={{ fontSize: '9px' }}>CONFIDENTIAL</span>;
      case 'INTERNAL':
        return <span className="badge badge-cyan" style={{ fontSize: '9px' }}>INTERNAL</span>;
      case 'PUBLIC':
        return <span className="badge badge-green" style={{ fontSize: '9px' }}>PUBLIC</span>;
    }
  };

  // Compute node center positions for edge rendering
  const nodePositions = new Map<string, { cx: number; cy: number }>();
  for (const n of nodes) {
    nodePositions.set(n.id, { cx: n.x + 105, cy: n.y + 45 });
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
            Data Lineage &amp; Transformation Topology
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Inspect provenance trees, derivation hops, and governance inheritance across datasets and AI training pipelines. Click any node to open the lineage inspector.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {usingMock && (
            <span className="badge badge-amber" style={{ fontSize: '9.5px' }}>MOCK DATA — NO LINEAGE IN DB</span>
          )}
          <select
            className="select-field"
            value={selectedRootId}
            onChange={(e) => setSelectedRootId(e.target.value)}
            style={{ fontSize: '12px', minWidth: '200px', fontFamily: 'var(--font-mono)' }}
          >
            {datasetsList.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
            ))}
          </select>
          <select
            className="select-field"
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            style={{ fontSize: '12px', minWidth: '140px' }}
          >
            <option value="both">Both directions</option>
            <option value="upstream">Upstream only</option>
            <option value="downstream">Downstream only</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Main Canvas Area */}
        <div
          className="terminal-card"
          style={{
            flex: '1 1 650px',
            minHeight: '520px',
            position: 'relative',
            backgroundColor: '#070a12',
            backgroundImage: 'radial-gradient(circle at 1px 1px, #162032 1px, transparent 0)',
            backgroundSize: '24px 24px',
            padding: '24px',
            overflow: 'hidden'
          }}
        >
          {/* Canvas Sub-header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <Network size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>TOPOLOGY: {nodes.length} NODES • {edges.length} TRANSFORMATIONS • DIRECTED ACYCLIC GRAPH</span>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '9.5px' }}>
              {usingMock ? 'MOCK TOPOLOGY' : 'LIVE LINEAGE'}
            </span>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '12px' }}>
              <RefreshCw size={24} style={{ color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading lineage topology...</span>
            </div>
          ) : (
            <>
              {/* SVG Connection Lines - drawn between computed node centers */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                <defs>
                  <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00e5c9" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00e5c9" stopOpacity="0.9" />
                  </linearGradient>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#00e5c9" />
                  </marker>
                </defs>

                {edges.map((edge) => {
                  const from = nodePositions.get(edge.from);
                  const to = nodePositions.get(edge.to);
                  if (!from || !to) return null;
                  const midX = (from.cx + to.cx) / 2;
                  const isRestricted =
                    nodes.find((n) => n.id === edge.to)?.classification === 'RESTRICTED';
                  return (
                    <path
                      key={edge.id}
                      d={`M ${from.cx} ${from.cy} C ${midX} ${from.cy}, ${midX} ${to.cy}, ${to.cx} ${to.cy}`}
                      fill="none"
                      stroke={isRestricted ? '#ef4444' : 'url(#cyanLine)'}
                      strokeWidth={isRestricted ? 2.5 : 2}
                      strokeDasharray={isRestricted ? undefined : '4 2'}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>

              {/* Nodes Container */}
              <div style={{ position: 'relative', zIndex: 10, minHeight: '450px' }}>
                {nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        position: 'absolute',
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: '210px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? '#151d2f' : 'var(--bg-card)',
                        border: '1px solid',
                        borderColor: isSelected
                          ? 'var(--accent-cyan)'
                          : node.classification === 'RESTRICTED'
                          ? 'var(--accent-red-border)'
                          : 'var(--border-subtle)',
                        boxShadow: isSelected
                          ? '0 0 16px rgba(0, 229, 201, 0.35)'
                          : '0 4px 12px rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {node.type}
                        </span>
                        {getClassificationBadge(node.classification)}
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '4px' }}>
                        {node.label}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                        <HardDrive size={10} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.storage}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', fontSize: '10.5px' }}>
                        <span style={{ color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>
                          {node.recordCount}
                        </span>
                        <span className={`badge ${node.governanceStatus === 'COMPLIANT' ? 'badge-green' : node.governanceStatus === 'FLAGGED' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: '9px' }}>
                          {node.governanceStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div
            className="terminal-card"
            style={{
              flex: '1 1 340px',
              maxWidth: '420px',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-active)'
            }}
          >
            <div className="card-header">
              <div>
                <div className="card-title">
                  <FileCheck2 size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Lineage Node Inspector</span>
                </div>
                <div className="card-subtitle">Detailed provenance and copy registry</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span className="input-label">Selected Node</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)', marginTop: '3px' }}>
                  {selectedNode.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {getClassificationBadge(selectedNode.classification)}
                  <span className="badge badge-neutral">{selectedNode.type}</span>
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                <div><strong>Storage:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedNode.storage}</span></div>
                <div><strong>Record Volume:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.recordCount}</span></div>
                <div><strong>Known Physical Copies:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.copiesCount} replica(s)</span></div>
              </div>

              {/* Incoming edges for this node */}
              {(() => {
                const incoming = edges.filter((e) => e.to === selectedNode.id);
                const outgoing = edges.filter((e) => e.from === selectedNode.id);
                return (
                  <>
                    {incoming.length > 0 && (
                      <div>
                        <span className="input-label">Upstream Sources ({incoming.length}):</span>
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {incoming.map((e) => {
                            const srcNode = nodes.find((n) => n.id === e.from);
                            return (
                              <div key={e.id} style={{ fontSize: '11.5px', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                {srcNode?.label || e.from} <span style={{ color: 'var(--text-muted)' }}>→ [{e.label}]</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {outgoing.length > 0 && (
                      <div>
                        <span className="input-label">Downstream Derivations ({outgoing.length}):</span>
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {outgoing.map((e) => {
                            const tgtNode = nodes.find((n) => n.id === e.to);
                            return (
                              <div key={e.id} style={{ fontSize: '11.5px', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                [{e.label}] <span style={{ color: 'var(--accent-amber)' }}>→ {tgtNode?.label || e.to}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {incoming.length === 0 && outgoing.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px', textAlign: 'center' }}>
                        <Database size={14} style={{ marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                        Root source — no recorded lineage relationships in database.
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Governance warning for flagged nodes */}
              {selectedNode.governanceStatus === 'FLAGGED' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-amber)', fontWeight: 600, fontSize: '12px' }}>
                    <AlertTriangle size={13} />
                    <span>Compound Sensitivity Inferred</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-bright)', marginTop: '4px', lineHeight: '1.4' }}>
                    Derived from sensitive upstream sources. Inherits elevated classification with potential usage restrictions.
                  </p>
                </div>
              )}

              {selectedNode.classification === 'RESTRICTED' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-red)', fontWeight: 600, fontSize: '12px' }}>
                    <AlertTriangle size={13} />
                    <span>Pipeline Execution Blocked</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-bright)', marginTop: '4px', lineHeight: '1.4' }}>
                    This node is classified RESTRICTED. Any downstream processing requires explicit Data Protection Officer authorization.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
