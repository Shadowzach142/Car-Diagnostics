import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, WORK_ORDER_STAGES } from '../data/fleetData';
import { parseVehicleAlert } from '../utils/formatters';
import {
  Truck,
  CheckCircle2,
  Wrench,
  ClipboardList,
  Search,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  Users,
  FileText,
  Plus,
  Building2
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

const STATUS_META = {
  ACTIVE: { label: 'Active', color: '#16A34A' },
  'IN-SHOP': { label: 'In-Shop', color: '#D97706' },
  OFFLINE: { label: 'Offline', color: '#DC2626' }
};

const shortPerson = (str) => {
  if (!str) return 'Motorpool Specialist';
  return str.split(' (')[0].trim();
};

const evaluateVehicleDiagnostics = (vehicle) => {
  const diags = Array.isArray(vehicle?.diagnostics) ? vehicle.diagnostics : [];
  const currentOdo = Number(vehicle?.odometerKm) || 0;
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let worstStatus = 'HEALTHY';
  let primaryAlertDiag = null;

  diags.forEach((diag) => {
    const mode = diag.trackMode || 'BOTH';
    const targetKm = Number(diag.targetKm) || 0;
    const remainingKm = targetKm > 0 ? targetKm - currentOdo : null;

    let remainingDays = null;
    if (diag.targetDate) {
      const parts = String(diag.targetDate).split('-').map(Number);
      const targetLocal = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(diag.targetDate);
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

    if (status === 'OVERDUE') {
      if (worstStatus !== 'OVERDUE') {
        worstStatus = 'OVERDUE';
        primaryAlertDiag = { ...diag, remainingKm, remainingDays, status };
      }
    } else if (status === 'DUE_SOON' && worstStatus === 'HEALTHY') {
      worstStatus = 'DUE_SOON';
      primaryAlertDiag = { ...diag, remainingKm, remainingDays, status };
    }
  });

  return { worstStatus, primaryAlertDiag };
};

const Kpi = ({ icon: Icon, tone, label, value, note, onClick }) => (
  <div
    className="card kpi-card"
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    style={onClick ? { cursor: 'pointer', transition: 'border-color 0.15s ease, transform 0.15s ease' } : undefined}
  >
    <div className={`kpi-icon tone-${tone}`}><Icon size={22} /></div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  </div>
);

export const Dashboard = () => {
  const {
    vehicles = [],
    branches = [],
    workOrders = [],
    drivers = [],
    repairArchive = [],
    editables = {},
    setSelectedVehicle,
    setModalType,
    settings,
    updateWorkOrderStage,
    setActiveTab,
    setFocusedHealthVehicleId
  } = useFleet();

  const [leftTab, setLeftTab] = useState('attention'); // 'attention' | 'maintenance'
  const [rightBottomTab, setRightBottomTab] = useState('branches'); // 'branches' | 'org'

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechFull = settings?.currentMechanic || '';
  const mechShort = mechFull.split(' (')[0].trim();
  const mechNorm = mechShort.toLowerCase();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (isMechanic) {
    const myOrders = workOrders.filter(
      wo => (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechNorm
    );
    const myActive = myOrders.filter(wo => wo.status !== COMPLETED);
    const myDone = myOrders.filter(wo => wo.status === COMPLETED);
    const inProgressCount = myActive.filter(wo => {
      const stage = wo.currentStage || 'Active Repair / Servicing';
      return stage === 'Diagnosing' || stage === 'Active Repair / Servicing';
    }).length;
    const queuedOrPartsCount = myActive.length - inProgressCount;

    return (
      <div className="dashboard-single-screen">
        <div className="dash-actions">
          <span className="dash-date">{today}</span>
          <div className="dash-actions-right">
            <span className="stat-chip">{mechShort || 'Assigned Mechanic'}</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('maintenance')}
            >
              <Wrench size={14} /> Open Maintenance
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          <Kpi icon={ClipboardList} tone="lime" label="Assigned to me" value={myActive.length} note="Open maintenance jobs" />
          <Kpi icon={Wrench} tone="warn" label="In progress" value={inProgressCount} note="Diagnosing / active repair" />
          <Kpi icon={Clock} tone="neutral" label="Queued / parts" value={queuedOrPartsCount} note="Inspection, parts, or QC" />
          <Kpi icon={CheckCircle2} tone="ok" label="Completed by me" value={myDone.length} note="Released work orders" />
        </div>

        <div className="dash-grid">
          <section className="card dash-panel span-2" aria-labelledby="mech-queue-title">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="mech-queue-title">My assigned maintenance queue</h2>
                <div className="card-sub">
                  {myActive.length} active {myActive.length === 1 ? 'vehicle' : 'vehicles'} assigned to {mechShort}
                </div>
              </div>
            </div>

            <div className="alert-list">
              {myActive.length === 0 && (
                <div className="empty-state">
                  <CheckCircle2 size={28} color="#16A34A" />
                  <strong>No pending vehicles assigned to you</strong>
                </div>
              )}
              {myActive.map(wo => {
                const v = vehicles.find(veh => veh.code === wo.vehicleCode);
                const branch = branches.find(b => b.id === (wo.branchId || v?.branchId));
                const stage = wo.currentStage || 'Active Repair / Servicing';

                return (
                  <div key={wo.id} className="alert-row" style={{ gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '30px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#E5E7EB',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {v && (
                        <img
                          src={getVehicleImage(v)}
                          alt={wo.vehicleCode}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                      <div className="alert-top">
                        <strong>{wo.vehicleCode}</strong>
                        <span className="muted">· {wo.plateNo || v?.plateNo || '—'}</span>
                        {branch && <span className="badge badge-muted">{branch.name}</span>}
                      </div>
                      <div className="alert-sub">
                        {wo.type}
                        {wo.notes ? ` — ${wo.notes}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-go-maintenance"
                        onClick={() => setActiveTab('maintenance')}
                      >
                        Go to Maintenance
                        <ArrowRight size={14} className="btn-go-arrow" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card dash-panel" aria-labelledby="mech-done-title">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="mech-done-title">Completed by me</h2>
                <div className="card-sub">{myDone.length} released maintenance records</div>
              </div>
            </div>

            <div className="alert-list">
              {myDone.length === 0 && (
                <div className="empty-state">
                  <Wrench size={24} />
                  <strong>No completed jobs yet</strong>
                </div>
              )}
              {myDone.map(wo => (
                <div key={wo.id} className="alert-row" style={{ gap: '10px' }}>
                  <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                    <div className="alert-top">
                      <strong>{wo.vehicleCode}</strong>
                      <span className="badge badge-ok">Completed</span>
                    </div>
                    <div className="alert-sub">
                      {wo.type} · {wo.dateCompleted || wo.dateReported}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => updateWorkOrderStage(wo.id, 'Active Repair / Servicing')}
                  >
                    Re-open
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const total = vehicles.length;
  const count = (s) => vehicles.filter(v => v.status === s).length;
  const active = count('ACTIVE');
  const inShop = count('IN-SHOP');
  const offline = count('OFFLINE');
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const activeWorkOrders = workOrders.filter(w => w.status !== COMPLETED);
  const completedWorkOrders = workOrders.filter(w => w.status === COMPLETED);
  const departments = editables.departments || [];

  // Evaluate Ongoing Health diagnostics across all vehicles
  const vehicleHealthMap = {};
  vehicles.forEach(v => {
    vehicleHealthMap[v.id] = evaluateVehicleDiagnostics(v);
  });

  const overdueHealthCount = vehicles.filter(v => vehicleHealthMap[v.id]?.worstStatus === 'OVERDUE').length;
  const dueSoonHealthCount = vehicles.filter(v => vehicleHealthMap[v.id]?.worstStatus === 'DUE_SOON').length;
  const healthyCount = Math.max(0, total - overdueHealthCount - dueSoonHealthCount);

  // Most urgent first: offline, then in-shop, then overdue diagnostics, then due-soon / active-with-alert
  const rankVehicle = (v) => {
    if (v.status === 'OFFLINE') return 0;
    if (v.status === 'IN-SHOP') return 1;
    const h = vehicleHealthMap[v.id]?.worstStatus;
    if (h === 'OVERDUE') return 2;
    if (h === 'DUE_SOON' || v.urgentAlert) return 3;
    return 4;
  };

  const flagged = vehicles
    .filter(v => {
      const h = vehicleHealthMap[v.id]?.worstStatus;
      return v.status !== 'ACTIVE' || v.urgentAlert || h === 'OVERDUE' || h === 'DUE_SOON';
    })
    .sort((a, b) => rankVehicle(a) - rankVehicle(b));

  // Availability donut
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = ['ACTIVE', 'IN-SHOP', 'OFFLINE'].map(s => {
    const n = count(s);
    const len = total ? (n / total) * C : 0;
    const seg = { s, n, len, offset };
    offset += len;
    return seg;
  });

  // Branch distribution
  const branchRows = branches
    .map(b => {
      const list = vehicles.filter(v => v.branchId === b.id);
      const empCount = drivers.filter(d => d.branchId === b.id).length;
      return {
        id: b.id,
        name: b.municipality,
        total: list.length,
        empCount,
        active: list.filter(v => v.status === 'ACTIVE').length,
        inShop: list.filter(v => v.status === 'IN-SHOP').length,
        offline: list.filter(v => v.status === 'OFFLINE').length
      };
    })
    .sort((a, b) => b.total - a.total);
  const maxBranch = Math.max(1, ...branchRows.map(b => b.total));

  // Department workforce breakdown
  const departmentRows = departments
    .map(dept => ({
      name: dept,
      count: drivers.filter(d => (d.department || 'Technical / Engineering') === dept).length
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="dashboard-single-screen">
      <div className="dash-actions">
        <span className="dash-date">{today}</span>
        <div className="dash-actions-right" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setActiveTab('health')}
          >
            <Activity size={14} /> Ongoing Health
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setModalType('add-ledger')}
          >
            <FileText size={14} /> + Log Report
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setModalType('add-vehicle')}
          >
            <Plus size={14} /> Add Vehicle
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          icon={Truck}
          tone="ok"
          label="Fleet readiness"
          value={`${active} / ${total}`}
          note={`${pct(active)}% ready · ${branches.length} stations`}
          onClick={() => setActiveTab('profiling')}
        />
        <Kpi
          icon={Activity}
          tone={overdueHealthCount > 0 ? 'bad' : dueSoonHealthCount > 0 ? 'warn' : 'ok'}
          label="Ongoing health alerts"
          value={overdueHealthCount + dueSoonHealthCount}
          note={`${overdueHealthCount} overdue · ${dueSoonHealthCount} due soon`}
          onClick={() => setActiveTab('health')}
        />
        <Kpi
          icon={Wrench}
          tone="warn"
          label="Maintenance pipeline"
          value={activeWorkOrders.length}
          note={`${inShop} in-shop · ${completedWorkOrders.length} completed`}
          onClick={() => setActiveTab('maintenance')}
        />
        <Kpi
          icon={Users}
          tone="lime"
          label="Workforce & reports"
          value={drivers.length}
          note={`${departments.length} depts · ${repairArchive.length} service reports`}
          onClick={() => setActiveTab('drivers')}
        />
      </div>

      <div className="dash-grid">
        <section className="card dash-panel span-2" aria-labelledby="alerts-title">
          <div className="card-head" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <h2 className="card-title" id="alerts-title">
                {leftTab === 'attention' ? 'Needs attention & ongoing health' : 'Active maintenance pipeline'}
              </h2>
              <div className="card-sub">
                {leftTab === 'attention'
                  ? `${flagged.length} vehicles with health countdown alerts or shop status`
                  : `${activeWorkOrders.length} active maintenance orders across specialists`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <div className="segmented" style={{ width: 'auto' }}>
                <button
                  type="button"
                  className={leftTab === 'attention' ? 'active' : ''}
                  onClick={() => setLeftTab('attention')}
                  style={{ minHeight: '30px', padding: '0 0.65rem', fontSize: '0.76rem' }}
                >
                  Alerts &amp; Health ({flagged.length})
                </button>
                <button
                  type="button"
                  className={leftTab === 'maintenance' ? 'active' : ''}
                  onClick={() => setLeftTab('maintenance')}
                  style={{ minHeight: '30px', padding: '0 0.65rem', fontSize: '0.76rem' }}
                >
                  In Maintenance ({activeWorkOrders.length})
                </button>
              </div>
            </div>
          </div>

          {leftTab === 'attention' ? (
            <div className="alert-list">
              {flagged.length === 0 && (
                <div className="empty-state">
                  <CheckCircle2 size={28} color="#16A34A" />
                  <strong>All vehicles &amp; health intervals are clear</strong>
                </div>
              )}
              {flagged.map(v => {
                const parsed = parseVehicleAlert(v);
                const branch = branches.find(b => b.id === v.branchId);
                const healthInfo = vehicleHealthMap[v.id];
                const diag = healthInfo?.primaryAlertDiag;
                const activeWo = activeWorkOrders.find(w => w.vehicleCode === v.code);

                let headline = parsed.issueText;
                let subline = `${branch?.municipality || 'Assigned Branch'} · ${(v.odometerKm || 0).toLocaleString()} km`;
                let badgeText = parsed.badgeText;
                let badgeClass = parsed.badgeType;

                if (activeWo) {
                  headline = `${activeWo.type} (${activeWo.currentStage || 'In Progress'})`;
                  subline = `${shortPerson(activeWo.assignedMechanic)} · ${branch?.municipality || 'Station'}`;
                  badgeText = activeWo.currentStage || 'In-Shop';
                  badgeClass = 'badge-warning';
                } else if (diag) {
                  const kmPart = diag.remainingKm !== null
                    ? (diag.remainingKm <= 0
                        ? `Overdue by ${Math.abs(diag.remainingKm).toLocaleString()} km`
                        : `${diag.remainingKm.toLocaleString()} km left`)
                    : null;
                  const dayPart = diag.remainingDays !== null
                    ? (diag.remainingDays < 0
                        ? `${Math.abs(diag.remainingDays)}d overdue`
                        : `${diag.remainingDays}d left`)
                    : null;
                  headline = `${diag.label} — ${[kmPart, dayPart].filter(Boolean).join(' · ') || 'Check interval'}`;
                  subline = `${shortPerson(diag.assignedMechanic)} · ${(v.odometerKm || 0).toLocaleString()} km`;
                  if (diag.status === 'OVERDUE' && v.status === 'ACTIVE') {
                    badgeText = 'Health Overdue';
                    badgeClass = 'badge-danger';
                  } else if (diag.status === 'DUE_SOON' && v.status === 'ACTIVE') {
                    badgeText = 'Due Soon';
                    badgeClass = 'badge-warning';
                  }
                }

                return (
                  <div key={v.id} className="alert-row">
                    <div style={{
                      width: '42px',
                      height: '30px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#E5E7EB',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <img
                        src={getVehicleImage(v)}
                        alt={v.code}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <span className={`alert-marker ${v.status.toLowerCase().replace('-', '')}`} />

                    <div className="vehicle-cell" style={{ minWidth: 0, flex: '1 1 135px' }}>
                      <div className="vehicle-cell-title">
                        {v.code} · <span className="mono" style={{ color: 'var(--text-muted)' }}>{v.plateNo}</span>
                      </div>
                      <div className="vehicle-cell-sub">{v.makeModel}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {headline}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {subline}
                      </div>
                    </div>

                    <span className={`badge ${badgeClass}`} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      {badgeText}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      {activeWo ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary btn-go-maintenance"
                          onClick={() => setActiveTab('maintenance')}
                          title="Open in Maintenance pipeline"
                        >
                          Maintenance
                          <ArrowRight size={13} className="btn-go-arrow" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            if (setFocusedHealthVehicleId) setFocusedHealthVehicleId(v.id);
                            setActiveTab('health');
                          }}
                          title={`Open Ongoing Health for ${v.code}`}
                        >
                          <Activity size={13} /> Health
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setSelectedVehicle(v);
                          setModalType('vehicle-detail');
                        }}
                        title={`Inspect profile for ${v.code}`}
                      >
                        <Search size={13} /> Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="alert-list">
              {activeWorkOrders.length === 0 && (
                <div className="empty-state">
                  <CheckCircle2 size={28} color="#16A34A" />
                  <strong>No active maintenance jobs</strong>
                </div>
              )}
              {activeWorkOrders.map(wo => {
                const v = vehicles.find(veh => veh.code === wo.vehicleCode);
                const stage = wo.currentStage || 'Queued / Inspection';

                return (
                  <div key={wo.id} className="alert-row" style={{ gap: '0.75rem' }}>
                    <div style={{
                      width: '42px',
                      height: '30px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#E5E7EB',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {v && (
                        <img
                          src={getVehicleImage(v)}
                          alt={wo.vehicleCode}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div className="vehicle-cell" style={{ minWidth: 0, flex: '1 1 130px' }}>
                      <div className="vehicle-cell-title">
                        {wo.vehicleCode} · <span className="mono" style={{ color: 'var(--text-muted)' }}>{wo.plateNo || v?.plateNo}</span>
                      </div>
                      <div className="vehicle-cell-sub">{shortPerson(wo.assignedMechanic)}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {wo.type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Reported {wo.dateReported}
                      </div>
                    </div>

                    <select
                      className="form-select"
                      value={stage}
                      onChange={(e) => updateWorkOrderStage(wo.id, e.target.value)}
                      aria-label={`Maintenance stage for ${wo.vehicleCode}`}
                      style={{ width: 'auto', minHeight: '32px', height: '32px', fontSize: '0.76rem', padding: '0 0.55rem' }}
                    >
                      {WORK_ORDER_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary btn-go-maintenance"
                      onClick={() => setActiveTab('maintenance')}
                    >
                      Open
                      <ArrowRight size={13} className="btn-go-arrow" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card dash-panel" aria-labelledby="avail-title">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title" id="avail-title">Availability &amp; health</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ minHeight: '28px', padding: '0 0.55rem', fontSize: '0.74rem' }}
              onClick={() => setActiveTab('health')}
            >
              Health tracker
            </button>
          </div>
          <div className="availability-body">
            <div className="donut-wrap">
              <svg viewBox="0 0 140 140" role="img" aria-label={`${active} active, ${inShop} in-shop, ${offline} offline`}>
                <circle cx="70" cy="70" r={R} fill="none" stroke="#EEF1F5" strokeWidth="18" />
                {segments.map(seg => seg.n > 0 && (
                  <circle
                    key={seg.s}
                    cx="70" cy="70" r={R}
                    fill="none"
                    stroke={STATUS_META[seg.s].color}
                    strokeWidth="18"
                    strokeDasharray={`${seg.len} ${C - seg.len}`}
                    strokeDashoffset={-seg.offset}
                  />
                ))}
              </svg>
              <div className="donut-center">
                <strong>{pct(active)}%</strong>
                <span>available</span>
              </div>
            </div>
            <div className="legend-list" style={{ flex: 1, minWidth: 0 }}>
              {segments.map(seg => (
                <div key={seg.s} className="legend-row">
                  <span className="legend-swatch" style={{ background: STATUS_META[seg.s].color }} />
                  {STATUS_META[seg.s].label}
                  <span className="legend-count">{seg.n} <span className="legend-pct">({pct(seg.n)}%)</span></span>
                </div>
              ))}
              <div style={{
                marginTop: '0.35rem',
                paddingTop: '0.55rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.4rem',
                fontSize: '0.76rem',
                fontWeight: 700
              }}>
                <span style={{ color: '#16A34A' }}>{healthyCount} Healthy</span>
                <span style={{ color: '#D97706' }}>{dueSoonHealthCount} Due soon</span>
                <span style={{ color: '#DC2626' }}>{overdueHealthCount} Overdue</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card dash-panel" aria-labelledby="branch-title">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 className="card-title" id="branch-title">
              {rightBottomTab === 'branches' ? 'Stations & fleet' : 'Departments & reports'}
            </h2>
            <div className="segmented" style={{ width: 'auto' }}>
              <button
                type="button"
                className={rightBottomTab === 'branches' ? 'active' : ''}
                onClick={() => setRightBottomTab('branches')}
                style={{ minHeight: '28px', padding: '0 0.55rem', fontSize: '0.73rem' }}
              >
                Stations
              </button>
              <button
                type="button"
                className={rightBottomTab === 'org' ? 'active' : ''}
                onClick={() => setRightBottomTab('org')}
                style={{ minHeight: '28px', padding: '0 0.55rem', fontSize: '0.73rem' }}
              >
                Depts &amp; Reports
              </button>
            </div>
          </div>

          {rightBottomTab === 'branches' ? (
            <div className="branch-list">
              {branchRows.map(b => (
                <div key={b.id} className="branch-row">
                  <span className="branch-name">
                    {b.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>· {b.empCount} staff</span>
                  </span>
                  <span className="branch-count">{b.total}</span>
                  <div className="branch-bar" title={`${b.active} active · ${b.inShop} in-shop · ${b.offline} offline`}>
                    <span style={{ width: `${(b.active / maxBranch) * 100}%`, background: STATUS_META.ACTIVE.color }} />
                    <span style={{ width: `${(b.inShop / maxBranch) * 100}%`, background: STATUS_META['IN-SHOP'].color }} />
                    <span style={{ width: `${(b.offline / maxBranch) * 100}%`, background: STATUS_META.OFFLINE.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="branch-list" style={{ gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Departments ({departments.length})</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('drivers')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                >
                  Open Employees &rarr;
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: '0.4rem' }}>
                {departmentRows.slice(0, 6).map(d => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setActiveTab('drivers')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-light)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.name}
                    </span>
                    <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {d.count}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.35rem' }}>
                <span>Latest Reports ({repairArchive.length})</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('auditing')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                >
                  All Reports &rarr;
                </button>
              </div>

              {repairArchive.slice(0, 2).map(rep => (
                <div
                  key={rep.voucherNo || rep.receiptId}
                  onClick={() => setActiveTab('auditing')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rep.vehicleCode} &bull; {rep.serviceType}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {shortPerson(rep.mechanic)} &bull; {rep.date}
                    </div>
                  </div>
                  <ArrowRight size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
