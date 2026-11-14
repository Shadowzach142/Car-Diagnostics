import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage } from '../../data/fleetData';
import { VehicleSelect } from '../common/VehicleSelect';
import { X, CalendarDays, Truck, Wrench, Clock, MapPin, User, FileText } from 'lucide-react';

export const BookingModal = () => {
  const {
    modalType,
    setModalType,
    selectedBooking,
    selectedVehicle,
    vehicles,
    branches,
    addBooking
  } = useFleet();

  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('DISPATCH'); // 'DISPATCH' | 'MAINTENANCE'
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-10-19');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:00');
  const [driver, setDriver] = useState('');
  const [branchId, setBranchId] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    if (modalType === 'new-booking') {
      const defaultVehicle = selectedVehicle || vehicles[0];
      setVehicleId(defaultVehicle?.id || '');
      setDriver(defaultVehicle?.assignedDriver || '');
      setBranchId(defaultVehicle?.branchId || branches[0]?.id || '');

      if (selectedBooking) {
        if (selectedBooking.date) setDate(selectedBooking.date);
        if (selectedBooking.startTime) setStartTime(selectedBooking.startTime);
        if (selectedBooking.endTime) setEndTime(selectedBooking.endTime);
        if (selectedBooking.type) setType(selectedBooking.type);
      } else {
        setDate('2026-10-19');
        setStartTime('08:00');
        setEndTime('11:00');
        setType('DISPATCH');
      }

      setTitle(type === 'MAINTENANCE' ? 'Vehicle Maintenance' : 'Field Line Dispatch');
      setDestination('');
      setPurpose('');
    }
  }, [modalType, selectedBooking, vehicles, branches]);

  // When vehicle changes, sync driver and branch
  const handleVehicleChange = (id) => {
    setVehicleId(id);
    const v = vehicles.find(item => item.id === id);
    if (v) {
      setDriver(v.assignedDriver || '');
      setBranchId(v.branchId || '');
    }
  };

  // When type changes, adjust default title
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'MAINTENANCE' && (!title || title === 'Field Line Dispatch')) {
      setTitle('Vehicle Maintenance');
    } else if (newType === 'DISPATCH' && (!title || title === 'Vehicle Maintenance')) {
      setTitle('Field Line Dispatch');
    }
  };

  if (modalType !== 'new-booking') return null;

  const selectedVehicleObj = vehicles.find(v => v.id === vehicleId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vehicleId) return;

    const v = selectedVehicleObj;
    const branchObj = branches.find(b => b.id === branchId);

    // Calculate start hour number (e.g. 7.5 for 07:30)
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startHour = (startH || 8) + (startM || 0) / 60;
    const endHour = (endH || 11) + (endM || 0) / 60;

    addBooking({
      vehicleId: v.id,
      vehicleCode: v.code,
      driver: driver || v.assignedDriver || 'Assigned Driver',
      avatar: getVehicleImage(v),
      type,
      title: title || (type === 'MAINTENANCE' ? 'Vehicle Maintenance' : 'Field Dispatch'),
      category: type === 'MAINTENANCE' ? 'Scheduled Maintenance' : 'Field Operations',
      date,
      startHour,
      endHour,
      startTime,
      endTime,
      branchId: branchId || v.branchId,
      branch: branchObj?.municipality || 'District Office',
      destination: destination || branchObj?.name || 'Assigned Sector',
      purpose: purpose || (type === 'MAINTENANCE' ? 'Scheduled vehicle service check' : 'Operational field dispatch'),
      status: 'Scheduled'
    });

    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <CalendarDays size={20} color="var(--lime)" />
            <span>Schedule Vehicle Ride or Service</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-box-body">
            {/* Type selector */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.4rem' }}>Schedule Type</label>
              <div className="segmented" style={{ width: '100%' }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: '0.55rem' }}
                  className={type === 'DISPATCH' ? 'active' : ''}
                  onClick={() => handleTypeChange('DISPATCH')}
                >
                  <Truck size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                  Vehicle Use / Field Dispatch
                </button>
                <button
                  type="button"
                  style={{ flex: 1, padding: '0.55rem' }}
                  className={type === 'MAINTENANCE' ? 'active' : ''}
                  onClick={() => handleTypeChange('MAINTENANCE')}
                >
                  <Wrench size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                  Maintenance &amp; Motorpool Service
                </button>
              </div>
            </div>

            {/* Vehicle Selection */}
            <VehicleSelect
              vehicles={vehicles}
              value={vehicleId}
              valueKey="id"
              onChange={(newId) => handleVehicleChange(newId)}
              label="Select Vehicle: *"
            />

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Activity Title: *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'MAINTENANCE' ? 'e.g. Periodic Oil & Filter Service' : 'e.g. Feeder Line Patrol'}
                required
              />
            </div>

            {/* Date and Time slots */}
            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-col">
                <label className="form-label">Scheduled Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-col">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-col">
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Driver and Location */}
            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-col">
                <label className="form-label">Assigned Driver / Lead *</label>
                <input
                  type="text"
                  className="form-input"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Driver or crew lead name"
                  required
                />
              </div>

              <div className="form-col">
                <label className="form-label">Branch / Operating Office *</label>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.municipality} ({b.name})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination / Facility */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Destination / Facility / Sector</label>
              <input
                type="text"
                className="form-input"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={type === 'MAINTENANCE' ? 'e.g. Central Motorpool Shop' : 'e.g. Feeder 3 Highway Right-of-Way'}
              />
            </div>

            {/* Purpose */}
            <div className="form-group">
              <label className="form-label">Purpose &amp; Work Description</label>
              <textarea
                className="form-input"
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Brief summary of the scheduled use or maintenance procedure"
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
              Schedule Ride / Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
