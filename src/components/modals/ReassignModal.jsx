import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { X, RefreshCw, Building, ShieldCheck, FileText, Layers } from 'lucide-react';

export const ReassignModal = () => {
  const {
    modalType,
    setModalType,
    selectedVehicle,
    branches,
    reassignVehicle
  } = useFleet();

  const [targetBranch, setTargetBranch] = useState('');
  const [custodianDept, setCustodianDept] = useState('Operations & Maintenance Motor Pool');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (selectedVehicle) {
      setTargetBranch(selectedVehicle.branchId);
      setCustodianDept(selectedVehicle.custodianDepartment || 'Operations & Maintenance Motor Pool');
      setReason('');
    }
  }, [selectedVehicle]);

  if (modalType !== 'reassign' || !selectedVehicle) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = reassignVehicle(selectedVehicle.id, targetBranch, custodianDept, reason);
    if (success) {
      setModalType(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <RefreshCw size={20} color="#FBBF24" />
            <span>Transfer Vehicle Branch Station</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-box-body">
            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.15rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)'
            }}>
              <ShieldCheck size={18} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>
                <strong>COTELCO Company Fleet:</strong> Transferring an asset updates geographic telemetry placement and branch pool custody, logged to the append-only security audit trail.
              </span>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Vehicle Selected:</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{selectedVehicle.code} [{selectedVehicle.plateNo}]</strong>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{selectedVehicle.makeModel} ({selectedVehicle.classification})</div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Building size={14} style={{ display: 'inline', marginRight: '4px' }} /> Destination Branch Sub-Office: *
              </label>
              <select
                className="form-select"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                required
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} &bull; {b.coverage}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Layers size={14} style={{ display: 'inline', marginRight: '4px' }} /> Receiving Motor Pool / Department: *
              </label>
              <select
                className="form-select"
                value={custodianDept}
                onChange={(e) => setCustodianDept(e.target.value)}
                required
              >
                <option value="Operations & Maintenance Motor Pool">Operations &amp; Maintenance Motor Pool</option>
                <option value="Substation & Transmission Construction">Substation &amp; Transmission Construction</option>
                <option value="Emergency Response & Trouble Team">Emergency Response &amp; Trouble Team</option>
                <option value="Consumer Metering & Services Pool">Consumer Metering &amp; Services Pool</option>
                <option value="Executive & Administrative Fleet">Executive &amp; Administrative Fleet</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} /> Operational Transfer Justification: *
              </label>
              <textarea
                className="form-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail reason for fleet relocation (e.g., Storm restoration support in Midsayap, transmission line construction in Makilala, feeder load rebalancing)..."
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
              Confirm &amp; Log Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
