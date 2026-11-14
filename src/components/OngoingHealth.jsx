import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, DEFAULT_EDITABLES } from '../data/fleetData';
import {
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  X,
  Check,
  Wrench,
  ArrowRight,
  Search
} from 'lucide-react';

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
};

const parseLocalYmd = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addMonthsToDateStr = (baseDateStr, months) => {
  const parsed = parseLocalYmd(baseDateStr);
  const now = new Date();
  const base = parsed || new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMonth = base.getMonth() + Number(months || 1);
  const day = base.getDate();
  const result = new Date(base.getFullYear(), targetMonth, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return formatLocalYmd(result);
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
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetLocal = parseLocalYmd(diag.targetDate) || new Date(diag.targetDate);
    if (!isNaN(targetLocal)) {
      remainingDays = Math.ceil((targetLocal - todayLocal) / (1000 * 60 * 60 * 24));
    }
  }

  let kmStatus = 'HEALTHY';
  if (mode === 'KM' || mode === 'BOTH') {
    if (remainingKm !== null && remainingKm <= 0) kmStatus = 'OVERDUE';
    else if (remainingKm !== null && remainingKm <= 1200) kmStatus = 'DUE_SOON';
  }

  let dateStatus = 'HEALTHY';
  if (mode === 'DATE' || mode === 'BOTH') {
    if (remainingDays !== null && remainingDays < 0) dateStatus = 'OVERDUE';
    else if (remainingDays !== null && remainingDays <= 21) dateStatus = 'DUE_SOON';
  }

  let status = 'HEALTHY';
  if (kmStatus === 'OVERDUE' || dateStatus === 'OVERDUE') status = 'OVERDUE';
  else if (kmStatus === 'DUE_SOON' || dateStatus === 'DUE_SOON') status = 'DUE_SOON';

  return { remainingKm, remainingDays, usedKm, intervalKm, progressPct, kmStatus, dateStatus, status };
};

export const OngoingHealth = () => {
  const {
    vehicles = [],
    branches = [],
    workOrders = [],
    editables = {},
    setModalType,
    setSelectedVehicle,
    setActiveTab,
    createWorkOrder,
    upsertVehicleDiagnostic,
    removeVehicleDiagnostic,
    globalSearch
  } = useFleet();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [diagFilter, setDiagFilter] = useState('ALL'); // 'ALL' | 'OIL' | 'BRAKES' | 'DIELECTRIC'

  const [diagModalVehicleId, setDiagModalVehicleId] = useState(null);
  const [editingDiag, setEditingDiag] = useState(null);
  const [addCarPickerOpen, setAddCarPickerOpen] = useState(false);
  const [addCarSearch, setAddCarSearch] = useState('');

  // Send to Maintenance Modal State (Checklist + Mechanic + Note)
  const [maintModalVehicleId, setMaintModalVehicleId] = useState(null);
  const [maintChecklist, setMaintChecklist] = useState([]);
  const [maintOtherChecked, setMaintOtherChecked] = useState(false);
  const [maintOtherText, setMaintOtherText] = useState('');
  const [maintMechanic, setMaintMechanic] = useState('');
  const [maintCustomMechanic, setMaintCustomMechanic] = useState('');
  const [maintNote, setMaintNote] = useState('');

  const diagTypes = editables.diagnosticTypes || DEFAULT_EDITABLES.diagnosticTypes;
  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;

  const branchName = (id) => branches.find(b => b.id === id)?.municipality || id;
  const q = (globalSearch || '').toLowerCase().trim();

  const healthVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if ((v.diagnostics || []).length === 0) return false;
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
  const maintModalVehicle = vehicles.find(v => v.id === maintModalVehicleId);

  const openSendToMaintenanceModal = (v) => {
    const odo = Number(v.odometerKm) || 0;
    const allDiags = v.diagnostics || [];
    const dueItems = allDiags
      .filter(d => {
        const st = evaluateDiagnostic(d, odo).status;
        return st === 'OVERDUE' || st === 'DUE_SOON';
      })
      .map(d => d.type);

    const initialChecked = dueItems.length > 0
      ? dueItems
      : (allDiags[0] ? [allDiags[0].type] : []);

    const primaryDiag =
      allDiags.find(d => evaluateDiagnostic(d, odo).status === 'OVERDUE') ||
      allDiags.find(d => evaluateDiagnostic(d, odo).status === 'DUE_SOON') ||
      allDiags[0];

    setMaintChecklist(initialChecked);
    setMaintOtherChecked(initialChecked.length === 0);
    setMaintOtherText('');
    setMaintMechanic(primaryDiag?.assignedPerson || mechanics[0] || '');
    setMaintCustomMechanic('');
    setMaintNote('');
    setMaintModalVehicleId(v.id);
  };

  const toggleChecklistItem = (itemType) => {
    setMaintChecklist(prev =>
      prev.includes(itemType) ? prev.filter(t => t !== itemType) : [...prev, itemType]
    );
  };

  const handleConfirmSendToMaintenance = (e) => {
    e.preventDefault();
    if (!maintModalVehicle) return;

    const v = maintModalVehicle;
    const odo = Number(v.odometerKm) || 0;
    const allDiags = v.diagnostics || [];
    const selectedItems = [...maintChecklist];
    if (maintOtherChecked && maintOtherText.trim()) {
      selectedItems.push(maintOtherText.trim());
    }
    if (selectedItems.length === 0) return;

    const matchedDiag = allDiags.find(d => selectedItems.includes(d.type)) || allDiags[0];
    const interval = Number(matchedDiag?.intervalKm) || 5000;
    const targetKm = Number(matchedDiag?.targetKm) || (odo + interval);
    const nextDate = matchedDiag?.targetDate || v.nextServiceDueDate || addMonthsToDateStr(null, 6);
    const finalMechanic = maintMechanic === 'OTHER'
      ? (maintCustomMechanic.trim() || 'Assigned Motorpool Specialist')
      : (maintMechanic || mechanics[0] || 'Motorpool Specialist');

    const hasOverdue = allDiags.some(
      d => selectedItems.includes(d.type) && evaluateDiagnostic(d, odo).status === 'OVERDUE'
    );

    createWorkOrder({
      vehicleCode: v.code,
      plateNo: v.plateNo,
      classification: v.classification,
      branchId: v.branchId,
      type: selectedItems.join(' + '),
      checklist: selectedItems,
      category: 'Preventive Maintenance (PMS)',
      priority: hasOverdue ? 'HIGH' : 'ROUTINE',
      currentStage: 'Queued / Inspection',
      assignedMechanic: finalMechanic,
      facility: 'COTELCO Motorpool & Diagnostic Bay',
      estimatedCost: 0,
      targetCompletion: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
      targetKm,
      nextServiceDate: nextDate,
      description: maintNote.trim(),
      reportedBy: 'Operations Director'
    });

    setMaintModalVehicleId(null);
  };

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
            setAddCarSearch('');
            setAddCarPickerOpen(true);
          }}
        >
          <Plus size={16} /> Add Cars
        </button>
      </div>

      {/* Responsive Card Grid (Matches Car Profiling & Employees) */}
      <div className="page-body">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
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
            const activeWO = workOrders.find(
              w => w.vehicleCode === v.code && w.status !== 'Completed / Released'
            );

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
                      const showKmBar = (d.trackMode === 'KM' || d.trackMode === 'BOTH') && ev.remainingKm !== null;
                      // Color KM bar & KM pill strictly by KM status so identical remaining KM always has the same color
                      const displayStatus = showKmBar ? ev.kmStatus : ev.dateStatus;
                      const isOverdue = displayStatus === 'OVERDUE';
                      const isSoon = displayStatus === 'DUE_SOON';

                      let badgeLabel = 'Healthy';
                      if (showKmBar) {
                        badgeLabel = ev.remainingKm <= 0
                          ? `Overdue ${Math.abs(ev.remainingKm).toLocaleString()} km`
                          : `${ev.remainingKm.toLocaleString()} km left`;
                      } else if (d.targetDate) {
                        badgeLabel = `Due ${d.targetDate}`;
                      }

                      const barColor = isOverdue
                        ? '#DC2626'
                        : isSoon
                        ? '#F59E0B'
                        : '#16A34A';

                      return (
                        <div
                          key={d.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDiagnosticsModal(v, d)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openDiagnosticsModal(v, d);
                            }
                          }}
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

                          {/* Middle Row: Colorful KM Meter Progress Bar */}
                          {showKmBar && (
                            <div
                              style={{
                                height: '7px',
                                background: '#E2E8F0',
                                borderRadius: '999px',
                                overflow: 'hidden',
                                margin: '0.45rem 0 0.35rem 0'
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
                              {d.trackMode === 'BOTH' && d.targetKm && d.targetDate ? ' • ' : ''}
                              {(d.trackMode === 'DATE' || d.trackMode === 'BOTH') && d.targetDate && (
                                <span style={{
                                  color: ev.dateStatus === 'OVERDUE' ? '#DC2626' : ev.dateStatus === 'DUE_SOON' ? '#D97706' : 'inherit',
                                  fontWeight: ev.dateStatus !== 'HEALTHY' ? 700 : 400
                                }}>
                                  Exp: {d.targetDate}
                                </span>
                              )}
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

                {/* Card Footer: Station & 1-Click Maintenance Action */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {branchName(v.branchId)}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '0.26rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => openDiagnosticsModal(v)}
                    >
                      Edit
                    </button>
                    {activeWO ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.26rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}
                        onClick={() => setActiveTab('maintenance')}
                      >
                        In Maintenance <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ${isDue ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.26rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => openSendToMaintenanceModal(v)}
                      >
                        <Wrench size={12} /> To Maintenance
                      </button>
                    )}
                  </div>
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

            <div className="modal-box-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Fixed 2-Tab Mode Switcher (Never wraps or shifts) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.25rem',
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.25rem',
                  marginBottom: '1rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const first = (diagModalVehicle.diagnostics || [])[0];
                    if (first) {
                      setEditingDiag({
                        ...first,
                        currentOdometerKm: diagModalVehicle.odometerKm || 0
                      });
                    }
                  }}
                  disabled={(diagModalVehicle.diagnostics || []).length === 0}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: editingDiag.id ? 'var(--bg-surface)' : 'transparent',
                    color: editingDiag.id ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: editingDiag.id ? 700 : 600,
                    fontSize: '0.82rem',
                    cursor: (diagModalVehicle.diagnostics || []).length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: editingDiag.id ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  Edit Existing ({(diagModalVehicle.diagnostics || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => startNewDiagnosticInModal(diagModalVehicle)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: !editingDiag.id ? 'var(--bg-surface)' : 'transparent',
                    color: !editingDiag.id ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: !editingDiag.id ? 700 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: !editingDiag.id ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  + Add New
                </button>
              </div>

              <form onSubmit={handleSaveDiagnostic}>
                {/* Row 1 (Fixed): Select Tracker (Edit) or Choose New Type (Add) + Odometer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  {editingDiag.id ? (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Select Tracker to Edit:</label>
                      <select
                        className="form-select"
                        value={editingDiag.id}
                        onChange={(e) => {
                          const found = (diagModalVehicle.diagnostics || []).find(d => d.id === e.target.value);
                          if (found) {
                            setEditingDiag({
                              ...found,
                              currentOdometerKm: diagModalVehicle.odometerKm || 0
                            });
                          }
                        }}
                      >
                        {(diagModalVehicle.diagnostics || []).map(d => (
                          <option key={d.id} value={d.id}>{d.type}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Item to Track: *</label>
                      <select
                        className="form-select"
                        value={diagTypes.includes(editingDiag.type) || editingDiag.type === 'OTHER' ? editingDiag.type : 'OTHER'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingDiag(prev => ({
                            ...prev,
                            type: val,
                            customType: val === 'OTHER' ? '' : ''
                          }));
                        }}
                      >
                        {diagTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="OTHER">Other (Type custom...)</option>
                      </select>
                    </div>
                  )}

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

                {!editingDiag.id && editingDiag.type === 'OTHER' && (
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label">Custom Tracker Name: *</label>
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

                {/* Row 2 (Fixed Positions — Never Jumps): Schedule Box */}
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  marginBottom: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Schedule &amp; Due Target
                    </span>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {[
                        { id: 'KM', label: 'By KM' },
                        { id: 'DATE', label: 'By Date' },
                        { id: 'BOTH', label: 'Both' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          className="btn btn-xs"
                          onClick={() => setEditingDiag(prev => ({ ...prev, trackMode: m.id }))}
                          style={{
                            background: editingDiag.trackMode === m.id ? 'var(--text-main)' : 'var(--bg-surface)',
                            color: editingDiag.trackMode === m.id ? '#FFFFFF' : 'var(--text-secondary)',
                            border: `1px solid ${editingDiag.trackMode === m.id ? 'var(--text-main)' : 'var(--border-light)'}`,
                            fontWeight: editingDiag.trackMode === m.id ? 700 : 600,
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.73rem'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* KM Row (Always Rendered — Dimmed if Date-only) */}
                  {(() => {
                    const kmActive = editingDiag.trackMode === 'KM' || editingDiag.trackMode === 'BOTH';
                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                        gap: '0.65rem',
                        marginBottom: '0.65rem',
                        opacity: kmActive ? 1 : 0.42,
                        transition: 'opacity 0.15s ease'
                      }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.74rem' }}>Repeat Every (KM):</label>
                          <select
                            className="form-select"
                            disabled={!kmActive}
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
                          <label className="form-label" style={{ fontSize: '0.74rem' }}>Next Due at (KM):</label>
                          <input
                            type="number"
                            className="form-input mono"
                            disabled={!kmActive}
                            value={editingDiag.targetKm || 0}
                            onChange={(e) => setEditingDiag(prev => ({ ...prev, targetKm: Number(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Date Row (Always Rendered — Dimmed if KM-only) */}
                  {(() => {
                    const dateActive = editingDiag.trackMode === 'DATE' || editingDiag.trackMode === 'BOTH';
                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                        gap: '0.65rem',
                        opacity: dateActive ? 1 : 0.42,
                        transition: 'opacity 0.15s ease'
                      }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.74rem' }}>Repeat Every (Months):</label>
                          <select
                            className="form-select"
                            disabled={!dateActive}
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
                          <label className="form-label" style={{ fontSize: '0.74rem' }}>Next Due Date:</label>
                          <input
                            type="date"
                            className="form-input"
                            disabled={!dateActive}
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
                      </div>
                    );
                  })()}
                </div>

                {/* Row 3 (Fixed): Assigned Personnel */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Assigned Mechanic / Specialist:</label>
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
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={!editingDiag.id}
                    style={{
                      color: 'var(--bad-text)',
                      visibility: editingDiag.id ? 'visible' : 'hidden'
                    }}
                    onClick={() => {
                      if (editingDiag.id) {
                        removeVehicleDiagnostic(diagModalVehicle.id, editingDiag.id);
                        setDiagModalVehicleId(null);
                      }
                    }}
                  >
                    <Trash2 size={14} /> Remove Item
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setDiagModalVehicleId(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingDiag.id ? (
                        <><Check size={15} /> Save Changes</>
                      ) : (
                        <><Plus size={15} /> Add Tracker</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Send to Maintenance (Checklist + Who to Fix + Note) */}
      {maintModalVehicle && (
        <div className="modal-overlay" onClick={() => setMaintModalVehicleId(null)}>
          <div className="modal-box" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Wrench size={18} color="var(--primary)" />
                <span>Send to Maintenance &bull; {maintModalVehicle.code}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setMaintModalVehicleId(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSendToMaintenance}>
              <div className="modal-box-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  {maintModalVehicle.makeModel} &bull; <span className="mono">{(maintModalVehicle.odometerKm || 0).toLocaleString()} km</span>
                </div>

                {/* 1. Checklist: What to Fix */}
                <div className="form-group" style={{ marginBottom: '0.9rem' }}>
                  <label className="form-label">What to Fix (Checklist): *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {(maintModalVehicle.diagnostics || []).map(d => {
                      const ev = evaluateDiagnostic(d, Number(maintModalVehicle.odometerKm) || 0);
                      const checked = maintChecklist.includes(d.type);
                      return (
                        <label
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.6rem',
                            padding: '0.5rem 0.7rem',
                            background: 'var(--bg-surface-subtle)',
                            border: `1px solid ${checked ? 'var(--text-main)' : 'var(--border-light)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChecklistItem(d.type)}
                              style={{ width: '15px', height: '15px', accentColor: 'var(--text-main)' }}
                            />
                            {d.type}
                          </span>
                          <span className={`badge ${ev.status === 'OVERDUE' ? 'badge-danger' : ev.status === 'DUE_SOON' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.66rem' }}>
                            {ev.remainingKm !== null && (d.trackMode === 'KM' || d.trackMode === 'BOTH')
                              ? `${ev.remainingKm.toLocaleString()} km left`
                              : (d.targetDate || 'Healthy')}
                          </span>
                        </label>
                      );
                    })}

                    {/* Other / Custom Issue (Fixed input row avoids layout jump) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.5rem 0.7rem',
                        background: 'var(--bg-surface-subtle)',
                        border: `1px solid ${maintOtherChecked ? 'var(--text-main)' : 'var(--border-light)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-main)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={maintOtherChecked}
                        onChange={(e) => setMaintOtherChecked(e.target.checked)}
                        style={{ width: '15px', height: '15px', accentColor: 'var(--text-main)' }}
                      />
                      Other issue / custom repair
                    </label>

                    <input
                      type="text"
                      className="form-input"
                      placeholder="Describe custom repair (enable 'Other issue' above)..."
                      value={maintOtherText}
                      onChange={(e) => setMaintOtherText(e.target.value)}
                      disabled={!maintOtherChecked}
                      required={maintOtherChecked && maintChecklist.length === 0}
                      style={{
                        opacity: maintOtherChecked ? 1 : 0.45,
                        transition: 'opacity 0.15s ease'
                      }}
                    />
                  </div>
                </div>

                {/* 2. Who to Fix */}
                <div className="form-group" style={{ marginBottom: '0.9rem' }}>
                  <label className="form-label">Who Will Fix (Assigned Personnel): *</label>
                  <select
                    className="form-select"
                    value={maintMechanic}
                    onChange={(e) => setMaintMechanic(e.target.value)}
                    required
                    style={{ marginBottom: '0.45rem' }}
                  >
                    {mechanics.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="OTHER">Other (Type specialist name...)</option>
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Custom specialist name (if 'Other' selected above)..."
                    value={maintCustomMechanic}
                    onChange={(e) => setMaintCustomMechanic(e.target.value)}
                    disabled={maintMechanic !== 'OTHER'}
                    required={maintMechanic === 'OTHER'}
                    style={{
                      opacity: maintMechanic === 'OTHER' ? 1 : 0.45,
                      transition: 'opacity 0.15s ease'
                    }}
                  />
                </div>

                {/* 3. Optional Note */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Note (Optional):</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Driver reported brake squeaking on downhill..."
                    value={maintNote}
                    onChange={(e) => setMaintNote(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-box-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setMaintModalVehicleId(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={maintChecklist.length === 0 && !(maintOtherChecked && maintOtherText.trim())}
                >
                  <Wrench size={14} /> Send to Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pick Existing Car from Car Profiling (or fallback to Register New Vehicle) */}
      {addCarPickerOpen && (
        <div className="modal-overlay" onClick={() => setAddCarPickerOpen(false)}>
          <div className="modal-box" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Plus size={18} color="var(--primary)" />
                <span>Add Car from Car Profiling</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setAddCarPickerOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Select an existing vehicle from <strong>Car Profiling</strong> to configure or add health diagnostics.
              </div>

              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  color="var(--text-tertiary)"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search Car Profiling by code, plate, or model..."
                  value={addCarSearch}
                  onChange={(e) => setAddCarSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '46vh', overflowY: 'auto' }}>
                {(() => {
                  const notInHealth = vehicles.filter(v => (v.diagnostics || []).length === 0);
                  const filteredNotInHealth = notInHealth.filter(v => {
                    const term = addCarSearch.toLowerCase().trim();
                    if (!term) return true;
                    return (
                      v.code.toLowerCase().includes(term) ||
                      v.plateNo.toLowerCase().includes(term) ||
                      v.makeModel.toLowerCase().includes(term)
                    );
                  });

                  if (notInHealth.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px dashed var(--border-medium)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.84rem'
                      }}>
                        All vehicles from <strong>Car Profiling</strong> are already in Ongoing Health.
                      </div>
                    );
                  }

                  if (filteredNotInHealth.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px dashed var(--border-medium)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.84rem'
                      }}>
                        No untracked vehicles match your search.
                      </div>
                    );
                  }

                  return filteredNotInHealth.map(v => {
                    const img = getVehicleImage(v);
                    return (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.6rem 0.8rem',
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                          <img
                            src={img}
                            alt={v.code}
                            style={{
                              width: '46px',
                              height: '34px',
                              borderRadius: '4px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-subtle)',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                              {v.code} <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>&bull; {v.plateNo}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                              {v.makeModel} &bull; {branchName(v.branchId)}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', flexShrink: 0 }}
                          onClick={() => {
                            setAddCarPickerOpen(false);
                            openDiagnosticsModal(v);
                          }}
                        >
                          <Plus size={13} /> Add to Health
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setAddCarPickerOpen(false);
                  setModalType('add-vehicle');
                }}
              >
                + Register New Car in Profiling
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setAddCarPickerOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

