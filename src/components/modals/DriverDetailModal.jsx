import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage, getEmployeeVehiclesWithAccess } from '../../data/fleetData';
import {
  X,
  User,
  Building,
  Phone,
  Plus,
  Check,
  Edit2
} from 'lucide-react';

export const DriverDetailModal = () => {
  const {
    modalType,
    setModalType,
    selectedDriver,
    vehicles = [],
    branches = [],
    bookings = [],
    grantVehicleAccess,
    revokeVehicleAccess
  } = useFleet();

  const [isEditingAccess, setIsEditingAccess] = useState(false);

  if (modalType !== 'driver-detail' || !selectedDriver) return null;

  const branch = branches.find(b => b.id === selectedDriver.branchId);
  const driverBookings = bookings.filter(b => b.driver === selectedDriver.name);
  const clearedVehicles = getEmployeeVehiclesWithAccess(selectedDriver, vehicles);
  const clearedCodes = new Set(clearedVehicles.map(v => v.code));
  const unclearedVehicles = vehicles.filter(v => !clearedCodes.has(v.code));
  const initials = selectedDriver.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleRevokeAccess = (vehicle) => {
    revokeVehicleAccess(vehicle.id, selectedDriver.id);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-box-header">
          <div className="modal-box-title">
            <User size={18} color="var(--primary)" />
            <span>Employee Profile &bull; {selectedDriver.name}</span>
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

        <div className="modal-box-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
          {/* Driver Identity Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {selectedDriver.name}
              </h3>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span className="mono">{selectedDriver.employeeId}</span> &bull; {selectedDriver.title || selectedDriver.role}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {selectedDriver.department || 'Technical / Engineering'} &bull; {selectedDriver.category}
              </div>
            </div>
          </div>

          {/* Station & Contact Phone (Subtle 2-Box Info Grid matching Car Profiling) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem'
            }}>
              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Building size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> STATION
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                {branch?.municipality || 'Central HQ'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {branch?.code || 'Central Station'}
              </span>
            </div>

            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem'
            }}>
              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Phone size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> CONTACT PHONE
              </span>
              <span className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                {selectedDriver.phone || '0919-550-2211'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                COTELCO Radio / SMS Dispatch
              </span>
            </div>
          </div>

          {/* Vehicles with Access (Head Access Control: Add & Remove) */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicles with Access ({clearedVehicles.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {clearedVehicles.length > 0 && (
                  <button
                    type="button"
                    className={`btn btn-xs ${isEditingAccess ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setIsEditingAccess(!isEditingAccess)}
                  >
                    {isEditingAccess ? <Check size={12} /> : <Edit2 size={12} />}
                    <span>{isEditingAccess ? 'Done' : 'Edit'}</span>
                  </button>
                )}
                {!isEditingAccess && unclearedVehicles.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setModalType('employee-access')}
                    title="Open vehicle access control manager"
                  >
                    <Plus size={12} /> Grant Access
                  </button>
                )}
              </div>
            </div>

            {clearedVehicles.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                No vehicles currently cleared for this employee.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {clearedVehicles.map(veh => (
                  <div
                    key={veh.code}
                    style={{
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                      <img
                        src={getVehicleImage(veh)}
                        alt={veh.code}
                        style={{
                          width: '44px',
                          height: '32px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          border: '1px solid var(--border-medium)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {veh.code} <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {veh.plateNo}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {veh.makeModel} &bull; {veh.classification}
                        </div>
                      </div>
                    </div>

                    {isEditingAccess && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        style={{
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          flexShrink: 0
                        }}
                        onClick={() => handleRevokeAccess(veh)}
                        title={`Revoke access to ${veh.code} for ${selectedDriver.name}`}
                      >
                        <X size={12} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reports */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
              Recent Reports ({driverBookings.length})
            </span>
            {driverBookings.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                No recent reports logged for this operator.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {driverBookings.slice(0, 3).map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>{b.title}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {b.date} &bull; {b.startTime}-{b.endTime} &bull; {b.destination}
                      </div>
                    </div>
                    <span className={`badge ${b.type === 'MAINTENANCE' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.66rem' }}>
                      {b.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setModalType(null)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
