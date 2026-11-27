import React, { useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import {
  expiryState,
  formatDate,
  getVehicleAvailability,
  getUpcomingBookings
} from '../utils/driverHelpers';
import { Route, CalendarDays, Gauge } from 'lucide-react';

const docPill = (label, dateStr) => {
  const s = expiryState(dateStr);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span className={`badge badge-${s.tone}`} title={`Until ${formatDate(dateStr)}`}>{s.label}</span>
    </div>
  );
};

export const DriverVehicles = () => {
  const {
    driverVehicles = [],
    bookings = [],
    branches = [],
    globalSearch,
    setActiveTab,
    setModalType,
    setTripDraft
  } = useFleet();

  const list = useMemo(() => {
    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return driverVehicles;
    return driverVehicles.filter(v =>
      [v.code, v.plateNo, v.makeModel, v.classification].some(f => String(f || '').toLowerCase().includes(q))
    );
  }, [driverVehicles, globalSearch]);

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="page-toolbar">
        <span className="stat-chip"><strong>{driverVehicles.length}</strong> authorized {driverVehicles.length === 1 ? 'vehicle' : 'vehicles'}</span>
        <span className="card-sub">You can only see vehicles the Operations Director cleared you to drive.</span>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="empty-state">No vehicles to show.</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))', gap: '0.9rem', alignItems: 'start' }}>
          {list.map(v => {
            const a = getVehicleAvailability(v, bookings);
            const upcoming = getUpcomingBookings(v, bookings, 3);
            const branch = branches.find(b => b.id === v.branchId);
            return (
              <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={getVehicleImage(v)} alt={v.code} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block', borderBottom: '1px solid var(--border-subtle)' }} />
                <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>{v.code} <span className="mono" style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>· {v.plateNo}</span></div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{v.makeModel} · {v.year}</div>
                    </div>
                    <span className={`badge badge-${a.tone}`}>{a.label}</span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.detail}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.5rem 0.65rem' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Odometer</div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Gauge size={13} /> {(v.odometerKm || 0).toLocaleString()} km</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.5rem 0.65rem' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Station</div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{branch?.municipality || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {docPill('Insurance', v.insuranceExpiryDate)}
                    {docPill('LTO registration', v.registrationExpiryDate)}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Next schedules</div>
                    {upcoming.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No upcoming schedules.</div>
                    ) : (
                      upcoming.map(b => (
                        <div key={b.id} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.15rem 0' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{formatDate(b.date)}</strong> · {b.title}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1, justifyContent: 'center', opacity: v.status === 'ACTIVE' ? 1 : 0.5 }}
                      disabled={v.status !== 'ACTIVE'}
                      onClick={() => { setTripDraft({ vehicleId: v.id }); setModalType('log-trip'); }}
                    >
                      <Route size={14} /> Log trip
                    </button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setActiveTab('bookings')}>
                      <CalendarDays size={14} /> Calendar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
