import React, { useMemo, useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { monthKey, formatDate, formatMonthLabel, sumKm, tripRouteLabel } from '../utils/driverHelpers';
import { Route, Download } from 'lucide-react';

export const DriverTrips = () => {
  const {
    activeDriver,
    driverVehicles = [],
    driverTripLogs = [],
    globalSearch,
    setModalType,
    setTripDraft
  } = useFleet();

  const [range, setRange] = useState('MONTH'); // 'MONTH' | 'ALL'
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const currentMonth = useMemo(() => monthKey(), []);

  const rows = useMemo(() => {
    let list = [...driverTripLogs].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt))
    );
    if (range === 'MONTH') list = list.filter(t => String(t.date).slice(0, 7) === currentMonth);
    if (vehicleFilter !== 'ALL') list = list.filter(t => t.vehicleCode === vehicleFilter);
    const q = (globalSearch || '').toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        [t.vehicleCode, t.plateNo, t.from, t.to, t.purpose, t.notes].some(f => String(f || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [driverTripLogs, range, vehicleFilter, currentMonth, globalSearch]);

  const totalKm = sumKm(rows);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Trip ID', 'Date', 'Vehicle', 'Plate', 'Route', 'Round trip', 'Distance (km)', 'Notes'];
    const body = rows.map(t => [t.id, t.date, t.vehicleCode, t.plateNo, tripRouteLabel(t), t.roundTrip ? 'Yes' : 'No', t.distanceKm, t.notes].map(esc).join(','));
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-log-${(activeDriver?.name || 'driver').replace(/\s+/g, '-').toLowerCase()}-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <select className="form-select toolbar-select" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} aria-label="Filter by vehicle">
          <option value="ALL">All my vehicles</option>
          {driverVehicles.map(v => <option key={v.id} value={v.code}>{v.code} · {v.plateNo}</option>)}
        </select>

        <div className="segmented" role="group" aria-label="Report range">
          <button type="button" className={range === 'MONTH' ? 'active' : ''} onClick={() => setRange('MONTH')}>{formatMonthLabel(currentMonth)}</button>
          <button type="button" className={range === 'ALL' ? 'active' : ''} onClick={() => setRange('ALL')}>All history</button>
        </div>

        <span className="stat-chip"><strong>{rows.length}</strong> trips</span>
        <span className="stat-chip"><strong>{totalKm.toLocaleString()}</strong> km</span>

        <span className="spacer" />
        <button type="button" className="btn btn-outline btn-sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={14} /> Export CSV
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setTripDraft(null); setModalType('log-trip'); }}>
          <Route size={14} /> Log a Trip
        </button>
      </div>

      <div className="card page-body" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ overflow: 'auto' }}>
          <table className="data-table" aria-label="My trip logs">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Route</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Distance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state">No trips logged {range === 'MONTH' ? 'this month' : 'yet'}. Tap <strong>Log a Trip</strong> after you use a vehicle.</div></td></tr>
              ) : (
                rows.map(t => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{formatDate(t.date)}</div>
                      <span className="cell-sub mono">{t.id}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="cell-strong">{t.vehicleCode}</div>
                      <span className="cell-sub">{t.plateNo}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{tripRouteLabel(t)}{t.roundTrip ? ' ⇄' : ''}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: t.notes ? 'var(--text-main)' : 'var(--text-muted)' }}>{t.notes || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>{Number(t.distanceKm).toLocaleString()} km</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
