import React, { useState, useEffect, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { TRIP_PLACES, getTripDistance, getVehicleImage } from '../../data/fleetData';
import { X, Route, Repeat, Check, Gauge } from 'lucide-react';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MODES = [
  { id: 'ROUTE', label: 'Common route' },
  { id: 'CUSTOM', label: 'Custom (Odometer)' }
];

const segStyle = (active) => ({
  height: '34px',
  borderRadius: '6px',
  border: active ? '1px solid var(--border-light)' : '1px solid transparent',
  background: active ? 'var(--bg-surface)' : 'transparent',
  color: active ? 'var(--text-main)' : 'var(--text-secondary)',
  fontWeight: active ? 700 : 600,
  fontSize: '0.78rem',
  cursor: 'pointer'
});

const chipStyle = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.32rem 0.7rem',
  borderRadius: '999px',
  fontSize: '0.76rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid var(--text-main)' : '1px solid var(--border-light)',
  background: active ? 'var(--text-main)' : 'var(--bg-surface)',
  color: active ? '#FFFFFF' : 'var(--text-secondary)'
});

const fieldSubLabel = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'var(--text-tertiary)',
  marginBottom: '0.2rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

export const LogTripModal = () => {
  const {
    modalType,
    setModalType,
    activeDriver,
    driverVehicles = [],
    driverTripLogs = [],
    tripDraft,
    setTripDraft,
    addTripLog
  } = useFleet();

  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState('ROUTE'); // 'ROUTE' | 'CUSTOM'
  const [fromPlace, setFromPlace] = useState('Kidapawan');
  const [toPlace, setToPlace] = useState('Matalam');
  const [roundTrip, setRoundTrip] = useState(true);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [odoStart, setOdoStart] = useState('');
  const [odoEnd, setOdoEnd] = useState('');
  const [notes, setNotes] = useState('');

  const usable = useMemo(() => driverVehicles.filter(v => v.status === 'ACTIVE'), [driverVehicles]);
  const placeIds = useMemo(() => new Set(TRIP_PLACES.map(p => p.id)), []);

  // Recent distinct From → To pairs for one-tap reuse
  const recentRoutes = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const t of driverTripLogs) {
      if (!t.from || !t.to || !placeIds.has(t.from) || !placeIds.has(t.to) || t.from === t.to) continue;
      const key = `${t.from}|${t.to}|${t.roundTrip ? 1 : 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, from: t.from, to: t.to, roundTrip: Boolean(t.roundTrip) });
      if (out.length >= 4) break;
    }
    return out;
  }, [driverTripLogs, placeIds]);

  useEffect(() => {
    if (modalType !== 'log-trip') return;
    const last = driverTripLogs[0];
    const draft = tripDraft || {};
    const lastUsable = last && usable.find(v => v.id === last.vehicleId);
    const initVehicle = (draft.vehicleId && usable.find(v => v.id === draft.vehicleId))
      || lastUsable
      || usable[0]
      || null;

    const draftMode = draft.inputMode === 'ODOMETER' || draft.inputMode === 'CUSTOM' ? 'CUSTOM' : 'ROUTE';
    const initFrom = (draft.from && placeIds.has(draft.from))
      ? draft.from
      : (last?.from && placeIds.has(last.from) ? last.from : 'Kidapawan');
    const initTo = (draft.to && placeIds.has(draft.to) && draft.to !== initFrom)
      ? draft.to
      : (last?.to && placeIds.has(last.to) && last.to !== initFrom ? last.to : (initFrom === 'Kidapawan' ? 'Matalam' : 'Kidapawan'));

    setVehicleId(initVehicle?.id || '');
    setDate(todayStr());
    setMode(draftMode);
    setFromPlace(initFrom);
    setToPlace(initTo);
    setRoundTrip(draft.roundTrip !== undefined ? Boolean(draft.roundTrip) : (last ? Boolean(last.roundTrip) : true));
    setCustomFrom(draftMode === 'CUSTOM' ? (draft.from || '') : '');
    setCustomTo(draftMode === 'CUSTOM' ? (draft.to || '') : '');
    setOdoStart(initVehicle ? String(initVehicle.odometerKm || 0) : '');
    setOdoEnd('');
    setNotes('');
  }, [modalType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (modalType !== 'log-trip' || !activeDriver) return null;

  const close = () => {
    setModalType(null);
    setTripDraft(null);
  };

  const selectedVehicle = usable.find(v => v.id === vehicleId) || null;
  const vehicleLocked = Boolean(tripDraft?.vehicleId && selectedVehicle);

  const handleVehicleChange = (nextId) => {
    const v = usable.find(item => item.id === nextId);
    setVehicleId(nextId);
    setOdoStart(v ? String(v.odometerKm || 0) : '');
    setOdoEnd('');
  };

  let distanceKm = 0;
  let routeLabel = '';
  if (mode === 'ROUTE') {
    const oneWay = getTripDistance(fromPlace, toPlace);
    distanceKm = oneWay * (roundTrip ? 2 : 1);
    routeLabel = fromPlace === toPlace
      ? 'Select a different destination'
      : `${fromPlace} → ${toPlace}${roundTrip ? ' (round trip)' : ''}`;
  } else {
    const s = Number(odoStart);
    const e = Number(odoEnd);
    distanceKm = Number.isFinite(s) && Number.isFinite(e) && e > s ? e - s : 0;
    routeLabel = customFrom || customTo
      ? `${customFrom || '—'} → ${customTo || '—'}`
      : 'Custom odometer range';
  }

  const canSave = Boolean(selectedVehicle) && distanceKm > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const saved = addTripLog({
      vehicleId: selectedVehicle.id,
      driverId: activeDriver.id,
      date,
      routeId: null,
      from: mode === 'ROUTE' ? fromPlace : customFrom,
      to: mode === 'ROUTE' ? toPlace : customTo,
      roundTrip: mode === 'ROUTE' ? roundTrip : false,
      distanceKm,
      inputMode: mode === 'ROUTE' ? 'ROUTE' : 'ODOMETER',
      odometerStart: mode === 'CUSTOM' ? odoStart : null,
      odometerEnd: mode === 'CUSTOM' ? odoEnd : null,
      purpose: '',
      notes
    });
    if (saved) close();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Route size={19} />
            <span>Log a Trip</span>
          </div>
          <button type="button" className="modal-box-close" onClick={close} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', overflowY: 'auto' }}>
            {/* Compact vehicle strip (locked when opened from a vehicle button; simple dropdown only if opened from generic button with multiple active vehicles) */}
            {usable.length === 0 ? (
              <div className="empty-state">No active authorized vehicles available right now.</div>
            ) : vehicleLocked || usable.length === 1 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.7rem',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <img
                  src={getVehicleImage(selectedVehicle)}
                  alt=""
                  style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-subtle)', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                    {selectedVehicle.code} · {selectedVehicle.plateNo}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {selectedVehicle.makeModel} · {(selectedVehicle.odometerKm || 0).toLocaleString()} km
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="trip-vehicle-select">Vehicle</label>
                <select
                  id="trip-vehicle-select"
                  className="form-select"
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                >
                  {usable.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.code} · {v.plateNo} ({(v.odometerKm || 0).toLocaleString()} km)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Route / Distance */}
            <div>
              <label className="form-label">Where did you go?</label>

              {recentRoutes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Repeat size={12} /> Recent
                  </span>
                  {recentRoutes.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      style={chipStyle(mode === 'ROUTE' && fromPlace === r.from && toPlace === r.to && roundTrip === r.roundTrip)}
                      onClick={() => {
                        setMode('ROUTE');
                        setFromPlace(r.from);
                        setToPlace(r.to);
                        setRoundTrip(r.roundTrip);
                      }}
                    >
                      {r.from === 'Kidapawan' ? r.to : `${r.from} → ${r.to}`}{r.roundTrip ? ' ⇄' : ' →'}
                    </button>
                  ))}
                </div>
              )}

              <div
                role="tablist"
                aria-label="Distance input mode"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '4px',
                  background: 'var(--bg-surface-subtle)',
                  padding: '4px',
                  borderRadius: '9px',
                  border: '1px solid var(--border-light)'
                }}
              >
                {MODES.map(m => (
                  <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)} style={segStyle(mode === m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Fixed-height panel so switching tabs never shifts the modal */}
              <div style={{ minHeight: '132px', marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {mode === 'ROUTE' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
                      <div>
                        <span style={fieldSubLabel}>From</span>
                        <select
                          className="form-select"
                          value={fromPlace}
                          onChange={(e) => setFromPlace(e.target.value)}
                          aria-label="From location"
                        >
                          {TRIP_PLACES.map(p => (
                            <option key={p.id} value={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span style={fieldSubLabel}>To</span>
                        <select
                          className="form-select"
                          value={toPlace}
                          onChange={(e) => setToPlace(e.target.value)}
                          aria-label="To location"
                        >
                          {TRIP_PLACES.map(p => (
                            <option key={p.id} value={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', background: 'var(--bg-surface-subtle)', padding: '4px', borderRadius: '9px', border: '1px solid var(--border-light)' }}>
                      <button type="button" aria-pressed={roundTrip} onClick={() => setRoundTrip(true)} style={segStyle(roundTrip)}>Round trip (×2)</button>
                      <button type="button" aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)} style={segStyle(!roundTrip)}>One way</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
                      <input className="form-input" placeholder="From (optional)" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="Custom from" />
                      <input className="form-input" placeholder="To (optional)" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="Custom to" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
                      <div>
                        <span style={fieldSubLabel}>Odometer start (km)</span>
                        <input
                          className="form-input"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={odoStart}
                          onChange={(e) => setOdoStart(e.target.value)}
                          aria-label="Odometer start"
                        />
                      </div>
                      <div>
                        <span style={fieldSubLabel}>Odometer end (km)</span>
                        <input
                          className="form-input"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="Reading now"
                          value={odoEnd}
                          onChange={(e) => setOdoEnd(e.target.value)}
                          aria-label="Odometer end"
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Gauge size={13} /> Start is pre-filled from the vehicle&apos;s current odometer.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date + optional note */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.6rem' }}>
              <div>
                <label className="form-label" htmlFor="trip-date">Date of trip</label>
                <input id="trip-date" className="form-input" type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
              </div>
              <div>
                <label className="form-label" htmlFor="trip-notes">Note (optional)</label>
                <input id="trip-notes" className="form-input" placeholder="e.g. Feeder 3 patrol" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            {/* Live summary */}
            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedVehicle ? selectedVehicle.code : 'No vehicle'}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {routeLabel || '—'}
                </div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                {distanceKm > 0 ? `${distanceKm.toLocaleString()} km` : '— km'}
              </div>
            </div>
          </div>

          <div className="modal-box-footer">
            <button type="button" className="btn btn-sm btn-outline" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!canSave} style={{ opacity: canSave ? 1 : 0.55 }}>
              <Check size={14} /> Save Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
