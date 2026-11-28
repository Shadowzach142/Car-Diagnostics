import React, { useState, useMemo, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, DEFAULT_EDITABLES } from '../data/fleetData';
import { evaluateDiagnostic, parseLocalYmd } from '../utils/vehicleHealth';
import {
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  X,
  Check,
  Wrench,
  ArrowRight,
  Search,
  Eye,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CalendarDays
} from 'lucide-react';

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
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

export const OngoingHealth = () => {
  const {
    settings,
    vehicles = [],
    drivers = [],
    branches = [],
    workOrders = [],
    bookings = [],
    editables = {},
    setModalType,
    setSelectedVehicle,
    setActiveTab,
    createWorkOrder,
    upsertVehicleDiagnostic,
    removeVehicleDiagnostic,
    globalSearch,
    focusedHealthVehicleId,
    setFocusedHealthVehicleId,
    setFocusedProfileVehicleId
  } = useFleet();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [diagFilter, setDiagFilter] = useState('ALL'); // 'ALL' | 'OIL' | 'BRAKES' | 'DIELECTRIC'

  const focusedHealthIds = Array.isArray(focusedHealthVehicleId)
    ? focusedHealthVehicleId
    : focusedHealthVehicleId
    ? [focusedHealthVehicleId]
    : [];

  useEffect(() => {
    if (focusedHealthIds.length === 0) return;
    setBranchFilter('ALL');
    setDiagFilter('ALL');
    const firstId = focusedHealthIds[0];
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`health-card-${firstId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    const clearTimer = setTimeout(() => {
      setFocusedHealthVehicleId(null);
    }, 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusedHealthVehicleId, setFocusedHealthVehicleId]);

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
  const [maintScheduledDate, setMaintScheduledDate] = useState(() => formatLocalYmd(new Date()));
  const [maintDeadlineDate, setMaintDeadlineDate] = useState(() => formatLocalYmd(new Date(Date.now() + 3 * 86400000)));
  const [maintNote, setMaintNote] = useState('');
  const [maintPickerOpen, setMaintPickerOpen] = useState(false);
  const [maintPickerDept, setMaintPickerDept] = useState('ALL');
  const [maintPickerSearch, setMaintPickerSearch] = useState('');
  const [maintCalOpen, setMaintCalOpen] = useState(false);
  const [maintCalMonth, setMaintCalMonth] = useState(() => new Date());
  const [calDraftStart, setCalDraftStart] = useState('');
  const [calDraftEnd, setCalDraftEnd] = useState('');
  const [calDragging, setCalDragging] = useState(false);
  const [calAnchorDate, setCalAnchorDate] = useState('');

  useEffect(() => {
    if (!calDragging) return;
    const stopDrag = () => setCalDragging(false);
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, [calDragging]);

  const diagTypes = editables.diagnosticTypes || DEFAULT_EDITABLES.diagnosticTypes;
  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;
  const departments = editables.departments || DEFAULT_EDITABLES.departments;

  const personnelOptions = useMemo(() => {
    const seenNames = new Set();
    const list = [];

    (drivers || []).forEach(d => {
      const name = (d.name || '').trim();
      if (!name) return;
      seenNames.add(name.toLowerCase());
      const title = d.title || d.role || 'Fleet Personnel';
      list.push({
        id: d.id,
        name,
        title,
        department: d.department || 'Technical / Engineering',
        employeeId: d.employeeId || '',
        branchId: d.branchId || '',
        value: `${name} (${title})`
      });
    });

    (mechanics || []).forEach((m, idx) => {
      const name = shortPerson(m);
      if (!name || seenNames.has(name.toLowerCase())) return;
      seenNames.add(name.toLowerCase());
      const titleMatch = m.match(/\(([^)]+)\)/);
      list.push({
        id: `MECH-${idx}`,
        name,
        title: titleMatch ? titleMatch[1] : 'Motorpool Specialist',
        department: 'Technical / Engineering',
        employeeId: '',
        branchId: '',
        value: m
      });
    });

    return list;
  }, [drivers, mechanics]);

  const branchName = (id) => branches.find(b => b.id === id)?.municipality || id;
  const q = (globalSearch || '').toLowerCase().trim();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechNameNorm = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();
  const matchedDriver = useMemo(
    () => drivers.find(d => (d.name || '').trim().toLowerCase() === mechNameNorm),
    [drivers, mechNameNorm]
  );

  const healthVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (isMechanic) {
        if (matchedDriver) {
          if (!(v.authorizedDriverIds || []).includes(matchedDriver.id)) return false;
        } else {
          const hasOrder = workOrders.some(
            wo => wo.vehicleCode === v.code && (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechNameNorm
          );
          if (!hasOrder) return false;
        }
      }
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
  }, [vehicles, isMechanic, matchedDriver, workOrders, mechNameNorm, branchFilter, q]);

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
    const todayStr = formatLocalYmd(new Date());
    const defaultDeadlineStr = formatLocalYmd(new Date(Date.now() + 3 * 86400000));
    setMaintScheduledDate(todayStr);
    setMaintDeadlineDate(defaultDeadlineStr);
    setMaintNote('');
    setMaintPickerOpen(false);
    setMaintPickerDept('ALL');
    setMaintPickerSearch('');
    setMaintCalOpen(false);
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
      scheduledDate: maintScheduledDate || formatLocalYmd(new Date()),
      targetCompletion: maintDeadlineDate || maintScheduledDate || formatLocalYmd(new Date(Date.now() + 3 * 86400000)),
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

        {!isMechanic && (
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
        )}
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

            const getVisibleRowStatus = (d, ev) => {
              const showKmBar = (d.trackMode === 'KM' || d.trackMode === 'BOTH') && ev.remainingKm !== null;
              return showKmBar ? ev.kmStatus : ev.dateStatus;
            };

            const allRowStatuses = allDiags.map(d => {
              const ev = evaluateDiagnostic(d, odo);
              return getVisibleRowStatus(d, ev);
            });
            const isOverdueCard = allRowStatuses.some(s => s === 'OVERDUE');
            const isDue = allRowStatuses.some(s => s !== 'HEALTHY');
            const activeWO = workOrders.find(
              w => w.vehicleCode === v.code && w.status !== 'Completed / Released'
            );

            return (
              <div
                key={v.id}
                id={`health-card-${v.id}`}
                className={`data-card ${focusedHealthIds.includes(v.id) ? 'health-focus-pulse' : ''}`}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  {/* Header: Matches Car Profiling (58x58 Photo, Code + Year, Model, Plate Pill + Station, Status Pill) */}
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '1.05rem' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
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
                              padding: '1px 6px',
                              flexShrink: 0
                            }}
                          >
                            {v.year}
                          </span>
                        </div>
                        <span
                          className={`badge ${isOverdueCard ? 'badge-danger' : isDue ? 'badge-warning' : 'badge-success'}`}
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            padding: '0.16rem 0.5rem',
                            flexShrink: 0
                          }}
                        >
                          {isOverdueCard ? 'OVERDUE' : isDue ? 'SERVICE SOON' : 'HEALTHY'}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '5px', minWidth: 0 }}>
                        <span
                          className="mono"
                          style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            background: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '5px',
                            padding: '1px 7px',
                            flexShrink: 0
                          }}
                        >
                          {v.plateNo}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--text-tertiary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={branchName(v.branchId)}
                        >
                          &bull; {branchName(v.branchId)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Items with Clean Progress Meter Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.1rem' }}>
                    {evaluatedDiags.map(d => {
                      const { ev } = d;
                      const showKmBar = (d.trackMode === 'KM' || d.trackMode === 'BOTH') && ev.remainingKm !== null;
                      const displayStatus = showKmBar ? ev.kmStatus : ev.dateStatus;
                      const isOverdue = displayStatus === 'OVERDUE';
                      const isSoon = displayStatus === 'DUE_SOON';

                      let badgeLabel = 'Healthy';
                      if (showKmBar) {
                        badgeLabel = ev.remainingKm <= 0
                          ? `Overdue ${Math.abs(ev.remainingKm).toLocaleString()} km`
                          : `${ev.remainingKm.toLocaleString()} km left`;
                      } else if (d.targetDate) {
                        badgeLabel = d.targetDate;
                      }

                      const barColor = isOverdue
                        ? '#DC2626'
                        : isSoon
                        ? '#F59E0B'
                        : '#10B981';

                      const barWidthPct = showKmBar ? ev.healthPct : ev.dateHealthPct;

                      return (
                        <div
                          key={d.id}
                          role={isMechanic ? undefined : 'button'}
                          tabIndex={isMechanic ? undefined : 0}
                          onClick={isMechanic ? undefined : () => openDiagnosticsModal(v, d)}
                          onKeyDown={isMechanic ? undefined : (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openDiagnosticsModal(v, d);
                            }
                          }}
                          style={{
                            padding: '0.2rem 0.35rem',
                            margin: '0 -0.35rem',
                            borderRadius: '6px',
                            cursor: isMechanic ? 'default' : 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={isMechanic ? undefined : (e) => { e.currentTarget.style.background = 'var(--bg-surface-subtle)'; }}
                          onMouseLeave={isMechanic ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; }}
                          title={isMechanic ? undefined : 'Click to edit KM or Date interval'}
                        >
                          {/* Top Row: Diagnostic Name & Remaining KM / Date Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.38rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                              {d.type}
                            </span>
                            <span
                              className={`badge ${isOverdue ? 'badge-danger' : isSoon ? 'badge-warning' : 'badge-success'}`}
                              style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.12rem 0.48rem', borderRadius: '6px', flexShrink: 0 }}
                            >
                              {badgeLabel}
                            </span>
                          </div>

                          {/* Bottom Row: Sleek Progress Bar */}
                          <div
                            style={{
                              height: '5px',
                              background: '#E2E8F0',
                              borderRadius: '999px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${barWidthPct}%`,
                                height: '100%',
                                background: barColor,
                                borderRadius: '999px',
                                transition: 'width 0.25s ease'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Uncramped Action Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '0.32rem 0.65rem', fontSize: '0.76rem' }}
                      onClick={() => {
                        setFocusedProfileVehicleId(v.id);
                        setActiveTab('profiling');
                      }}
                      title={`Locate ${v.code} in Car Profiling`}
                    >
                      <Eye size={13} /> Profile
                    </button>
                    {!isMechanic && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.32rem 0.65rem', fontSize: '0.76rem' }}
                        onClick={() => openDiagnosticsModal(v)}
                        title="Edit diagnostic intervals"
                      >
                        <Sliders size={13} /> Edit
                      </button>
                    )}
                  </div>
                  {activeWO ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '0.32rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}
                      onClick={() => setActiveTab('maintenance')}
                    >
                      In Maintenance <ArrowRight size={13} />
                    </button>
                  ) : !isMechanic ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ padding: '0.32rem 0.8rem', fontSize: '0.76rem', fontWeight: 700 }}
                      onClick={() => openSendToMaintenanceModal(v)}
                    >
                      <Wrench size={13} /> To Maintenance
                    </button>
                  ) : null}
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
                            <option value={6}>Every 6 months (Semi-Annual / 2x yr)</option>
                            <option value={9}>Every 9 months (Office Cars)</option>
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

                {/* 2. Who to Fix (Scalable Employee Directory Picker) */}
                <div className="form-group" style={{ marginBottom: '0.9rem' }}>
                  <label className="form-label">Who Will Fix (Assigned Personnel): *</label>
                  {(() => {
                    const isOther = maintMechanic === 'OTHER';
                    const selectedPerson = !isOther
                      ? personnelOptions.find(
                          p =>
                            p.value === maintMechanic ||
                            p.name.toLowerCase() === shortPerson(maintMechanic).toLowerCase()
                        )
                      : null;
                    const displayLabel = isOther
                      ? 'Other / External Specialist'
                      : selectedPerson?.name || shortPerson(maintMechanic) || 'Select personnel...';
                    const displaySub = isOther
                      ? 'Type custom specialist name below'
                      : selectedPerson
                      ? `${selectedPerson.title}${selectedPerson.department ? ` · ${selectedPerson.department}` : ''}`
                      : maintMechanic;
                    const personInitials = displayLabel
                      .replace(/^Engr\.\s+/i, '')
                      .split(' ')
                      .filter(Boolean)
                      .map(w => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'OP';

                    return (
                      <button
                        type="button"
                        onClick={() => setMaintPickerOpen(true)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.55rem 0.75rem',
                          marginBottom: '0.45rem',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                          <span style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: '#1E293B',
                            color: '#FFFFFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            flexShrink: 0
                          }}>
                            {personInitials}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {displayLabel}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {displaySub}
                            </div>
                          </div>
                        </div>
                        <span className="btn btn-sm btn-outline" style={{ pointerEvents: 'none', flexShrink: 0 }}>
                          <Users size={13} /> Change
                        </span>
                      </button>
                    );
                  })()}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Custom specialist name (if 'Other' selected)..."
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

                {/* 3. Set Date & Deadline (Opens Interactive Click & Drag Calendar) */}
                <div className="form-group" style={{ marginBottom: '0.9rem' }}>
                  <label className="form-label">Schedule &amp; Deadline (Operator &amp; Mechanic Calendar): *</label>
                  {(() => {
                    const startD = parseLocalYmd(maintScheduledDate);
                    const endD = parseLocalYmd(maintDeadlineDate);
                    const daysCount = startD && endD
                      ? Math.max(1, Math.round((endD - startD) / 86400000) + 1)
                      : 1;
                    const fmtShort = (d) =>
                      d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setCalDraftStart(maintScheduledDate);
                          setCalDraftEnd(maintDeadlineDate || maintScheduledDate);
                          setMaintCalMonth(parseLocalYmd(maintScheduledDate) || new Date());
                          setMaintCalOpen(true);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.55rem 0.75rem',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                          <span style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-light)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            flexShrink: 0
                          }}>
                            <CalendarDays size={16} />
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                              {fmtShort(startD) || maintScheduledDate} &rarr; {fmtShort(endD) || maintDeadlineDate}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {daysCount} {daysCount === 1 ? 'day' : 'days'} scheduled &bull; Click to drag on calendar
                            </div>
                          </div>
                        </div>
                        <span className="btn btn-sm btn-outline" style={{ pointerEvents: 'none', flexShrink: 0 }}>
                          <CalendarDays size={13} /> Change
                        </span>
                      </button>
                    );
                  })()}
                </div>

                {/* 4. Optional Note */}
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

      {/* Employee / Personnel Directory Picker Popup (for Send to Maintenance) */}
      {maintPickerOpen && maintModalVehicle && (
        <div
          className="modal-overlay"
          style={{ zIndex: 240 }}
          onClick={() => setMaintPickerOpen(false)}
        >
          <div
            className="modal-box"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Users size={18} />
                <span>Select Assigned Personnel</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setMaintPickerOpen(false)}
                aria-label="Close personnel picker"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '72vh', overflowY: 'auto' }}>
              <div className="access-filter-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    color="var(--text-tertiary)"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '32px', paddingRight: maintPickerSearch ? '28px' : '10px', fontSize: '0.82rem', height: '38px' }}
                    placeholder="Search employee name, ID, title, or station..."
                    value={maintPickerSearch}
                    onChange={(e) => setMaintPickerSearch(e.target.value)}
                    autoFocus
                  />
                  {maintPickerSearch && (
                    <button
                      type="button"
                      onClick={() => setMaintPickerSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)' }}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  className="form-select"
                  value={maintPickerDept}
                  onChange={(e) => setMaintPickerDept(e.target.value)}
                  style={{ height: '38px', fontSize: '0.8rem', minWidth: 'min(100%, 175px)' }}
                  aria-label="Filter by department"
                >
                  <option value="ALL">All Departments ({personnelOptions.length})</option>
                  {departments.map(dept => {
                    const count = personnelOptions.filter(p => p.department === dept).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {maintPickerDept === 'ALL' && !maintPickerSearch.trim() ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
                  gap: '0.75rem'
                }}>
                  {departments.map(dept => {
                    const count = personnelOptions.filter(p => p.department === dept).length;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setMaintPickerDept(dept)}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '10px',
                          padding: '0.9rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.65rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-light)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            flexShrink: 0
                          }}>
                            <Building2 size={15} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                              {dept}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {count} {count === 1 ? 'Employee' : 'Employees'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {maintPickerDept !== 'ALL' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setMaintPickerDept('ALL')}
                      >
                        <ArrowLeft size={13} /> All Departments
                      </button>
                      <span className="stat-chip">{maintPickerDept}</span>
                    </div>
                  )}

                  {(() => {
                    const pq = maintPickerSearch.trim().toLowerCase();
                    const matches = personnelOptions.filter(p => {
                      if (maintPickerDept !== 'ALL' && p.department !== maintPickerDept) return false;
                      if (!pq) return true;
                      const st = p.branchId ? branchName(p.branchId) : '';
                      return [p.name, p.title, p.department, p.employeeId, st]
                        .some(f => String(f || '').toLowerCase().includes(pq));
                    });

                    if (matches.length === 0) {
                      return (
                        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                          <Users size={28} color="var(--text-tertiary)" />
                          <strong>No matching employees found</strong>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {matches.map(p => {
                          const isSelected =
                            maintMechanic === p.value ||
                            shortPerson(maintMechanic).toLowerCase() === p.name.toLowerCase();
                          const empInitials = p.name
                            .replace(/^Engr\.\s+/i, '')
                            .split(' ')
                            .filter(Boolean)
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'OP';

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setMaintMechanic(p.value);
                                setMaintPickerOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.7rem 0.85rem',
                                borderRadius: '10px',
                                background: isSelected ? 'var(--lime-soft)' : 'var(--bg-surface)',
                                border: `1px solid ${isSelected ? 'var(--lime)' : 'var(--border-light)'}`,
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                                <span style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '9px',
                                  background: '#1E293B',
                                  color: '#FFFFFF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  flexShrink: 0
                                }}>
                                  {empInitials}
                                </span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                    {p.name}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.title}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '3px' }}>
                                    {p.employeeId && (
                                      <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)' }}>
                                        {p.employeeId}
                                      </span>
                                    )}
                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                      {p.department}
                                    </span>
                                    {p.branchId && (
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                        &bull; {branchName(p.branchId)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                                style={{ flexShrink: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMaintMechanic(p.value);
                                  setMaintPickerOpen(false);
                                }}
                              >
                                {isSelected ? <><Check size={13} /> Selected</> : 'Select'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setMaintMechanic('OTHER');
                  setMaintPickerOpen(false);
                }}
              >
                Other / Custom Specialist
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setMaintPickerOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Click-and-Drag Calendar Schedule Picker */}
      {maintCalOpen && maintModalVehicle && (() => {
        const year = maintCalMonth.getFullYear();
        const month = maintCalMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const todayStr = formatLocalYmd(new Date());

        const cells = [];
        for (let i = 0; i < startOffset; i++) {
          const d = new Date(year, month, 1 - (startOffset - i));
          cells.push({ dateStr: formatLocalYmd(d), dayNum: d.getDate(), inMonth: false });
        }
        for (let d = 1; d <= totalDays; d++) {
          const dt = new Date(year, month, d);
          cells.push({ dateStr: formatLocalYmd(dt), dayNum: d, inMonth: true });
        }
        while (cells.length % 7 !== 0) {
          const d = new Date(year, month + 1, cells.length - totalDays - startOffset + 1);
          cells.push({ dateStr: formatLocalYmd(d), dayNum: d.getDate(), inMonth: false });
        }

        const assignedShort = shortPerson(
          maintMechanic === 'OTHER' ? maintCustomMechanic : maintMechanic
        ).toLowerCase();

        const rangeStart = calDraftStart && calDraftEnd
          ? (calDraftStart <= calDraftEnd ? calDraftStart : calDraftEnd)
          : (calDraftStart || maintScheduledDate);
        const rangeEnd = calDraftStart && calDraftEnd
          ? (calDraftStart <= calDraftEnd ? calDraftEnd : calDraftStart)
          : (calDraftEnd || rangeStart);
        const sObj = parseLocalYmd(rangeStart);
        const eObj = parseLocalYmd(rangeEnd);
        const spanDays = sObj && eObj ? Math.max(1, Math.round((eObj - sObj) / 86400000) + 1) : 1;

        const monthLabel = maintCalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
          <div
            className="modal-overlay"
            style={{ zIndex: 245 }}
            onClick={() => setMaintCalOpen(false)}
          >
            <div
              className="modal-box"
              style={{ maxWidth: '640px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-box-header">
                <div className="modal-box-title">
                  <CalendarDays size={18} />
                  <span>Select Maintenance Duration</span>
                </div>
                <button
                  type="button"
                  className="modal-box-close"
                  onClick={() => setMaintCalOpen(false)}
                  aria-label="Close calendar picker"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={() => setMaintCalMonth(new Date(year, month - 1, 1))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <strong style={{ fontSize: '0.98rem', minWidth: '135px', textAlign: 'center', color: 'var(--text-main)' }}>
                      {monthLabel}
                    </strong>
                    <button
                      type="button"
                      className="cal-nav-btn"
                      onClick={() => setMaintCalMonth(new Date(year, month + 1, 1))}
                      aria-label="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="cal-today-btn"
                      onClick={() => setMaintCalMonth(new Date())}
                    >
                      Today
                    </button>
                  </div>

                  <div className="stat-chip" style={{ fontSize: '0.76rem' }}>
                    <strong>{rangeStart}</strong> &rarr; <strong>{rangeEnd}</strong> ({spanDays} {spanDays === 1 ? 'day' : 'days'})
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click and drag across calendar days to set how long <strong>{shortPerson(maintMechanic === 'OTHER' ? (maintCustomMechanic || 'Specialist') : maintMechanic)}</strong> needs to fix it.
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: 'var(--bg-surface)'
                }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(h => (
                    <div
                      key={h}
                      style={{
                        padding: '0.45rem 0.25rem',
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-surface-subtle)',
                        borderBottom: '1px solid var(--border-light)'
                      }}
                    >
                      {h}
                    </div>
                  ))}

                  {cells.map((cell, idx) => {
                    const inRange = cell.dateStr >= rangeStart && cell.dateStr <= rangeEnd;
                    const isStart = cell.dateStr === rangeStart;
                    const isEnd = cell.dateStr === rangeEnd;
                    const isToday = cell.dateStr === todayStr;

                    const busyCount = (bookings || []).filter(b => {
                      const bEnd = b.deadline || b.date;
                      if (cell.dateStr < b.date || cell.dateStr > bEnd) return false;
                      if (!assignedShort) return true;
                      return (b.driver || '').split(' (')[0].trim().toLowerCase() === assignedShort;
                    }).length;

                    return (
                      <div
                        key={`${cell.dateStr}-${idx}`}
                        onMouseDown={() => {
                          setCalDragging(true);
                          setCalAnchorDate(cell.dateStr);
                          setCalDraftStart(cell.dateStr);
                          setCalDraftEnd(cell.dateStr);
                        }}
                        onMouseEnter={() => {
                          if (!calDragging || !calAnchorDate) return;
                          if (cell.dateStr >= calAnchorDate) {
                            setCalDraftStart(calAnchorDate);
                            setCalDraftEnd(cell.dateStr);
                          } else {
                            setCalDraftStart(cell.dateStr);
                            setCalDraftEnd(calAnchorDate);
                          }
                        }}
                        onMouseUp={() => setCalDragging(false)}
                        style={{
                          minHeight: '58px',
                          padding: '0.35rem 0.4rem',
                          borderRight: (idx % 7 !== 6) ? '1px solid var(--border-subtle)' : 'none',
                          borderBottom: idx < cells.length - 7 ? '1px solid var(--border-subtle)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          background: inRange
                            ? (isStart || isEnd ? 'var(--lime)' : 'var(--lime-soft)')
                            : cell.inMonth
                            ? 'var(--bg-surface)'
                            : '#FAFAFC',
                          opacity: cell.inMonth || inRange ? 1 : 0.45,
                          inset: undefined,
                          boxShadow: isToday ? 'inset 0 0 0 1.5px #16A34A' : undefined,
                          transition: 'background 0.08s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '3px' }}>
                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: isToday ? '#FFFFFF' : 'var(--text-main)',
                            width: isToday ? '22px' : 'auto',
                            height: isToday ? '22px' : 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: isToday ? '#16A34A' : 'transparent'
                          }}>
                            {cell.dayNum}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {isToday && (
                              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.03em' }}>
                                TODAY
                              </span>
                            )}
                            {(isStart || isEnd) && (
                              <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: '#1E293B' }}>
                                {isStart && isEnd ? '1d' : isStart ? 'Start' : 'Due'}
                              </span>
                            )}
                          </div>
                        </div>

                        {busyCount > 0 && (
                          <div style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: '#B45309',
                            background: '#FEF3C7',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {busyCount} busy
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-box-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setMaintCalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMaintScheduledDate(rangeStart);
                    setMaintDeadlineDate(rangeEnd);
                    setMaintCalOpen(false);
                  }}
                >
                  <Check size={14} /> Confirm Schedule ({spanDays} {spanDays === 1 ? 'day' : 'days'})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

