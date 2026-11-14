import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage } from '../../data/fleetData';
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Wrench,
  Truck,
  Trash2,
  FileText,
  CheckCircle2,
  Pencil,
  Save
} from 'lucide-react';

export const BookingDetailModal = () => {
  const {
    modalType,
    setModalType,
    selectedBooking,
    setSelectedBooking,
    vehicles,
    deleteBooking,
    updateBooking,
    setSelectedVehicle
  } = useFleet();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    driver: '',
    destination: '',
    purpose: '',
    status: 'Scheduled'
  });

  useEffect(() => {
    if (selectedBooking) {
      setFormData({
        title: selectedBooking.title || '',
        date: selectedBooking.date || '2026-10-19',
        startTime: selectedBooking.startTime || '08:00',
        endTime: selectedBooking.endTime || '11:00',
        driver: selectedBooking.driver || '',
        destination: selectedBooking.destination || '',
        purpose: selectedBooking.purpose || '',
        status: selectedBooking.status || 'Scheduled'
      });
      setIsEditing(modalType === 'edit-booking');
    }
  }, [selectedBooking, modalType]);

  if ((modalType !== 'booking-detail' && modalType !== 'edit-booking') || !selectedBooking) return null;

  const vehicle = vehicles.find(
    v => v.id === selectedBooking.vehicleId || v.code === selectedBooking.vehicleCode
  );
  const photo = selectedBooking.avatar || getVehicleImage(vehicle);
  const isMaint = selectedBooking.type === 'MAINTENANCE';

  const handleDelete = () => {
    if (confirm(`Remove this scheduled booking for ${selectedBooking.vehicleCode}?`)) {
      deleteBooking(selectedBooking.id);
      setModalType(null);
    }
  };

  const handleMarkComplete = () => {
    updateBooking(selectedBooking.id, { status: 'Completed' });
    setSelectedBooking(prev => ({ ...prev, status: 'Completed' }));
    setModalType(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const [startH, startM] = (formData.startTime || '08:00').split(':').map(Number);
    const [endH, endM] = (formData.endTime || '11:00').split(':').map(Number);
    const startHour = (startH || 8) + (startM || 0) / 60;
    const endHour = (endH || 11) + (endM || 0) / 60;

    const updates = {
      ...formData,
      startHour,
      endHour
    };

    updateBooking(selectedBooking.id, updates);
    setSelectedBooking(prev => ({ ...prev, ...updates }));
    setIsEditing(false);
    if (modalType === 'edit-booking') {
      setModalType('booking-detail');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <CalendarDays size={20} color="var(--lime)" />
            <span>{isEditing ? 'Edit Schedule Record' : 'Booking & Schedule Details'}</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
          >
            <X size={18} />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave}>
            <div className="modal-box-body">
              {/* Header vehicle identity summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <img
                  src={photo}
                  alt={selectedBooking.vehicleCode}
                  style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{selectedBooking.vehicleCode} · {vehicle?.plateNo || 'Assigned'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{vehicle?.makeModel || selectedBooking.category}</div>
                </div>
                <span className={`badge ${isMaint ? 'badge-warning' : 'badge-success'}`} style={{ marginLeft: 'auto' }}>
                  {isMaint ? 'Maintenance' : 'Dispatch'}
                </span>
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-col">
                  <label className="form-label">Procedure / Trip Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-col">
                  <label className="form-label">Schedule Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-col">
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-col">
                  <label className="form-label">End Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-col">
                  <label className="form-label">Assigned Driver / Custodian</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    placeholder="Enter driver or technician name"
                  />
                </div>
                <div className="form-col">
                  <label className="form-label">Destination / Facility</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. Kidapawan Central Motorpool"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-col">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Operational Notes / Work Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Specific scope of dispatch or maintenance check"
                />
              </div>
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (modalType === 'edit-booking') {
                    setModalType(null);
                  } else {
                    setIsEditing(false);
                  }
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={15} /> Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-box-body">
              {/* Photo banner */}
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                height: '140px',
                marginBottom: '1rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <img
                  src={photo}
                  alt={selectedBooking.vehicleCode}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  className={`badge ${isMaint ? 'badge-warning' : 'badge-success'}`}
                  style={{ position: 'absolute', top: 10, right: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                >
                  {isMaint ? 'Maintenance' : 'Field Dispatch'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{selectedBooking.title}</h3>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    {selectedBooking.vehicleCode} {vehicle?.plateNo ? `· ${vehicle.plateNo}` : ''}
                  </div>
                </div>
                <span className={`badge ${selectedBooking.status === 'Completed' ? 'badge-neutral' : 'badge-primary'}`}>
                  {selectedBooking.status || 'Scheduled'}
                </span>
              </div>

              <div className="inspector-box" style={{ marginBottom: '1rem' }}>
                <div className="cell-strong">{vehicle?.makeModel || selectedBooking.vehicleCode}</div>
                <div className="card-sub">{vehicle?.classification || selectedBooking.category}</div>
              </div>

              <dl className="inspector-facts" style={{ marginBottom: '1.1rem' }}>
                <div>
                  <dt>Date</dt>
                  <dd><strong>{selectedBooking.date}</strong></dd>
                </div>
                <div>
                  <dt>Time Window</dt>
                  <dd>{selectedBooking.startTime} - {selectedBooking.endTime}</dd>
                </div>
                <div>
                  <dt>Assigned Driver</dt>
                  <dd>{selectedBooking.driver}</dd>
                </div>
                <div>
                  <dt>Branch / Area</dt>
                  <dd>{selectedBooking.branch}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Destination / Facility</dt>
                  <dd>{selectedBooking.destination || selectedBooking.branch}</dd>
                </div>
              </dl>

              {selectedBooking.purpose && (
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 0.9rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Operational Work Description
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {selectedBooking.purpose}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--bad-text)', borderColor: 'var(--bad-bg)' }}
                onClick={handleDelete}
              >
                <Trash2 size={15} /> Cancel Booking
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={14} /> Edit Schedule
                </button>
                {selectedBooking.status !== 'Completed' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={handleMarkComplete}
                  >
                    <CheckCircle2 size={15} /> Mark Completed
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setModalType(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
