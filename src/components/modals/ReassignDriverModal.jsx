import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { VehicleSelect } from '../common/VehicleSelect';
import { X, ArrowRightLeft } from 'lucide-react';

export const ReassignDriverModal = () => {
  const {
    modalType,
    setModalType,
    selectedDriver,
    vehicles,
    reassignDriverVehicle
  } = useFleet();

  const [targetVehicleCode, setTargetVehicleCode] = useState('');

  useEffect(() => {
    if (selectedDriver) {
      setTargetVehicleCode(selectedDriver.assignedVehicleCode || (vehicles[0]?.code || ''));
    }
  }, [selectedDriver, vehicles]);

  if (modalType !== 'reassign-driver-vehicle' || !selectedDriver) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    reassignDriverVehicle(selectedDriver.id, targetVehicleCode);
    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <ArrowRightLeft size={18} color="var(--primary)" />
            <span>Assign Vehicle</span>
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
          <div className="modal-box-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Assign a utility fleet vehicle to <strong>{selectedDriver.name}</strong> ({selectedDriver.role}).
            </p>

            <VehicleSelect
              vehicles={vehicles}
              value={targetVehicleCode}
              onChange={(val) => setTargetVehicleCode(val)}
              label="Select Vehicle: *"
              valueKey="code"
            />
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
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

