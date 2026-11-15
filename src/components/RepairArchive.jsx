import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import { truncateWords } from '../utils/formatters';
import {
  RotateCcw,
  Plus,
  Download,
  Camera,
  FileText,
  X,
  Eye
} from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const RepairArchive = () => {
  const {
    settings,
    repairArchive,
    setModalType,
    vehicles,
    branches,
    globalSearch
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechNameNorm = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [activeReport, setActiveReport] = useState(null);

  const rows = useMemo(() => {
    let list = [...(repairArchive || [])].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || ''))
    );

    if (isMechanic) {
      list = list.filter(
        (r) => (r.mechanic || '').split(' (')[0].trim().toLowerCase() === mechNameNorm
      );
    }

    if (branchFilter !== 'ALL') {
      list = list.filter((r) => r.branch === branchFilter || r.branchId === branchFilter);
    }
    if (vehicleFilter !== 'ALL') {
      list = list.filter((r) => r.vehicleCode === vehicleFilter);
    }

    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.voucherNo,
        r.vehicleCode,
        r.plateNo,
        r.model,
        r.serviceType,
        r.branch,
        r.facility,
        r.mechanic,
        r.serviceSummary,
        r.fileName
      ].some((f) => String(f || '').toLowerCase().includes(q))
    );
  }, [repairArchive, branchFilter, vehicleFilter, globalSearch]);

  const handleExportCsv = () => {
    const headers = [
      'Report ID',
      'Date',
      'Vehicle Code',
      'Plate No',
      'Branch',
      'Submitted By',
      'Facility / Source',
      'Report Title',
      'Notes',
      'Attachment'
    ];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.voucherNo,
          r.date,
          r.vehicleCode,
          r.plateNo,
          r.branch,
          r.mechanic || '',
          r.facility || '',
          r.serviceType || '',
          r.serviceSummary || '',
          r.fileName || (r.receiptImage ? 'Photo attached' : '')
        ]
          .map(escapeCsv)
          .join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotelco-reports-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          aria-label="Filter by vehicle"
        >
          <option value="ALL">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.code}>
              {v.code} &bull; {v.plateNo}
            </option>
          ))}
        </select>

        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.municipality}>
              {b.municipality}
            </option>
          ))}
        </select>

        {(branchFilter !== 'ALL' || vehicleFilter !== 'ALL') && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              setBranchFilter('ALL');
              setVehicleFilter('ALL');
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}

        {globalSearch && (
          <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
            Filter: &ldquo;{globalSearch}&rdquo;
          </span>
        )}

        <span className="spacer" />

        <span className="stat-chip">
          Reports <strong>{rows.length}</strong>
        </span>
        <button
          type="button"
          className="btn btn-outline no-print"
          onClick={handleExportCsv}
          title="Export reports history to CSV"
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          type="button"
          className="btn btn-primary no-print"
          onClick={() => setModalType('add-ledger')}
          title="Add report entry"
        >
          <Plus size={16} /> Add Report
        </button>
      </div>

      <div className="page-body">
        {/* Clean Logs History Table */}
        <div className="table-wrap">
          <table className="data-table" aria-label="Reports logs history">
            <thead>
              <tr>
                <th>Date &amp; ID</th>
                <th>Vehicle</th>
                <th>Submitted By</th>
                <th>Report &amp; Notes</th>
                <th>Attachment</th>
                <th style={{ textAlign: 'right' }} className="no-print">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No reports logged yet.</div>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const v = vehicles?.find(
                    (item) => item.code === r.vehicleCode || item.plateNo === r.plateNo
                  );
                  const img = getVehicleImage(v);

                  return (
                    <tr key={r.voucherNo || i}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                          {r.date}
                        </div>
                        <span className="cell-sub mono">{r.voucherNo}</span>
                      </td>

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
                            <span className="vehicle-cell-title">
                              {r.vehicleCode} &bull; {r.plateNo}
                            </span>
                            <span className="vehicle-cell-sub">
                              {truncateWords(r.model, 4)} &bull; {r.branch}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {(r.mechanic || 'Motorpool Staff').split(' (')[0]}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {r.facility || 'Central Motorpool'}
                        </div>
                      </td>

                      <td style={{ maxWidth: 320 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                          {r.serviceType || 'Fleet Report'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '300px'
                          }}
                          title={r.serviceSummary}
                        >
                          {r.serviceSummary}
                        </div>
                      </td>

                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.fileDataUrl && r.fileName ? (
                          <a
                            href={r.fileDataUrl}
                            download={r.fileName}
                            className="badge badge-muted"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              textDecoration: 'none',
                              color: 'var(--text-main)'
                            }}
                            title={`Download ${r.fileName}`}
                          >
                            <FileText size={12} /> {truncateWords(r.fileName, 3)}
                          </a>
                        ) : r.receiptImage ? (
                          <span
                            className="badge badge-muted"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Camera size={12} /> Photo
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>&mdash;</span>
                        )}
                      </td>

                      <td className="no-print" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setActiveReport(r)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Detail Modal */}
      {activeReport && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-box" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <span>Report &bull; {activeReport.voucherNo}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setActiveReport(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '0.65rem 0.8rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>VEHICLE</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {activeReport.vehicleCode} &bull; {activeReport.plateNo}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{activeReport.model}</div>
                </div>
                <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '0.65rem 0.8rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>DATE &amp; SUBMITTED BY</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{activeReport.date}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {(activeReport.mechanic || 'Staff').split(' (')[0]} &bull; {activeReport.facility}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '0.75rem 0.85rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  REPORT &amp; NOTES
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {activeReport.serviceType}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {activeReport.serviceSummary}
                </div>
              </div>

              {activeReport.fileDataUrl && activeReport.fileName && !activeReport.receiptImage && (
                <div
                  style={{
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {activeReport.fileName}
                      </div>
                      {activeReport.fileSize && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {formatFileSize(activeReport.fileSize)}
                        </div>
                      )}
                    </div>
                  </div>
                  <a
                    href={activeReport.fileDataUrl}
                    download={activeReport.fileName}
                    className="btn btn-sm btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>
              )}

              {activeReport.receiptImage && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    ATTACHED PHOTO
                  </div>
                  <img
                    src={activeReport.receiptImage}
                    alt={`Report ${activeReport.voucherNo}`}
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', border: '1px solid var(--border-light)', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
            <div className="modal-box-footer">
              <button type="button" className="btn btn-outline" onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
