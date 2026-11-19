import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import { parseVehicleAlert } from '../utils/formatters';
import { computeVehicleHealthScore } from '../utils/healthScore';
import {
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  RefreshCw,
  FileText,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const statusBadge = (s) =>
  s === 'ACTIVE' ? 'badge-success' : s === 'IN-SHOP' ? 'badge-warning' : 'badge-danger';

export const FleetDirectory = () => {
  const {
    vehicles,
    branches,
    workOrders = [],
    setSelectedVehicle,
    setModalType,
    globalSearch,
    setGlobalSearch
  } = useFleet();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  const [expandedCards, setExpandedCards] = useState({});

  const classifications = useMemo(
    () => [...new Set(vehicles.map(v => v.classification))].sort(),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    return vehicles.filter(v => {
      const matchSearch = !q ||
        v.code.toLowerCase().includes(q) ||
        v.plateNo.toLowerCase().includes(q) ||
        v.makeModel.toLowerCase().includes(q) ||
        (v.assetTag && v.assetTag.toLowerCase().includes(q)) ||
        v.vin.toLowerCase().includes(q);
      return matchSearch &&
        (branchFilter === 'ALL' || v.branchId === branchFilter) &&
        (statusFilter === 'ALL' || v.status === statusFilter) &&
        (typeFilter === 'ALL' || v.classification === typeFilter);
    });
  }, [vehicles, globalSearch, branchFilter, statusFilter, typeFilter]);

  const filtersActive =
    globalSearch || branchFilter !== 'ALL' || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const clearFilters = () => {
    setGlobalSearch('');
    setBranchFilter('ALL');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  const branchName = (id) => branches.find(b => b.id === id)?.municipality || id;

  const open = (v, modal) => {
    setSelectedVehicle(v);
    setModalType(modal);
  };

  const healthTitle = (hs) => `Health Score: ${hs.score} / 100 — ${hs.gradeLabel}`;

  const toggleCardExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.municipality}</option>)}
        </select>

        <select
          className="form-select toolbar-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="IN-SHOP">In-Shop</option>
          <option value="OFFLINE">Offline</option>
        </select>

        <select
          className="form-select toolbar-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by vehicle type"
        >
          <option value="ALL">All vehicle types</option>
          {classifications.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {globalSearch && (
          <span className="filter-chip">
            Search: “{globalSearch}”
            <button type="button" onClick={() => setGlobalSearch('')} aria-label="Clear search"><X size={14} /></button>
          </span>
        )}

        {filtersActive && (
          <button type="button" className="btn btn-sm btn-outline" onClick={clearFilters}>
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <span className="spacer" />
        <span className="card-sub">{filtered.length} of {vehicles.length} vehicles</span>

        <div className="segmented" role="group" aria-label="View mode">
          <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
            <TableIcon size={15} /> Table
          </button>
          <button type="button" className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>
            <LayoutGrid size={15} /> Cards
          </button>
        </div>
      </div>

      <div className="page-body">
        {viewMode === 'table' ? (
          <div className="table-wrap">
            <table className="data-table" aria-label="Fleet directory">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>Photo</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Branch</th>
                  <th>Date Bought</th>
                  <th className="col-num">Odometer</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Next Service</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10}><div className="empty-state">No vehicles match your search or filters.</div></td></tr>
                ) : filtered.map(v => {
                  const parsed = parseVehicleAlert(v);
                  const health = computeVehicleHealthScore(v, workOrders);
                  return (
                    <tr key={v.id}>
                      <td>
                        <div style={{
                          width: '44px',
                          height: '32px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: '#E5E7EB',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <img
                            src={getVehicleImage(v)}
                            alt={v.code}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="vehicle-cell">
                          <div className="vehicle-cell-title">
                            {v.code} · <span className="mono" style={{ color: 'var(--text-muted)' }}>{v.plateNo}</span>
                          </div>
                          <div className="vehicle-cell-sub">{v.makeModel}</div>
                        </div>
                      </td>
                      <td>{v.classification}</td>
                      <td>{branchName(v.branchId)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>{v.acquisitionDate || `${v.year}`}</td>
                      <td className="col-num">{v.odometerKm.toLocaleString()} km</td>
                      <td><span className={`badge ${statusBadge(v.status)}`}>{v.status}</span></td>
                      <td>
                        <button
                          type="button"
                          className={`badge ${health.badgeClass}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title={healthTitle(health)}
                          onClick={() => open(v, 'vehicle-detail')}
                        >
                          {health.score}
                        </button>
                      </td>
                      <td>
                        {v.urgentAlert ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className={`badge ${parsed.badgeType}`} style={{ alignSelf: 'flex-start', fontSize: '0.74rem' }}>
                              {parsed.badgeText}
                            </span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                              {parsed.issueText}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.84rem' }}>{v.nextServiceDueDate}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => open(v, 'reassign')}
                          title="Reassign branch"
                        >
                          <RefreshCw size={13} /> Reassign
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="fleet-grid">
            {filtered.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No vehicles match your search or filters.</div>
            )}
            {filtered.map(v => {
              const isExpanded = !!expandedCards[v.id];
              const health = computeVehicleHealthScore(v, workOrders);
              return (
                <article key={v.id} className="vehicle-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Vehicle Image Banner */}
                  <div
                    style={{
                      height: '135px',
                      position: 'relative',
                      background: '#E5E7EB'
                    }}
                  >
                    <img
                      src={getVehicleImage(v)}
                      alt={v.makeModel}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className={`badge ${statusBadge(v.status)}`}>
                        <span className={`status-dot ${v.status.toLowerCase().replace('-', '')}`} />
                        {v.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`badge ${health.badgeClass}`}
                      style={{ position: 'absolute', top: '10px', left: '10px', cursor: 'pointer', border: 'none' }}
                      title={healthTitle(health)}
                      onClick={() => open(v, 'vehicle-detail')}
                    >
                      Health {health.score}
                    </button>
                  </div>

                  {/* Clean Summary (Minimal Text) */}
                  <div style={{ padding: '0.9rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span className="vehicle-code">{v.code}</span>
                      <span className="vehicle-plate mono">{v.plateNo}</span>
                    </div>

                    <h3 className="vehicle-model" style={{ fontSize: '0.92rem', marginBottom: '0.4rem' }}>
                      {v.makeModel} ({v.year})
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {v.classification} · {branchName(v.branchId)}
                    </div>

                    {v.urgentAlert && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <span className={`badge ${parseVehicleAlert(v).badgeType}`} style={{ fontSize: '0.74rem' }}>
                          {parseVehicleAlert(v).badgeText}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {parseVehicleAlert(v).issueText}
                        </span>
                      </div>
                    )}

                    {/* Quick Specs Accordion (Optional disclosure) */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '0.35rem',
                        marginBottom: '0.65rem',
                        padding: '0.6rem 0.75rem',
                        background: 'var(--bg-surface-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div className="vehicle-spec-row">
                          <span className="vehicle-spec-label">Date Bought:</span>
                          <span className="vehicle-spec-val">{v.acquisitionDate || `${v.year}`}</span>
                        </div>
                        <div className="vehicle-spec-row">
                          <span className="vehicle-spec-label">Odometer:</span>
                          <span className="vehicle-spec-val">{v.odometerKm.toLocaleString()} km</span>
                        </div>
                        <div className="vehicle-spec-row">
                          <span className="vehicle-spec-label">Fuel:</span>
                          <span className="vehicle-spec-val">{v.fuelType} ({v.fuelLevelPct}%)</span>
                        </div>
                        <div className="vehicle-spec-row">
                          <span className="vehicle-spec-label">Next Service:</span>
                          <span className="vehicle-spec-val">{v.nextServiceDueDate}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Toggle for Card */}
                    <button
                      type="button"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        alignSelf: 'flex-start',
                        marginBottom: '0.5rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleCardExpand(v.id)}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      <span>{isExpanded ? 'Hide Specs' : 'Quick Specs'}</span>
                    </button>

                    {/* Card Footer Actions */}
                    <div className="vehicle-card-footer" style={{ marginTop: 'auto', paddingTop: '0.65rem' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ width: '100%' }}
                        onClick={() => open(v, 'reassign')}
                      >
                        <RefreshCw size={14} /> Reassign branch
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
