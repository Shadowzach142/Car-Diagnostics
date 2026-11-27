import React, { useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import {
  dateKey,
  monthKey,
  expiryState,
  formatDate,
  getVehicleAvailability,
  getUpcomingBookings,
  sumKm,
  tripRouteLabel
} from '../utils/driverHelpers';
import { Route, Repeat, Gauge, Car, IdCard, CalendarDays, ChevronRight } from 'lucide-react';

export const DriverDashboard = () => {
  const {
    activeDriver,
    driverVehicles = [],
    driverTripLogs = [],
    bookings = [],
    setActiveTab,
    setModalType,
    setTripDraft
  } = useFleet();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const thisMonth = monthKey();

  const monthTrips = useMemo(
    () => driverTripLogs.filter(t => String(t.date).slice(0, 7) === thisMonth),
    [driverTripLogs, thisMonth]
  );
  const monthKm = sumKm(monthTrips);
  const lastTrip = driverTripLogs[0] || null;
  const lastTripVehicle = lastTrip ? driverVehicles.find(v => v.id === lastTrip.vehicleId && v.status === 'ACTIVE') : null;

  const availability = useMemo(
    () => driverVehicles.map(v => ({ v, a: getVehicleAvailability(v, bookings) })),
    [driverVehicles, bookings]
  );
  const availableCount = availability.filter(x => x.a.state === 'AVAILABLE').length;

  const lic = expiryState(activeDriver?.licenseExpiry);
  const licTone = lic.tone === 'danger' ? 'bad' : lic.tone === 'warning' ? 'warn' : lic.tone === 'success' ? 'ok' : 'neutral';

  const upcoming = useMemo(() => {
    const todayStr = dateKey();
    const codes = new Set(driverVehicles.map(v => v.code));
    return bookings
      .filter(b => codes.has(b.vehicleCode) && b.status !== 'Completed' && b.status !== 'Cancelled' && (b.deadline || b.date) >= todayStr)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 5);
  }, [bookings, driverVehicles]);

  const openLog = (draft = null) => {
    setTripDraft(draft);
    setModalType('log-trip');
  };

  const repeatLast = () => {
    if (!lastTrip) return openLog();
    openLog({
      vehicleId: lastTrip.vehicleId,
      roundTrip: lastTrip.roundTrip,
      inputMode: lastTrip.inputMode === 'ODOMETER' ? 'ROUTE' : lastTrip.inputMode,
      from: lastTrip.from,
      to: lastTrip.to
    });
  };

  const firstName = (activeDriver?.name || 'Driver').split(' ')[0];

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="page-toolbar" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>Hello, {firstName}</div>
          <div className="card-sub">{today}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {lastTrip && lastTripVehicle && (
            <button type="button" className="btn btn-outline" onClick={repeatLast} title={`${lastTrip.vehicleCode} · ${tripRouteLabel(lastTrip)}`}>
              <Repeat size={15} /> Repeat last trip
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => openLog()}>
            <Route size={15} /> Log a Trip
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.9rem' }}>
        <div className="card kpi-card">
          <div className="kpi-icon tone-lime"><Route size={20} /></div>
          <div>
            <div className="kpi-label">Trips this month</div>
            <div className="kpi-value">{monthTrips.length}</div>
            <div className="kpi-note">{driverTripLogs.length} logged overall</div>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon tone-neutral"><Gauge size={20} /></div>
          <div>
            <div className="kpi-label">Kilometers this month</div>
            <div className="kpi-value">{monthKm.toLocaleString()}</div>
            <div className="kpi-note">km driven</div>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon tone-ok"><Car size={20} /></div>
          <div>
            <div className="kpi-label">My vehicles available</div>
            <div className="kpi-value">{availableCount}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> / {driverVehicles.length}</span></div>
            <div className="kpi-note">authorized to drive</div>
          </div>
        </div>
        <div
          className="card kpi-card"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('profile')}
          onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('profile'); }}
          style={{ cursor: 'pointer', ...(lic.tone === 'danger' ? { background: '#DC2626', borderColor: '#B91C1C' } : {}) }}
        >
          <div className={`kpi-icon ${lic.tone === 'danger' ? '' : `tone-${licTone}`}`} style={lic.tone === 'danger' ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : undefined}>
            <IdCard size={20} />
          </div>
          <div>
            <div className="kpi-label" style={lic.tone === 'danger' ? { color: 'rgba(255,255,255,0.9)' } : undefined}>Driver&apos;s license</div>
            <div className="kpi-value" style={{ fontSize: '1.15rem', ...(lic.tone === 'danger' ? { color: '#fff' } : {}) }}>{lic.label}</div>
            <div className="kpi-note" style={lic.tone === 'danger' ? { color: 'rgba(255,255,255,0.88)' } : undefined}>Until {formatDate(activeDriver?.licenseExpiry)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '0.9rem', alignItems: 'start' }}>
        {/* My vehicles + availability */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">My vehicles</div>
              <div className="card-sub">Availability right now</div>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setActiveTab('profiling')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {availability.length === 0 ? (
            <div className="empty-state">No authorized vehicles yet. Ask the Operations Director for access.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {availability.map(({ v, a }) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0.6rem', border: '1px solid var(--border-light)', borderRadius: '10px', background: 'var(--bg-surface-subtle)' }}>
                  <img src={getVehicleImage(v)} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-subtle)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>{v.code} · {v.plateNo}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.detail} · {(v.odometerKm || 0).toLocaleString()} km
                    </div>
                  </div>
                  <span className={`badge badge-${a.tone}`}>{a.label}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={v.status !== 'ACTIVE'}
                    style={{ opacity: v.status === 'ACTIVE' ? 1 : 0.5 }}
                    onClick={() => openLog({ vehicleId: v.id })}
                  >
                    Log trip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent trips */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Recent trips</div>
              <div className="card-sub">Your latest logged usage</div>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setActiveTab('auditing')}>
              All trips <ChevronRight size={14} />
            </button>
          </div>
          {driverTripLogs.length === 0 ? (
            <div className="empty-state">No trips logged yet. Tap <strong>Log a Trip</strong> after you use a vehicle.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {driverTripLogs.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.2rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tripRouteLabel(t)}{t.roundTrip ? ' ⇄' : ''}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {formatDate(t.date)} · {t.vehicleCode}{t.notes ? ` · ${t.notes}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{Number(t.distanceKm).toLocaleString()} km</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming schedules on my vehicles */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Upcoming on my vehicles</div>
              <div className="card-sub">Schedules that may affect availability</div>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setActiveTab('bookings')}>
              <CalendarDays size={14} /> Calendar
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">Nothing scheduled — your vehicles are free.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {upcoming.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.2rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-main)' }}>{b.vehicleCode} · {b.title}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {formatDate(b.date)}{b.deadline && b.deadline !== b.date ? ` → ${formatDate(b.deadline)}` : ''} · {b.startTime}–{b.endTime}
                    </div>
                  </div>
                  <span className={`badge ${b.type === 'MAINTENANCE' ? 'badge-warning' : 'badge-primary'}`} style={{ alignSelf: 'center' }}>
                    {b.type === 'MAINTENANCE' ? 'Maintenance' : 'Trip'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
