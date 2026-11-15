import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { DEFAULT_EDITABLES, getVehicleImage } from '../data/fleetData';
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
  ChevronRight
} from 'lucide-react';

const COMPLETED = 'Completed / Released';
const FOR_MAINTENANCE_STAGE = 'Queued / Inspection';
const IN_MAINTENANCE_STAGE = 'Active Repair / Servicing';

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
    workOrders = [],
    editables = {},
    setModalType,
    setSelectedVehicle,
    updateWorkOrderStage,
    archiveCompletedWorkOrder,
    deleteWorkOrder,
    globalSearch,
    settings
  } = useFleet();

  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;
  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechShort = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [activeWOId, setActiveWOId] = useState(null);
  const [deleteConfirmWO, setDeleteConfirmWO] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerMechanic, setDrawerMechanic] = useState('');
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

  // Split into 3 workflow columns
  const columns = useMemo(() => {
    const forMaint = [];
    const inMaint = [];
    const done = [];

    boardWorkOrders.forEach(wo => {
      const stage = wo.currentStage || IN_MAINTENANCE_STAGE;
      if (wo.status === COMPLETED || stage === COMPLETED) {
        done.push(wo);
      } else if (stage === FOR_MAINTENANCE_STAGE) {
        forMaint.push(wo);
      } else {
        inMaint.push(wo);
      }
    });

    return { forMaint, inMaint, done };
  }, [boardWorkOrders]);

  const activeWO = useMemo(
    () => workOrders.find(w => w.id === activeWOId) || null,
    [workOrders, activeWOId]
  );

  const openDrawer = (wo) => {
    setActiveWOId(wo.id);
    setDrawerNotes(wo.description || wo.notes || '');
    setDrawerMechanic(wo.assignedMechanic || mechanics[0] || '');
    setNewTaskText('');
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

  const handleAddChecklistTask = (e) => {
    e.preventDefault();
    if (!activeWO || !newTaskText.trim()) return;
    const isDoneCol = activeWO.status === COMPLETED || activeWO.currentStage === COMPLETED;
    const currentItems = getChecklistForWO(activeWO, isDoneCol);
    const updatedItems = [
      ...currentItems,
      {
        id: `CHK-${Date.now()}`,
        label: newTaskText.trim(),
        done: false
      }
    ];

    const nextStage = activeWO.currentStage === FOR_MAINTENANCE_STAGE
      ? FOR_MAINTENANCE_STAGE
      : IN_MAINTENANCE_STAGE;

    updateWorkOrderStage(activeWO.id, nextStage, {
      checklistItems: updatedItems,
      description: drawerNotes,
      assignedMechanic: drawerMechanic || activeWO.assignedMechanic
    });
    setNewTaskText('');
  };

  const handleSaveAndCloseDrawer = () => {
    if (!activeWO) return;
    const currentStage = activeWO.currentStage || IN_MAINTENANCE_STAGE;
    updateWorkOrderStage(activeWO.id, currentStage, {
      description: drawerNotes,
      assignedMechanic: drawerMechanic || activeWO.assignedMechanic
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
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '0.75rem' }}>
          {wo.category || 'Maintenance Service'} &bull; {shortPerson(wo.assignedMechanic)}
        </div>

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
              title="Move to In Maintenance"
            >
              <Play size={11} /> Start Repair
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
              className="btn btn-sm btn-outline"
              style={{ minHeight: '30px', padding: '0.2rem 0.65rem', fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={(e) => handleArchiveDone(e, wo)}
              title="Remove from active board and keep in Maintenance & Repair History"
            >
              <Archive size={12} /> Archive to History
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.15rem',
          alignItems: 'start'
        }}>
          {[
            {
              key: 'forMaint',
              title: 'For Maintenance',
              icon: <Clock size={16} color="#D97706" />,
              items: columns.forMaint,
              emptyText: 'No vehicles queued for maintenance'
            },
            {
              key: 'inMaint',
              title: 'In Maintenance',
              icon: <Wrench size={16} color="var(--text-secondary)" />,
              items: columns.inMaint,
              emptyText: 'No vehicles actively under repair'
            },
            {
              key: 'done',
              title: 'Done',
              icon: <CheckCircle2 size={16} color="#16A34A" />,
              items: columns.done,
              emptyText: 'No completed vehicles awaiting archive'
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
                    marginBottom: isCollapsed ? 0 : '0.85rem',
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
              height: '100vh',
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
                    <Play size={13} /> Move to In Maintenance
                  </button>
                )}
              </div>

              {/* Assigned Technician */}
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  ASSIGNED TECHNICIAN
                </div>
                {isMechanic ? (
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
                ) : (
                  <select
                    className="form-select"
                    value={drawerMechanic}
                    onChange={(e) => setDrawerMechanic(e.target.value)}
                  >
                    {!mechanics.includes(drawerMechanic) && drawerMechanic && (
                      <option value={drawerMechanic}>{drawerMechanic}</option>
                    )}
                    {mechanics.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service Notes */}
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  SERVICE NOTES
                </div>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Add service notes, findings, or clearance remarks..."
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Standard Vehicle Checklist */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    VEHICLE CHECKLIST
                  </span>
                  <span className="badge badge-muted">
                    {activeDoneCount} of {activeChecklist.length} Completed
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.65rem' }}>
                  {activeChecklist.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isMechanic}
                      onClick={() => isMechanic && handleToggleChecklistItem(activeWO, item.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        cursor: isMechanic ? 'pointer' : 'default',
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
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Operator can add extra needed checklist tasks */}
                {!isMechanic && (
                  <form onSubmit={handleAddChecklistTask} style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Add another repair/check item..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-sm btn-outline">
                      <Plus size={14} /> Add
                    </button>
                  </form>
                )}
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
                    <Archive size={14} /> Archive to History
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAndCloseDrawer}
              >
                Save &amp; Close
              </button>
            </div>
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
