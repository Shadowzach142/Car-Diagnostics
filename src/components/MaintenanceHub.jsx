import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, WORK_ORDER_STAGES } from '../data/fleetData';
import { getPmsDetails } from '../utils/formatters';
import {
  Plus,
  Wrench,
  CheckCircle2,
  RotateCcw,
  Check
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
};

const evaluateDiagnostic = (diag, currentOdo = 0) => {
  const mode = diag.trackMode || 'BOTH';
  const targetKm = Number(diag.targetKm) || 0;
  const remainingKm = targetKm > 0 ? targetKm - currentOdo : null;

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

  return { remainingKm, remainingDays, status };
};

export const MaintenanceHub = () => {
  const {
    vehicles = [],
    branches = [],
    workOrders = [],
    setModalType,
    setSelectedVehicle,
    updateWorkOrderStage,
    globalSearch
  } = useFleet();

  // Filter: 'needs' (Needs Maintenance) | 'done' (Done with Maintenance) | 'ALL'
  const [maintStatusFilter, setMaintStatusFilter] = useState('needs');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const q = (globalSearch || '').toLowerCase().trim();

  // 1. Vehicles Needing / Undergoing Maintenance
  const needsMaintenanceItems = useMemo(() => {
    const activeWOs = workOrders.filter(wo => wo.status !== COMPLETED);
    const activeVehCodes = new Set(activeWOs.map(w => w.vehicleCode));
    const items = [];

    activeWOs.forEach(wo => {
      const v = vehicles.find(veh => veh.code === wo.vehicleCode);
      const woBranch = wo.branchId || v?.branchId;
      if (branchFilter !== 'ALL' && woBranch !== branchFilter) return;

      if (q) {
        const match =
          wo.vehicleCode.toLowerCase().includes(q) ||
          (wo.plateNo || '').toLowerCase().includes(q) ||
          (wo.type || '').toLowerCase().includes(q) ||
          (wo.assignedMechanic || '').toLowerCase().includes(q) ||
          (v?.makeModel || '').toLowerCase().includes(q);
        if (!match) return;
      }

      items.push({
        kind: 'WORK_ORDER',
        id: wo.id,
        wo,
        vehicle: v,
        stage: wo.currentStage || 'Active Repair / Servicing'
      });
    });

    vehicles.forEach(v => {
      if (activeVehCodes.has(v.code)) return;
      if (branchFilter !== 'ALL' && v.branchId !== branchFilter) return;

      const pms = getPmsDetails(v);
      const diags = v.diagnostics || [];
      const dueDiag = diags.find(d => {
        const ev = evaluateDiagnostic(d, v.odometerKm);
        return ev.status === 'OVERDUE' || ev.status === 'DUE_SOON';
      });

      const isDue = pms.compliance === 'OVERDUE' || pms.compliance === 'DUE_SOON' || Boolean(dueDiag);
      if (!isDue) return;

      if (q) {
        const match =
          v.code.toLowerCase().includes(q) ||
          v.plateNo.toLowerCase().includes(q) ||
          v.makeModel.toLowerCase().includes(q) ||
          (dueDiag?.type || pms.milestone || '').toLowerCase().includes(q);
        if (!match) return;
      }

      items.push({
        kind: 'DUE_VEHICLE',
        id: `DUE-${v.id}`,
        vehicle: v,
        dueDiag,
        pms,
        stage: 'Due for Service'
      });
    });

    return items;
  }, [workOrders, vehicles, branchFilter, q]);

  // 2. Vehicles Done with Maintenance
  const completedMaintenanceItems = useMemo(() => {
    return workOrders
      .filter(wo => wo.status === COMPLETED)
      .filter(wo => {
        const v = vehicles.find(veh => veh.code === wo.vehicleCode);
        const woBranch = wo.branchId || v?.branchId;
        if (branchFilter !== 'ALL' && woBranch !== branchFilter) return false;
        if (q) {
          return (
            wo.vehicleCode.toLowerCase().includes(q) ||
            (wo.plateNo || '').toLowerCase().includes(q) ||
            (wo.type || '').toLowerCase().includes(q) ||
            (wo.assignedMechanic || '').toLowerCase().includes(q) ||
            (v?.makeModel || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map(wo => ({
        kind: 'COMPLETED_WO',
        id: wo.id,
        wo,
        vehicle: vehicles.find(veh => veh.code === wo.vehicleCode)
      }));
  }, [workOrders, vehicles, branchFilter, q]);

  const visibleItems = useMemo(() => {
    if (maintStatusFilter === 'needs') return needsMaintenanceItems;
    if (maintStatusFilter === 'done') return completedMaintenanceItems;
    return [...needsMaintenanceItems, ...completedMaintenanceItems];
  }, [maintStatusFilter, needsMaintenanceItems, completedMaintenanceItems]);

  return (
    <div className="page">
      {/* Page Toolbar */}
      <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: '0.65rem' }}>
        {/* Segmented Filter: Needs Maintenance vs. Done with Maintenance */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '0.22rem',
            gap: '0.2rem'
          }}
          role="tablist"
          aria-label="Maintenance status filter"
        >
          {[
            { id: 'needs', label: 'Needs Maintenance', count: needsMaintenanceItems.length, icon: Wrench },
            { id: 'done', label: 'Done with Maintenance', count: completedMaintenanceItems.length, icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const active = maintStatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMaintStatusFilter(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.42rem 0.9rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-main)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.42rem',
                    borderRadius: '999px',
                    background: active ? 'var(--text-main)' : 'var(--border-light)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

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

        {branchFilter !== 'ALL' && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setBranchFilter('ALL')}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <span className="spacer" />

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

      {/* Responsive Card Grid */}
      <div className="page-body">
        {visibleItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <Wrench size={34} color="var(--text-tertiary)" style={{ marginBottom: '0.65rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '0.25rem' }}>
              No maintenance records in this view
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              Click <strong>+ Add Car to Maintenance</strong> to schedule servicing.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem'
            }}
          >
            {visibleItems.map(item => {
              // 1. Active Work Order (Undergoing Maintenance Step)
              if (item.kind === 'WORK_ORDER') {
                const { wo, vehicle: v, stage } = item;
                const img = getVehicleImage(v);

                return (
                  <div
                    key={wo.id}
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
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <img
                          src={img}
                          alt={wo.vehicleCode}
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
                              {wo.vehicleCode} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {wo.plateNo || v?.plateNo}</span>
                            </div>
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                              In Service
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v?.makeModel || wo.classification}
                          </div>
                        </div>
                      </div>

                      {/* Step Dropdown */}
                      <div style={{ marginBottom: '0.6rem' }}>
                        <select
                          className="form-select"
                          value={stage}
                          onChange={(e) => updateWorkOrderStage(wo.id, e.target.value)}
                          aria-label="Maintenance step"
                          style={{
                            minHeight: '34px',
                            fontSize: '0.79rem',
                            fontWeight: 600,
                            background: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          {WORK_ORDER_STAGES.map(st => (
                            <option key={st} value={st}>
                              {st === COMPLETED ? '✓ Mark Done' : `Step: ${st}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2-Box Summary */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                        <div style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem'
                        }}>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            TASK
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={wo.type}>
                            {wo.type}
                          </span>
                        </div>

                        <div style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem'
                        }}>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ASSIGNED TO
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={wo.assignedMechanic}>
                            {shortPerson(wo.assignedMechanic)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-light)'
                    }}>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                        {(v?.odometerKm || 0).toLocaleString()} km
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.28rem 0.7rem', fontSize: '0.76rem' }}
                        onClick={() => updateWorkOrderStage(wo.id, COMPLETED)}
                      >
                        <Check size={13} /> Done
                      </button>
                    </div>
                  </div>
                );
              }

              // 2. Completed Work Order (Done with Maintenance)
              if (item.kind === 'COMPLETED_WO') {
                const { wo, vehicle: v } = item;
                const img = getVehicleImage(v);
                const odo = Number(v?.odometerKm) || 0;
                const nextKm = Number(wo.targetKm || v?.nextServiceDueKm) || (odo + 5000);
                const kmLeft = Math.max(0, nextKm - odo);

                return (
                  <div
                    key={wo.id}
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
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <img
                          src={img}
                          alt={wo.vehicleCode}
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
                              {wo.vehicleCode} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {wo.plateNo || v?.plateNo}</span>
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                              Done
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {wo.type}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                        <div style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem'
                        }}>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            SERVICED BY
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {shortPerson(wo.assignedMechanic)}
                          </span>
                        </div>

                        <div style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem'
                        }}>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            NEXT DUE
                          </span>
                          <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                            {kmLeft.toLocaleString()} km left
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-light)'
                    }}>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                        {wo.dateCompleted || wo.targetCompletion || wo.dateReported}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.28rem 0.65rem', fontSize: '0.76rem' }}
                        onClick={() => updateWorkOrderStage(wo.id, 'Active Repair / Servicing')}
                      >
                        Re-open
                      </button>
                    </div>
                  </div>
                );
              }

              // 3. Vehicle Due Soon (Needs Maintenance Scheduling)
              const { vehicle: v, dueDiag, pms } = item;
              const img = getVehicleImage(v);
              const ev = dueDiag ? evaluateDiagnostic(dueDiag, v.odometerKm) : null;

              return (
                <div
                  key={item.id}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                            {v.code} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {v.plateNo}</span>
                          </div>
                          <span className="badge badge-danger" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                            Due Soon
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.makeModel}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          DUE ITEM
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dueDiag ? dueDiag.type : pms.milestone}
                        </span>
                      </div>

                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          REMAINING
                        </span>
                        <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                          {ev && ev.remainingKm !== null
                            ? `${ev.remainingKm.toLocaleString()} km left`
                            : pms.targetDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {shortPerson(dueDiag?.assignedPerson)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ padding: '0.28rem 0.7rem', fontSize: '0.76rem' }}
                      onClick={() => {
                        setSelectedVehicle(v);
                        setModalType('new-wo');
                      }}
                    >
                      <Plus size={13} /> Start Service
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
