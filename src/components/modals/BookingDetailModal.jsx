import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage } from '../../data/fleetData';
import { PersonnelPickerField } from '../common/PersonnelPickerModal';
import { DateRangeCalendarField } from '../common/DateRangeCalendarModal';
import {
  X,
  CalendarDays,
  Wrench,
  Truck,
  Trash2,
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
    vehicles = [],
    drivers = [],
    editables = {},
    deleteBooking,
    updateBooking,
    settings
  } = useFleet();
  const isDriverView = settings?.currentRole === 'DRIVER';

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    vehicleCode: '',
    type: 'MAINTENANCE',
    title: '',
    date: '',
    deadline: '',
    startTime: '08:00',
    endTime: '11:00',
    driver: '',
    destination: '',
    purpose: '',
    status: 'Scheduled'
  });

  useEffect(() => {
    if (selectedBooking) {
      const startDate = selectedBooking.date || new Date().toISOString().slice(0, 10);
      const endDate = selectedBooking.deadline && selectedBooking.deadline >= startDate
        ? selectedBooking.deadline
        : startDate;
      setFormData({
        vehicleCode: selectedBooking.vehicleCode || '',
        type: selectedBooking.type === 'DISPATCH' ? 'DISPATCH' : 'MAINTENANCE',
        title: selectedBooking.title || '',
        date: startDate,
        deadline: endDate,
        startTime: selectedBooking.startTime || '08:00',
        endTime: selectedBooking.endTime || '11:00',
        driver: selectedBooking.driver || '',
        destination: selectedBooking.destination || '',
        purpose: selectedBooking.purpose || '',
        status: selectedBooking.status || 'Scheduled'
      });
      setIsEditing(!isDriverView && modalType === 'edit-booking');
    }
  }, [selectedBooking, modalType, isDriverView]);

  if ((modalType !== 'booking-detail' && modalType !== 'edit-booking') || !selectedBooking) return null;

  const isNote = selectedBooking.vehicleCode === 'NOTE' || selectedBooking.category === 'Calendar Note';
  const vehicle = vehicles.find(
    v => v.code === (isEditing ? formData.vehicleCode : selectedBooking.vehicleCode) || v.id === selectedBooking.vehicleId
  );
  const photo = (!isNote && (vehicle ? getVehicleImage(vehicle) : selectedBooking.avatar)) || null;
  const isMaint = (isEditing ? formData.type : selectedBooking.type) === 'MAINTENANCE';

  // Personnel options combining mechanics and drivers
  const personnelOptions = Array.from(
    new Set([
      ...(editables.mechanics || []),
      ...drivers.map(d => d.name),
      formData.driver
    ].filter(Boolean))
  );

  const handleDelete = () => {
    const label = isNote ? selectedBooking.title : selectedBooking.vehicleCode;
    if (confirm(`Remove this ${isNote ? 'calendar note' : 'scheduled booking'} for ${label}?`)) {
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
    if (!formData.title.trim()) return;

    const finalDeadline = formData.deadline && formData.deadline >= formData.date
      ? formData.deadline
      : formData.date;

    if (isNote) {
      const updates = {
        title: formData.title.trim(),
        date: formData.date,
        deadline: finalDeadline,
        purpose: formData.purpose.trim() || formData.title.trim()
      };
      updateBooking(selectedBooking.id, updates);
      setSelectedBooking(prev => ({ ...prev, ...updates }));
    } else {
      const [startH, startM] = (formData.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (formData.endTime || '11:00').split(':').map(Number);
      const startHour = (startH || 8) + (startM || 0) / 60;
      const endHour = Math.max(startHour + 1, (endH || 11) + (endM || 0) / 60);
      const matchedVeh = vehicles.find(v => v.code === formData.vehicleCode) || vehicle;

      const updates = {
        vehicleId: matchedVeh?.id || selectedBooking.vehicleId || '',
        vehicleCode: matchedVeh?.code || formData.vehicleCode || selectedBooking.vehicleCode,
        avatar: matchedVeh ? getVehicleImage(matchedVeh) : selectedBooking.avatar,
        type: formData.type,
        category: formData.type === 'MAINTENANCE' ? 'Vehicle Maintenance' : 'Vehicle Inspection / Test',
        title: formData.title.trim(),
        date: formData.date,
        deadline: finalDeadline,
        startTime: formData.startTime || '08:00',
        endTime: formData.endTime || '11:00',
        startHour,
        endHour,
        driver: formData.driver.trim() || selectedBooking.driver,
        destination: formData.destination.trim() || selectedBooking.destination,
        purpose: formData.purpose.trim(),
        status: formData.status
      };

      updateBooking(selectedBooking.id, updates);
      setSelectedBooking(prev => ({ ...prev, ...updates }));
    }

    setIsEditing(false);
    if (modalType === 'edit-booking') {
      setModalType('booking-detail');
    }
  };

  const viewEndDate = selectedBooking.deadline && selectedBooking.deadline > selectedBooking.date
    ? selectedBooking.deadline
    : null;

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: isNote ? '480px' : '540px' }}
      >
        <div className="modal-box-header">
          <div className="modal-box-title">
            <CalendarDays size={19} />
            <span>
              {isEditing
                ? (isNote ? 'Edit Calendar Note' : 'Edit Vehicle Schedule')
                : (isNote ? 'Calendar Note Details' : 'Vehicle Schedule Details')}
            </span>
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

        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
              {!isNote && (
                <>
                  {/* Vehicle Summary / Selector */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px'
                  }}>
                    {photo && (
                      <img
                        src={photo}
                        alt={formData.vehicleCode}
                        style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <select
                        className="form-select"
                        value={formData.vehicleCode}
                        onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                        style={{ minHeight: '34px', fontSize: '0.82rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}
                        aria-label="Select vehicle"
                      >
                        {vehicles.map(v => (
                          <option key={v.id} value={v.code}>
                            {v.code} &bull; {v.plateNo} ({v.makeModel})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Schedule Type & Status */}
                  <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Schedule Type</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'MAINTENANCE' })}
                          style={{
                            padding: '0.45rem 0.5rem',
                            borderRadius: '7px',
                            border: formData.type === 'MAINTENANCE' ? '1.5px solid var(--text-main)' : '1px solid var(--border-light)',
                            background: formData.type === 'MAINTENANCE' ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Wrench size={13} /> Maintenance
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'DISPATCH' })}
                          style={{
                            padding: '0.45rem 0.5rem',
                            borderRadius: '7px',
                            border: formData.type === 'DISPATCH' ? '1.5px solid var(--text-main)' : '1px solid var(--border-light)',
                            background: formData.type === 'DISPATCH' ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Truck size={13} /> Inspection
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
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
                </>
              )}

              {/* Click-and-Drag Calendar Duration Picker */}
              <DateRangeCalendarField
                label={isNote ? 'Note Date Range' : 'Schedule Duration (Start → Due) *'}
                startDate={formData.date}
                endDate={formData.deadline}
                personLabel={(formData.driver || '').split(' (')[0]}
                onChange={(newStart, newEnd) =>
                  setFormData(prev => ({ ...prev, date: newStart, deadline: newEnd }))
                }
              />

              {!isNote && (
                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{isNote ? 'Note Title *' : 'Schedule Title / Task *'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {!isNote && (
                <>
                  <PersonnelPickerField
                    label="Assigned Personnel *"
                    value={formData.driver}
                    drivers={drivers}
                    departments={editables.departments || []}
                    onChange={(name) => setFormData(prev => ({ ...prev, driver: name }))}
                  />

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Bay / Facility / Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g. COTELCO Central Motorpool"
                    />
                  </div>
                </>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{isNote ? 'Note Details (Optional)' : 'Scope / Mechanic Notes (Optional)'}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder={isNote ? 'Write your note here...' : 'Describe maintenance work or schedule details...'}
                  style={{ resize: 'vertical' }}
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
              {/* Photo banner for vehicle schedules */}
              {!isNote && photo && (
                <div style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  height: '136px',
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
                    {isMaint ? 'Maintenance' : 'Inspection / Dispatch'}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.9rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0 }}>{selectedBooking.title}</h3>
                  {!isNote && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {selectedBooking.vehicleCode} {vehicle?.plateNo ? `· ${vehicle.plateNo}` : ''}
                      {vehicle?.makeModel ? ` · ${vehicle.makeModel}` : ''}
                    </div>
                  )}
                </div>
                <span className={`badge ${selectedBooking.status === 'Completed' ? 'badge-ok' : 'badge-muted'}`}>
                  {selectedBooking.status || 'Scheduled'}
                </span>
              </div>

              <dl className="inspector-facts" style={{ marginBottom: '1rem' }}>
                <div>
                  <dt>{viewEndDate ? 'Schedule Duration' : 'Date'}</dt>
                  <dd className="mono">
                    <strong>{viewEndDate ? `${selectedBooking.date} → ${viewEndDate}` : selectedBooking.date}</strong>
                  </dd>
                </div>
                {!isNote && (
                  <div>
                    <dt>Time Window</dt>
                    <dd className="mono">{selectedBooking.startTime || '08:00'} – {selectedBooking.endTime || '11:00'}</dd>
                  </div>
                )}
                {!isNote && (
                  <div>
                    <dt>Assigned Personnel</dt>
                    <dd>{(selectedBooking.driver || '').split(' (')[0] || 'Motorpool Staff'}</dd>
                  </div>
                )}
                {!isNote && (
                  <div>
                    <dt>Bay / Facility</dt>
                    <dd>{selectedBooking.destination || selectedBooking.branch || 'Central Motorpool'}</dd>
                  </div>
                )}
              </dl>

              {selectedBooking.purpose && (
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                    {isNote ? 'Note Details' : 'Scope / Notes'}
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {selectedBooking.purpose}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              {isDriverView ? (
                <>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>View only — schedules are managed by the Operations Director.</span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setModalType(null)}>Close</button>
                </>
              ) : (
              <>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--bad-text)', borderColor: '#FECACA' }}
                onClick={handleDelete}
              >
                <Trash2 size={14} /> {isNote ? 'Delete Note' : 'Cancel Schedule'}
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={14} /> {isNote ? 'Edit Note' : 'Edit Schedule'}
                </button>
                {!isNote && selectedBooking.status !== 'Completed' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleMarkComplete}
                  >
                    <CheckCircle2 size={14} /> Mark Completed
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
