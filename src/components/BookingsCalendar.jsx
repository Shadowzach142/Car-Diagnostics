import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import { formatVehicleShort, VEHICLE_GROUPS } from '../utils/formatters';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Wrench,
  Truck,
  RotateCcw,
  CheckCircle2,
  FileText,
  Printer,
  Pencil
} from 'lucide-react';

const HOURS = [
  { val: 7, label: '07.00 am' },
  { val: 8, label: '08.00 am' },
  { val: 9, label: '09.00 am' },
  { val: 10, label: '10.00 am' },
  { val: 11, label: '11.00 am' },
  { val: 12, label: '12.00 pm' },
  { val: 13, label: '01.00 pm' },
  { val: 14, label: '02.00 pm' },
  { val: 15, label: '03.00 pm' },
  { val: 16, label: '04.00 pm' },
  { val: 17, label: '05.00 pm' }
];

// Helper to format ISO date YYYY-MM-DD
const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Anchor around Oct 19, 2026
const INITIAL_DATE = new Date(2026, 9, 19); // Oct is month index 9

export const BookingsCalendar = () => {
  const {
    vehicles,
    branches,
    bookings,
    setSelectedVehicle,
    setSelectedBooking,
    setModalType,
    updateBooking,
    updateVehicle
  } = useFleet();

  const [currentDate, setCurrentDate] = useState(INITIAL_DATE);
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'MAINTENANCE', 'DISPATCH'
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Drag and Drop Rescheduling state
  const [draggedBookingId, setDraggedBookingId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [rescheduleNotice, setRescheduleNotice] = useState(null);

  // Compute week days (Monday - Friday or Monday - Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    // Find Monday of current week
    const day = curr.getDay(); // 0 is Sun, 1 is Mon
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const days = [];
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        name: names[i],
        dayNum: d.getDate(),
        dateStr: formatDateStr(d),
        dateObj: d,
        isToday: formatDateStr(d) === '2026-10-19'
      });
    }
    return days;
  }, [currentDate]);

  // Compute Month days
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start on Monday
    const startDayIndex = (firstDay.getDay() + 6) % 7; // 0 for Mon
    const totalDays = lastDay.getDate();

    const cells = [];
    // Previous month padding
    for (let i = 0; i < startDayIndex; i++) {
      const prevDate = new Date(year, month, 1 - (startDayIndex - i));
      cells.push({
        dateStr: formatDateStr(prevDate),
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: formatDateStr(prevDate) === '2026-10-19'
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(year, month, d);
      cells.push({
        dateStr: formatDateStr(thisDate),
        dayNum: d,
        isCurrentMonth: true,
        isToday: formatDateStr(thisDate) === '2026-10-19'
      });
    }

    // Trailing padding to fill complete weeks (multiples of 7)
    while (cells.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, cells.length - totalDays - startDayIndex + 1);
      cells.push({
        dateStr: formatDateStr(nextDate),
        dayNum: nextDate.getDate(),
        isCurrentMonth: false,
        isToday: formatDateStr(nextDate) === '2026-10-19'
      });
    }

    return cells;
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 19));
  };

  // Header Title
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const headerTitle = useMemo(() => {
    const m = monthNames[currentDate.getMonth()];
    const y = currentDate.getFullYear();
    const isToday = formatDateStr(currentDate) === '2026-10-19';

    if (viewMode === 'day') {
      return `${m} ${currentDate.getDate()}, ${y}`;
    }
    return `${isToday ? 'Today, ' : ''}${m} ${y}`;
  }, [currentDate, viewMode]);

  // Synthesize Insurance & LTO Registration milestones from each vehicle's dates
  const allCalendarEvents = useMemo(() => {
    const complianceEvents = [];

    (vehicles || []).forEach(v => {
      const branch = (branches || []).find(b => b.id === v.branchId);
      const photo = getVehicleImage(v);

      // 1. Insurance Expiration Event
      if (v.insuranceExpiryDate) {
        complianceEvents.push({
          id: `INS-EXP-${v.id}`,
          vehicleId: v.id,
          vehicleCode: v.code,
          driver: v.assignedDriver || 'Motorpool Custodian',
          avatar: photo,
          type: 'COMPLIANCE',
          complianceSubType: 'INSURANCE_EXPIRY',
          title: `Insurance Expiry (${v.insuranceAcquiredDate || 'Acq'} → ${v.insuranceExpiryDate})`,
          category: 'Insurance Expiration',
          date: v.insuranceExpiryDate,
          startHour: 9,
          endHour: 11,
          startTime: '09:00',
          endTime: '11:00',
          branchId: v.branchId,
          branch: branch?.municipality || 'Central HQ',
          destination: 'GSIS / Commercial Fleet Insurance Renewal',
          purpose: `Fleet Insurance Policy Term: Acquired ${v.insuranceAcquiredDate || 'N/A'} — Expires ${v.insuranceExpiryDate}.`,
          status: 'Scheduled',
          isComplianceRecord: true
        });
      }

      // 2. Insurance Acquired Event
      if (v.insuranceAcquiredDate) {
        complianceEvents.push({
          id: `INS-ACQ-${v.id}`,
          vehicleId: v.id,
          vehicleCode: v.code,
          driver: v.assignedDriver || 'Motorpool Custodian',
          avatar: photo,
          type: 'COMPLIANCE',
          complianceSubType: 'INSURANCE_ACQUIRED',
          title: `Insurance Acquired (${v.insuranceAcquiredDate} → ${v.insuranceExpiryDate || 'Exp'})`,
          category: 'Insurance Acquired',
          date: v.insuranceAcquiredDate,
          startHour: 9,
          endHour: 10,
          startTime: '09:00',
          endTime: '10:00',
          branchId: v.branchId,
          branch: branch?.municipality || 'Central HQ',
          destination: 'GSIS / Commercial Fleet Insurance Policy',
          purpose: `Fleet Insurance Policy Effective Date: ${v.insuranceAcquiredDate} — Valid until ${v.insuranceExpiryDate || 'N/A'}.`,
          status: 'Completed',
          isComplianceRecord: true
        });
      }

      // 3. LTO Registration Expiration Event
      if (v.registrationExpiryDate) {
        complianceEvents.push({
          id: `REG-EXP-${v.id}`,
          vehicleId: v.id,
          vehicleCode: v.code,
          driver: v.assignedDriver || 'Motorpool Custodian',
          avatar: photo,
          type: 'COMPLIANCE',
          complianceSubType: 'REGISTRATION_EXPIRY',
          title: `LTO Registration Expiry (${v.registrationAcquiredDate || 'Reg'} → ${v.registrationExpiryDate})`,
          category: 'LTO Registration Expiration',
          date: v.registrationExpiryDate,
          startHour: 14,
          endHour: 16,
          startTime: '14:00',
          endTime: '16:00',
          branchId: v.branchId,
          branch: branch?.municipality || 'Central HQ',
          destination: 'LTO District Office (OR/CR Renewal)',
          purpose: `LTO OR/CR (${v.orCrNo || 'OR/CR'}) Term: Registered ${v.registrationAcquiredDate || 'N/A'} — Expires ${v.registrationExpiryDate}.`,
          status: 'Scheduled',
          isComplianceRecord: true
        });
      }

      // 4. LTO Registration Acquired Event
      if (v.registrationAcquiredDate) {
        complianceEvents.push({
          id: `REG-ACQ-${v.id}`,
          vehicleId: v.id,
          vehicleCode: v.code,
          driver: v.assignedDriver || 'Motorpool Custodian',
          avatar: photo,
          type: 'COMPLIANCE',
          complianceSubType: 'REGISTRATION_ACQUIRED',
          title: `LTO Registered (${v.registrationAcquiredDate} → ${v.registrationExpiryDate || 'Exp'})`,
          category: 'LTO Registration Acquired',
          date: v.registrationAcquiredDate,
          startHour: 14,
          endHour: 15,
          startTime: '14:00',
          endTime: '15:00',
          branchId: v.branchId,
          branch: branch?.municipality || 'Central HQ',
          destination: 'LTO District Office',
          purpose: `LTO OR/CR (${v.orCrNo || 'OR/CR'}) Date Registered: ${v.registrationAcquiredDate} — Valid until ${v.registrationExpiryDate || 'N/A'}.`,
          status: 'Completed',
          isComplianceRecord: true
        });
      }
    });

    return [...(bookings || []), ...complianceEvents];
  }, [bookings, vehicles, branches]);

  // Filtered Bookings & Compliance Events
  const filteredBookings = useMemo(() => {
    return allCalendarEvents.filter(b => {
      if (vehicleFilter !== 'ALL' && b.vehicleCode !== vehicleFilter && b.vehicleId !== vehicleFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && b.type !== typeFilter) {
        return false;
      }
      if (branchFilter !== 'ALL' && b.branchId !== branchFilter) {
        return false;
      }
      return true;
    });
  }, [allCalendarEvents, vehicleFilter, typeFilter, branchFilter]);

  // Click on a booking or compliance record
  const handleBookingClick = (booking) => {
    if (booking.isComplianceRecord) {
      const targetVeh = vehicles.find(v => v.id === booking.vehicleId || v.code === booking.vehicleCode);
      if (targetVeh) {
        setSelectedVehicle(targetVeh);
        setModalType('vehicle-detail');
        return;
      }
    }
    setSelectedBooking(booking);
    setModalType('booking-detail');
  };

  // Drag and Drop drop handler to reschedule (also updates vehicle insurance/registration date if dragged!)
  const handleDropSlot = (targetDateStr, targetHourVal) => {
    setDragOverSlot(null);
    if (!draggedBookingId) return;

    const b = allCalendarEvents.find(item => item.id === draggedBookingId);
    if (!b) return;

    if (b.isComplianceRecord) {
      if (b.complianceSubType === 'INSURANCE_EXPIRY') {
        updateVehicle(b.vehicleId, { insuranceExpiryDate: targetDateStr });
      } else if (b.complianceSubType === 'INSURANCE_ACQUIRED') {
        updateVehicle(b.vehicleId, { insuranceAcquiredDate: targetDateStr });
      } else if (b.complianceSubType === 'REGISTRATION_EXPIRY') {
        updateVehicle(b.vehicleId, { registrationExpiryDate: targetDateStr });
      } else if (b.complianceSubType === 'REGISTRATION_ACQUIRED') {
        updateVehicle(b.vehicleId, { registrationAcquiredDate: targetDateStr });
      }
      setRescheduleNotice(`Updated ${b.vehicleCode} (${b.category}) date to ${targetDateStr}`);
      setTimeout(() => setRescheduleNotice(null), 4500);
      setDraggedBookingId(null);
      return;
    }

    const duration = (b.endHour && b.startHour && b.endHour > b.startHour)
      ? (b.endHour - b.startHour)
      : 1.5;

    const newStartHour = targetHourVal;
    const newEndHour = Number((targetHourVal + duration).toFixed(2));
    const newStartTime = `${String(targetHourVal).padStart(2, '0')}:00`;
    const newEndTime = `${String(Math.min(23, Math.ceil(newEndHour))).padStart(2, '0')}:00`;

    updateBooking(b.id, {
      date: targetDateStr,
      startHour: newStartHour,
      endHour: newEndHour,
      startTime: newStartTime,
      endTime: newEndTime
    });

    const hourLabel = HOURS.find(h => h.val === targetHourVal)?.label || `${targetHourVal}:00`;
    setRescheduleNotice(`Rescheduled ${b.vehicleCode} (${b.title}) to ${targetDateStr} at ${hourLabel}`);
    setTimeout(() => {
      setRescheduleNotice(null);
    }, 4500);

    setDraggedBookingId(null);
  };

  return (
    <div className="page">
      {/* Top filter toolbar */}
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          aria-label="Filter by vehicle"
        >
          <option value="ALL">All vehicles</option>
          {VEHICLE_GROUPS.map(g => {
            const gVehs = vehicles.filter(v => v.classification === g.key);
            if (gVehs.length === 0) return null;
            return (
              <optgroup key={g.key} label={g.label}>
                {gVehs.map(v => (
                  <option key={v.id} value={v.code}>
                    {formatVehicleShort(v)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        <select
          className="form-select toolbar-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by schedule type"
        >
          <option value="ALL">All schedule types</option>
          <option value="DISPATCH">Trips &amp; Dispatches</option>
          <option value="MAINTENANCE">Maintenance &amp; PMS</option>
          <option value="COMPLIANCE">Insurance &amp; Registration</option>
        </select>

        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.municipality}</option>
          ))}
        </select>

        {(vehicleFilter !== 'ALL' || typeFilter !== 'ALL' || branchFilter !== 'ALL') && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => { setVehicleFilter('ALL'); setTypeFilter('ALL'); setBranchFilter('ALL'); }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <span className="spacer" />

        {/* Zone 1: Automated Feed Status & Page Actions */}
        <span
          className="stat-chip"
          style={{
            background: 'var(--ok-bg)',
            color: 'var(--ok-text)',
            border: '1px solid #86EFAC',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.65rem'
          }}
          title="Automated timeline: Trip dispatches and in-shop maintenance sync automatically from vehicle records."
        >
          <CheckCircle2 size={13} color="#16A34A" /> Automated Feed
        </span>

        <button
          type="button"
          className="btn btn-outline no-print"
          onClick={() => window.print()}
          title="Print official dispatch & maintenance schedule"
        >
          <Printer size={15} /> Print Schedule
        </button>
      </div>

      {/* Main Calendar Card */}
      <div className="card calendar-container-card">
        {/* Calendar Card Header */}
        <div className="calendar-card-header">
          <div className="calendar-header-left">
            <div className="calendar-icon-circle">
              <CalendarDays size={18} strokeWidth={2.4} color="var(--text-main)" />
            </div>
            <h2 className="calendar-title-text">{headerTitle}</h2>

            <div className="calendar-nav-buttons">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={handlePrev}
                title="Previous"
                aria-label="Previous date"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className="cal-today-btn"
                onClick={handleToday}
              >
                Today
              </button>
              <button
                type="button"
                className="cal-nav-btn"
                onClick={handleNext}
                title="Next"
                aria-label="Next date"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="segmented" role="group" aria-label="Calendar view switcher">
            <button
              type="button"
              className={viewMode === 'day' ? 'active' : ''}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={viewMode === 'week' ? 'active' : ''}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              type="button"
              className={viewMode === 'month' ? 'active' : ''}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
        </div>

        {/* Reschedule Notification Banner */}
        {rescheduleNotice && (
          <div className="calendar-banner-notice">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#16A34A" />
              {rescheduleNotice}
            </span>
            <button
              type="button"
              onClick={() => setRescheduleNotice(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ok-text)', fontWeight: 700 }}
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Subtle Automated Sync & Drag Hint Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.45rem 1.25rem',
          background: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={13} color="#16A34A" /> Automated schedule synced from vehicle dispatches, PMS, Insurance &amp; LTO Registration dates.
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            💡 Tip: Drag and drop cards across days or hours to reschedule
          </span>
        </div>

        {/* WEEK VIEW (Timetable grid with Drag and Drop) */}
        {viewMode === 'week' && (
          <div className="calendar-scroll-wrap">
            <div className="timetable-grid">
              {/* Header row: time spacer + week days */}
              <div className="timetable-corner" />
              {weekDays.map(day => (
                <div
                  key={day.dateStr}
                  className={`timetable-col-header ${day.isToday ? 'is-today' : ''}`}
                >
                  <span className="col-day-name">{day.name}</span>
                  <span className="col-day-num">{day.dayNum}</span>
                </div>
              ))}

              {/* Time rows */}
              {HOURS.map(hour => (
                <React.Fragment key={hour.val}>
                  <div className="timetable-time-cell">
                    <span className="timetable-time-label">{hour.label}</span>
                  </div>

                  {weekDays.map(day => {
                    // Find bookings for this day that start in or encompass this hour
                    const slotBookings = filteredBookings.filter(b => {
                      if (b.date !== day.dateStr) return false;
                      const sHour = b.startHour !== undefined ? b.startHour : (parseInt(b.startTime) || 8);
                      return sHour >= hour.val && sHour < hour.val + 1;
                    });

                    const isSlotTarget = dragOverSlot === `${day.dateStr}-${hour.val}`;

                    return (
                      <div
                        key={`${day.dateStr}-${hour.val}`}
                        className={`timetable-grid-slot ${isSlotTarget ? 'slot-drag-target' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSlot !== `${day.dateStr}-${hour.val}`) {
                            setDragOverSlot(`${day.dateStr}-${hour.val}`);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverSlot === `${day.dateStr}-${hour.val}`) {
                            setDragOverSlot(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropSlot(day.dateStr, hour.val);
                        }}
                      >
                        {slotBookings.map(b => {
                          const v = vehicles.find(item => item.code === b.vehicleCode || item.id === b.vehicleId);
                          const photo = b.avatar || getVehicleImage(v);
                          const isMaint = b.type === 'MAINTENANCE';
                          const isCompliance = b.type === 'COMPLIANCE';
                          const isReg = b.complianceSubType?.includes('REGISTRATION');

                          const complianceStyle = isCompliance
                            ? {
                                background: isReg ? '#F5F3FF' : '#EFF6FF',
                                borderColor: isReg ? '#DDD6FE' : '#BFDBFE',
                                borderLeft: isReg ? '4px solid #7C3AED' : '4px solid #2563EB'
                              }
                            : undefined;

                          return (
                            <div
                              key={b.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData('text/plain', b.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedBookingId(b.id);
                              }}
                              onDragEnd={() => {
                                setDraggedBookingId(null);
                                setDragOverSlot(null);
                              }}
                              className={`booking-pill-card ${isMaint ? 'booking-pill-maint' : 'booking-pill-dispatch'} ${draggedBookingId === b.id ? 'is-dragging' : ''}`}
                              style={complianceStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookingClick(b);
                              }}
                              title={`Drag to update date · Click to inspect: ${b.title} (${b.startTime} - ${b.endTime})`}
                            >
                              <img
                                src={photo}
                                alt={b.driver || b.vehicleCode}
                                className="booking-card-avatar"
                              />
                              <div className="booking-card-info">
                                <div className="booking-card-title" style={isCompliance ? { color: isReg ? '#4C1D95' : '#1E3A8A' } : undefined}>
                                  {b.vehicleCode} {isCompliance ? `• ${isReg ? 'LTO Reg' : 'Insurance'}` : `• ${b.driver}`}
                                </div>
                                <div className="booking-card-subtitle">{b.title}</div>
                              </div>
                              <button
                                type="button"
                                className="booking-card-quick-edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (b.isComplianceRecord && v) {
                                    setSelectedVehicle(v);
                                    setModalType('vehicle-detail');
                                  } else {
                                    setSelectedBooking(b);
                                    setModalType('edit-booking');
                                  }
                                }}
                                title={b.isComplianceRecord ? 'Edit insurance/registration dates in Vehicle Profile' : 'Edit schedule details'}
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="calendar-scroll-wrap">
            <div className="month-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(h => (
                <div key={h} className="month-grid-header">{h}</div>
              ))}

              {monthGrid.map((cell, idx) => {
                const dayBookings = filteredBookings.filter(b => b.date === cell.dateStr);

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`month-cell ${!cell.isCurrentMonth ? 'outside' : ''} ${cell.isToday ? 'today' : ''}`}
                    onClick={() => {
                      setCurrentDate(new Date(cell.dateStr));
                      setViewMode('day');
                    }}
                  >
                    <div className="month-cell-head">
                      <span className={`month-day-num ${cell.isToday ? 'today-badge' : ''}`}>
                        {cell.dayNum}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="month-event-count">{dayBookings.length} scheduled</span>
                      )}
                    </div>

                    <div className="month-events-list">
                      {dayBookings.slice(0, 3).map(b => {
                        const isCompliance = b.type === 'COMPLIANCE';
                        const isReg = b.complianceSubType?.includes('REGISTRATION');
                        return (
                          <div
                            key={b.id}
                            className={`month-event-chip ${b.type === 'MAINTENANCE' ? 'chip-maint' : 'chip-dispatch'}`}
                            style={isCompliance ? {
                              background: isReg ? '#F5F3FF' : '#EFF6FF',
                              color: isReg ? '#5B21B6' : '#1E40AF',
                              border: `1px solid ${isReg ? '#DDD6FE' : '#BFDBFE'}`
                            } : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookingClick(b);
                            }}
                          >
                            <span
                              className="chip-dot"
                              style={isCompliance ? { background: isReg ? '#7C3AED' : '#2563EB' } : undefined}
                            />
                            <span className="chip-text">{b.vehicleCode} · {b.title}</span>
                          </div>
                        );
                      })}
                      {dayBookings.length > 3 && (
                        <div className="month-more-chip">+{dayBookings.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <div className="calendar-scroll-wrap">
            <div className="day-timeline-view">
              <div className="day-view-summary">
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {filteredBookings.filter(b => b.date === formatDateStr(currentDate)).length} events automatically synced for this day
                  </p>
                </div>
                <span className="stat-chip" style={{ background: 'var(--ok-bg)', color: 'var(--ok-text)', border: '1px solid #86EFAC' }}>
                  <CheckCircle2 size={13} color="#16A34A" /> Automated Day Feed
                </span>
              </div>

              <div className="day-slots-list">
                {HOURS.map(hour => {
                  const dateStr = formatDateStr(currentDate);
                  const hourBookings = filteredBookings.filter(b => {
                    if (b.date !== dateStr) return false;
                    const sHour = b.startHour !== undefined ? b.startHour : (parseInt(b.startTime) || 8);
                    return sHour >= hour.val && sHour < hour.val + 1;
                  });

                  const isSlotTarget = dragOverSlot === `day-${hour.val}`;

                  return (
                    <div
                      key={hour.val}
                      className={`day-hour-row ${isSlotTarget ? 'slot-drag-target' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverSlot !== `day-${hour.val}`) {
                          setDragOverSlot(`day-${hour.val}`);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverSlot === `day-${hour.val}`) {
                          setDragOverSlot(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropSlot(dateStr, hour.val);
                      }}
                    >
                      <div className="day-hour-label">{hour.label}</div>
                      <div className="day-hour-content">
                        {hourBookings.length === 0 ? (
                          <div className="day-empty-slot" style={{ cursor: 'default' }}>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>— No dispatches or maintenance</span>
                          </div>
                        ) : (
                          hourBookings.map(b => {
                            const v = vehicles.find(item => item.code === b.vehicleCode || item.id === b.vehicleId);
                            const photo = b.avatar || getVehicleImage(v);
                            const isMaint = b.type === 'MAINTENANCE';
                            const isCompliance = b.type === 'COMPLIANCE';
                            const isReg = b.complianceSubType?.includes('REGISTRATION');

                            return (
                              <div
                                key={b.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('text/plain', b.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedBookingId(b.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedBookingId(null);
                                  setDragOverSlot(null);
                                }}
                                className={`day-event-card ${isMaint ? 'day-card-maint' : 'day-card-dispatch'} ${draggedBookingId === b.id ? 'is-dragging' : ''}`}
                                onClick={() => handleBookingClick(b)}
                                title="Drag to reschedule hour · Click to inspect details"
                                style={{
                                  cursor: 'grab',
                                  ...(isCompliance ? {
                                    background: isReg ? '#F5F3FF' : '#EFF6FF',
                                    borderLeft: `4px solid ${isReg ? '#7C3AED' : '#2563EB'}`
                                  } : {})
                                }}
                              >
                                <img src={photo} alt={b.vehicleCode} className="day-card-photo" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>{b.vehicleCode}</span>
                                    <span
                                      className={`badge ${isMaint ? 'badge-warning' : isCompliance ? 'badge-primary' : 'badge-success'}`}
                                      style={isCompliance ? {
                                        background: isReg ? '#EDE9FE' : '#DBEAFE',
                                        color: isReg ? '#5B21B6' : '#1E40AF'
                                      } : undefined}
                                    >
                                      {isMaint ? 'Maintenance' : isCompliance ? (isReg ? 'LTO Registration' : 'Insurance Validity') : 'Dispatch'}
                                    </span>
                                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={12} /> {b.startTime} - {b.endTime}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (b.isComplianceRecord && v) {
                                            setSelectedVehicle(v);
                                            setModalType('vehicle-detail');
                                          } else {
                                            setSelectedBooking(b);
                                            setModalType('edit-booking');
                                          }
                                        }}
                                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.74rem' }}
                                        title={b.isComplianceRecord ? 'Edit dates in Vehicle Profile' : 'Edit schedule details'}
                                      >
                                        <Pencil size={11} /> Edit
                                      </button>
                                    </span>
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{b.title}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                    Driver: <strong>{b.driver}</strong> · Facility/Branch: <strong>{b.branch}</strong>
                                  </div>
                                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {b.purpose}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
