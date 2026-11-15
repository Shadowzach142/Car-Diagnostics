import React, { useState, useEffect, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { WORK_ORDER_STAGES, DEFAULT_EDITABLES } from '../../data/fleetData';
import { VehicleSelect } from '../common/VehicleSelect';
import {
  X,
  Wrench,
  UserCheck,
  Gauge,
  CalendarDays,
  Layers,
  Activity
} from 'lucide-react';

export const NewWorkOrderModal = () => {
  const {
    modalType,
    setModalType,
    selectedVehicle,
    vehicles,
    editables = {},
    createWorkOrder
  } = useFleet();

  const serviceCategories = editables.serviceCategories || DEFAULT_EDITABLES.serviceCategories;
  const tasksMap = editables.serviceTasksByCategory || DEFAULT_EDITABLES.serviceTasksByCategory;
  const mechanics = editables.mechanics || DEFAULT_EDITABLES.mechanics;

  const [vehicleCode, setVehicleCode] = useState('');
  const [category, setCategory] = useState(serviceCategories[0] || 'Preventive Maintenance (PMS)');
  const [selectedTask, setSelectedTask] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [currentStage, setCurrentStage] = useState('Active Repair / Servicing');
  const [assignedMechanic, setAssignedMechanic] = useState(mechanics[0] || '');
  const [customMechanic, setCustomMechanic] = useState('');
  const [priority, setPriority] = useState('ROUTINE');

  // Interval / Diagnostic Target Settings (KM, Date, or Both)
  const [trackMode, setTrackMode] = useState('BOTH'); // 'KM' | 'DATE' | 'BOTH'
  const [intervalKm, setIntervalKm] = useState(5000);
  const [targetKm, setTargetKm] = useState(35000);
  const [targetCompletion, setTargetCompletion] = useState('');
  const [intervalMonths, setIntervalMonths] = useState(6);
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [description, setDescription] = useState('');

  // Available tasks for the currently selected category
  const categoryTasks = useMemo(() => {
    const list = tasksMap[category] || DEFAULT_EDITABLES.serviceTasksByCategory[category] || [
      'Engine Oil & Oil Filter Change (5,000 km)',
      '10,000 km Periodic Maintenance Service',
      'Comprehensive Multi-Point Safety Diagnostic'
    ];
    return list;
  }, [category, tasksMap]);

  const defaultReturnDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().substring(0, 10);
  };

  const addMonthsToToday = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(months || 6));
    return d.toISOString().substring(0, 10);
  };

  // Sync defaults when modal opens or selectedVehicle changes
  useEffect(() => {
    if (modalType !== 'new-wo') return;
    const target = selectedVehicle || vehicles[0];
    if (target) {
      setVehicleCode(target.code);
      const odo = Number(target.odometerKm) || 20000;
      const defCat = serviceCategories[0] || 'Preventive Maintenance (PMS)';
      setCategory(defCat);
      const firstTasks = tasksMap[defCat] || DEFAULT_EDITABLES.serviceTasksByCategory[defCat] || [];
      setSelectedTask(firstTasks[0] || 'Engine Oil & Oil Filter Change (5,000 km)');
      setCustomTask('');
      setCurrentStage('Active Repair / Servicing');
      setAssignedMechanic(mechanics[0] || 'Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)');
      setCustomMechanic('');
      setIntervalKm(5000);
      setTargetKm(odo + 5000);
      setTargetCompletion(defaultReturnDate());
      setIntervalMonths(6);
      setNextServiceDate(addMonthsToToday(6));
      setDescription('');
    }
  }, [modalType, selectedVehicle]);

  // Update task dropdown when category changes
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const list = tasksMap[newCat] || DEFAULT_EDITABLES.serviceTasksByCategory[newCat] || [];
    setSelectedTask(list[0] || 'OTHER');
  };

  if (modalType !== 'new-wo') return null;

  const activeVeh = vehicles.find(v => v.code === vehicleCode);
  const currentOdo = Number(activeVeh?.odometerKm) || 0;

  const handleIntervalChange = (val) => {
    const num = Number(val) || 0;
    setIntervalKm(num);
    setTargetKm(currentOdo + num);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalType = selectedTask === 'OTHER'
      ? (customTask.trim() || category)
      : selectedTask;

    const finalMechanic = assignedMechanic === 'OTHER'
      ? (customMechanic.trim() || 'Assigned Motorpool Specialist')
      : assignedMechanic;

    createWorkOrder({
      vehicleCode,
      plateNo: activeVeh ? activeVeh.plateNo : '',
      classification: activeVeh ? activeVeh.classification : '',
      branchId: activeVeh ? activeVeh.branchId : 'BR-KID',
      type: finalType,
      category,
      priority,
      currentStage,
      assignedMechanic: finalMechanic,
      facility: 'COTELCO Motorpool & Diagnostic Bay',
      estimatedCost: 0,
      targetCompletion: targetCompletion || defaultReturnDate(),
      targetKm: (trackMode === 'KM' || trackMode === 'BOTH') ? Number(targetKm) : activeVeh?.nextServiceDueKm,
      nextServiceDate: (trackMode === 'DATE' || trackMode === 'BOTH') ? nextServiceDate : activeVeh?.nextServiceDueDate,
      description: description.trim() || `${finalType} — Assigned to ${finalMechanic}`,
      reportedBy: activeVeh?.assignedDriver || 'Operations Director'
    });

    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Wrench size={19} color="var(--primary)" />
            <span>Add Vehicle to Maintenance &amp; Diagnostics</span>
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
          <div className="modal-box-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1rem' }}>
              Select a service category to filter common maintenance tasks, assign a repair specialist, and set the next diagnostic interval by mileage (km) or date.
            </p>

            {/* 1. Vehicle Selection */}
            <VehicleSelect
              vehicles={vehicles}
              value={vehicleCode}
              onChange={(val, veh) => {
                setVehicleCode(val);
                if (veh) {
                  const odo = Number(veh.odometerKm) || 0;
                  setTargetKm(odo + Number(intervalKm || 5000));
                }
              }}
              label="Select Utility Vehicle: *"
              valueKey="code"
            />

            {/* Current Odometer & Status Context Banner */}
            {activeVeh && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.55rem 0.85rem',
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Current Odometer: <strong className="mono" style={{ color: 'var(--text-main)' }}>{currentOdo.toLocaleString()} km</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Last Service: <strong className="mono" style={{ color: 'var(--text-main)' }}>{activeVeh.lastServiceDate || 'N/A'}</strong>
                </span>
              </div>
            )}

            {/* 2. Category -> Dependent Task Dropdown */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Layers size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  1. Service Category: *
                </label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                >
                  {serviceCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Wrench size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  2. Maintenance / Diagnostic Task: *
                </label>
                <select
                  className="form-select"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  required
                >
                  {categoryTasks.map(task => (
                    <option key={task} value={task}>{task}</option>
                  ))}
                  <option value="OTHER">Other (Type custom maintenance task...)</option>
                </select>
              </div>
            </div>

            {/* Custom Task Input when "Other" is chosen */}
            {selectedTask === 'OTHER' && (
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Specify Custom Maintenance / Diagnostic Task: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type specific repair or diagnostic work required..."
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {/* 3. Assigned Repair Personnel & Current Maintenance Step */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <UserCheck size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Assigned Repair Personnel / Specialist: *
                </label>
                <select
                  className="form-select"
                  value={assignedMechanic}
                  onChange={(e) => setAssignedMechanic(e.target.value)}
                  required
                >
                  {mechanics.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="OTHER">Other (Type repair specialist name...)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Activity size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Maintenance Step / Stage: *
                </label>
                <select
                  className="form-select"
                  value={currentStage}
                  onChange={(e) => setCurrentStage(e.target.value)}
                  required
                >
                  {WORK_ORDER_STAGES.filter(s => s !== 'Completed / Released').map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {assignedMechanic === 'OTHER' && (
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Specify Assigned Mechanic / Specialist: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Engr. R. Villanueva / External Specialist..."
                  value={customMechanic}
                  onChange={(e) => setCustomMechanic(e.target.value)}
                  required
                />
              </div>
            )}

            {/* 4. Next Change / Service Interval (Track by KM, Date, or Both) */}
            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '0.85rem',
              marginBottom: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Next Service / Oil Change Trigger
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[
                    { id: 'BOTH', label: 'By KM + Date' },
                    { id: 'KM', label: 'By Odometer (KM)' },
                    { id: 'DATE', label: 'By Date Only' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      className="btn btn-xs"
                      onClick={() => setTrackMode(mode.id)}
                      style={{
                        background: trackMode === mode.id ? 'var(--text-primary)' : 'var(--bg-card)',
                        color: trackMode === mode.id ? '#FFFFFF' : 'var(--text-secondary)',
                        border: `1px solid ${trackMode === mode.id ? 'var(--text-primary)' : 'var(--border-light)'}`,
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.72rem'
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.65rem' }}>
                {(trackMode === 'KM' || trackMode === 'BOTH') && (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>
                        <Gauge size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                        Interval (+KM):
                      </label>
                      <select
                        className="form-select"
                        value={intervalKm}
                        onChange={(e) => handleIntervalChange(e.target.value)}
                      >
                        <option value={3000}>Every 3,000 km</option>
                        <option value={5000}>Every 5,000 km (Oil Change)</option>
                        <option value={10000}>Every 10,000 km (PMS)</option>
                        <option value={20000}>Every 20,000 km (Major)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>
                        Next Due Odometer (KM):
                      </label>
                      <input
                        type="number"
                        className="form-input mono"
                        value={targetKm}
                        onChange={(e) => setTargetKm(e.target.value)}
                        step="500"
                      />
                    </div>
                  </>
                )}

                {(trackMode === 'DATE' || trackMode === 'BOTH') && (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>
                        <CalendarDays size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                        Date Interval (Auto):
                      </label>
                      <select
                        className="form-select"
                        value={intervalMonths}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setIntervalMonths('CUSTOM');
                          } else {
                            const months = Number(val);
                            setIntervalMonths(months);
                            setNextServiceDate(addMonthsToToday(months));
                          }
                        }}
                      >
                        <option value={1}>Every 1 month</option>
                        <option value={2}>Every 2 months</option>
                        <option value={3}>Every 3 months</option>
                        <option value={4}>Every 4 months</option>
                        <option value={6}>Every 6 months</option>
                        <option value={12}>Every 12 months (1 yr)</option>
                        <option value="CUSTOM">Custom Date</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>
                        Next Due Date:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={nextServiceDate}
                        onChange={(e) => {
                          setIntervalMonths('CUSTOM');
                          setNextServiceDate(e.target.value);
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>
                    Est. Completion Date:
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={targetCompletion}
                    onChange={(e) => setTargetCompletion(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 5. Priority & Diagnostic Notes */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Urgency:</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Diagnostic Notes / Findings (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Check oil viscosity, inspect brake pad wear, test battery..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
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
              Add to Maintenance Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
