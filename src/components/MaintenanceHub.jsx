import React, { useState, useMemo, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { DEFAULT_EDITABLES, getVehicleImage } from '../data/fleetData';
import { PersonnelPickerField } from './common/PersonnelPickerModal';
import { DateRangeCalendarField } from './common/DateRangeCalendarModal';
import {
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  X,
  Eye,
  Archive,
  Play,
  CheckSquare,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Check,
  CalendarDays
} from 'lucide-react';

const COMPLETED = 'Completed / Released';
const FOR_MAINTENANCE_STAGE = 'Queued / Inspection';
const IN_MAINTENANCE_STAGE = 'Active Repair / Servicing';

const QUICK_EXTRA_REPAIRS = [
  'Tire Replacement',
  'Brake Pads & Fluid Check',
  'Battery Replacement',
  'Air & Fuel Filter',
  'Coolant Flush',
  'Wiper Blades & Lights'
];

const isWorkOrderScheduled = (wo) => {
  const mech = (wo?.assignedMechanic || '').trim();
  const hasMechanic = Boolean(mech) && mech.toLowerCase() !== 'unassigned';
  const hasDate = Boolean((wo?.scheduledDate || '').trim() || (wo?.targetCompletion || '').trim());
  return hasMechanic && hasDate;
};

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
};

const getInitials = (name) =>
  shortPerson(name)
    .replace(/^Engr\.\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MC';

const getChecklistForWO = (wo, isDone) => {
  if (Array.isArray(wo.checklistItems) && wo.checklistItems.length > 0) {
    return wo.checklistItems;
  }
  if (Array.isArray(wo.checklist) && wo.checklist.length > 0) {
    return wo.checklist.map((label, i) => ({
      id: `CHK-${wo.id}-${i}`,
      label,
      done: isDone
    }));
  }
  return [
    {
      id: `CHK-${wo.id}-0`,
      label: wo.type || 'Inspection & Servicing',
      done: isDone
    }
  ];
};

export const MaintenanceHub = () => {
  const {
    vehicles = [],
    branches = [],
    drivers = [],
    workOrders = [],
    editables = {},
    setModalType,
    setSelectedVehicle,
    updateWorkOrderStage,
    archiveCompletedWorkOrder,
    deleteWorkOrder,
    globalSearch,
    settings,
    focusedMaintenanceIds,
    setFocusedMaintenanceIds
  } = useFleet();

  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;
  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechShort = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [activeWOId, setActiveWOId] = useState(null);

  const focusedWoIds = Array.isArray(focusedMaintenanceIds)
    ? focusedMaintenanceIds
    : focusedMaintenanceIds
    ? [focusedMaintenanceIds]
    : [];

  useEffect(() => {
    if (focusedWoIds.length === 0) return;
    setBranchFilter('ALL');
    const firstId = focusedWoIds[0];
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`wo-card-${firstId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    const clearTimer = setTimeout(() => {
      setFocusedMaintenanceIds(null);
    }, 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusedMaintenanceIds, setFocusedMaintenanceIds]);
  const [deleteConfirmWO, setDeleteConfirmWO] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [checklistEditMode, setChecklistEditMode] = useState(false);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerMechanic, setDrawerMechanic] = useState('');
  const [drawerScheduledDate, setDrawerScheduledDate] = useState('');
  const [drawerTargetCompletion, setDrawerTargetCompletion] = useState('');
  const [drawerNextKm, setDrawerNextKm] = useState('');
  const [drawerNextDate, setDrawerNextDate] = useState('');
  const [reportModalWO, setReportModalWO] = useState(null);
  const [reportNotes, setReportNotes] = useState('');
  const [reportNextKm, setReportNextKm] = useState('');
  const [reportNextDate, setReportNextDate] = useState('');
  const [reportExtraItems, setReportExtraItems] = useState([]);
  const [reportExtraInput, setReportExtraInput] = useState('');
  const [collapsedCols, setCollapsedCols] = useState(() => {
    const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 768;
    return { forMaint: false, inMaint: false, done: isNarrow };
  });

  const toggleColumn = (colKey) =>
    setCollapsedCols(prev => ({ ...prev, [colKey]: !prev[colKey] }));

  const q = (globalSearch || '').toLowerCase().trim();

  // Filter work orders visible on the board (exclude already archived items)
  const boardWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      if (wo.archivedFromBoard) return false;

      if (isMechanic) {
        const woMech = (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase();
        if (woMech !== mechShort) return false;
      }

      const v = vehicles.find(veh => veh.code === wo.vehicleCode);
      const woBranch = wo.branchId || v?.branchId;
      if (branchFilter !== 'ALL' && woBranch !== branchFilter) return false;

      if (q) {
        const match =
          wo.vehicleCode.toLowerCase().includes(q) ||
          (wo.plateNo || '').toLowerCase().includes(q) ||
          (wo.type || '').toLowerCase().includes(q) ||
          (wo.assignedMechanic || '').toLowerCase().includes(q) ||
          (v?.makeModel || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [workOrders, vehicles, branchFilter, q, isMechanic, mechShort]);

  // Split into 3 Kanban columns: For Maintenance -> Under Maintenance -> Done
  const columns = useMemo(() => {
    const forMaintAll = [];
    const inMaint = [];
    const done = [];

    boardWorkOrders.forEach(wo => {
      const stage = wo.currentStage || IN_MAINTENANCE_STAGE;
      if (wo.status === COMPLETED || stage === COMPLETED) {
        done.push(wo);
      } else if (stage === FOR_MAINTENANCE_STAGE) {
        forMaintAll.push(wo);
      } else {
        inMaint.push(wo);
      }
    });

    const forMaintScheduled = forMaintAll.filter(isWorkOrderScheduled);
    const forMaintUnscheduled = forMaintAll.filter(wo => !isWorkOrderScheduled(wo));

    return {
      forMaint: forMaintAll,
      forMaintAll,
      forMaintScheduled,
      forMaintUnscheduled,
      inMaint,
      done
    };
  }, [boardWorkOrders]);

  const activeWO = useMemo(
    () => workOrders.find(w => w.id === activeWOId) || null,
    [workOrders, activeWOId]
  );

  const getMatchedDiagForWO = (wo) => {
    const v = vehicles.find(veh => veh.code === wo.vehicleCode);
    const diags = v?.diagnostics || [];
    const woTypeLower = (wo.type || '').toLowerCase();
    return diags.find(d => {
      const dt = (d.type || '').toLowerCase();
      return (
        dt === woTypeLower ||
        woTypeLower.includes(dt) ||
        (woTypeLower.includes('oil') && dt.includes('oil')) ||
        (woTypeLower.includes('brake') && dt.includes('brake')) ||
        (woTypeLower.includes('tire') && dt.includes('tire')) ||
        (woTypeLower.includes('dielectric') && dt.includes('dielectric')) ||
        (woTypeLower.includes('battery') && dt.includes('battery'))
      );
    }) || diags[0];
  };

  const openDrawer = (wo) => {
    const matchedDiag = getMatchedDiagForWO(wo);
    setActiveWOId(wo.id);
    setDrawerNotes(wo.mechanicNote || wo.description || wo.notes || '');
    setDrawerMechanic(wo.assignedMechanic || '');
    setDrawerScheduledDate(wo.scheduledDate || '');
    setDrawerTargetCompletion(wo.targetCompletion || wo.scheduledDate || '');
    setDrawerNextKm(String(wo.nextIntervalKm || matchedDiag?.intervalKm || 5000));
    setDrawerNextDate(wo.nextTargetDate || wo.nextServiceDate || matchedDiag?.targetDate || '');
    setNewTaskText('');
    setChecklistEditMode(false);
  };

  const openReportModal = (wo) => {
    const matchedDiag = getMatchedDiagForWO(wo);
    const existingExtras = Array.isArray(wo.additionalWork) ? wo.additionalWork : [];
    const checklistExtras = (wo.checklistItems || [])
      .filter(i => i.addedByMechanic)
      .map(i => i.label);
    setReportModalWO(wo);
    setReportNotes(wo.mechanicNote || wo.description || wo.notes || '');
    setReportNextKm(String(wo.nextIntervalKm || matchedDiag?.intervalKm || 5000));
    setReportNextDate(wo.nextTargetDate || wo.nextServiceDate || matchedDiag?.targetDate || '');
    setReportExtraItems(Array.from(new Set([...existingExtras, ...checklistExtras])));
    setReportExtraInput('');
  };

  const handleAddReportExtra = (rawLabel) => {
    const label = String(rawLabel || '').trim();
    if (!label) return;
    setReportExtraItems(prev => (prev.some(i => i.toLowerCase() === label.toLowerCase()) ? prev : [...prev, label]));
    setReportExtraInput('');
  };

  const handleSubmitReportModal = (archiveAfterSave) => {
    if (!reportModalWO) return;
    const nextKmNum = Number(reportNextKm);
    const pendingInput = reportExtraInput.trim();
    const finalExtras = pendingInput && !reportExtraItems.some(i => i.toLowerCase() === pendingInput.toLowerCase())
      ? [...reportExtraItems, pendingInput]
      : reportExtraItems;
    updateWorkOrderStage(reportModalWO.id, COMPLETED, {
      description: reportNotes,
      mechanicNote: reportNotes,
      additionalWork: finalExtras,
      nextIntervalKm: nextKmNum > 0 ? nextKmNum : undefined,
      nextTargetDate: reportNextDate || undefined,
      intervalKmOverride: nextKmNum > 0 ? nextKmNum : undefined,
      targetDateOverride: reportNextDate || undefined,
      createReport: true
    });
    if (archiveAfterSave) {
      archiveCompletedWorkOrder(reportModalWO.id);
      if (activeWOId === reportModalWO.id) setActiveWOId(null);
    }
    setReportModalWO(null);
  };

  const handleOpenVehicleProfile = (e, vehicleCode) => {
    if (e) e.stopPropagation();
    const v = vehicles.find(veh => veh.code === vehicleCode);
    if (v) {
      setSelectedVehicle(v);
      setModalType('vehicle-detail');
    }
  };

  const handleStartMaintenance = (e, wo) => {
    if (e) e.stopPropagation();
    const items = getChecklistForWO(wo, false);
    updateWorkOrderStage(wo.id, IN_MAINTENANCE_STAGE, {
      checklistItems: items
    });
  };

  const handleToggleChecklistItem = (wo, itemId) => {
    const isDoneCol = wo.status === COMPLETED || wo.currentStage === COMPLETED;
    const currentItems = getChecklistForWO(wo, isDoneCol);
    const updatedItems = currentItems.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );

    const doneCount = updatedItems.filter(i => i.done).length;
    const totalCount = updatedItems.length;

    let nextStage = IN_MAINTENANCE_STAGE;
    if (totalCount > 0 && doneCount === totalCount) {
      nextStage = COMPLETED;
    } else if (doneCount === 0 && wo.currentStage === FOR_MAINTENANCE_STAGE) {
      nextStage = FOR_MAINTENANCE_STAGE;
    }

    updateWorkOrderStage(wo.id, nextStage, {
      checklistItems: updatedItems,
      description: drawerNotes,
      assignedMechanic: drawerMechanic || wo.assignedMechanic
    });
  };

  const addChecklistItemLabel = (rawLabel) => {
    const label = String(rawLabel || '').trim();
    if (!activeWO || !label) return;
    const isDoneCol = activeWO.status === COMPLETED || activeWO.currentStage === COMPLETED;
    const currentItems = getChecklistForWO(activeWO, isDoneCol);
    if (currentItems.some(i => i.label.toLowerCase() === label.toLowerCase())) {
      setNewTaskText('');
      return;
    }
    const updatedItems = [
      ...currentItems,
      {
        id: `CHK-${Date.now()}`,
        label,
        done: isMechanic ? true : false,
        addedByMechanic: isMechanic
      }
    ];

    const doneCount = updatedItems.filter(i => i.done).length;
    let nextStage = activeWO.currentStage || FOR_MAINTENANCE_STAGE;
    if (!isMechanic && activeWO.currentStage !== FOR_MAINTENANCE_STAGE) {
      nextStage = IN_MAINTENANCE_STAGE;
    } else if (isMechanic && doneCount === updatedItems.length) {
      nextStage = COMPLETED;
    }

    const existingExtras = Array.isArray(activeWO.additionalWork) ? activeWO.additionalWork : [];
    const nextAdditional = isMechanic
      ? Array.from(new Set([...existingExtras, label]))
      : existingExtras;

    updateWorkOrderStage(activeWO.id, nextStage, {
      checklistItems: updatedItems,
      additionalWork: nextAdditional,
      description: drawerNotes,
      assignedMechanic: drawerMechanic || activeWO.assignedMechanic
    });
    setNewTaskText('');
  };

  const handleAddChecklistTask = (e) => {
    e.preventDefault();
    addChecklistItemLabel(newTaskText);
  };

  const handleRemoveChecklistItem = (wo, itemId) => {
    const isDoneCol = wo.status === COMPLETED || wo.currentStage === COMPLETED;
    const currentItems = getChecklistForWO(wo, isDoneCol);
    const updatedItems = currentItems.filter(item => item.id !== itemId);
    const nextType = updatedItems.map(i => i.label).join(' + ') || wo.type;

    const doneCount = updatedItems.filter(i => i.done).length;
    const totalCount = updatedItems.length;
    let nextStage = wo.currentStage || FOR_MAINTENANCE_STAGE;
    if (totalCount > 0 && doneCount === totalCount) {
      nextStage = COMPLETED;
    } else if (doneCount === 0 && nextStage === COMPLETED) {
      nextStage = IN_MAINTENANCE_STAGE;
    }

    updateWorkOrderStage(wo.id, nextStage, {
      checklistItems: updatedItems,
      type: nextType,
      description: drawerNotes,
      assignedMechanic: drawerMechanic || wo.assignedMechanic
    });
  };

  const handleSaveAndCloseDrawer = () => {
    if (!activeWO) return;
    const currentStage = activeWO.currentStage || IN_MAINTENANCE_STAGE;
    const nextKmNum = Number(drawerNextKm);
    updateWorkOrderStage(activeWO.id, currentStage, {
      description: drawerNotes,
      mechanicNote: drawerNotes,
      nextIntervalKm: nextKmNum > 0 ? nextKmNum : undefined,
      nextTargetDate: drawerNextDate || undefined,
      intervalKmOverride: nextKmNum > 0 ? nextKmNum : undefined,
      targetDateOverride: drawerNextDate || undefined,
      assignedMechanic: drawerMechanic,
      scheduledDate: drawerScheduledDate,
      targetCompletion: drawerTargetCompletion || drawerScheduledDate,
      createReport: isMechanic && currentStage === COMPLETED
    });
    setActiveWOId(null);
  };

  const handleMechanicCompleteWithReport = () => {
    if (!activeWO) return;
    const currentItems = getChecklistForWO(activeWO, false).map(i => ({ ...i, done: true }));
    const nextKmNum = Number(drawerNextKm);
    updateWorkOrderStage(activeWO.id, COMPLETED, {
      checklistItems: currentItems,
      description: drawerNotes,
      mechanicNote: drawerNotes,
      nextIntervalKm: nextKmNum > 0 ? nextKmNum : undefined,
      nextTargetDate: drawerNextDate || undefined,
      intervalKmOverride: nextKmNum > 0 ? nextKmNum : undefined,
      targetDateOverride: drawerNextDate || undefined,
      assignedMechanic: drawerMechanic || activeWO.assignedMechanic,
      createReport: true
    });
    setActiveWOId(null);
  };

  const handleArchiveDone = (e, wo) => {
    if (e) e.stopPropagation();
    archiveCompletedWorkOrder(wo.id);
    if (activeWOId === wo.id) setActiveWOId(null);
  };

  const renderCard = (wo, columnType) => {
    const v = vehicles.find(veh => veh.code === wo.vehicleCode);
    const isDoneCol = columnType === 'done';
    const items = getChecklistForWO(wo, isDoneCol);
    const doneCount = items.filter(i => i.done).length;
    const totalCount = items.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
      <div
        key={wo.id}
        id={`wo-card-${wo.id}`}
        className={focusedWoIds.includes(wo.id) ? 'health-focus-pulse' : ''}
        onClick={() => openDrawer(wo)}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '0.95rem 1rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'border-color 0.15s ease'
        }}
      >
        {/* Top Row: Small Vehicle Thumbnail + Code Pill + Plate Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
            <img
              src={getVehicleImage(v || { code: wo.vehicleCode })}
              alt={wo.vehicleCode}
              style={{
                width: '44px',
                height: '32px',
                borderRadius: '7px',
                objectFit: 'cover',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface-subtle)',
                flexShrink: 0
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '2px 8px'
              }}
            >
              {wo.vehicleCode}
            </span>
          </div>
          <span
            className="mono"
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '2px 8px',
              flexShrink: 0
            }}
          >
            {wo.plateNo || v?.plateNo || '—'}
          </span>
        </div>

        {/* Service Title & Subtitle */}
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
          {wo.type}
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: columnType === 'forMaint' ? '0.55rem' : '0.75rem' }}>
          {wo.category || 'Maintenance Service'} &bull;{' '}
          {wo.assignedMechanic ? shortPerson(wo.assignedMechanic) : 'Unassigned'}
        </div>

        {/* For Maintenance Scheduling Status Pill (Scheduled vs Unscheduled) */}
        {columnType === 'forMaint' && (() => {
          const scheduled = isWorkOrderScheduled(wo);
          const schedStart = wo.scheduledDate || wo.targetCompletion;
          const schedEnd = wo.targetCompletion && wo.targetCompletion > schedStart ? wo.targetCompletion : null;
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.45rem',
                flexWrap: 'wrap',
                padding: '0.42rem 0.6rem',
                borderRadius: '8px',
                marginBottom: '0.7rem',
                background: scheduled ? '#EFF6FF' : '#FFFBEB',
                border: scheduled ? '1px solid #BFDBFE' : '1px solid #FDE68A',
                fontSize: '0.72rem'
              }}
            >
              <span style={{ fontWeight: 800, color: scheduled ? '#1D4ED8' : '#B45309', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CalendarDays size={12} />
                {scheduled ? 'Scheduled · Awaiting Confirmation' : 'Unscheduled · Needs Date & Mechanic'}
              </span>
              {scheduled && schedStart && (
                <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1E40AF' }}>
                  {schedEnd ? `${schedStart} → ${schedEnd}` : schedStart}
                </span>
              )}
            </div>
          );
        })()}

        {/* Checklist Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>
          <span>CHECKLIST TASKS</span>
          <span className="mono">{doneCount}/{totalCount} DONE</span>
        </div>
        <div style={{
          height: '5px',
          width: '100%',
          background: 'var(--bg-surface-subtle)',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: isDoneCol ? '#16A34A' : '#475569',
            borderRadius: '999px',
            transition: 'width 0.2s ease'
          }} />
        </div>

        {/* Done Card Note & Next Interval Summary */}
        {isDoneCol && (wo.mechanicNote || wo.description || wo.nextIntervalKm || wo.nextTargetDate) && (
          <div style={{
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '0.55rem 0.7rem',
            marginBottom: '0.7rem',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            {(wo.mechanicNote || wo.description) && (
              <div style={{ color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.35 }}>
                &ldquo;{wo.mechanicNote || wo.description}&rdquo;
              </div>
            )}
            {(wo.nextIntervalKm || wo.nextTargetDate) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {wo.nextIntervalKm && <span className="mono">Next: +{Number(wo.nextIntervalKm).toLocaleString()} km</span>}
                {wo.nextTargetDate && <span className="mono">&bull; Due: {wo.nextTargetDate}</span>}
              </div>
            )}
          </div>
        )}

        {/* Card Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ minHeight: '30px', padding: '0.2rem 0.65rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => handleOpenVehicleProfile(e, wo.vehicleCode)}
              title={`View ${wo.vehicleCode} profile & details`}
            >
              <Eye size={12} /> View Car
            </button>
            {!isMechanic && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{
                  minHeight: '30px',
                  width: '30px',
                  padding: 0,
                  borderRadius: '7px',
                  color: '#DC2626',
                  borderColor: '#FECACA',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmWO(wo);
                }}
                title="Delete work order (accidental entry)"
                aria-label={`Delete ${wo.vehicleCode} work order`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {columnType === 'forMaint' && isMechanic && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ minHeight: '30px', padding: '0.2rem 0.7rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => handleStartMaintenance(e, wo)}
              title="Confirm schedule and move to Under Maintenance"
            >
              <Play size={11} /> Confirm &amp; Start
            </button>
          )}

          {columnType === 'forMaint' && !isMechanic && !isWorkOrderScheduled(wo) && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ minHeight: '30px', padding: '0.2rem 0.7rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(wo);
              }}
              title="Assign mechanic and schedule date"
            >
              <CalendarDays size={12} /> Schedule
            </button>
          )}

          {columnType === 'inMaint' && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ minHeight: '30px', padding: '0.2rem 0.7rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(wo);
              }}
            >
              Checklist
            </button>
          )}

          {columnType === 'done' && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ minHeight: '30px', padding: '0.2rem 0.75rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => {
                e.stopPropagation();
                openReportModal(wo);
              }}
              title="Leave completion note, set next service interval, and send to Reports"
            >
              <Archive size={12} /> Send to Reports
            </button>
          )}
        </div>
      </div>
    );
  };

  const activeIsDone = activeWO && (activeWO.status === COMPLETED || activeWO.currentStage === COMPLETED);
  const activeChecklist = activeWO ? getChecklistForWO(activeWO, activeIsDone) : [];
  const activeDoneCount = activeChecklist.filter(i => i.done).length;

  return (
    <div className="page">
      {/* Zone 2: Toolbar */}
      <div className="page-toolbar">
        <div>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Maintenance Workflow</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.6rem' }}>
            Click cards to view checklists or update tasks. Cards move automatically.
          </span>
        </div>

        <span className="spacer" />

        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.municipality}</option>
          ))}
        </select>

        {!isMechanic && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedVehicle(null);
              setModalType('new-wo');
            }}
          >
            <Plus size={16} /> Add to For Maintenance
          </button>
        )}
      </div>

      {/* Zone 3: 3-Column Workflow Board (Collapsible Columns for Mobile & Large Queues) */}
      <div className="page-body">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
          gap: '1.15rem',
          alignItems: 'start'
        }}>
          {[
            {
              key: 'forMaint',
              title: 'For Maintenance',
              icon: <Clock size={16} color="#D97706" />,
              items: columns.forMaint,
              totalCount: columns.forMaintAll.length,
              emptyText: 'No vehicles queued for maintenance'
            },
            {
              key: 'inMaint',
              title: 'Under Maintenance',
              icon: <Wrench size={16} color="var(--text-secondary)" />,
              items: columns.inMaint,
              totalCount: columns.inMaint.length,
              emptyText: 'No vehicles actively under maintenance'
            },
            {
              key: 'done',
              title: 'Done',
              icon: <CheckCircle2 size={16} color="#16A34A" />,
              items: columns.done,
              totalCount: columns.done.length,
              emptyText: 'No completed vehicles awaiting reports'
            }
          ].map(col => {
            const isCollapsed = !!collapsedCols[col.key];
            return (
              <div
                key={col.key}
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '14px',
                  padding: '0.9rem',
                  minHeight: isCollapsed ? 'auto' : '380px'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  aria-expanded={!isCollapsed}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isCollapsed ? 0 : '0.7rem',
                    padding: '0.15rem 0.25rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  title={isCollapsed ? `Expand ${col.title}` : `Collapse ${col.title}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-muted">{col.items.length}</span>
                    {isCollapsed ? (
                      <ChevronRight size={16} color="var(--text-tertiary)" />
                    ) : (
                      <ChevronDown size={16} color="var(--text-tertiary)" />
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {col.items.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {col.emptyText}
                      </div>
                    ) : (
                      col.items.map(wo => renderCard(wo, col.key))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-Side Checklist & Service Drawer */}
      {activeWO && (
        <div
          className="modal-overlay"
          style={{ justifyContent: 'flex-end', padding: 0 }}
          onClick={handleSaveAndCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(100%, 440px)',
              height: '100%',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '1.15rem 1.25rem',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-main)'
                  }}>
                    {activeWO.vehicleCode}
                  </span>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    {activeWO.id}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {activeWO.type}
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {activeWO.category || 'Maintenance Service'}
                </div>
              </div>

              <button
                type="button"
                className="modal-box-close"
                onClick={handleSaveAndCloseDrawer}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Quick View Car Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={(e) => handleOpenVehicleProfile(e, activeWO.vehicleCode)}
                >
                  <Eye size={14} /> View Car Profile ({activeWO.vehicleCode})
                </button>

                {isMechanic && activeWO.currentStage === FOR_MAINTENANCE_STAGE && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={(e) => handleStartMaintenance(e, activeWO)}
                  >
                    <Play size={13} /> Confirm &amp; Start
                  </button>
                )}
              </div>

              {/* Assigned Technician (Mandatory Department-Box Picker) */}
              {isMechanic ? (
                <div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    ASSIGNED TECHNICIAN
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--text-main)'
                    }}>
                      {getInitials(activeWO.assignedMechanic)}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {shortPerson(activeWO.assignedMechanic)}
                    </strong>
                  </div>
                </div>
              ) : (
                <>
                  <PersonnelPickerField
                    label="Assigned Technician"
                    value={drawerMechanic}
                    drivers={drivers}
                    departments={editables.departments || []}
                    onChange={(name) => setDrawerMechanic(name)}
                  />

                  <DateRangeCalendarField
                    label="Schedule Duration (Start → Due)"
                    startDate={drawerScheduledDate}
                    endDate={drawerTargetCompletion}
                    personLabel={shortPerson(drawerMechanic)}
                    onChange={(newStart, newEnd) => {
                      setDrawerScheduledDate(newStart);
                      setDrawerTargetCompletion(newEnd);
                    }}
                  />
                </>
              )}

              {/* Service Notes */}
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  SERVICE NOTES
                </div>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={isMechanic ? 'Leave a completion note for the operator & Reports (e.g. 15W-40 oil used, good for 5,000 km; tires rotated)...' : 'Add service notes, findings, or clearance remarks...'}
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Mechanic Next Service Interval Update (Only visible when Done) */}
              {isMechanic && activeIsDone && (
                <div
                  style={{
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '0.85rem'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.55rem' }}>
                    NEXT SERVICE INTERVAL (UPDATES VEHICLE HEALTH)
                  </div>
                  <div className="responsive-grid-2" style={{ gap: '0.65rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Next Miles / KM (+km)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="100"
                        step="500"
                        placeholder="e.g. 5000"
                        value={drawerNextKm}
                        onChange={(e) => setDrawerNextKm(e.target.value)}
                        style={{ background: 'var(--bg-surface)' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Next Change Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={drawerNextDate}
                        onChange={(e) => setDrawerNextDate(e.target.value)}
                        style={{ background: 'var(--bg-surface)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Vehicle Checklist */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    VEHICLE CHECKLIST
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className="badge badge-muted">
                      {activeDoneCount} of {activeChecklist.length} Completed
                    </span>
                    {!isMechanic && activeChecklist.length > 0 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${checklistEditMode ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setChecklistEditMode(prev => !prev)}
                        style={{ minHeight: '26px', padding: '0 0.55rem', fontSize: '0.72rem' }}
                      >
                        {checklistEditMode ? <><Check size={12} /> Done</> : <><Edit3 size={12} /> Edit</>}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.65rem' }}>
                  {activeChecklist.map(item => (
                    <div
                      key={item.id}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <button
                        type="button"
                        disabled={!isMechanic || checklistEditMode}
                        onClick={() => isMechanic && !checklistEditMode && handleToggleChecklistItem(activeWO, item.id)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: isMechanic && !checklistEditMode ? 'pointer' : 'default',
                          textAlign: 'left',
                          color: item.done ? 'var(--text-secondary)' : 'var(--text-main)',
                          textDecoration: item.done ? 'line-through' : 'none',
                          fontSize: '0.84rem',
                          fontWeight: 600
                        }}
                      >
                        {item.done ? (
                          <CheckSquare size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ wordBreak: 'break-word' }}>{item.label}</span>
                        {item.addedByMechanic && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', flexShrink: 0, textDecoration: 'none' }}
                          >
                            Extra Work
                          </span>
                        )}
                      </button>

                      {((!isMechanic && checklistEditMode) || (isMechanic && item.addedByMechanic)) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(activeWO, item.id)}
                          title={`Delete "${item.label}"`}
                          aria-label={`Delete ${item.label}`}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Extra Work / Parts Replaced (Available to both Mechanic & Operator) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {isMechanic && (
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                        ADDITIONAL WORK / PARTS REPLACED (NOT ON ORIGINAL LIST)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        {QUICK_EXTRA_REPAIRS.map(quickLabel => (
                          <button
                            key={quickLabel}
                            type="button"
                            onClick={() => addChecklistItemLabel(quickLabel)}
                            style={{
                              padding: '0.22rem 0.55rem',
                              borderRadius: '999px',
                              border: '1px solid var(--border-light)',
                              background: 'var(--bg-surface-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            + {quickLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleAddChecklistTask} style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={isMechanic ? 'Log extra work done (e.g. Replaced 2 rear tires)...' : 'Add another repair/check item...'}
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-sm btn-outline">
                      <Plus size={14} /> Add
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{
              padding: '0.9rem 1.25rem',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {!isMechanic && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: '#DC2626', borderColor: '#FECACA' }}
                    onClick={() => setDeleteConfirmWO(activeWO)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                {activeIsDone && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={(e) => handleArchiveDone(e, activeWO)}
                  >
                    <Archive size={14} /> Send to Reports
                  </button>
                )}
              </div>
              {isMechanic && !activeIsDone ? (
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSaveAndCloseDrawer}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleMechanicCompleteWithReport}
                  >
                    <Check size={14} /> Complete &amp; Send Report
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAndCloseDrawer}
                >
                  Save &amp; Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combined Leave Note, Set Next Interval & Send to Reports Modal */}
      {reportModalWO && (
        <div className="modal-overlay" onClick={() => setReportModalWO(null)}>
          <div className="modal-box" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Archive size={18} />
                <span>Send to Reports &bull; {reportModalWO.vehicleCode}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setReportModalWO(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitReportModal(true);
              }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.82rem'
                }}>
                  <strong style={{ color: 'var(--text-main)' }}>{reportModalWO.type}</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {shortPerson(reportModalWO.assignedMechanic)} &bull; {reportModalWO.plateNo}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Completion Note (Visible to Operator &amp; Reports)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. 15W-40 oil used (good for next 5,000 km), tires replaced..."
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                    autoFocus
                  />
                </div>

                {/* Additional Work / Parts Replaced (Not on Original List) */}
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ADDITIONAL WORK / PARTS REPLACED (OPTIONAL)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {QUICK_EXTRA_REPAIRS.map(quickLabel => {
                      const alreadyAdded = reportExtraItems.some(i => i.toLowerCase() === quickLabel.toLowerCase());
                      return (
                        <button
                          key={quickLabel}
                          type="button"
                          onClick={() => handleAddReportExtra(quickLabel)}
                          disabled={alreadyAdded}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            border: alreadyAdded ? '1px solid #A7F3D0' : '1px solid var(--border-light)',
                            background: alreadyAdded ? '#ECFDF5' : 'var(--bg-surface)',
                            color: alreadyAdded ? '#047857' : 'var(--text-main)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: alreadyAdded ? 'default' : 'pointer'
                          }}
                        >
                          {alreadyAdded ? '✓ ' : '+ '}{quickLabel}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Other part/repair done (e.g. Replaced 2 rear tires)..."
                      value={reportExtraInput}
                      onChange={(e) => setReportExtraInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddReportExtra(reportExtraInput);
                        }
                      }}
                      style={{ flex: 1, background: 'var(--bg-surface)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleAddReportExtra(reportExtraInput)}
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {reportExtraItems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingTop: '0.2rem' }}>
                      {reportExtraItems.map(item => (
                        <span
                          key={item}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            color: 'var(--text-main)'
                          }}
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setReportExtraItems(prev => prev.filter(x => x !== item))}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-tertiary)', display: 'inline-flex' }}
                            aria-label={`Remove ${item}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.8rem'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    NEXT SERVICE INTERVAL (UPDATES VEHICLE HEALTH)
                  </div>
                  <div className="responsive-grid-2" style={{ gap: '0.7rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Next Miles / KM (+km)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="100"
                        step="500"
                        value={reportNextKm}
                        onChange={(e) => setReportNextKm(e.target.value)}
                        style={{ background: 'var(--bg-surface)' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Next Change Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={reportNextDate}
                        onChange={(e) => setReportNextDate(e.target.value)}
                        style={{ background: 'var(--bg-surface)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-box-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReportModalWO(null)}
                >
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleSubmitReportModal(false)}
                  >
                    Save Note Only
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Archive size={14} /> Send to Reports
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmWO && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmWO(null)}>
          <div className="modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Trash2 size={18} color="#DC2626" />
                <span>Delete Work Order &bull; {deleteConfirmWO.vehicleCode}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setDeleteConfirmWO(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body">
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Remove <strong>{deleteConfirmWO.vehicleCode}</strong> ({deleteConfirmWO.type}) from Maintenance?
              </p>
              <div style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                This will delete the work order and return the vehicle to <strong>ACTIVE</strong> status if no other repairs are open.
              </div>
            </div>

            <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteConfirmWO(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626', color: '#FFFFFF' }}
                onClick={() => {
                  const target = deleteConfirmWO;
                  setDeleteConfirmWO(null);
                  if (activeWOId === target.id) setActiveWOId(null);
                  deleteWorkOrder(target.id);
                }}
              >
                <Trash2 size={14} /> Delete Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
