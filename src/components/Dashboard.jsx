import React from 'react';
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
  ArrowRight
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

const STATUS_META = {
  ACTIVE: { label: 'Active', color: '#16A34A' },
  'IN-SHOP': { label: 'In-Shop', color: '#D97706' },
  OFFLINE: { label: 'Offline', color: '#DC2626' }
};

const Kpi = ({ icon: Icon, tone, label, value, note }) => (
  <div className="card kpi-card">
    <div className={`kpi-icon tone-${tone}`}><Icon size={22} /></div>
    <div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  </div>
);

export const Dashboard = () => {
  const {
    vehicles,
    branches,
    workOrders,
    setSelectedVehicle,
    setModalType,
    settings,
    updateWorkOrderStage,
    setActiveTab
  } = useFleet();

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
  const openOrders = workOrders.filter(w => w.status !== COMPLETED).length;

  // Most urgent first: offline, then in-shop, then active-with-alert
  const rank = { OFFLINE: 0, 'IN-SHOP': 1, ACTIVE: 2 };
  const flagged = vehicles
    .filter(v => v.urgentAlert || v.status !== 'ACTIVE')
    .sort((a, b) => rank[a.status] - rank[b.status]);

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
      return {
        id: b.id,
        name: b.municipality,
        total: list.length,
        active: list.filter(v => v.status === 'ACTIVE').length,
        inShop: list.filter(v => v.status === 'IN-SHOP').length,
        offline: list.filter(v => v.status === 'OFFLINE').length
      };
    })
    .sort((a, b) => b.total - a.total);
  const maxBranch = Math.max(1, ...branchRows.map(b => b.total));

  // Simplify long alert text to short scannable phrase
  const formatShortAlert = (alertStr, statusReason) => {
    const raw = alertStr || statusReason || 'Scheduled check';
    if (raw.length > 55) {
      return raw.substring(0, 52) + '...';
    }
    return raw;
  };

  return (
    <div className="dashboard-single-screen">
      <div className="dash-actions">
        <span className="dash-date">{today}</span>
        <div className="dash-actions-right">
          <span className="stat-chip">COTELCO Grid Operations</span>
          <span className="stat-chip">Fleet Command Center</span>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon={Truck} tone="neutral" label="Total vehicles" value={total} note={`${branches.length} branch offices`} />
        <Kpi icon={CheckCircle2} tone="ok" label="Ready for deployment" value={active} note={`${pct(active)}% of the fleet`} />
        <Kpi icon={Wrench} tone="warn" label="In-shop or offline" value={inShop + offline} note={`${inShop} in-shop · ${offline} offline`} />
        <Kpi icon={ClipboardList} tone="lime" label="Active outside services" value={openOrders} note="At outside facilities" />
      </div>

      <div className="dash-grid">
        <section className="card dash-panel span-2" aria-labelledby="alerts-title">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="alerts-title">Needs attention</h2>
              <div className="card-sub">{flagged.length} vehicles flagged for service or unavailable</div>
            </div>
          </div>

          <div className="alert-list">
            {flagged.length === 0 && (
              <div className="empty-state">
                <CheckCircle2 size={28} color="#16A34A" />
                <strong>All vehicles are ready</strong>
              </div>
            )}
            {flagged.map(v => {
              const parsed = parseVehicleAlert(v);
              const branch = branches.find(b => b.id === v.branchId);

              return (
                <div key={v.id} className="alert-row">
                  {/* Vehicle Thumbnail */}
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

                  {/* Compact Vehicle Label (2 tight lines) */}
                  <div className="vehicle-cell" style={{ minWidth: 0, flex: '1 1 135px' }}>
                    <div className="vehicle-cell-title">
                      {v.code} · <span className="mono" style={{ color: 'var(--text-muted)' }}>{v.plateNo}</span>
                    </div>
                    <div className="vehicle-cell-sub">{v.makeModel}</div>
                  </div>

                  {/* Dedicated Plain-Text Issue / Service */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {parsed.issueText}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {branch?.municipality || 'Assigned Branch'} · {v.odometerKm.toLocaleString()} km
                    </div>
                  </div>

                  {/* Short Semantic Status Badge (Max 3 words) */}
                  <span className={`badge ${parsed.badgeType}`} style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {parsed.badgeText}
                  </span>

                  {/* Zone 3: Explicit Row Action Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setSelectedVehicle(v);
                      setModalType('vehicle-detail');
                    }}
                    title={`Inspect telemetry for ${v.code}`}
                  >
                    <Search size={13} /> Inspect
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card dash-panel" aria-labelledby="avail-title">
          <div className="card-head">
            <h2 className="card-title" id="avail-title">Fleet availability</h2>
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
            <div className="legend-list">
              {segments.map(seg => (
                <div key={seg.s} className="legend-row">
                  <span className="legend-swatch" style={{ background: STATUS_META[seg.s].color }} />
                  {STATUS_META[seg.s].label}
                  <span className="legend-count">{seg.n} <span className="legend-pct">({pct(seg.n)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card dash-panel" aria-labelledby="branch-title">
          <div className="card-head">
            <h2 className="card-title" id="branch-title">Vehicles by branch</h2>
          </div>
          <div className="branch-list">
            {branchRows.map(b => (
              <div key={b.id} className="branch-row">
                <span className="branch-name">{b.name}</span>
                <span className="branch-count">{b.total}</span>
                <div className="branch-bar" title={`${b.active} active · ${b.inShop} in-shop · ${b.offline} offline`}>
                  <span style={{ width: `${(b.active / maxBranch) * 100}%`, background: STATUS_META.ACTIVE.color }} />
                  <span style={{ width: `${(b.inShop / maxBranch) * 100}%`, background: STATUS_META['IN-SHOP'].color }} />
                  <span style={{ width: `${(b.offline / maxBranch) * 100}%`, background: STATUS_META.OFFLINE.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
