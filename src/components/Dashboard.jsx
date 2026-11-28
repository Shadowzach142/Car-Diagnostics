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
  ShieldCheck,
  CalendarDays,
  Plus,
  Play
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

const getValidityState = (expiryStr) => {
  if (!expiryStr) return 'valid';
  const exp = new Date(expiryStr);
  if (isNaN(exp)) return 'valid';
  const diffDays = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'expiring';
  return 'valid';
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

const Kpi = ({ icon: Icon, tone, label, value, note, onClick, alertRed }) => (
  <div
    className="card kpi-card"
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    style={{
      ...(onClick ? { cursor: 'pointer', transition: 'border-color 0.15s ease, transform 0.15s ease' } : {}),
      ...(alertRed
        ? {
            background: '#DC2626',
            borderColor: '#B91C1C',
            color: '#FFFFFF'
          }
        : {})
    }}
  >
    <div
      className={`kpi-icon ${alertRed ? '' : `tone-${tone}`}`}
      style={alertRed ? { background: 'rgba(255, 255, 255, 0.18)', color: '#FFFFFF' } : undefined}
    >
      <Icon size={22} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div className="kpi-label" style={alertRed ? { color: 'rgba(255, 255, 255, 0.9)' } : undefined}>
        {label}
      </div>
      <div className="kpi-value" style={alertRed ? { color: '#FFFFFF' } : undefined}>
        {value}
      </div>
      <div className="kpi-note" style={alertRed ? { color: 'rgba(255, 255, 255, 0.88)' } : undefined}>
        {note}
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const {
    vehicles = [],
    branches = [],
    workOrders = [],
    drivers = [],
    bookings = [],
    repairArchive = [],
    editables = {},
    setSelectedVehicle,
    setSelectedDriver,
    setSelectedBooking,
    setModalType,
    settings,
    updateWorkOrderStage,
    setActiveTab,
    setFocusedHealthVehicleId,
    setFocusedProfileVehicleId,
    setFocusedMaintenanceIds,
    setFocusedTabPulse
  } = useFleet();

  const [leftTab, setLeftTab] = useState('attention'); // Operator: 'attention' | 'maintenance' | 'expiry'

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
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const myOrders = workOrders.filter(
      wo => (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechNorm
    );
    const myBoardOrders = myOrders.filter(wo => !wo.archivedFromBoard);
    const forMaintOrders = myBoardOrders.filter(
      wo => wo.status !== COMPLETED && (wo.currentStage || 'Active Repair / Servicing') === 'Queued / Inspection'
    );
    const underMaintOrders = myBoardOrders.filter(
      wo => wo.status !== COMPLETED && (wo.currentStage || 'Active Repair / Servicing') !== 'Queued / Inspection'
    );
    const myDoneOrders = myBoardOrders.filter(wo => wo.status === COMPLETED || wo.currentStage === COMPLETED);

    const myUpcomingBookings = (bookings || [])
      .filter(b => {
        if (b.status === 'Completed') return false;
        const endStr = b.deadline || b.date || '';
        if (endStr < todayStr) return false;
        const createdByMe = b.createdByRole === 'MECHANIC' && (b.createdBy || '').split(' (')[0].trim().toLowerCase() === mechNorm;
        const assignedToMe = (b.driver || '').split(' (')[0].trim().toLowerCase() === mechNorm;
        return createdByMe || (b.type === 'MAINTENANCE' && assignedToMe);
      })
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

    const myReportsThisMonth = (repairArchive || []).filter(
      r => (r.mechanic || '').split(' (')[0].trim().toLowerCase() === mechNorm && String(r.date || '').slice(0, 7) === currentMonthKey
    );

    const myDriverRecord = drivers.find(d => (d.name || '').trim().toLowerCase() === mechNorm);
    const myLicenseState = getValidityState(myDriverRecord?.licenseExpiry);
    const hasMyLicenseAlert = myLicenseState === 'expired' || myLicenseState === 'expiring';

    // Active maintenance queue (For Maintenance + Under Maintenance together, visible at once)
    const myActiveQueue = [...forMaintOrders, ...underMaintOrders];

    // Ongoing health summary across vehicles (prioritize overdue/due-soon diagnostics)
    const healthOverviewVehicles = vehicles
      .map(v => ({ vehicle: v, health: evaluateVehicleDiagnostics(v) }))
      .sort((a, b) => {
        const rank = (s) => (s === 'OVERDUE' ? 0 : s === 'DUE_SOON' ? 1 : 2);
        return rank(a.health.worstStatus) - rank(b.health.worstStatus);
      });

    return (
      <div className="dashboard-single-screen">
        <div className="dash-actions">
          <span className="dash-date">{today}</span>
          <div className="dash-actions-right" style={{ flexWrap: 'wrap' }}>
            <span className="stat-chip">{mechShort || 'Assigned Mechanic'}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm btn-dash-action"
              onClick={() => {
                if (setSelectedBooking) {
                  setSelectedBooking({ date: todayStr, mode: 'schedule' });
                }
                setModalType('new-booking');
              }}
            >
              <Plus size={14} /> Add Schedule
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm btn-dash-action"
              onClick={() => setActiveTab('bookings')}
            >
              <CalendarDays size={14} /> Calendar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm btn-dash-action"
              onClick={() => setActiveTab('auditing')}
            >
              <FileText size={14} /> Reports
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('maintenance')}
            >
              <Wrench size={14} /> Maintenance
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          <Kpi
            icon={Clock}
            tone="warn"
            label="For Maintenance"
            value={forMaintOrders.length}
            note="Waiting for your confirmation"
            onClick={() => {
              if (forMaintOrders.length > 0 && setFocusedMaintenanceIds) {
                setFocusedMaintenanceIds(forMaintOrders.map(w => w.id));
              }
              setActiveTab('maintenance');
            }}
          />
          <Kpi
            icon={Wrench}
            tone="lime"
            label="Under Maintenance"
            value={underMaintOrders.length}
            note="Active repairs in progress"
            onClick={() => {
              if (underMaintOrders.length > 0 && setFocusedMaintenanceIds) {
                setFocusedMaintenanceIds(underMaintOrders.map(w => w.id));
              }
              setActiveTab('maintenance');
            }}
          />
          <Kpi
            icon={CalendarDays}
            tone="neutral"
            label="Upcoming Schedules"
            value={myUpcomingBookings.length}
            note="Scheduled on your calendar"
            onClick={() => setActiveTab('bookings')}
          />
          <Kpi
            icon={hasMyLicenseAlert ? AlertTriangle : CheckCircle2}
            tone="ok"
            alertRed={hasMyLicenseAlert}
            label={hasMyLicenseAlert ? 'My License Expiry' : 'Done & Reports'}
            value={hasMyLicenseAlert ? (myLicenseState === 'expired' ? 'EXPIRED' : 'DUE SOON') : myDoneOrders.length}
            note={
              hasMyLicenseAlert
                ? `License expires ${myDriverRecord?.licenseExpiry} · Update in My Profile`
                : `${myReportsThisMonth.length} reports filed this month`
            }
            onClick={() => setActiveTab(hasMyLicenseAlert ? 'profile' : 'auditing')}
          />
        </div>

        {/* Generalized 2x2 At-a-Glance Overview (Everything visible immediately, no tab clicks needed) */}
        <div className="dash-grid">
          {/* Panel 1: Active Maintenance Queue (For Maintenance + Under Maintenance) */}
          <section className="card dash-panel span-2" aria-labelledby="mech-queue-title">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2 className="card-title" id="mech-queue-title">Maintenance Queue</h2>
                <div className="card-sub">
                  {forMaintOrders.length} for maintenance &bull; {underMaintOrders.length} under maintenance
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setActiveTab('maintenance')}
              >
                Open Board
              </button>
            </div>

            <div className="alert-list">
              {myActiveQueue.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={26} color="#16A34A" />
                  <strong>No pending or active maintenance jobs</strong>
                </div>
              ) : (
                myActiveQueue.map(wo => {
                  const v = vehicles.find(veh => veh.code === wo.vehicleCode);
                  const isForMaint = (wo.currentStage || 'Active Repair / Servicing') === 'Queued / Inspection';
                  const items = Array.isArray(wo.checklistItems) ? wo.checklistItems : [];
                  const doneCnt = items.filter(i => i.done).length;
                  const schedLabel = wo.scheduledDate
                    ? (wo.targetCompletion && wo.targetCompletion > wo.scheduledDate
                        ? `${wo.scheduledDate} → ${wo.targetCompletion}`
                        : wo.scheduledDate)
                    : null;

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
                          <span className={`badge ${isForMaint ? 'badge-warning' : 'badge-muted'}`}>
                            {isForMaint ? 'For Maintenance' : 'Under Maintenance'}
                          </span>
                          {!isForMaint && items.length > 0 && (
                            <span className="badge badge-muted mono">{doneCnt}/{items.length}</span>
                          )}
                        </div>
                        <div className="alert-sub">
                          {wo.type}{schedLabel ? ` · ${schedLabel}` : ''}
                        </div>
                      </div>

                      {isForMaint ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => updateWorkOrderStage(wo.id, 'Active Repair / Servicing')}
                        >
                          <Play size={12} /> Confirm &amp; Start
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            if (setFocusedMaintenanceIds) setFocusedMaintenanceIds([wo.id]);
                            setActiveTab('maintenance');
                          }}
                        >
                          Checklist
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Panel 2: Upcoming Calendar Schedules */}
          <section className="card dash-panel span-2" aria-labelledby="mech-sched-title">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2 className="card-title" id="mech-sched-title">Upcoming Schedules</h2>
                <div className="card-sub">
                  {myUpcomingBookings.length} scheduled {myUpcomingBookings.length === 1 ? 'entry' : 'entries'} on calendar
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setActiveTab('bookings')}
              >
                Open Calendar
              </button>
            </div>

            <div className="alert-list">
              {myUpcomingBookings.length === 0 ? (
                <div className="empty-state">
                  <CalendarDays size={24} color="var(--text-tertiary)" />
                  <strong>No upcoming schedules</strong>
                </div>
              ) : (
                myUpcomingBookings.slice(0, 5).map(b => {
                  const endStr = b.deadline && b.deadline > b.date ? b.deadline : null;
                  return (
                    <div key={b.id} className="alert-row" style={{ gap: '10px' }}>
                      <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                        <div className="alert-top">
                          <strong>{b.vehicleCode}</strong>
                          <span className="badge badge-muted mono">
                            {endStr ? `${b.date} → ${endStr}` : b.date}
                          </span>
                        </div>
                        <div className="alert-sub">
                          {b.title} · {b.startTime || '08:00'}–{b.endTime || '11:00'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Panel 3: Ongoing Health Overview */}
          <section className="card dash-panel span-2" aria-labelledby="mech-health-title">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2 className="card-title" id="mech-health-title">Ongoing Vehicle Health</h2>
                <div className="card-sub">Oil, brakes, tires &amp; safety diagnostic countdowns</div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setActiveTab('health')}
              >
                View Health
              </button>
            </div>

            <div className="alert-list">
              {healthOverviewVehicles.slice(0, 5).map(({ vehicle: v, health }) => {
                const diag = health.primaryAlertDiag || (v.diagnostics || [])[0];
                const statusBadge =
                  health.worstStatus === 'OVERDUE'
                    ? { label: 'Overdue', cls: 'badge-danger' }
                    : health.worstStatus === 'DUE_SOON'
                    ? { label: 'Due Soon', cls: 'badge-warning' }
                    : { label: 'Healthy', cls: 'badge-ok' };
                return (
                  <div key={v.id} className="alert-row" style={{ gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '28px',
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
                    <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                      <div className="alert-top">
                        <strong>{v.code}</strong>
                        <span className="muted">· {(v.odometerKm || 0).toLocaleString()} km</span>
                      </div>
                      <div className="alert-sub">
                        {diag ? `${diag.type}${diag.targetDate ? ` · Due ${diag.targetDate}` : ''}` : v.makeModel}
                      </div>
                    </div>
                    <span className={`badge ${statusBadge.cls}`} style={{ flexShrink: 0 }}>
                      {statusBadge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Panel 4: Done & Recent Reports (This Month) */}
          <section className="card dash-panel span-2" aria-labelledby="mech-done-title">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2 className="card-title" id="mech-done-title">Done &amp; Recent Reports</h2>
                <div className="card-sub">
                  {myDoneOrders.length} awaiting report &bull; {myReportsThisMonth.length} filed this month
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setActiveTab('auditing')}
              >
                Reports
              </button>
            </div>

            <div className="alert-list">
              {myDoneOrders.length === 0 && myReportsThisMonth.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={24} color="#16A34A" />
                  <strong>No completed jobs or reports this month</strong>
                </div>
              ) : (
                <>
                  {myDoneOrders.map(wo => (
                    <div key={wo.id} className="alert-row" style={{ gap: '10px' }}>
                      <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                        <div className="alert-top">
                          <strong>{wo.vehicleCode}</strong>
                          <span className="badge badge-ok">Done</span>
                        </div>
                        <div className="alert-sub">
                          {wo.type} · {wo.dateCompleted || wo.dateReported}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          if (setFocusedMaintenanceIds) setFocusedMaintenanceIds([wo.id]);
                          setActiveTab('maintenance');
                        }}
                      >
                        Send Report
                      </button>
                    </div>
                  ))}
                  {myReportsThisMonth.slice(0, 3).map((r, idx) => (
                    <div key={r.voucherNo || idx} className="alert-row" style={{ gap: '10px' }}>
                      <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                        <div className="alert-top">
                          <strong>{r.vehicleCode}</strong>
                          <span className="badge badge-muted mono">{r.voucherNo}</span>
                        </div>
                        <div className="alert-sub">
                          {r.serviceType} · {r.date}
                        </div>
                      </div>
                      <span className="badge badge-ok" style={{ flexShrink: 0 }}>Filed</span>
                    </div>
                  ))}
                </>
              )}
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
  const alertHealthVehicleIds = [
    ...vehicles.filter(v => vehicleHealthMap[v.id]?.worstStatus === 'OVERDUE').map(v => v.id),
    ...vehicles.filter(v => vehicleHealthMap[v.id]?.worstStatus === 'DUE_SOON').map(v => v.id)
  ];
  const activeWorkOrderIds = activeWorkOrders.map(w => w.id);

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

  // Document & Driver's License expiry / renewal status (Insurance, LTO Registration & Employee Driver's Licenses)
  let expiredDocsCount = 0;
  let expiringSoonDocsCount = 0;
  let expiredLicensesCount = 0;
  let expiringSoonLicensesCount = 0;
  const expiredVehicleIds = [];
  const expiringVehicleIds = [];
  const expiryAlertItems = [];

  vehicles.forEach(v => {
    const ins = getValidityState(v.insuranceExpiryDate);
    const reg = getValidityState(v.registrationExpiryDate);
    if (ins === 'expired') {
      expiredDocsCount += 1;
      expiryAlertItems.push({
        id: `EXP-VEH-INS-${v.id}`,
        kind: 'VEHICLE_DOC',
        tone: 'expired',
        badgeText: 'Insurance Expired',
        title: `${v.code} · ${v.plateNo}`,
        sub: v.makeModel,
        detail: `GSIS Fleet Insurance expired on ${v.insuranceExpiryDate}`,
        vehicle: v
      });
    } else if (ins === 'expiring') {
      expiringSoonDocsCount += 1;
      expiryAlertItems.push({
        id: `EXP-VEH-INS-${v.id}`,
        kind: 'VEHICLE_DOC',
        tone: 'expiring',
        badgeText: 'Insurance Due Soon',
        title: `${v.code} · ${v.plateNo}`,
        sub: v.makeModel,
        detail: `GSIS Fleet Insurance expires on ${v.insuranceExpiryDate}`,
        vehicle: v
      });
    }

    if (reg === 'expired') {
      expiredDocsCount += 1;
      expiryAlertItems.push({
        id: `EXP-VEH-REG-${v.id}`,
        kind: 'VEHICLE_DOC',
        tone: 'expired',
        badgeText: 'LTO Expired',
        title: `${v.code} · ${v.plateNo}`,
        sub: v.makeModel,
        detail: `LTO Registration (OR/CR) expired on ${v.registrationExpiryDate}`,
        vehicle: v
      });
    } else if (reg === 'expiring') {
      expiringSoonDocsCount += 1;
      expiryAlertItems.push({
        id: `EXP-VEH-REG-${v.id}`,
        kind: 'VEHICLE_DOC',
        tone: 'expiring',
        badgeText: 'LTO Due Soon',
        title: `${v.code} · ${v.plateNo}`,
        sub: v.makeModel,
        detail: `LTO Registration (OR/CR) expires on ${v.registrationExpiryDate}`,
        vehicle: v
      });
    }

    if (ins === 'expired' || reg === 'expired') {
      expiredVehicleIds.push(v.id);
    } else if (ins === 'expiring' || reg === 'expiring') {
      expiringVehicleIds.push(v.id);
    }
  });

  drivers.forEach(d => {
    const lic = getValidityState(d.licenseExpiry);
    if (lic === 'expired') {
      expiredLicensesCount += 1;
      expiryAlertItems.push({
        id: `EXP-DRV-LIC-${d.id}`,
        kind: 'DRIVER_LICENSE',
        tone: 'expired',
        badgeText: 'License Expired',
        title: d.name,
        sub: `${d.employeeId} · ${d.department || 'Technical / Engineering'}`,
        detail: `Driver's License (${d.licenseNo || 'LTO'}) expired on ${d.licenseExpiry}`,
        driver: d
      });
    } else if (lic === 'expiring') {
      expiringSoonLicensesCount += 1;
      expiryAlertItems.push({
        id: `EXP-DRV-LIC-${d.id}`,
        kind: 'DRIVER_LICENSE',
        tone: 'expiring',
        badgeText: 'License Due Soon',
        title: d.name,
        sub: `${d.employeeId} · ${d.department || 'Technical / Engineering'}`,
        detail: `Driver's License (${d.licenseNo || 'LTO'}) expires on ${d.licenseExpiry}`,
        driver: d
      });
    }
  });

  expiryAlertItems.sort((a, b) => (a.tone === 'expired' ? 0 : 1) - (b.tone === 'expired' ? 0 : 1));

  const unresolvedDocsCount = expiredDocsCount + expiringSoonDocsCount;
  const unresolvedLicensesCount = expiredLicensesCount + expiringSoonLicensesCount;
  const totalExpiredCount = expiredDocsCount + expiredLicensesCount;
  const totalExpiringCount = expiringSoonDocsCount + expiringSoonLicensesCount;
  const totalUnresolvedExpiryCount = unresolvedDocsCount + unresolvedLicensesCount;
  const unresolvedDocVehicleIds = [...expiredVehicleIds, ...expiringVehicleIds];

  return (
    <div className="dashboard-single-screen">
      <div className="dash-actions">
        <span className="dash-date">{today}</span>
        <div className="dash-actions-right" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-dash-action"
            onClick={() => {
              if (alertHealthVehicleIds.length > 0 && setFocusedHealthVehicleId) {
                setFocusedHealthVehicleId(alertHealthVehicleIds);
              }
              setActiveTab('health');
            }}
          >
            <Activity size={14} /> Ongoing Health
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-dash-action"
            onClick={() => setActiveTab('auditing')}
          >
            <FileText size={14} /> Reports
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-dash-action"
            onClick={() => {
              if (unresolvedDocVehicleIds.length > 0 && setFocusedProfileVehicleId) {
                setFocusedProfileVehicleId(unresolvedDocVehicleIds);
              }
              setActiveTab('profiling');
            }}
          >
            <Truck size={14} /> Car Profiling
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          icon={Activity}
          tone={overdueHealthCount > 0 ? 'bad' : dueSoonHealthCount > 0 ? 'warn' : 'ok'}
          label="Ongoing health alerts"
          value={overdueHealthCount + dueSoonHealthCount}
          note={`${overdueHealthCount} overdue · ${dueSoonHealthCount} due soon`}
          onClick={() => {
            if (alertHealthVehicleIds.length > 0 && setFocusedHealthVehicleId) {
              setFocusedHealthVehicleId(alertHealthVehicleIds);
            }
            setActiveTab('health');
          }}
        />
        <Kpi
          icon={Wrench}
          tone="warn"
          label="Maintenance pipeline"
          value={activeWorkOrders.length}
          note={`${inShop} in-shop · ${completedWorkOrders.length} completed`}
          onClick={() => {
            if (activeWorkOrderIds.length > 0 && setFocusedMaintenanceIds) {
              setFocusedMaintenanceIds(activeWorkOrderIds);
            }
            setActiveTab('maintenance');
          }}
        />
        <Kpi
          icon={Users}
          tone="lime"
          label="Workforce & reports"
          value={drivers.length}
          note={`${departments.length} depts · ${repairArchive.length} service reports`}
          onClick={() => {
            if (setFocusedTabPulse) {
              setFocusedTabPulse('drivers');
            }
            setActiveTab('drivers');
          }}
        />
        <Kpi
          icon={totalUnresolvedExpiryCount > 0 ? AlertTriangle : ShieldCheck}
          tone="ok"
          alertRed={totalUnresolvedExpiryCount > 0}
          label="Document & License Expiry"
          value={totalUnresolvedExpiryCount}
          note={
            totalUnresolvedExpiryCount > 0
              ? `${unresolvedDocsCount} vehicle docs · ${unresolvedLicensesCount} driver licenses (${totalExpiredCount} expired · ${totalExpiringCount} due)`
              : 'All vehicle documents & driver licenses resolved'
          }
          onClick={() => {
            setLeftTab('expiry');
          }}
        />
      </div>

      <div className="dash-grid">
        <section className="card dash-panel span-2" aria-labelledby="alerts-title">
          <div className="card-head" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <h2 className="card-title" id="alerts-title">
                {leftTab === 'attention'
                  ? 'Needs attention & ongoing health'
                  : leftTab === 'maintenance'
                  ? 'Active maintenance pipeline'
                  : 'Document & Driver License Expiry Alerts'}
              </h2>
              <div className="card-sub">
                {leftTab === 'attention'
                  ? `${flagged.length} vehicles with health countdown alerts or shop status`
                  : leftTab === 'maintenance'
                  ? `${activeWorkOrders.length} active maintenance orders across specialists`
                  : `${unresolvedDocsCount} vehicle registration/insurance alerts · ${unresolvedLicensesCount} employee driver license alerts`}
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
                <button
                  type="button"
                  className={leftTab === 'expiry' ? 'active' : ''}
                  onClick={() => setLeftTab('expiry')}
                  style={{
                    minHeight: '30px',
                    padding: '0 0.65rem',
                    fontSize: '0.76rem',
                    ...(totalUnresolvedExpiryCount > 0
                      ? {
                          background: leftTab === 'expiry' ? '#B91C1C' : '#DC2626',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          borderRadius: '6px'
                        }
                      : {})
                  }}
                >
                  Doc &amp; License Expiry ({totalUnresolvedExpiryCount})
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
                  headline = `${diag.type || diag.label || 'Diagnostic'} — ${[kmPart, dayPart].filter(Boolean).join(' · ') || 'Check interval'}`;
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
          ) : leftTab === 'maintenance' ? (
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

                    <span className="badge badge-warning" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      {stage}
                    </span>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary btn-go-maintenance"
                      onClick={() => {
                        if (setFocusedMaintenanceIds) setFocusedMaintenanceIds([wo.id]);
                        setActiveTab('maintenance');
                      }}
                    >
                      Open
                      <ArrowRight size={13} className="btn-go-arrow" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="alert-list">
              {expiryAlertItems.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={28} color="#16A34A" />
                  <strong>All vehicle documents &amp; employee driver licenses are valid</strong>
                </div>
              ) : (
                expiryAlertItems.map(item => (
                  <div key={item.id} className="alert-row" style={{ gap: '0.75rem' }}>
                    {item.kind === 'VEHICLE_DOC' ? (
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
                          src={getVehicleImage(item.vehicle)}
                          alt={item.vehicle.code}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#1E293B',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        flexShrink: 0
                      }}>
                        {item.driver.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}

                    <div className="vehicle-cell" style={{ minWidth: 0, flex: '1 1 140px' }}>
                      <div className="vehicle-cell-title">{item.title}</div>
                      <div className="vehicle-cell-sub">{item.sub}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: item.tone === 'expired' ? '#DC2626' : '#B45309' }}>
                        {item.detail}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {item.kind === 'VEHICLE_DOC'
                          ? 'Vehicle Registration / Insurance Document'
                          : 'Employee Driver\u2019s License Tracking'}
                      </div>
                    </div>

                    <span
                      className={`badge ${item.tone === 'expired' ? 'badge-danger' : 'badge-warning'}`}
                      style={{ whiteSpace: 'nowrap', fontSize: '0.73rem' }}
                    >
                      {item.badgeText}
                    </span>

                    {item.kind === 'VEHICLE_DOC' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setSelectedVehicle(item.vehicle);
                          setModalType('vehicle-detail');
                        }}
                      >
                        Renew Document
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          if (setSelectedDriver) setSelectedDriver(item.driver);
                          setModalType('driver-detail');
                        }}
                      >
                        Renew License
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section className="card dash-panel span-2" aria-labelledby="avail-title">
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
      </div>
    </div>
  );
};
