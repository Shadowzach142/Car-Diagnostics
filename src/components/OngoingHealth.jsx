import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, DEFAULT_EDITABLES } from '../data/fleetData';
import {
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  X,
  Check
} from 'lucide-react';

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
};

const addMonthsToDateStr = (baseDateStr, months) => {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const d = isNaN(base.getTime()) ? new Date() : base;
  d.setMonth(d.getMonth() + Number(months || 1));
  return d.toISOString().substring(0, 10);
};

const evaluateDiagnostic = (diag, currentOdo = 0) => {
  const mode = diag.trackMode || 'BOTH';
  const intervalKm = Number(diag.intervalKm) || 5000;
  const targetKm = Number(diag.targetKm) || 0;
  const lastDoneKm = Number(diag.lastDoneKm) || Math.max(0, targetKm - intervalKm);
  const remainingKm = targetKm > 0 ? targetKm - currentOdo : null;
  const usedKm = Math.max(0, currentOdo - lastDoneKm);
  const progressPct = intervalKm > 0
    ? Math.min(100, Math.max(8, Math.round((usedKm / intervalKm) * 100)))
    : 50;

  let remainingDays = null;
  if (diag.targetDate) {
    const today = new Date();
    const target = new Date(diag.targetDate);
    if (!isNaN(target)) {
      remainingDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    }
  }

  let status = 'HEALTHY';
  if (mode === 'KM' || mode === 'BOTH') {
    if (remainingKm !== null && remainingKm <= 0) status = 'OVERDUE';
    else if (remainingKm !== null && remainingKm <= 1200 && status !== 'OVERDUE') status = 'DUE_SOON';
  }
  if (mode === 'DATE' || mode === 'BOTH') {
    if (remainingDays !== null && remainingDays < 0) status = 'OVERDUE';
    else if (remainingDays !== null && remainingDays <= 21 && status !== 'OVERDUE') status = 'DUE_SOON';
  }

  return { remainingKm, remainingDays, usedKm, intervalKm, progressPct, status };
};

export const OngoingHealth = () => {
  const {
    vehicles = [],
    branches = [],
    editables = {},
    setModalType,
    setSelectedVehicle,
    upsertVehicleDiagnostic,
    removeVehicleDiagnostic,
    globalSearch
  } = useFleet();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [diagFilter, setDiagFilter] = useState('ALL'); // 'ALL' | 'OIL' | 'BRAKES' | 'DIELECTRIC'

  const [diagModalVehicleId, setDiagModalVehicleId] = useState(null);
  const [editingDiag, setEditingDiag] = useState(null);

  const diagTypes = editables.diagnosticTypes || DEFAULT_EDITABLES.diagnosticTypes;
  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;

  const branchName = (id) => branches.find(b => b.id === id)?.municipality || id;
  const q = (globalSearch || '').toLowerCase().trim();

  const healthVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (branchFilter !== 'ALL' && v.branchId !== branchFilter) return false;
      if (q) {
        const matchVeh =
          v.code.toLowerCase().includes(q) ||
          v.plateNo.toLowerCase().includes(q) ||
          v.makeModel.toLowerCase().includes(q);
        const matchDiag = (v.diagnostics || []).some(
          d =>
            d.type.toLowerCase().includes(q) ||
            (d.assignedPerson || '').toLowerCase().includes(q)
        );
        if (!matchVeh && !matchDiag) return false;
      }
      return true;
    });
  }, [vehicles, branchFilter, q]);

  const openDiagnosticsModal = (v, initialDiag = null) => {
    setDiagModalVehicleId(v.id);
    const odo = Number(v.odometerKm) || 20000;
    if (initialDiag) {
      setEditingDiag({
        ...initialDiag,
        currentOdometerKm: odo
      });
    } else {
      const firstExisting = (v.diagnostics || [])[0];
      if (firstExisting) {
        setEditingDiag({
          ...firstExisting,
          currentOdometerKm: odo
        });
      } else {
        setEditingDiag({
          id: null,
          type: diagTypes[0] || 'Engine Oil & Filter Change',
          customType: '',
          trackMode: 'BOTH',
          currentOdometerKm: odo,
          lastDoneKm: odo,
          intervalKm: 5000,
          targetKm: odo + 5000,
          lastDoneDate: new Date().toISOString().substring(0, 10),
          intervalMonths: 6,
          targetDate: addMonthsToDateStr(null, 6),
          assignedPerson: mechanics[0] || '',
          notes: ''
        });
      }
    }
  };

  const startNewDiagnosticInModal = (v) => {
    const odo = Number(v.odometerKm) || 20000;
    setEditingDiag({
      id: null,
      type: diagTypes[0] || 'Engine Oil & Filter Change',
      customType: '',
      trackMode: 'BOTH',
      currentOdometerKm: odo,
      lastDoneKm: odo,
      intervalKm: 5000,
      targetKm: odo + 5000,
      lastDoneDate: new Date().toISOString().substring(0, 10),
      intervalMonths: 6,
      targetDate: addMonthsToDateStr(null, 6),
      assignedPerson: mechanics[0] || '',
      notes: ''
    });
  };

  const diagModalVehicle = vehicles.find(v => v.id === diagModalVehicleId);

  const handleSaveDiagnostic = (e) => {
    e.preventDefault();
    if (!diagModalVehicle || !editingDiag) return;

    const finalType = editingDiag.type === 'OTHER'
      ? (editingDiag.customType?.trim() || 'Custom Diagnostic Check')
      : editingDiag.type;

    upsertVehicleDiagnostic(diagModalVehicle.id, {
      id: editingDiag.id,
      type: finalType,
      trackMode: editingDiag.trackMode || 'BOTH',
      currentOdometerKm: Number(editingDiag.currentOdometerKm) || diagModalVehicle.odometerKm,
      lastDoneKm: Number(editingDiag.lastDoneKm) || 0,
      intervalKm: Number(editingDiag.intervalKm) || 5000,
      targetKm: Number(editingDiag.targetKm) || 0,
      lastDoneDate: editingDiag.lastDoneDate || '',
      intervalMonths: editingDiag.intervalMonths || 'CUSTOM',
      targetDate: editingDiag.targetDate || '',
      assignedPerson: editingDiag.assignedPerson || mechanics[0],
      notes: editingDiag.notes || ''
    });

    setDiagModalVehicleId(null);
  };

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
          value={diagFilter}
          onChange={(e) => setDiagFilter(e.target.value)}
          aria-label="Filter diagnostic item"
        >
          <option value="ALL">All diagnostics</option>
          <option value="OIL">Change Oil Only</option>
          <option value="BRAKES">Brakes &amp; Fluid</option>
          <option value="DIELECTRIC">Dielectric &amp; Tires</option>
        </select>

        {(branchFilter !== 'ALL' || diagFilter !== 'ALL') && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              setBranchFilter('ALL');
              setDiagFilter('ALL');
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <span className="spacer" />

        <span className="stat-chip">
          Vehicles <strong>{healthVehicles.length}</strong>
        </span>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setSelectedVehicle(null);
            setModalType('new-wo');
          }}
        >
          <Plus size={16} /> Add Car to Maintenance
        </button>
      </div>

      {/* Responsive Card Grid (Matches Car Profiling & Employees) */}
      <div className="page-body">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem'
          }}
        >
          {healthVehicles.map(v => {
            const img = getVehicleImage(v);
            const odo = Number(v.odometerKm) || 0;
            const allDiags = v.diagnostics || [];

            const visibleDiags = allDiags.filter(d => {
              const lower = d.type.toLowerCase();
              if (diagFilter === 'OIL') return lower.includes('oil');
              if (diagFilter === 'BRAKES') return lower.includes('brake') || lower.includes('suspension');
              if (diagFilter === 'DIELECTRIC') return lower.includes('dielectric') || lower.includes('tire') || lower.includes('battery');
              return true;
            });

            const evaluatedDiags = visibleDiags.map(d => ({
              ...d,
              ev: evaluateDiagnostic(d, odo)
            }));

            const isDue = allDiags.some(d => evaluateDiagnostic(d, odo).status !== 'HEALTHY');

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
                  {/* Header: Photo, Code & Plate, Current Odometer */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.8rem' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                          {v.code} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {v.plateNo}</span>
                        </div>
                        <span className={`badge ${isDue ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.68rem' }}>
                          {isDue ? 'Service Soon' : 'Healthy'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.makeModel} &bull; <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{odo.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Items with KM Meter Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    {evaluatedDiags.map(d => {
                      const { ev } = d;
                      const isOverdue = ev.status === 'OVERDUE';
                      const isSoon = ev.status === 'DUE_SOON';
                      const showKmBar = (d.trackMode === 'KM' || d.trackMode === 'BOTH') && ev.remainingKm !== null;

                      let badgeLabel = 'Healthy';
                      if (showKmBar) {
                        badgeLabel = ev.remainingKm <= 0
                          ? `Overdue ${Math.abs(ev.remainingKm).toLocaleString()} km`
                          : `${ev.remainingKm.toLocaleString()} km left`;
                      } else if (d.targetDate) {
                        badgeLabel = `Due ${d.targetDate}`;
                      }

                      const barColor = isOverdue
                        ? 'var(--bad-text)'
                        : isSoon
                        ? '#D97706'
                        : 'var(--text-main)';

                      return (
                        <div
                          key={d.id}
                          onClick={() => openDiagnosticsModal(v, d)}
                          style={{
                            background: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '6px',
                            padding: '0.55rem 0.7rem',
                            cursor: 'pointer'
                          }}
                          title="Click to edit KM or Date interval"
                        >
                          {/* Top Row: Diagnostic Name & Remaining KM Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)' }}>
                              {d.type}
                            </span>
                            <span
                              className={`badge ${isOverdue ? 'badge-danger' : isSoon ? 'badge-warning' : 'badge-success'}`}
                              style={{ fontSize: '0.67rem', padding: '0.12rem 0.45rem' }}
                            >
                              {badgeLabel}
                            </span>
                          </div>

                          {/* Middle Row: KM Meter Progress Bar */}
                          {showKmBar && (
                            <div
                              style={{
                                height: '6px',
                                background: 'var(--border-light)',
                                borderRadius: '999px',
                                overflow: 'hidden',
                                margin: '0.42rem 0 0.35rem 0'
                              }}
                            >
                              <div
                                style={{
                                  width: `${ev.progressPct}%`,
                                  height: '100%',
                                  background: barColor,
                                  borderRadius: '999px',
                                  transition: 'width 0.25s ease'
                                }}
                              />
                            </div>
                          )}

                          {/* Bottom Row: Next KM / Expiration Date & Assigned Specialist */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: showKmBar ? 0 : '0.28rem' }}>
                            <span className="mono">
                              {(d.trackMode === 'KM' || d.trackMode === 'BOTH') && d.targetKm
                                ? `Next: ${Number(d.targetKm).toLocaleString()} km`
                                : ''}
                              {d. trackMode === 'BOTH' && d.targetKm && d.targetDate ? ' • ' : ''}
                              {(d.trackMode === 'DATE' || d.trackMode === 'BOTH') && d.targetDate
                                ? `Exp: ${d.targetDate}`
                                : ''}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
                              {shortPerson(d.assignedPerson)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Station & Edit Diagnostics Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {branchName(v.branchId)} &bull; {allDiags.length} diagnostic{allDiags.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ padding: '0.28rem 0.7rem', fontSize: '0.76rem' }}
                    onClick={() => openDiagnosticsModal(v)}
                  >
                    Edit Diagnostics
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Edit / Add Vehicle Diagnostics & Intervals (By KM or Date) */}
      {diagModalVehicle && editingDiag && (
        <div className="modal-overlay" onClick={() => setDiagModalVehicleId(null)}>
          <div className="modal-box" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Sliders size={18} color="var(--primary)" />
                <span>Ongoing Health &amp; Intervals &bull; {diagModalVehicle.code}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setDiagModalVehicleId(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(diagModalVehicle.diagnostics || []).map(d => {
                  const isSelected = editingDiag.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className="btn btn-xs"
                      onClick={() =>
                        setEditingDiag({
                          ...d,
                          currentOdometerKm: diagModalVehicle.odometerKm || 0
                        })
                      }
                      style={{
                        background: isSelected ? 'var(--text-main)' : 'var(--bg-surface-subtle)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                        border: `1px solid ${isSelected ? 'var(--text-main)' : 'var(--border-light)'}`,
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      {d.type}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => startNewDiagnosticInModal(diagModalVehicle)}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                >
                  <Plus size={12} /> Add Diagnostic
                </button>
              </div>

              <form onSubmit={handleSaveDiagnostic}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Changeable / Diagnostic Item: *</label>
                    <select
                      className="form-select"
                      value={diagTypes.includes(editingDiag.type) || editingDiag.type === 'OTHER' ? editingDiag.type : 'OTHER'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingDiag(prev => ({
                          ...prev,
                          type: val,
                          customType: val === 'OTHER' ? prev.type : ''
                        }));
                      }}
                    >
                      {diagTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="OTHER">Other (Type custom...)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Current Odometer (KM):</label>
                    <input
                      type="number"
                      className="form-input mono"
                      value={editingDiag.currentOdometerKm}
                      onChange={(e) => {
                        const newOdo = Number(e.target.value) || 0;
                        setEditingDiag(prev => ({
                          ...prev,
                          currentOdometerKm: newOdo,
                          targetKm: newOdo + (Number(prev.intervalKm) || 5000)
                        }));
                      }}
                    />
                  </div>
                </div>

                {editingDiag.type === 'OTHER' && (
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label">Custom Diagnostic Name: *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Coolant Flush, Gear Oil..."
                      value={editingDiag.customType || ''}
                      onChange={(e) => setEditingDiag(prev => ({ ...prev, customType: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">Set Trigger By:</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[
                      { id: 'KM', label: 'Via KM (Odometer)' },
                      { id: 'DATE', label: 'Via Date' },
                      { id: 'BOTH', label: 'Both (KM & Date)' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setEditingDiag(prev => ({ ...prev, trackMode: m.id }))}
                        style={{
                          background: editingDiag.trackMode === m.id ? 'var(--text-main)' : 'var(--bg-surface-subtle)',
                          color: editingDiag.trackMode === m.id ? '#FFFFFF' : 'var(--text-secondary)',
                          border: `1px solid ${editingDiag.trackMode === m.id ? 'var(--text-main)' : 'var(--border-light)'}`,
                          fontWeight: editingDiag.trackMode === m.id ? 700 : 600,
                          fontSize: '0.76rem'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  {(editingDiag.trackMode === 'KM' || editingDiag.trackMode === 'BOTH') && (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Interval (+KM):</label>
                        <select
                          className="form-select"
                          value={editingDiag.intervalKm || 5000}
                          onChange={(e) => {
                            const intKm = Number(e.target.value) || 5000;
                            const baseOdo = Number(editingDiag.currentOdometerKm) || diagModalVehicle.odometerKm || 0;
                            setEditingDiag(prev => ({
                              ...prev,
                              intervalKm: intKm,
                              targetKm: baseOdo + intKm
                            }));
                          }}
                        >
                          <option value={3000}>Every 3,000 km</option>
                          <option value={5000}>Every 5,000 km</option>
                          <option value={10000}>Every 10,000 km</option>
                          <option value={15000}>Every 15,000 km</option>
                          <option value={20000}>Every 20,000 km</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Next Due Odometer (KM):</label>
                        <input
                          type="number"
                          className="form-input mono"
                          value={editingDiag.targetKm || 0}
                          onChange={(e) => setEditingDiag(prev => ({ ...prev, targetKm: Number(e.target.value) || 0 }))}
                        />
                      </div>
                    </>
                  )}

                  {(editingDiag.trackMode === 'DATE' || editingDiag.trackMode === 'BOTH') && (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Date Interval (Auto):</label>
                        <select
                          className="form-select"
                          value={editingDiag.intervalMonths || 'CUSTOM'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM') {
                              setEditingDiag(prev => ({ ...prev, intervalMonths: 'CUSTOM' }));
                            } else {
                              const months = Number(val);
                              const base = editingDiag.lastDoneDate || new Date().toISOString().substring(0, 10);
                              setEditingDiag(prev => ({
                                ...prev,
                                intervalMonths: months,
                                targetDate: addMonthsToDateStr(base, months)
                              }));
                            }
                          }}
                        >
                          <option value={1}>Every 1 month</option>
                          <option value={2}>Every 2 months</option>
                          <option value={3}>Every 3 months</option>
                          <option value={4}>Every 4 months</option>
                          <option value={6}>Every 6 months</option>
                          <option value={12}>Every 12 months (1 yr)</option>
                          <option value="CUSTOM">Custom Date</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Next Due Date:</label>
                        <input
                          type="date"
                          className="form-input"
                          value={editingDiag.targetDate || ''}
                          onChange={(e) =>
                            setEditingDiag(prev => ({
                              ...prev,
                              intervalMonths: 'CUSTOM',
                              targetDate: e.target.value
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Assigned Repair Personnel / Specialist:</label>
                  <select
                    className="form-select"
                    value={editingDiag.assignedPerson || mechanics[0]}
                    onChange={(e) => setEditingDiag(prev => ({ ...prev, assignedPerson: e.target.value }))}
                  >
                    {mechanics.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="modal-box-footer" style={{ padding: '0.85rem 0 0 0', justifyContent: 'space-between' }}>
                  {editingDiag.id ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--bad-text)' }}
                      onClick={() => {
                        removeVehicleDiagnostic(diagModalVehicle.id, editingDiag.id);
                        setDiagModalVehicleId(null);
                      }}
                    >
                      <Trash2 size={14} /> Remove Item
                    </button>
                  ) : <span />}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setDiagModalVehicleId(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Check size={15} /> Save Interval
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

