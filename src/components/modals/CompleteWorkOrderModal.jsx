import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { X, CheckCircle2, FileCheck } from 'lucide-react';

export const CompleteWorkOrderModal = () => {
  const {
    modalType,
    setModalType,
    activeWoToComplete,
    completeWorkOrder,
    setActiveReceipt
  } = useFleet();

  const [partsCost, setPartsCost] = useState(15000);
  const [laborCost, setLaborCost] = useState(6000);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (activeWoToComplete) {
      const est = activeWoToComplete.estimatedCost || 20000;
      setPartsCost(Math.round(est * 0.65));
      setLaborCost(Math.round(est * 0.35));
      setSummary(`Completed ${activeWoToComplete.type}. Certified 100% inspection pass rate; all hydraulic seals bench tested to 3,000 PSI; cleared road-ready.`);
    }
  }, [activeWoToComplete]);

  if (modalType !== 'complete-wo' || !activeWoToComplete) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const voucher = completeWorkOrder(activeWoToComplete.id, partsCost, laborCost, summary);
    setModalType('receipt-voucher');
    setActiveReceipt(voucher);
  };

  const totalCost = (Number(partsCost) || 0) + (Number(laborCost) || 0);

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <CheckCircle2 size={20} color="#65A30D" />
            <span>Record Vehicle Return &amp; Expense Voucher</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-box-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Release vehicle and archive expense voucher.
            </p>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OUTSIDE SERVICE REFERENCE:</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                {activeWoToComplete.id} &bull; {activeWoToComplete.vehicleCode} {activeWoToComplete.plateNo ? `(${activeWoToComplete.plateNo})` : ''}
              </strong>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeWoToComplete.type}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Authorized Facility: <strong style={{ color: 'var(--text-main)' }}>{activeWoToComplete.facility || 'External Authorized Repair Shop'}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span style={{ fontWeight: 800, color: 'var(--text-main)', marginRight: '4px' }}>₱</span> Invoiced Parts &amp; Supplies (PHP): *
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="100"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span style={{ fontWeight: 800, color: 'var(--text-main)', marginRight: '4px' }}>₱</span> Invoiced Labor &amp; Service (PHP): *
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="100"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-light)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL AUDITED SERVICE EXPENSE:</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>₱{totalCost.toLocaleString()} PHP</strong>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Return Inspection &amp; Shop Invoice Notes: *
              </label>
              <textarea
                className="form-textarea"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Detail outside shop work done, warranty notes, replacement parts, or inspection findings..."
                required
              />
            </div>
          </div>

          <div className="modal-box-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalType(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm Return &amp; Generate Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
