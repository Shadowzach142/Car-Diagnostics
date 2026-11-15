import React, { useState, useMemo, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, getVehicleAuthorizedDrivers } from '../data/fleetData';
import {
  Car,
  Plus,
  RotateCcw,
  LayoutGrid,
  List,
  MapPin,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Activity
} from 'lucide-react';

const getValidityState = (expiryStr) => {
  if (!expiryStr) return { label: 'VALID', tone: 'valid' };
  const exp = new Date(expiryStr);
  if (isNaN(exp)) return { label: 'VALID', tone: 'valid' };
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'EXPIRED', tone: 'expired' };
  if (diffDays <= 90) return { label: 'EXPIRING SOON', tone: 'expiring' };
  return { label: 'VALID', tone: 'valid' };
};

const getInitials = (name) =>
  (name || '')
    .replace(/^Engr\.\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OP';

const ValidityPill = ({ state }) => {
  const styles =
    state.tone === 'expired'
      ? { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', Icon: AlertTriangle }
      : state.tone === 'expiring'
      ? { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', Icon: AlertTriangle }
      : { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', Icon: ShieldCheck };

  const Icon = styles.Icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.22rem 0.55rem',
        borderRadius: '6px',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color
      }}
    >
      <Icon size={12} />
      {state.label}
    </span>
  );
};

export const VehicleProfiling = () => {
  const {
    settings,
    editables = {},
    vehicles = [],
    drivers = [],
    branches = [],
    workOrders = [],
    globalSearch,
    setFocusedHealthVehicleId,
    focusedProfileVehicleId,
    setFocusedProfileVehicleId,
    setActiveTab,
    setModalType,
    setSelectedVehicle
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechNameNorm = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();
  const matchedDriver = useMemo(
    () => drivers.find(d => (d.name || '').trim().toLowerCase() === mechNameNorm),
    [drivers, mechNameNorm]
  );

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

  useEffect(() => {
    if (!focusedProfileVehicleId) return;
    setBranchFilter('ALL');
    setCategoryFilter('ALL');
    setViewMode('cards');
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`profiling-card-${focusedProfileVehicleId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    const clearTimer = setTimeout(() => {
      setFocusedProfileVehicleId(null);
    }, 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusedProfileVehicleId, setFocusedProfileVehicleId]);

  const filteredVehicles = useMemo(() => {
    let list = vehicles;

    if (isMechanic) {
      if (matchedDriver) {
        list = list.filter(v => (v.authorizedDriverIds || []).includes(matchedDriver.id));
      } else {
        const orderVehicleCodes = new Set(
          workOrders
            .filter(wo => (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechNameNorm)
            .map(wo => wo.vehicleCode)
        );
        list = list.filter(v => orderVehicleCodes.has(v.code));
      }
    }

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
      {/* Page Toolbar */}
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

        <span className="stat-chip">ASSETS <strong>{filteredVehicles.length}</strong></span>

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

      {/* Page Body */}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
              gap: '1.15rem'
            }}
          >
            {filteredVehicles.map(v => {
              const authorizedDrivers = getVehicleAuthorizedDrivers(v, drivers);
              const branch = branches.find(b => b.id === v.branchId);
              const img = getVehicleImage(v);
              const insState = getValidityState(v.insuranceExpiryDate);
              const regState = getValidityState(v.registrationExpiryDate);
              const specText =
                v.specs?.reach && !v.specs.reach.startsWith('N/A')
                  ? v.specs.reach
                  : v.classification;

              return (
                <div
                  key={v.id}
                  id={`profiling-card-${v.id}`}
                  className={`data-card ${focusedProfileVehicleId === v.id ? 'health-focus-pulse' : ''}`}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '14px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Top Row: Thumbnail + Code/Year + Model + Plate Pill */}
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.95rem' }}>
                      <img
                        src={img}
                        alt={v.code}
                        style={{
                          width: '58px',
                          height: '58px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-surface-subtle)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {v.code}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-surface-subtle)',
                              border: '1px solid var(--border-light)',
                              borderRadius: '5px',
                              padding: '1px 6px'
                            }}
                          >
                            {v.year}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            marginTop: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={v.makeModel}
                        >
                          {v.makeModel}
                        </div>
                        <span
                          className="mono"
                          style={{
                            display: 'inline-block',
                            marginTop: '5px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            background: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '5px',
                            padding: '1px 7px'
                          }}
                        >
                          {v.plateNo}
                        </span>
                      </div>
                    </div>

                    {/* Authorized Personnel Avatar Chips Row */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicle(v);
                        setModalType('vehicle-access');
                      }}
                      title={`Manage authorized personnel for ${v.code}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        background: 'transparent',
                        border: 'none',
                        padding: '0.15rem 0',
                        marginBottom: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      {authorizedDrivers.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {authorizedDrivers.slice(0, 3).map((d, idx) => (
                            <span
                              key={d.id}
                              title={d.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--bg-surface-subtle)',
                                border: '1.5px solid var(--bg-surface)',
                                boxShadow: '0 0 0 1px var(--border-light)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: 'var(--text-main)',
                                marginLeft: idx === 0 ? 0 : '-6px'
                              }}
                            >
                              {getInitials(d.name)}
                            </span>
                          ))}
                          {authorizedDrivers.length > 3 && (
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--bg-surface-subtle)',
                                border: '1.5px solid var(--bg-surface)',
                                boxShadow: '0 0 0 1px var(--border-light)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: 'var(--text-secondary)',
                                marginLeft: '-6px'
                              }}
                            >
                              +{authorizedDrivers.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--bg-surface-subtle)',
                            border: '1px dashed var(--border-medium)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          +
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        {authorizedDrivers.length > 0 ? 'AUTHORIZED' : 'NO AUTHORIZED'}
                      </span>
                    </button>

                    {/* Station & Spec Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.95rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                        <MapPin size={14} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            STATION
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {branch?.municipality ? `${branch.municipality} District` : 'Central HQ'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                        <Settings size={14} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            SPEC / TYPE
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {specText}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validity Badges Row */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: '0.8rem',
                        marginBottom: '0.95rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                          INSURANCE
                        </div>
                        <ValidityPill state={insState} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                          LTO REG
                        </div>
                        <ValidityPill state={regState} />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: View Profile & Car Health */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicle(v);
                        setModalType('vehicle-detail');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedHealthVehicleId(v.id);
                        setActiveTab('health');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'background 0.15s ease'
                      }}
                      title={`View ${v.code} in Ongoing Health`}
                    >
                      <Activity size={13} /> Car Health
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="card">
            <div className="table-scroll">
              <table className="data-table" aria-label="Car profiling table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Classification</th>
                    <th>Station</th>
                    <th>Authorized</th>
                    <th>Insurance</th>
                    <th>LTO Reg</th>
                    <th className="num">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => {
                    const authorizedDrivers = getVehicleAuthorizedDrivers(v, drivers);
                    const branch = branches.find(b => b.id === v.branchId);
                    const img = getVehicleImage(v);
                    const insState = getValidityState(v.insuranceExpiryDate);
                    const regState = getValidityState(v.registrationExpiryDate);

                    return (
                      <tr key={v.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <img
                              src={img}
                              alt={v.code}
                              style={{
                                width: '40px',
                                height: '30px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                                border: '1px solid var(--border-subtle)',
                                flexShrink: 0
                              }}
                            />
                            <div>
                              <div className="cell-primary">
                                {v.code} <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>&bull; {v.plateNo}</span>
                              </div>
                              <div className="cell-sub">{v.makeModel} ({v.year})</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-muted">{v.classification}</span></td>
                        <td>{branch?.municipality || 'Central HQ'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setSelectedVehicle(v);
                              setModalType('vehicle-access');
                            }}
                          >
                            {authorizedDrivers.length} Authorized
                          </button>
                        </td>
                        <td><ValidityPill state={insState} /></td>
                        <td><ValidityPill state={regState} /></td>
                        <td className="num">
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setGlobalSearch(v.code);
                                setActiveTab('health');
                              }}
                            >
                              <Activity size={13} /> Car Health
                            </button>
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
