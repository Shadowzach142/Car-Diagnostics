import React, { useMemo, useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import { expiryState, formatDate, monthKey, sumKm } from '../utils/driverHelpers';
import { Pencil, Save, X, Phone, Mail, Building2, MapPin, IdCard } from 'lucide-react';

const Field = ({ label, children }) => (
  <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.6rem 0.8rem' }}>
    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{children}</div>
  </div>
);

export const DriverProfile = () => {
  const {
    activeDriver,
    driverVehicles = [],
    driverTripLogs = [],
    branches = [],
    updateOwnDriverContact
  } = useFleet();

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const thisMonth = monthKey();
  const monthTrips = useMemo(() => driverTripLogs.filter(t => String(t.date).slice(0, 7) === thisMonth), [driverTripLogs, thisMonth]);

  if (!activeDriver) return <div className="page"><div className="card"><div className="empty-state">No driver profile found.</div></div></div>;

  const d = activeDriver;
  const branch = branches.find(b => b.id === d.branchId);
  const lic = expiryState(d.licenseExpiry);
  const initials = (d.name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const startEdit = () => {
    setPhone(d.phone || '');
    setEmail(d.email || '');
    setEditing(true);
  };
  const save = () => {
    if (updateOwnDriverContact({ phone, email })) setEditing(false);
  };

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="profile-avatar-circle" style={{ width: 64, height: 64, fontSize: '1.25rem', flexShrink: 0 }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{d.name}</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{d.title || d.role}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.9rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <span className="mono" style={{ fontWeight: 700 }}>{d.employeeId}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={13} /> {d.department}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={13} /> {branch?.name || branch?.municipality || '—'}</span>
            </div>
          </div>
          {!editing ? (
            <button type="button" className="btn btn-outline" onClick={startEdit}><Pencil size={14} /> Edit contact</button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}><Save size={14} /> Save</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.65rem', marginTop: '1rem' }}>
          <Field label="Mobile">
            {editing ? (
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Mobile number" />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Phone size={13} /> {d.phone || '—'}</span>
            )}
          </Field>
          <Field label="Email">
            {editing ? (
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', wordBreak: 'break-all' }}><Mail size={13} /> {d.email || '—'}</span>
            )}
          </Field>
          <Field label="Trips this month">{monthTrips.length} · {sumKm(monthTrips).toLocaleString()} km</Field>
          <Field label="Trips logged (all time)">{driverTripLogs.length} · {sumKm(driverTripLogs).toLocaleString()} km</Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><IdCard size={17} /> Driver&apos;s License</div>
            <div className="card-sub">Renewals are recorded by the Operations Director (Employees).</div>
          </div>
          <span className={`badge badge-${lic.tone}`}>{lic.label}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.65rem' }}>
          <Field label="License no."><span className="mono">{d.licenseNo || '—'}</span></Field>
          <Field label="Type / restrictions">{d.licenseType || '—'}</Field>
          <Field label="Date acquired">{formatDate(d.licenseAcquiredDate)}</Field>
          <Field label="Expiry date">{formatDate(d.licenseExpiry)}</Field>
        </div>
        {lic.tone !== 'success' && (
          <div className="inline-alert" style={{ marginTop: '0.75rem' }}>
            {lic.tone === 'danger'
              ? 'Your license has expired. You should not drive company vehicles until it is renewed — inform the Operations Director.'
              : 'Your license expires soon. Please schedule your LTO renewal and inform the Operations Director.'}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Vehicles I can drive</div>
            <div className="card-sub">{driverVehicles.length} authorized</div>
          </div>
        </div>
        {driverVehicles.length === 0 ? (
          <div className="empty-state">No vehicle access granted yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {driverVehicles.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.7rem', border: '1px solid var(--border-light)', borderRadius: 10, background: 'var(--bg-surface-subtle)' }}>
                <img src={getVehicleImage(v)} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 5 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{v.code}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{v.plateNo}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
