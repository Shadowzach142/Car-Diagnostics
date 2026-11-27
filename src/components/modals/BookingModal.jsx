import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage } from '../../data/fleetData';
import { PersonnelPickerField } from '../common/PersonnelPickerModal';
import { DateRangeCalendarField } from '../common/DateRangeCalendarModal';
import { X, CalendarDays, Wrench, Truck } from 'lucide-react';

export const BookingModal = () => {
  const {
    modalType,
    setModalType,
    selectedBooking,
    addBooking,
    vehicles = [],
    branches = [],
    drivers = [],
    editables = {},
    settings
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechShort = (settings?.currentMechanic || 'Assigned Mechanic').split(' (')[0].trim();

  const [entryMode, setEntryMode] = useState('note'); // 'schedule' | 'note'
  const [vehicleCode, setVehicleCode] = useState('');
  const [scheduleType, setScheduleType] = useState('MAINTENANCE'); // 'MAINTENANCE' | 'DISPATCH'
  const [assignedPerson, setAssignedPerson] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:00');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    if (modalType === 'new-booking') {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const initialDate = selectedBooking?.date || todayStr;
      const shouldDefaultSchedule =
        isMechanic ||
        selectedBooking?.mode === 'schedule' ||
        Boolean(selectedBooking?.vehicleCode && selectedBooking.vehicleCode !== 'NOTE');
      const initVehCode = selectedBooking?.vehicleCode && selectedBooking.vehicleCode !== 'NOTE'
        ? selectedBooking.vehicleCode
        : (vehicles[0]?.code || '');
      const initVeh = vehicles.find(v => v.code === initVehCode) || vehicles[0];

      setEntryMode(shouldDefaultSchedule ? 'schedule' : 'note');
      setVehicleCode(initVehCode);
      setScheduleType(selectedBooking?.type === 'DISPATCH' ? 'DISPATCH' : 'MAINTENANCE');
      setAssignedPerson(isMechanic ? mechShort : (initVeh?.assignedDriver || drivers[0]?.name || 'Engr. Mateo R. Villanueva'));
      setDate(initialDate);
      setDeadline(selectedBooking?.deadline || initialDate);
      setStartTime(selectedBooking?.startTime || '08:00');
      setEndTime(selectedBooking?.endTime || '11:00');
      setTitle('');
      setDestination(isMechanic ? 'COTELCO Central Motorpool' : '');
      setPurpose('');
    }
  }, [modalType, selectedBooking, isMechanic, mechShort, vehicles, drivers]);

  if (modalType !== 'new-booking') return null;

  const selectedVeh = vehicles.find(v => v.code === vehicleCode) || vehicles[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalDeadline = deadline && deadline >= date ? deadline : date;

    if (entryMode === 'schedule' && selectedVeh) {
      const branchObj = branches.find(b => b.id === selectedVeh.branchId);
      const [sH, sM] = (startTime || '08:00').split(':').map(Number);
      const [eH, eM] = (endTime || '11:00').split(':').map(Number);
      const startHour = (sH || 8) + (sM || 0) / 60;
      const endHour = Math.max(startHour + 1, (eH || 11) + (eM || 0) / 60);

      addBooking({
        vehicleId: selectedVeh.id,
        vehicleCode: selectedVeh.code,
        driver: isMechanic ? settings.currentMechanic : (assignedPerson || selectedVeh.assignedDriver || 'Pool Operator'),
        avatar: getVehicleImage(selectedVeh),
        type: scheduleType,
        title: title.trim(),
        category: scheduleType === 'MAINTENANCE' ? 'Vehicle Maintenance' : 'Vehicle Inspection / Test',
        date,
        deadline: finalDeadline,
        startHour,
        endHour,
        startTime: startTime || '08:00',
        endTime: endTime || '11:00',
        branchId: selectedVeh.branchId || 'BR-KID',
        branch: branchObj?.municipality || 'Central HQ',
        destination: destination.trim() || (scheduleType === 'MAINTENANCE' ? 'COTELCO Central Motorpool' : 'Field Test Route'),
        purpose: purpose.trim() || title.trim(),
        status: 'Scheduled'
      });
    } else {
      addBooking({
        vehicleId: '',
        vehicleCode: 'NOTE',
        driver: 'Operations Note',
        avatar: '',
        type: 'DISPATCH',
        title: title.trim(),
        category: 'Calendar Note',
        date,
        deadline: finalDeadline,
        startHour: 8,
        endHour: 11,
        startTime: '08:00',
        endTime: '11:00',
        branchId: 'BR-KID',
        branch: 'Operations',
        destination: 'Calendar Note',
        purpose: purpose.trim() || title.trim(),
        status: 'Scheduled'
      });
    }

    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: entryMode === 'schedule' ? '520px' : '460px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <CalendarDays size={19} />
            <span>{entryMode === 'schedule' ? 'Add Vehicle Schedule' : 'Add Calendar Note'}</span>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
            {!isMechanic && (
              <div
                role="tablist"
                aria-label="Entry mode"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '4px',
                  background: 'var(--bg-surface-subtle)',
                  padding: '4px',
                  borderRadius: '9px',
                  border: '1px solid var(--border-light)'
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={entryMode === 'note'}
                  onClick={() => setEntryMode('note')}
                  style={{
                    height: '32px',
                    borderRadius: '6px',
                    border: entryMode === 'note' ? '1px solid var(--border-light)' : '1px solid transparent',
                    background: entryMode === 'note' ? 'var(--bg-surface)' : 'transparent',
                    color: entryMode === 'note' ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: entryMode === 'note' ? 700 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Calendar Note
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={entryMode === 'schedule'}
                  onClick={() => setEntryMode('schedule')}
                  style={{
                    height: '32px',
                    borderRadius: '6px',
                    border: entryMode === 'schedule' ? '1px solid var(--border-light)' : '1px solid transparent',
                    background: entryMode === 'schedule' ? 'var(--bg-surface)' : 'transparent',
                    color: entryMode === 'schedule' ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: entryMode === 'schedule' ? 700 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Vehicle Schedule
                </button>
              </div>
            )}

            {entryMode === 'schedule' && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Select Vehicle *</label>
                  <select
                    className="form-select"
                    value={vehicleCode}
                    onChange={(e) => setVehicleCode(e.target.value)}
                    required
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.code}>
                        {v.code} &bull; {v.plateNo} ({v.makeModel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Schedule Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => setScheduleType('MAINTENANCE')}
                      style={{
                        padding: '0.48rem 0.6rem',
                        borderRadius: '8px',
                        border: scheduleType === 'MAINTENANCE' ? '1.5px solid var(--text-main)' : '1px solid var(--border-light)',
                        background: scheduleType === 'MAINTENANCE' ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        color: 'var(--text-main)'
                      }}
                    >
                      <Wrench size={14} /> Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType('DISPATCH')}
                      style={{
                        padding: '0.48rem 0.6rem',
                        borderRadius: '8px',
                        border: scheduleType === 'DISPATCH' ? '1.5px solid var(--text-main)' : '1px solid var(--border-light)',
                        background: scheduleType === 'DISPATCH' ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        color: 'var(--text-main)'
                      }}
                    >
                      <Truck size={14} /> Inspection / Dispatch
                    </button>
                  </div>
                </div>

                <PersonnelPickerField
                  label={isMechanic ? 'Scheduled By (Mechanic)' : 'Assigned Personnel'}
                  value={isMechanic ? mechShort : assignedPerson}
                  drivers={drivers}
                  departments={editables.departments || []}
                  readOnly={isMechanic}
                  onChange={(name) => setAssignedPerson(name)}
                />
              </>
            )}

            <DateRangeCalendarField
              label={entryMode === 'schedule' ? 'Schedule Duration (Start → Due) *' : 'Note Date Range *'}
              startDate={date}
              endDate={deadline}
              personLabel={isMechanic ? mechShort : assignedPerson}
              onChange={(newStart, newEnd) => {
                setDate(newStart);
                setDeadline(newEnd);
              }}
            />

            {entryMode === 'schedule' && (
              <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{entryMode === 'schedule' ? 'Schedule Title / Task *' : 'Note Title *'}</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={entryMode === 'schedule' ? 'e.g. Preventive Maintenance & Brake Check' : 'e.g. Monthly fleet inspection reminder'}
                autoFocus
                required
              />
            </div>

            {entryMode === 'schedule' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Bay / Facility / Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. COTELCO Central Motorpool Bay 2"
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{entryMode === 'schedule' ? 'Scope / Mechanic Notes (Optional)' : 'Note Details (Optional)'}</label>
              <textarea
                className="form-input"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={entryMode === 'schedule' ? 'Describe maintenance work or schedule details...' : 'Write your note here...'}
                style={{ resize: 'vertical' }}
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
            <button
              type="submit"
              className="btn btn-primary"
            >
              {entryMode === 'schedule' ? 'Save Vehicle Schedule' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
