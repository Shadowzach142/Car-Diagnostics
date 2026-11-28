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
  Pencil,
  Plus,
  AlertTriangle
} from 'lucide-react';

const isExpiryEvent = (b) =>
  b?.complianceSubType === 'INSURANCE_EXPIRY' ||
  b?.complianceSubType === 'REGISTRATION_EXPIRY' ||
  b?.complianceSubType === 'LICENSE_EXPIRY';

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

const getTodayStr = () => formatDateStr(new Date());

// Default calendar to current date so today's dispatches & bookings appear immediately
const INITIAL_DATE = new Date();

export const BookingsCalendar = () => {
  const {
    vehicles,
    branches,
    drivers = [],
    bookings,
    workOrders = [],
    settings,
    setSelectedVehicle,
    setSelectedDriver,
    setSelectedBooking,
    setModalType,
    updateBooking,
    updateVehicle,
    driverVehicles,
    activeDriver,
    setActiveTab
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const isDriver = settings?.currentRole === 'DRIVER';
  const canEditCalendar = !isDriver; // drivers get a read-only availability calendar
  const mechShort = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();
  const driverVehicleCodes = useMemo(
    () => new Set((driverVehicles || []).map(v => v.code)),
    [driverVehicles]
  );

  const [currentDate, setCurrentDate] = useState(INITIAL_DATE);
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayStr);
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [expiryOnly, setExpiryOnly] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'MAINTENANCE', 'DISPATCH'
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Drag and Drop Rescheduling state
  const [draggedBookingId, setDraggedBookingId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [rescheduleNotice, setRescheduleNotice] = useState(null);
  const [expandedSlots, setExpandedSlots] = useState({});

  // Compute week days (Monday - Friday or Monday - Sunday)
  const weekDays = useMemo(() => {
    const todayStr = getTodayStr();
    const curr = new Date(currentDate);
    // Find Monday of current week
    const day = curr.getDay(); // 0 is Sun, 1 is Mon
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const days = [];
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        name: names[i],
        dayNum: d.getDate(),
        dateStr: formatDateStr(d),
        dateObj: d,
        isToday: formatDateStr(d) === todayStr
      });
    }
    return days;
  }, [currentDate]);

  // Compute Month days
  const monthGrid = useMemo(() => {
    const todayStr = getTodayStr();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start on Sunday
    const startDayIndex = firstDay.getDay(); // 0 for Sun
    const totalDays = lastDay.getDate();

    const cells = [];
    // Previous month padding
    for (let i = 0; i < startDayIndex; i++) {
      const prevDate = new Date(year, month, 1 - (startDayIndex - i));
      cells.push({
        dateStr: formatDateStr(prevDate),
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: formatDateStr(prevDate) === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(year, month, d);
      cells.push({
        dateStr: formatDateStr(thisDate),
        dayNum: d,
        isCurrentMonth: true,
        isToday: formatDateStr(thisDate) === todayStr
      });
    }

    // Trailing padding to fill complete weeks (multiples of 7)
    while (cells.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, cells.length - totalDays - startDayIndex + 1);
      cells.push({
        dateStr: formatDateStr(nextDate),
        dayNum: nextDate.getDate(),
        isCurrentMonth: false,
        isToday: formatDateStr(nextDate) === todayStr
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
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(formatDateStr(now));
  };

  // Header Title
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const headerTitle = useMemo(() => {
    const m = monthNames[currentDate.getMonth()];
    const y = currentDate.getFullYear();
    const isToday = formatDateStr(currentDate) === getTodayStr();

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

    // 5. Employee Driver's License Expiration Events
    (drivers || []).forEach(d => {
      if (!d.licenseExpiry) return;
      const branch = (branches || []).find(b => b.id === d.branchId);
      complianceEvents.push({
        id: `LIC-EXP-${d.id}`,
        driverId: d.id,
        vehicleId: '',
        vehicleCode: d.name,
        driver: d.name,
        avatar: '',
        type: 'COMPLIANCE',
        complianceSubType: 'LICENSE_EXPIRY',
        title: `Driver's License Expiry (${d.licenseNo || 'LTO'})`,
        category: "Driver's License Expiry",
        date: d.licenseExpiry,
        startHour: 10,
        endHour: 11,
        startTime: '10:00',
        endTime: '11:00',
        branchId: d.branchId,
        branch: branch?.municipality || 'Central HQ',
        destination: 'LTO Licensing Center',
        purpose: `${d.name} (${d.employeeId}) Driver's License ${d.licenseNo || ''} expires on ${d.licenseExpiry}.`,
        status: 'Scheduled',
        isComplianceRecord: true
      });
    });

    return [...(bookings || []), ...complianceEvents];
  }, [bookings, vehicles, drivers, branches]);

  // Filtered Bookings & Compliance Events
  const filteredBookings = useMemo(() => {
    const myAssignedVehicleCodes = isMechanic
      ? new Set(
          workOrders
            .filter(w => (w.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechShort)
            .map(w => w.vehicleCode)
        )
      : null;

    return allCalendarEvents.filter(b => {
      if (b.id && b.id.endsWith('-DUE')) {
        const parentId = b.id.replace(/-DUE$/, '');
        if (allCalendarEvents.some(p => p.id === parentId)) return false;
      }
      if (expiryOnly && !isExpiryEvent(b)) {
        return false;
      }
      if (isDriver) {
        // Availability of MY authorized vehicles + MY license only (no notes, no other drivers' licenses)
        if (b.complianceSubType === 'LICENSE_EXPIRY') {
          if (b.driverId !== activeDriver?.id) return false;
        } else if (!driverVehicleCodes.has(b.vehicleCode)) {
          return false;
        }
      }
      if (isMechanic) {
        const createdByMech = b.createdByRole === 'MECHANIC' || (b.createdBy || '').split(' (')[0].trim().toLowerCase() === mechShort;
        if (!createdByMech) {
          if (b.type !== 'MAINTENANCE') return false;
          const driverShort = (b.driver || '').split(' (')[0].trim().toLowerCase();
          if (driverShort !== mechShort && !myAssignedVehicleCodes.has(b.vehicleCode)) {
            return false;
          }
        }
      }
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
  }, [allCalendarEvents, expiryOnly, vehicleFilter, typeFilter, branchFilter, isMechanic, mechShort, workOrders, isDriver, driverVehicleCodes, activeDriver]);

  // Click on a booking or compliance record
  const handleBookingClick = (booking) => {
    if (isDriver) {
      if (booking.isComplianceRecord) {
        if (booking.complianceSubType === 'LICENSE_EXPIRY') {
          setActiveTab('profile');
          return;
        }
        const targetVeh = (driverVehicles || []).find(v => v.id === booking.vehicleId || v.code === booking.vehicleCode);
        if (targetVeh) {
          setSelectedVehicle(targetVeh);
          setModalType('vehicle-detail');
          return;
        }
        setActiveTab('profiling');
        return;
      }
      setSelectedBooking(booking);
      setModalType('booking-detail');
      return;
    }
    if (booking.isComplianceRecord) {
      if (booking.complianceSubType === 'LICENSE_EXPIRY' && booking.driverId) {
        const targetDriver = (drivers || []).find(d => d.id === booking.driverId);
        if (targetDriver && setSelectedDriver) {
          setSelectedDriver(targetDriver);
          setModalType('driver-detail');
          return;
        }
      }
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

  const shiftDateStr = (dateStr, deltaDays) => {
    if (!dateStr || !deltaDays) return dateStr;
    const parts = String(dateStr).split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
    return formatDateStr(d);
  };

  // Drag and Drop drop handler to reschedule (also updates vehicle insurance/registration date if dragged!)
  const handleDropSlot = (targetDateStr, targetHourVal = null, fallbackId = null) => {
    setDragOverSlot(null);
    if (!canEditCalendar) {
      setDraggedBookingId(null);
      return;
    }
    const activeId = draggedBookingId || fallbackId;
    if (!activeId) return;

    const b = allCalendarEvents.find(item => item.id === activeId);
    if (!b) return;

    if (b.isComplianceRecord) {
      if (isMechanic || b.date === targetDateStr) {
        setDraggedBookingId(null);
        return;
      }
      if (b.complianceSubType === 'INSURANCE_EXPIRY') {
        updateVehicle(b.vehicleId, { insuranceExpiryDate: targetDateStr });
      } else if (b.complianceSubType === 'INSURANCE_ACQUIRED') {
        updateVehicle(b.vehicleId, { insuranceAcquiredDate: targetDateStr });
      } else if (b.complianceSubType === 'REGISTRATION_EXPIRY') {
        updateVehicle(b.vehicleId, { registrationExpiryDate: targetDateStr });
      } else if (b.complianceSubType === 'REGISTRATION_ACQUIRED') {
        updateVehicle(b.vehicleId, { registrationAcquiredDate: targetDateStr });
      }
      setSelectedDateStr(targetDateStr);
      setRescheduleNotice(`Updated ${b.vehicleCode} (${b.category}) date to ${targetDateStr}`);
      setTimeout(() => setRescheduleNotice(null), 4500);
      setDraggedBookingId(null);
      return;
    }

    // Preserve multi-day duration when shifting dates
    let nextDeadline = b.deadline || b.date;
    if (b.date && targetDateStr && b.date !== targetDateStr) {
      const [oy, om, od] = String(b.date).split('-').map(Number);
      const [ny, nm, nd] = String(targetDateStr).split('-').map(Number);
      if (!isNaN(oy) && !isNaN(ny)) {
        const oldLocal = new Date(oy, (om || 1) - 1, od || 1);
        const newLocal = new Date(ny, (nm || 1) - 1, nd || 1);
        const deltaDays = Math.round((newLocal - oldLocal) / 86400000);
        if (b.deadline && b.deadline > b.date) {
          nextDeadline = shiftDateStr(b.deadline, deltaDays);
        } else {
          nextDeadline = targetDateStr;
        }
      }
    }

    const updates = {
      date: targetDateStr,
      deadline: nextDeadline
    };

    if (targetHourVal !== null && targetHourVal !== undefined) {
      const duration = (b.endHour && b.startHour && b.endHour > b.startHour)
        ? (b.endHour - b.startHour)
        : 1.5;
      const newStartHour = targetHourVal;
      const newEndHour = Number((targetHourVal + duration).toFixed(2));
      updates.startHour = newStartHour;
      updates.endHour = newEndHour;
      updates.startTime = `${String(targetHourVal).padStart(2, '0')}:00`;
      updates.endTime = `${String(Math.min(23, Math.ceil(newEndHour))).padStart(2, '0')}:00`;
    } else if (b.date === targetDateStr) {
      setDraggedBookingId(null);
      return;
    }

    updateBooking(b.id, updates);
    setSelectedDateStr(targetDateStr);

    const rangeLabel = nextDeadline && nextDeadline > targetDateStr
      ? `${targetDateStr} → ${nextDeadline}`
      : targetDateStr;
    const hourLabel = targetHourVal !== null && targetHourVal !== undefined
      ? ` at ${HOURS.find(h => h.val === targetHourVal)?.label || `${targetHourVal}:00`}`
      : '';
    setRescheduleNotice(`Rescheduled ${b.vehicleCode} (${b.title}) to ${rangeLabel}${hourLabel}`);
    setTimeout(() => {
      setRescheduleNotice(null);
    }, 4500);

    setDraggedBookingId(null);
  };

  return (
    <div className="page">
      {/* Page Body */}
      <div className="page-body">
        {/* Main Calendar Card */}
        <div
          className="card calendar-container-card"
          style={{
            borderRadius: '14px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}
        >
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3B82F6' }} />
                Trips
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B' }} />
                Maintenance
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626' }} />
                Expiry Dates
              </span>
            </div>

            {!isMechanic && (
              <button
                type="button"
                className="btn btn-sm no-print"
                onClick={() => setExpiryOnly(prev => !prev)}
                aria-pressed={expiryOnly}
                title="Show only vehicle registration, insurance, and driver license expiry dates"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '0.35rem 0.7rem',
                  cursor: 'pointer',
                  background: expiryOnly ? '#DC2626' : '#FEF2F2',
                  color: expiryOnly ? '#FFFFFF' : '#DC2626',
                  border: expiryOnly ? '1px solid #B91C1C' : '1px solid #FCA5A5'
                }}
              >
                <AlertTriangle size={13} />
                <span>{expiryOnly ? 'Expiry Dates Only (On)' : 'Expiry Dates Only'}</span>
              </button>
            )}

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

            <button
              type="button"
              className="btn btn-primary btn-sm no-print"
              style={canEditCalendar ? undefined : { display: 'none' }}
              onClick={() => {
                setSelectedBooking({
                  date: selectedDateStr,
                  mode: isMechanic ? 'schedule' : 'note'
                });
                if (canEditCalendar) setModalType('new-booking');
              }}
            >
              <Plus size={14} /> {isMechanic ? 'Add Schedule' : 'Add Note'}
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

              {/* Multi-day spanning bars (Start Date -> Deadline) */}
              {(() => {
                const weekStart = weekDays[0]?.dateStr;
                const weekEnd = weekDays[6]?.dateStr;
                if (!weekStart || !weekEnd) return null;

                const spanning = filteredBookings.filter(b => {
                  const endStr = b.deadline || b.date;
                  return endStr > b.date && b.date <= weekEnd && endStr >= weekStart;
                });

                if (spanning.length === 0) return null;

                return spanning.map((b, sIdx) => {
                  const endStr = b.deadline || b.date;
                  const clampedStart = b.date < weekStart ? weekStart : b.date;
                  const clampedEnd = endStr > weekEnd ? weekEnd : endStr;
                  const startIdx = Math.max(0, weekDays.findIndex(d => d.dateStr === clampedStart));
                  const endIdx = Math.max(startIdx, weekDays.findIndex(d => d.dateStr === clampedEnd));
                  const spanCols = endIdx - startIdx + 1;
                  const continuesLeft = b.date < weekStart;
                  const continuesRight = endStr > weekEnd;

                  const v = vehicles.find(item => item.code === b.vehicleCode || item.id === b.vehicleId);
                  const photo = b.avatar || getVehicleImage(v);
                  const isMaint = b.type === 'MAINTENANCE';

                  const totalDays = Math.max(
                    1,
                    Math.round((new Date(endStr) - new Date(b.date)) / 86400000) + 1
                  );

                  return (
                    <React.Fragment key={`span-${b.id}`}>
                      <div
                        style={{
                          gridColumn: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.25rem 0.35rem',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: sIdx === spanning.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          borderRight: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface-subtle)'
                        }}
                      >
                        {sIdx === 0 ? 'Span' : ''}
                      </div>

                      <div
                        style={{
                          gridColumn: '2 / span 7',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                          padding: '0.24rem 0.25rem',
                          borderBottom: sIdx === spanning.length - 1 ? '1px solid var(--border-subtle)' : '1px dashed var(--border-light)',
                          background: 'var(--bg-surface-subtle)'
                        }}
                      >
                        <button
                          type="button"
                          draggable={canEditCalendar}
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
                          onClick={() => handleBookingClick(b)}
                          title={`Drag to reschedule · ${b.vehicleCode} · ${b.title} (${b.date} → Due ${endStr})`}
                          style={{
                            gridColumn: `${startIdx + 1} / span ${spanCols}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: `${continuesLeft ? '0' : '8px'} ${continuesRight ? '0' : '8px'} ${continuesRight ? '0' : '8px'} ${continuesLeft ? '0' : '8px'}`,
                            border: `1px solid ${isMaint ? '#F59E0B' : '#3B82F6'}`,
                            borderLeftWidth: continuesLeft ? '0' : '4px',
                            background: isMaint ? '#FEF3C7' : '#DBEAFE',
                            color: isMaint ? '#92400E' : '#1E40AF',
                            cursor: 'grab',
                            opacity: draggedBookingId === b.id ? 0.55 : 1,
                            textAlign: 'left',
                            minWidth: 0
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                            {photo && (
                              <img
                                src={photo}
                                alt={b.vehicleCode}
                                style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                              />
                            )}
                            <span style={{ fontWeight: 800, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {continuesLeft ? '← ' : ''}{b.vehicleCode} · {b.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.85, whiteSpace: 'nowrap' }}>
                              ({(b.driver || '').split(' (')[0]})
                            </span>
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: 'rgba(255,255,255,0.7)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {b.date} &rarr; {endStr} ({totalDays}d){continuesRight ? ' →' : ''}
                          </span>
                        </button>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}

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
                        onClick={() => {
                          setSelectedBooking({
                            date: day.dateStr,
                            startTime: `${String(hour.val).padStart(2, '0')}:00`,
                            endTime: `${String(Math.min(18, hour.val + 2)).padStart(2, '0')}:00`
                          });
                          if (canEditCalendar) setModalType('new-booking');
                        }}
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
                        title={`Click to add schedule on ${day.dateStr} at ${hour.label}`}
                      >
                        {(() => {
                          const slotKey = `${day.dateStr}-${hour.val}`;
                          const isExpanded = !!expandedSlots[slotKey];
                          const visibleBookings = isExpanded ? slotBookings : slotBookings.slice(0, 2);
                          const hiddenCount = slotBookings.length - visibleBookings.length;

                          return (
                            <>
                              {visibleBookings.map(b => {
                                const v = vehicles.find(item => item.code === b.vehicleCode || item.id === b.vehicleId);
                                const photo = b.avatar || getVehicleImage(v);
                                const isMaint = b.type === 'MAINTENANCE';
                                const isCompliance = b.type === 'COMPLIANCE';
                                const isReg = b.complianceSubType?.includes('REGISTRATION');

                                const complianceStyle = isCompliance
                                  ? {
                                      background: 'var(--bg-surface-subtle)',
                                      borderColor: 'var(--border-medium)'
                                    }
                                  : undefined;

                                return (
                                  <div
                                    key={b.id}
                                    draggable={canEditCalendar}
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
                                      <div className="booking-card-title">
                                        {b.vehicleCode} {isCompliance ? `• ${isReg ? 'LTO Reg' : 'Insurance'}` : `• ${b.driver}`}
                                      </div>
                                      <div className="booking-card-subtitle">{b.title}</div>
                                    </div>
                                    {canEditCalendar && (
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
                                    )}
                                  </div>
                                );
                              })}

                              {slotBookings.length > 2 && (
                                <button
                                  type="button"
                                  className="timetable-more-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }));
                                  }}
                                >
                                  {isExpanded ? 'Show fewer' : `+${hiddenCount} more in this hour`}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* MONTH VIEW (Grid + Selected Date Agenda Sidebar) */}
        {viewMode === 'month' && (() => {
          const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const [selY, selM, selD] = selectedDateStr.split('-').map(Number);
          const selectedDateObj = new Date(selY, (selM || 1) - 1, selD || 1);
          const selectedDateFullLabel = selectedDateObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const selectedDateShortLabel = selectedDateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });

          const selectedDayEvents = filteredBookings.filter(b => {
            const endStr = b.deadline || b.date;
            return selectedDateStr >= b.date && selectedDateStr <= endStr;
          });

          const monthScheduledEvents = filteredBookings
            .filter(b => {
              const endStr = b.deadline || b.date;
              return b.date.startsWith(monthPrefix) || endStr.startsWith(monthPrefix) || (b.date <= `${monthPrefix}-01` && endStr >= `${monthPrefix}-28`);
            })
            .sort((a, b) => a.date.localeCompare(b.date));

          const currentMonthShortUpper = currentDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          }).toUpperCase();

          return (
            <div className="calendar-month-agenda-layout">
              <div className="calendar-scroll-wrap">
                <div className="month-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(h => (
                    <div key={h} className="month-grid-header">{h}</div>
                  ))}

                  {Array.from({ length: Math.ceil(monthGrid.length / 7) }, (_, wIdx) => {
                    const weekCells = monthGrid.slice(wIdx * 7, wIdx * 7 + 7);

                    return (
                      <div
                        key={`week-${wIdx}`}
                        style={{
                          gridColumn: '1 / -1',
                          position: 'relative',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'
                        }}
                      >
                        {weekCells.map((cell, idx) => {
                          const cellBookings = filteredBookings.filter(b => {
                            const endStr = b.deadline || b.date;
                            return cell.dateStr >= b.date && cell.dateStr <= endStr;
                          });
                          const isSelected = cell.dateStr === selectedDateStr;

                          const isDropTarget = dragOverSlot === `month-${cell.dateStr}`;
                          const hasExpiryOnDay = cellBookings.some(isExpiryEvent);

                          return (
                            <div
                              key={`${cell.dateStr}-${idx}`}
                              className={`month-cell ${!cell.isCurrentMonth ? 'outside' : ''} ${cell.isToday ? 'today' : ''} ${isDropTarget ? 'slot-drag-target' : ''}`}
                              style={{
                                minWidth: 0,
                                overflow: 'hidden',
                                ...(isDropTarget
                                  ? {
                                      boxShadow: 'inset 0 0 0 2px #16A34A',
                                      background: '#DCFCE7'
                                    }
                                  : isSelected
                                  ? {
                                      boxShadow: hasExpiryOnDay ? 'inset 0 0 0 2px #DC2626' : 'inset 0 0 0 1.5px #16A34A',
                                      background: hasExpiryOnDay ? '#FEF2F2' : '#F0FDF4'
                                    }
                                  : hasExpiryOnDay
                                  ? {
                                      boxShadow: 'inset 0 0 0 1.5px #FCA5A5',
                                      background: '#FEF2F2'
                                    }
                                  : {})
                              }}
                              onClick={() => setSelectedDateStr(cell.dateStr)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverSlot !== `month-${cell.dateStr}`) {
                                  setDragOverSlot(`month-${cell.dateStr}`);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverSlot === `month-${cell.dateStr}`) {
                                  setDragOverSlot(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fallbackId = e.dataTransfer.getData('text/plain');
                                handleDropSlot(cell.dateStr, null, fallbackId);
                              }}
                            >
                              <div className="month-cell-head" style={{ gap: '4px' }}>
                                <span
                                  className={`month-day-num ${cell.isToday ? 'today-badge' : ''}`}
                                  style={{
                                    flexShrink: 0,
                                    ...(cell.isToday
                                      ? { background: '#16A34A', color: '#FFFFFF' }
                                      : hasExpiryOnDay
                                      ? { background: '#DC2626', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }
                                      : isSelected
                                      ? { background: '#0F172A', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
                                      : {})
                                  }}
                                >
                                  {cell.dayNum}
                                </span>
                                {cell.isToday ? (
                                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                                    TODAY
                                  </span>
                                ) : hasExpiryOnDay ? (
                                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                                    EXPIRY
                                  </span>
                                ) : null}
                              </div>

                              <div
                                className="month-events-list"
                                style={{ minWidth: 0, overflow: 'hidden' }}
                              >
                                {cellBookings.slice(0, 3).map(b => {
                                  const endStr = b.deadline || b.date;
                                  const isMultiDay = endStr > b.date;
                                  const isDueDay = isMultiDay && cell.dateStr === endStr;
                                  const isCompliance = b.type === 'COMPLIANCE';
                                  const isExpiry = isExpiryEvent(b);
                                  const isReg = b.complianceSubType?.includes('REGISTRATION');
                                  const isCompleted = b.status === 'Completed' || b.status === 'Completed / Released';

                                  return (
                                    <div
                                      key={`${b.id}-${cell.dateStr}`}
                                      draggable={canEditCalendar}
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
                                      className={`month-event-chip ${b.type === 'MAINTENANCE' ? 'chip-maint' : 'chip-dispatch'} ${draggedBookingId === b.id ? 'is-dragging' : ''}`}
                                      style={{
                                        cursor: canEditCalendar ? 'grab' : 'pointer',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        ...(isExpiry
                                          ? {
                                              background: '#FEE2E2',
                                              color: '#B91C1C',
                                              border: '1px solid #F87171',
                                              fontWeight: 700
                                            }
                                          : isCompleted
                                          ? {
                                              background: '#ECFDF5',
                                              color: '#047857',
                                              border: '1px solid #A7F3D0',
                                              textDecoration: 'line-through'
                                            }
                                          : isCompliance
                                          ? {
                                              background: 'var(--bg-surface-subtle)',
                                              color: 'var(--text-main)',
                                              border: '1px solid var(--border-medium)'
                                            }
                                          : {})
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDateStr(cell.dateStr);
                                        handleBookingClick(b);
                                      }}
                                      title={
                                        isMultiDay
                                          ? `${b.vehicleCode} · ${b.title} (${b.date} → Due ${endStr})`
                                          : `${b.vehicleCode} · ${b.title}`
                                      }
                                    >
                                      <span
                                        className="chip-dot"
                                        style={
                                          isExpiry
                                            ? { background: '#DC2626' }
                                            : isCompleted
                                            ? { background: '#10B981' }
                                            : isCompliance
                                            ? { background: isReg ? '#7C3AED' : '#2563EB' }
                                            : undefined
                                        }
                                      />
                                      <span className="chip-text" style={{ flex: 1, minWidth: 0 }}>
                                        {b.vehicleCode && b.vehicleCode !== 'NOTE' ? `${b.vehicleCode}: ` : ''}{b.title}
                                      </span>
                                      {isMultiDay && (
                                        <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.85, flexShrink: 0, marginLeft: '2px' }}>
                                          {isDueDay ? `Due ${endStr.slice(5)}` : `→${endStr.slice(5)}`}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {cellBookings.length > 3 && (
                                  <div className="month-more-chip">+{cellBookings.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Selected Date Agenda Sidebar */}
              <aside className="calendar-agenda-sidebar" aria-label="Selected date agenda">
                <div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    SELECTED DATE AGENDA
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedDateFullLabel}
                  </h3>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '1rem 0.9rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      No scheduled maintenance or renewals on {selectedDateShortLabel}.
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Select a highlighted date below or click a day cell to inspect details.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedDayEvents.map(b => {
                      const endStr = b.deadline || b.date;
                      const isMultiDay = endStr > b.date;
                      const isExpiry = isExpiryEvent(b);
                      return (
                        <button
                          key={`agenda-${b.id}`}
                          type="button"
                          onClick={() => handleBookingClick(b)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.65rem 0.8rem',
                            borderRadius: '10px',
                            background: isExpiry ? '#FEF2F2' : 'var(--bg-surface-subtle)',
                            border: isExpiry ? '1px solid #FCA5A5' : '1px solid var(--border-light)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                            <strong style={{ fontSize: '0.84rem', color: isExpiry ? '#B91C1C' : 'var(--text-main)' }}>
                              {b.vehicleCode} · {b.title}
                            </strong>
                            <ChevronRight size={14} color={isExpiry ? '#DC2626' : 'var(--text-tertiary)'} style={{ flexShrink: 0 }} />
                          </div>
                          <div style={{ fontSize: '0.74rem', color: isExpiry ? '#991B1B' : 'var(--text-secondary)' }}>
                            {(b.driver || '').split(' (')[0]}
                            {isMultiDay ? ` · ${b.date} → Due ${endStr}` : ` · ${b.startTime || '08:00'}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', color: expiryOnly ? '#DC2626' : 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {expiryOnly ? `ALL EXPIRY DATES IN ${currentMonthShortUpper}` : `ALL SCHEDULED DATES IN ${currentMonthShortUpper}`}
                  </div>

                  {monthScheduledEvents.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {expiryOnly ? 'No expiry dates in this month.' : 'No scheduled items this month.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {monthScheduledEvents.map(b => {
                        const [ey, em, ed] = b.date.split('-').map(Number);
                        const dLabel = new Date(ey, (em || 1) - 1, ed || 1).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        });
                        const endStr = b.deadline || b.date;
                        const isMultiDay = endStr > b.date;
                        const isExpiry = isExpiryEvent(b);
                        let endLabel = '';
                        if (isMultiDay) {
                          const [dy, dm, dd] = endStr.split('-').map(Number);
                          endLabel = new Date(dy, (dm || 1) - 1, dd || 1).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          });
                        }

                        return (
                          <button
                            key={`month-item-${b.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedDateStr(b.date);
                              handleBookingClick(b);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: isExpiry ? '#FEF2F2' : 'var(--bg-surface)',
                              border: isExpiry ? '1px solid #FCA5A5' : '1px solid var(--border-light)',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontSize: '0.78rem', color: isExpiry ? '#B91C1C' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <strong>{isMultiDay ? `${dLabel}–${endLabel}` : dLabel}:</strong> {b.vehicleCode} ({b.category || b.type})
                            </span>
                            <ChevronRight size={14} color={isExpiry ? '#DC2626' : 'var(--text-tertiary)'} style={{ flexShrink: 0 }} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          );
        })()}

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
                    const endStr = b.deadline || b.date;
                    if (dateStr < b.date || dateStr > endStr) return false;
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
                          <div
                            className="day-empty-slot"
                            onClick={() => {
                              setSelectedBooking({
                                date: dateStr,
                                startTime: `${String(hour.val).padStart(2, '0')}:00`,
                                endTime: `${String(Math.min(18, hour.val + 2)).padStart(2, '0')}:00`
                              });
                              if (canEditCalendar) setModalType('new-booking');
                            }}
                            title={`Click to add schedule at ${hour.label}`}
                          >
                            <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>— No dispatches or maintenance (click to schedule)</span>
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
                                draggable={canEditCalendar}
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
                                    background: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-medium)'
                                  } : {})
                                }}
                              >
                                <img src={photo} alt={b.vehicleCode} className="day-card-photo" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>{b.vehicleCode}</span>
                                    <span
                                      className={`badge ${isMaint ? 'badge-warning' : isCompliance ? 'badge-neutral' : 'badge-success'}`}
                                    >
                                      {isMaint ? 'Maintenance' : isCompliance ? (isReg ? 'LTO Registration' : 'Insurance Validity') : 'Dispatch'}
                                    </span>
                                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={12} /> {b.startTime} - {b.endTime}
                                      </span>
                                      {canEditCalendar && (
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
                                      )}
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
    </div>
  );
};
