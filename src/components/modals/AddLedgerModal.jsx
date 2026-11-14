import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { peso } from '../../utils/formatters';
import { VehicleSelect } from '../common/VehicleSelect';
import { X, Receipt, Building, Calendar, Wrench, FileText } from 'lucide-react';

export const AddLedgerModal = () => {
  const {
    modalType,
    setModalType,
    vehicles,
    selectedVehicle,
    addLedgerEntry,
    setActiveReceipt
  } = useFleet();

  const [vehicleCode, setVehicleCode] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [partsCost, setPartsCost] = useState(5000);
  const [laborCost, setLaborCost] = useState(2500);
  const [facility, setFacility] = useState('Central Motorpool & Testing Facility');
  const [mechanic, setMechanic] = useState('Senior Motorpool Mechanic');
  const [receiptId, setReceiptId] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');

  useEffect(() => {
    if (selectedVehicle) {
      setVehicleCode(selectedVehicle.code);
    } else if (vehicles.length > 0 && !vehicleCode) {
      setVehicleCode(vehicles[0].code);
    }
  }, [selectedVehicle, vehicles]);

  if (modalType !== 'add-ledger') return null;

  const totalCost = (Number(partsCost) || 0) + (Number(laborCost) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceType.trim()) return;

    const voucher = addLedgerEntry({
      vehicleCode,
      serviceType: serviceType.trim(),
      date,
      partsCost: Number(partsCost) || 0,
      laborCost: Number(laborCost) || 0,
      facility: facility.trim() || 'Central Motorpool & Testing Facility',
      mechanic: mechanic.trim() || 'Senior Motorpool Mechanic',
      receiptId: receiptId.trim() || undefined,
      workOrderNo: workOrderNo.trim() || undefined,
      serviceSummary: serviceSummary.trim() || serviceType.trim()
    });

    if (voucher) {
      setActiveReceipt(voucher);
      setModalType('receipt-voucher');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Receipt size={20} color="var(--primary)" />
            <span>Record Expense Voucher</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-box-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Record audited repair expense voucher.
            </p>

            <VehicleSelect
              vehicles={vehicles}
              value={vehicleCode}
              onChange={(val) => setVehicleCode(val)}
              label="Select Vehicle: *"
              valueKey="code"
            />

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Service / Expense Description: *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Hydraulic arm hose replacement & dielectric oil flush"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Expense Date: *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Wrench size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Assigned Technician:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={mechanic}
                  onChange={(e) => setMechanic(e.target.value)}
                  placeholder="e.g. Senior Motorpool Mechanic"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Parts Cost (₱ PHP): *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  className="form-input"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Labor Cost (₱ PHP): *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  className="form-input"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Audited Voucher Total:</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{peso(totalCost)} PHP</strong>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                <Building size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Service Facility / Motorpool:
              </label>
              <input
                type="text"
                className="form-input"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                placeholder="Central Motorpool & Testing Facility"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Receipt / Invoice No. (Optional):
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-generated if blank"
                  value={receiptId}
                  onChange={(e) => setReceiptId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Work Order Ref (Optional):
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-generated if blank"
                  value={workOrderNo}
                  onChange={(e) => setWorkOrderNo(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label className="form-label">
                <FileText size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Detailed Scope &amp; Parts Breakdown:
              </label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Itemized parts, diagnostic observations, test results..."
                value={serviceSummary}
                onChange={(e) => setServiceSummary(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalType(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Record Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

