import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import { truncateWords, peso } from '../utils/formatters';
import { Printer, Receipt, RotateCcw, Plus } from 'lucide-react';

export const RepairArchive = () => {
  const { repairArchive, setActiveReceipt, setModalType, vehicles, branches, globalSearch } = useFleet();
  const [branchFilter, setBranchFilter] = useState('ALL');

  const rows = useMemo(() => {
    let list = repairArchive;
    if (branchFilter !== 'ALL') {
      list = list.filter(r => r.branch === branchFilter || r.branchId === branchFilter);
    }
    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter(r =>
      [r.voucherNo, r.workOrderNo, r.vehicleCode, r.plateNo, r.serviceType, r.branch, r.serviceSummary]
        .some(f => String(f || '').toLowerCase().includes(q))
    );
  }, [repairArchive, branchFilter, globalSearch]);

  const totalSpend = rows.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0);

  return (
    <div className="page">
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.municipality}>{b.municipality}</option>
          ))}
        </select>

        {branchFilter !== 'ALL' && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setBranchFilter('ALL')}>
            <RotateCcw size={14} /> Reset
          </button>
        )}

        {globalSearch && (
          <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
            Filter: &ldquo;{globalSearch}&rdquo;
          </span>
        )}

        <span className="spacer" />

        <span className="stat-chip">Vouchers <strong>{rows.length}</strong></span>
        <span className="stat-chip">Total <strong>{peso(totalSpend)}</strong></span>
        <button type="button" className="btn btn-outline no-print" onClick={() => window.print()}>
          <Printer size={16} /> Print Ledger
        </button>
        <button
          type="button"
          className="btn btn-primary no-print"
          onClick={() => setModalType('add-ledger')}
          title="Record new audited expense voucher"
        >
          <Plus size={16} /> Add Ledger Entry
        </button>
      </div>

      <div className="page-body">
        <div className="table-wrap">
          <table className="data-table" aria-label="Repair expense ledger">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Branch</th>
                <th>Service Summary</th>
                <th className="col-num">Labor</th>
                <th className="col-num">Parts</th>
                <th className="col-num">Total</th>
                <th style={{ textAlign: 'right' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state">No audited vouchers match criteria.</div></td></tr>
              ) : rows.map((r, i) => {
                const v = vehicles?.find(item => item.code === r.vehicleCode || item.plateNo === r.plateNo);
                const img = getVehicleImage(v);

                return (
                  <tr key={r.voucherNo || i}>
                    <td>
                      <span className="cell-strong mono">{r.voucherNo}</span>
                      <span className="cell-sub">WO {r.workOrderNo}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img
                          src={img}
                          alt={r.vehicleCode}
                          style={{
                            width: '40px',
                            height: '30px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            flexShrink: 0
                          }}
                        />
                        <div className="vehicle-cell">
                          <span className="vehicle-cell-title">{r.vehicleCode} · {r.plateNo}</span>
                          <span className="vehicle-cell-sub">{truncateWords(r.model, 4)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.branch}</td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                        {r.serviceType || 'Maintenance Service'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '240px'
                        }}
                        title={r.serviceSummary}
                      >
                        {r.serviceSummary}
                      </div>
                    </td>
                    <td className="col-num">{peso(r.laborCost)}</td>
                    <td className="col-num">{peso(r.partsCost)}</td>
                    <td className="cell-strong col-num">{peso(r.totalCost)}</td>
                    <td className="no-print" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => { setActiveReceipt(r); setModalType('receipt-voucher'); }}
                      >
                        <Receipt size={14} /> View Voucher
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
