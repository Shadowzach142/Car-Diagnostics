import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, getVehicleAuthorizedDrivers } from '../data/fleetData';
import {
  Car,
  Users,
  Plus,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';

const getTermYears = (startStr, endStr) => {
  if (!startStr || !endStr) return '3 Years';
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s) || isNaN(e) || e <= s) return '3 Years';
  const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24));
  const years = Math.round(diffDays / 365.25);
  if (years >= 1) {
    return `${years} ${years === 1 ? 'Year' : 'Years'}`;
  }
  const months = Math.round(diffDays / 30.4);
  if (months >= 1) return `${months} Mos`;
  return `${diffDays} Days`;
};

export const VehicleProfiling = () => {
  const {
    editables = {},
    vehicles = [],
    drivers = [],
    branches = [],
    globalSearch,
    setModalType,
    setSelectedVehicle
  } = useFleet();

  const vehicleClassifications = editables.vehicleClassifications || [
    'Bucket Truck',
    'Truck',
    'Pickup',
    'Van',
    'Motorcycle',
    'Car / Sedan'
  ];

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Filter logic
  const filteredVehicles = useMemo(() => {
    let list = vehicles;

    if (branchFilter !== 'ALL') {
      list = list.filter(v => v.branchId === branchFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter(v => v.classification === categoryFilter);
    }

    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return list;

    return list.filter(v => {
      const authorized = getVehicleAuthorizedDrivers(v, drivers);
      const searchFields = [
        v.code,
        v.plateNo,
        v.makeModel,
        v.classification,
        v.vin,
        v.assetTag,
        ...authorized.map(d => d.name),
        ...authorized.map(d => d.employeeId)
      ];
      return searchFields.some(f => String(f || '').toLowerCase().includes(q));
    });
  }, [vehicles, drivers, branchFilter, categoryFilter, globalSearch]);

  const resetFilters = () => {
    setBranchFilter('ALL');
    setCategoryFilter('ALL');
  };

  const hasActiveFilters = branchFilter !== 'ALL' || categoryFilter !== 'ALL';

  return (
    <div className="page">
      {/* Zone 2: Page Toolbar */}
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter branch station"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.municipality}</option>
          ))}
        </select>

        <select
          className="form-select toolbar-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter vehicle classification"
        >
          <option value="ALL">All classifications</option>
          {vehicleClassifications.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button type="button" className="btn btn-sm btn-outline" onClick={resetFilters}>
            <RotateCcw size={14} /> Reset
          </button>
        )}

        {globalSearch && (
          <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
            Search: &ldquo;{globalSearch}&rdquo;
          </span>
        )}

        <span className="spacer" />

        <span className="stat-chip">Assets <strong>{filteredVehicles.length}</strong></span>

        <div className="segmented no-print" role="group" aria-label="View toggle">
          <button
            type="button"
            className={viewMode === 'cards' ? 'active' : ''}
            onClick={() => setViewMode('cards')}
            title="Card grid view"
            aria-label="Card grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
            title="Table list view"
            aria-label="Table list view"
          >
            <List size={15} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary no-print"
          onClick={() => setModalType('add-vehicle')}
          title="Register new utility vehicle asset"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Zone 3: Page Body */}
      <div className="page-body">
        {filteredVehicles.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <Car size={36} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>No vehicles match filter</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Try adjusting your branch or classification filters, or clear your search term.
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem'
          }}>
            {filteredVehicles.map(v => {
              const authorizedDrivers = getVehicleAuthorizedDrivers(v, drivers);
              const branch = branches.find(b => b.id === v.branchId);
              const img = getVehicleImage(v);

              return (
                <div
                  key={v.id}
                  className="data-card"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Header: Photo thumbnail, Code & Plate, Model & Year */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <img
                        src={img}
                        alt={v.code}
                        style={{
                          width: '48px',
                          height: '36px',
                          borderRadius: '5px',
                          objectFit: 'cover',
                          border: '1px solid var(--border-subtle)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                          {v.code} <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {v.plateNo}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.makeModel}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          {v.classification} &bull; {v.year}
                        </div>
                      </div>
                    </div>

                    {/* Compact, Non-Flashy Employees with Access Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicle(v);
                        setModalType('vehicle-access');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      className="vehicle-access-trigger-btn"
                      title={`View employees with access to ${v.code}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Users size={14} color="var(--text-secondary)" />
                        <span>Employees with Access ({authorizedDrivers.length})</span>
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                        View <ChevronRight size={13} />
                      </span>
                    </button>

                    {/* Compact, Subtle Neutral 4-Box Specification Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      marginBottom: '0.85rem'
                    }}>
                      {/* Box 1: Station */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          STATION
                        </span>
                        <span style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {branch?.municipality || 'Central HQ'}
                        </span>
                      </div>

                      {/* Box 2: Spec / Class */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          SPEC / TYPE
                        </span>
                        <span style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.specs?.reach && !v.specs.reach.startsWith('N/A') ? v.specs.reach : v.classification}
                        </span>
                      </div>

                      {/* Box 3: Insurance */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            INSURANCE
                          </span>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {getTermYears(v.insuranceAcquiredDate, v.insuranceExpiryDate)}
                          </span>
                        </div>
                        <span className="mono" style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Exp: {v.insuranceExpiryDate || '2026-10-20'}
                        </span>
                      </div>

                      {/* Box 4: Registration */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            LTO REGISTRATION
                          </span>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {getTermYears(v.registrationAcquiredDate, v.registrationExpiryDate)}
                          </span>
                        </div>
                        <span className="mono" style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Exp: {v.registrationExpiryDate || '2026-10-23'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => {
                        setSelectedVehicle(v);
                        setModalType('vehicle-detail');
                      }}
                      title="Open full vehicle specification profile"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table List View (Clean & Streamlined) */
          <div className="table-wrap">
            <table className="data-table" aria-label="COTELCO vehicle fleet profiling">
              <thead>
                <tr>
                  <th>Vehicle Asset</th>
                  <th>Model &amp; Classification</th>
                  <th>Branch Station</th>
                  <th>Employees with Access</th>
                  <th>Insurance &amp; Registration</th>
                  <th>Specifications</th>
                  <th style={{ textAlign: 'right' }} className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => {
                  const authorizedDrivers = getVehicleAuthorizedDrivers(v, drivers);
                  const branch = branches.find(b => b.id === v.branchId);
                  const img = getVehicleImage(v);

                  return (
                    <tr key={v.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <img
                            src={img}
                            alt={v.code}
                            style={{ width: '44px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                          />
                          <div>
                            <strong className="mono" style={{ fontSize: '0.88rem' }}>{v.code}</strong>
                            <span className="cell-sub mono">{v.plateNo}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="cell-strong">{v.makeModel}</span>
                        <span className="cell-sub">{v.classification} ({v.year})</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {branch?.municipality || 'District Office'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setSelectedVehicle(v);
                            setModalType('vehicle-access');
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                        >
                          <Users size={12} /> {authorizedDrivers.length} Authorized &bull; View
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Ins Exp: {v.insuranceExpiryDate || '2026-10-20'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '2px' }}>
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Reg Exp: {v.registrationExpiryDate || '2026-10-23'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-strong" style={{ fontSize: '0.8rem' }}>
                          {v.specs?.reach || v.specs?.bucketCapacity || v.specs?.transmission || v.classification}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="no-print">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setSelectedVehicle(v);
                            setModalType('vehicle-detail');
                          }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
