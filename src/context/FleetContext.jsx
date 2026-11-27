import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  DEFAULT_EDITABLES,
  DEFAULT_BRANCHES,
  DEFAULT_VEHICLES,
  DEFAULT_WORK_ORDERS,
  DEFAULT_REPAIR_ARCHIVE,
  DEFAULT_AUDIT_LOGS,
  DEFAULT_BOOKINGS,
  DEFAULT_DRIVERS,
  WORK_ORDER_STAGES,
  buildDefaultVehicleDiagnostics,
  getVehicleImage,
  getVehicleAuthorizedDrivers
} from '../data/fleetData';

const FleetContext = createContext(null);

const STORAGE_KEYS = {
  EDITABLES: 'flt_editables_react_v4',
  BRANCHES: 'flt_branches_react_v4',
  VEHICLES: 'flt_vehicles_react_v5',
  WORK_ORDERS: 'flt_work_orders_react_v4',
  REPAIRS: 'flt_repairs_react_v4',
  AUDIT_LOGS: 'flt_audit_logs_react_v4',
  BOOKINGS: 'flt_bookings_react_v4',
  DRIVERS: 'flt_drivers_react_v4',
  SETTINGS: 'flt_settings_react_v4',
  INCIDENTS: 'flt_incidents_react_v1',
  NOTIFICATIONS: 'flt_notifications_react_v1',
  NOTIFICATION_STATE: 'flt_notification_state_react_v1'
};

const DEFAULT_INCIDENTS = [
  {
    id: 'INC-2026-001',
    vehicleCode: 'FLT-PU-01',
    plateNo: 'MAA-2290',
    model: 'Toyota Hilux 2.8L 4x4 Double Cab',
    branchId: 'BR-KID',
    branch: 'Kidapawan District',
    driverName: 'Danilo C. Santos',
    date: new Date().toISOString().substring(0, 10),
    time: '09:30',
    location: 'Brgy. Paco National Highway, Kidapawan',
    category: 'Tire / Blowout',
    severity: 'Medium',
    odometerKm: 28410,
    notes: 'Noticed front-right tire sidewall bulge and vibration while returning from feeder inspection. Replaced with spare at roadside and drove slowly back to station.',
    photoUrl: null,
    status: 'Open',
    createdAt: new Date().toISOString()
  },
  {
    id: 'INC-2026-002',
    vehicleCode: 'FLT-BT-01',
    plateNo: 'NDI-4092',
    model: 'Isuzu Forward FTR 16m Boom',
    branchId: 'BR-KID',
    branch: 'Kidapawan District',
    driverName: 'Rodrigo T. Mendoza',
    date: new Date(Date.now() - 2 * 86400000).toISOString().substring(0, 10),
    time: '14:15',
    location: 'Magsaysay Feeder Line 3',
    category: 'Mechanical Breakdown',
    severity: 'High',
    odometerKm: 34250,
    notes: 'Slight hydraulic pressure drop when elevating boom past 12 meters. Paused aerial work and logged unit for motorpool inspection.',
    photoUrl: null,
    status: 'Under Review',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

const LEGACY_DEPARTMENT_MAP = {
  'Operations & Maintenance': 'Technical / Engineering',
  'Technical Services': 'Technical / Engineering',
  'Engineering & Construction': 'Technical / Engineering',
  'Area Dispatch & Grid Patrol': 'Area',
  'Emergency Response & Logistics': 'Institutional Services',
  'General Services & Fleet': 'Institutional Services'
};

const generalizeClassification = (c) => {
  if (!c) return 'Pickup';
  const s = String(c);
  if (s.includes('Pickup')) return 'Pickup';
  if (s.includes('Van')) return 'Van';
  if (s.includes('Bucket')) return 'Bucket Truck';
  if (s.includes('Motorcycle') || s.includes('Bike')) return 'Motorcycle';
  if (s.includes('Sedan') || s.includes('Car')) return 'Car / Sedan';
  if (s.includes('Truck') || s.includes('Crane') || s.includes('Derrick') || s.includes('Hauler')) return 'Truck';
  return c;
};

export const FleetProvider = ({ children }) => {
  // 1. Initial State from localStorage or Defaults
  const [editables, setEditables] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EDITABLES);
    if (!saved) return DEFAULT_EDITABLES;
    try {
      const parsed = JSON.parse(saved);
      return {
        departments: Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : DEFAULT_EDITABLES.departments,
        jobTitles: Array.isArray(parsed.jobTitles) && parsed.jobTitles.length > 0 ? parsed.jobTitles : DEFAULT_EDITABLES.jobTitles,
        employeeClassifications: Array.isArray(parsed.employeeClassifications) && parsed.employeeClassifications.length > 0 ? parsed.employeeClassifications : DEFAULT_EDITABLES.employeeClassifications,
        vehicleClassifications: Array.isArray(parsed.vehicleClassifications) && parsed.vehicleClassifications.length > 0 ? parsed.vehicleClassifications : DEFAULT_EDITABLES.vehicleClassifications,
        serviceCategories: Array.isArray(parsed.serviceCategories) && parsed.serviceCategories.length > 0 ? parsed.serviceCategories : DEFAULT_EDITABLES.serviceCategories,
        serviceTasksByCategory: parsed.serviceTasksByCategory && typeof parsed.serviceTasksByCategory === 'object'
          ? { ...DEFAULT_EDITABLES.serviceTasksByCategory, ...parsed.serviceTasksByCategory }
          : DEFAULT_EDITABLES.serviceTasksByCategory,
        mechanics: (() => {
          const raw = Array.isArray(parsed.mechanics) && parsed.mechanics.length > 0 ? parsed.mechanics : DEFAULT_EDITABLES.mechanics;
          const employeesOnly = raw.filter(m => !String(m).includes('(Outside Facility)'));
          return employeesOnly.length > 0 ? employeesOnly : DEFAULT_EDITABLES.mechanics;
        })(),
        diagnosticTypes: Array.isArray(parsed.diagnosticTypes) && parsed.diagnosticTypes.length > 0 ? parsed.diagnosticTypes : DEFAULT_EDITABLES.diagnosticTypes
      };
    } catch {
      return DEFAULT_EDITABLES;
    }
  });

  const [branches, setBranches] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    return saved ? JSON.parse(saved) : DEFAULT_BRANCHES;
  });

  const [vehicles, setVehicles] = useState(() => {
    const savedV5 = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    const savedV4 = !savedV5 ? localStorage.getItem('flt_vehicles_react_v4') : null;
    const rawSaved = savedV5 || savedV4;
    const isMigratingFromV4 = !savedV5 && !!savedV4;
    const baseList = rawSaved ? (() => { try { return JSON.parse(rawSaved); } catch { return DEFAULT_VEHICLES; } })() : DEFAULT_VEHICLES;
    return baseList.map(v => {
      const defV = DEFAULT_VEHICLES.find(dv => dv.id === v.id || dv.code === v.code);
      return {
        ...v,
        classification: generalizeClassification(v.classification),
        ownershipType: v.ownershipType || 'COTELCO Company Fleet (Pool Asset)',
        custodianDepartment: v.custodianDepartment || 'Technical / Engineering',
        acquisitionDate: v.acquisitionDate || `${v.year || 2022}-03-15`,
        acquisitionCost: v.acquisitionCost || 2100000,
        insuranceAcquiredDate: v.insuranceAcquiredDate || defV?.insuranceAcquiredDate || '2023-10-20',
        insuranceExpiryDate: v.insuranceExpiryDate || defV?.insuranceExpiryDate || '2026-10-20',
        registrationAcquiredDate: v.registrationAcquiredDate || defV?.registrationAcquiredDate || '2023-10-23',
        registrationExpiryDate: v.registrationExpiryDate || defV?.registrationExpiryDate || '2026-10-23',
        diagnostics: isMigratingFromV4 || !Array.isArray(v.diagnostics) || v.diagnostics.length === 0
          ? buildDefaultVehicleDiagnostics(v)
          : v.diagnostics
      };
    });
  });

  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
    if (!saved) return DEFAULT_WORK_ORDERS;
    try {
      const parsed = JSON.parse(saved);
      let completedSeen = 0;
      return parsed.map(w => {
        const isDone = w.status === 'Completed / Released' || w.currentStage === 'Completed / Released';
        let archivedFromBoard = Boolean(w.archivedFromBoard);
        if (isDone && !archivedFromBoard) {
          completedSeen += 1;
          if (completedSeen > 1) {
            archivedFromBoard = true;
          }
        }
        return {
          ...w,
          archivedFromBoard,
          currentStage: w.currentStage || (w.status === 'Completed / Released' ? 'Completed / Released' : 'Active Repair / Servicing'),
          assignedMechanic: w.assignedMechanic !== undefined ? w.assignedMechanic : 'Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)'
        };
      });
    } catch {
      return DEFAULT_WORK_ORDERS;
    }
  });

  const [repairArchive, setRepairArchive] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REPAIRS);
    return saved ? JSON.parse(saved) : DEFAULT_REPAIR_ARCHIVE;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : DEFAULT_AUDIT_LOGS;
  });

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return saved ? JSON.parse(saved) : DEFAULT_BOOKINGS;
  });

  const [drivers, setDrivers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (!saved) return DEFAULT_DRIVERS;
    try {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map(d => {
        const def = DEFAULT_DRIVERS.find(x => x.id === d.id);
        const rawDept = d.department || def?.department || 'Technical / Engineering';
        const migratedDept = LEGACY_DEPARTMENT_MAP[rawDept] || rawDept;
        const needsLicenseMigration = !d.licenseAcquiredDate;
        return {
          ...d,
          title: d.title || d.role || def?.title || 'Operator',
          role: d.title || d.role || def?.role || 'Operator',
          department: migratedDept,
          licenseNo: d.licenseNo && d.licenseNo !== 'N/A' ? d.licenseNo : (def?.licenseNo || `L02-22-${String(d.id || '100').replace(/\D/g, '').padStart(6, '4')}`),
          licenseType: d.licenseType || def?.licenseType || 'Professional (RC 1, 2)',
          licenseAcquiredDate: d.licenseAcquiredDate || def?.licenseAcquiredDate || '2022-08-15',
          licenseExpiry: needsLicenseMigration && def?.licenseExpiry ? def.licenseExpiry : (d.licenseExpiry || def?.licenseExpiry || '2027-08-15')
        };
      });
      const existingIds = new Set(migrated.map(d => d.id));
      const existingNames = new Set(migrated.map(d => (d.name || '').toLowerCase()));
      const missingDefaults = DEFAULT_DRIVERS.filter(
        def => !existingIds.has(def.id) && !existingNames.has((def.name || '').toLowerCase())
      );
      return [...migrated, ...missingDefaults];
    } catch {
      return DEFAULT_DRIVERS;
    }
  });

  const [incidentReports, setIncidentReports] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (!saved) return DEFAULT_INCIDENTS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : DEFAULT_INCIDENTS;
    } catch {
      return DEFAULT_INCIDENTS;
    }
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = saved ? JSON.parse(saved) : {};
    const validRole = parsed.currentRole === 'MECHANIC' ? 'MECHANIC' : 'DIRECTOR';
    return {
      seniorMode: false,
      highContrast: false,
      currentMechanic: DEFAULT_EDITABLES.mechanics[0],
      ...parsed,
      currentRole: validRole // 'DIRECTOR' or 'MECHANIC'
    };
  });

  const [activeTab, setActiveTabState] = useState('dashboard');
  const MECHANIC_TABS = ['dashboard', 'profiling', 'bookings', 'health', 'maintenance', 'auditing', 'profile'];
  const setActiveTab = (tab) => {
    if (settings.currentRole === 'MECHANIC' && !MECHANIC_TABS.includes(tab)) {
      setActiveTabState('dashboard');
      return;
    }
    setActiveTabState(tab);
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('flt_sidebar_collapsed') === 'true';
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [focusedHealthVehicleId, setFocusedHealthVehicleId] = useState(null);
  const [focusedProfileVehicleId, setFocusedProfileVehicleId] = useState(null);
  const [focusedMaintenanceIds, setFocusedMaintenanceIds] = useState(null);
  const [focusedTabPulse, setFocusedTabPulse] = useState(null);

  const [storedNotifications, setStoredNotifications] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [notificationState, setNotificationState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_STATE);
    if (!saved) return { readIds: [], dismissedIds: [] };
    try {
      const parsed = JSON.parse(saved);
      return {
        readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
        dismissedIds: Array.isArray(parsed?.dismissedIds) ? parsed.dismissedIds : []
      };
    } catch {
      return { readIds: [], dismissedIds: [] };
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('flt_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [modalType, setModalType] = useState(null); // 'vehicle-detail', 'reassign', 'new-wo', 'complete-wo', 'add-vehicle', 'receipt-voucher', 'new-booking', 'booking-detail'
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [activeWoToComplete, setActiveWoToComplete] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EDITABLES, JSON.stringify(editables));
  }, [editables]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(workOrders));
  }, [workOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(repairArchive));
  }, [repairArchive]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(storedNotifications));
  }, [storedNotifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_STATE, JSON.stringify(notificationState));
  }, [notificationState]);

  // Backend-ready Notification Engine (maps 1:1 to dbo.Notifications)
  const pushNotification = ({
    type = 'SYSTEM',
    severity = 'INFO',
    title = '',
    message = '',
    targetTab = 'dashboard',
    targetEntityType = null,
    targetEntityId = null,
    recipientRole = 'ALL',
    recipientName = null
  }) => {
    if (!title) return null;
    const notif = {
      id: `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type,
      severity,
      title,
      message,
      targetTab,
      targetEntityType,
      targetEntityId,
      recipientRole,
      recipientName,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false
    };
    setStoredNotifications(prev => [notif, ...prev].slice(0, 80));
    return notif;
  };

  const markNotificationRead = (notifId) => {
    if (!notifId) return;
    setNotificationState(prev => (
      prev.readIds.includes(notifId)
        ? prev
        : { ...prev, readIds: [...prev.readIds, notifId] }
    ));
    setStoredNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, isRead: true } : n)));
  };

  const dismissNotification = (notifId) => {
    if (!notifId) return;
    setNotificationState(prev => ({
      readIds: prev.readIds.includes(notifId) ? prev.readIds : [...prev.readIds, notifId],
      dismissedIds: prev.dismissedIds.includes(notifId) ? prev.dismissedIds : [...prev.dismissedIds, notifId]
    }));
    setStoredNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, isRead: true, isDismissed: true } : n)));
  };

  const notifications = useMemo(() => {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isMechanic = settings.currentRole === 'MECHANIC';
    const activeMechShort = (settings.currentMechanic || DEFAULT_EDITABLES.mechanics[0] || '').split(' (')[0].trim().toLowerCase();
    const readSet = new Set(notificationState.readIds || []);
    const dismissedSet = new Set(notificationState.dismissedIds || []);

    const liveItems = [];

    // 1. Live Document Expiry / Renewal notifications (Insurance & LTO Registration)
    vehicles.forEach(v => {
      const checkDoc = (expiryStr, docKey, docLabel) => {
        if (!expiryStr) return;
        const exp = new Date(expiryStr);
        if (isNaN(exp)) return;
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          liveItems.push({
            id: `NOTIF-DOC-${v.id}-${docKey}-${expiryStr}`,
            type: 'DOCUMENT_EXPIRY',
            severity: 'CRITICAL',
            title: `${v.code} · ${docLabel} Expired`,
            message: `Expired ${Math.abs(diffDays)}d ago (${expiryStr}). Update renewal in Car Profiling.`,
            targetTab: 'profiling',
            targetEntityType: 'VEHICLE',
            targetEntityId: v.id,
            recipientRole: 'DIRECTOR',
            recipientName: null,
            createdAt: `${expiryStr}T00:00:00.000Z`
          });
        } else if (diffDays <= 90) {
          liveItems.push({
            id: `NOTIF-DOC-${v.id}-${docKey}-${expiryStr}`,
            type: 'DOCUMENT_EXPIRY',
            severity: 'WARNING',
            title: `${v.code} · ${docLabel} Expiring Soon`,
            message: `Expires in ${diffDays}d (${expiryStr}). Schedule renewal in Car Profiling.`,
            targetTab: 'profiling',
            targetEntityType: 'VEHICLE',
            targetEntityId: v.id,
            recipientRole: 'DIRECTOR',
            recipientName: null,
            createdAt: `${expiryStr}T00:00:00.000Z`
          });
        }
      };

      checkDoc(v.insuranceExpiryDate, 'INS', 'Insurance');
      checkDoc(v.registrationExpiryDate, 'REG', 'LTO Registration');

      // 2. Live Ongoing Health diagnostic notifications
      const diags = Array.isArray(v.diagnostics) ? v.diagnostics : [];
      const currentOdo = Number(v.odometerKm) || 0;
      diags.forEach(diag => {
        const mode = diag.trackMode || 'BOTH';
        const targetKm = Number(diag.targetKm) || 0;
        const remainingKm = targetKm > 0 ? targetKm - currentOdo : null;
        let remainingDays = null;
        if (diag.targetDate) {
          const parts = String(diag.targetDate).split('-').map(Number);
          const targetLocal = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(diag.targetDate);
          if (!isNaN(targetLocal)) {
            remainingDays = Math.ceil((targetLocal - todayLocal) / (1000 * 60 * 60 * 24));
          }
        }

        const kmOverdue = (mode === 'KM' || mode === 'BOTH') && remainingKm !== null && remainingKm <= 0;
        const kmSoon = (mode === 'KM' || mode === 'BOTH') && remainingKm !== null && remainingKm > 0 && remainingKm <= 1200;
        const dateOverdue = (mode === 'DATE' || mode === 'BOTH') && remainingDays !== null && remainingDays < 0;
        const dateSoon = (mode === 'DATE' || mode === 'BOTH') && remainingDays !== null && remainingDays >= 0 && remainingDays <= 21;

        if (kmOverdue || dateOverdue || kmSoon || dateSoon) {
          const isOverdue = kmOverdue || dateOverdue;
          const partsMsg = [];
          if (remainingKm !== null && (mode === 'KM' || mode === 'BOTH')) {
            partsMsg.push(remainingKm <= 0 ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km` : `${remainingKm.toLocaleString()} km left`);
          }
          if (remainingDays !== null && (mode === 'DATE' || mode === 'BOTH')) {
            partsMsg.push(remainingDays < 0 ? `${Math.abs(remainingDays)}d overdue` : `${remainingDays}d left`);
          }
          liveItems.push({
            id: `NOTIF-HEALTH-${v.id}-${diag.id || diag.type || diag.label}-${isOverdue ? 'OVERDUE' : 'SOON'}`,
            type: 'HEALTH_ALERT',
            severity: isOverdue ? 'CRITICAL' : 'WARNING',
            title: `${v.code} · ${diag.type || diag.label || 'Diagnostic'}`,
            message: `${isOverdue ? 'Service overdue' : 'Service due soon'}: ${partsMsg.join(' · ')}.`,
            targetTab: 'health',
            targetEntityType: 'VEHICLE',
            targetEntityId: v.id,
            recipientRole: 'ALL',
            recipientName: diag.assignedPerson || null,
            createdAt: now.toISOString()
          });
        }
      });
    });

    // 3. Live Active Maintenance Order notifications
    workOrders
      .filter(wo => wo.status !== 'Completed / Released')
      .forEach(wo => {
        const mechShort = (wo.assignedMechanic || '').split(' (')[0].trim();
        liveItems.push({
          id: `NOTIF-WO-${wo.id}-${wo.currentStage || 'OPEN'}`,
          type: 'MAINTENANCE',
          severity: wo.priority === 'EMERGENCY' || wo.priority === 'HIGH' ? 'CRITICAL' : 'INFO',
          title: `${wo.vehicleCode} · ${wo.currentStage || 'In Maintenance'}`,
          message: `${wo.type}${mechShort ? ` · Assigned to ${mechShort}` : ''}`,
          targetTab: 'maintenance',
          targetEntityType: 'WORK_ORDER',
          targetEntityId: wo.id,
          recipientRole: 'ALL',
          recipientName: wo.assignedMechanic || null,
          createdAt: wo.dateReported ? `${wo.dateReported}T08:00:00.000Z` : now.toISOString()
        });
      });

    // 4. Live Employee Driver's License Expiry / Renewal notifications
    drivers.forEach(d => {
      if (!d.licenseExpiry) return;
      const exp = new Date(d.licenseExpiry);
      if (isNaN(exp)) return;
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        liveItems.push({
          id: `NOTIF-LIC-${d.id}-${d.licenseExpiry}`,
          type: 'DOCUMENT_EXPIRY',
          severity: 'CRITICAL',
          title: `${d.name} · Driver's License Expired`,
          message: `License ${d.licenseNo || ''} expired ${Math.abs(diffDays)}d ago (${d.licenseExpiry}). Renew in Employees.`,
          targetTab: 'drivers',
          targetEntityType: 'DRIVER',
          targetEntityId: d.id,
          recipientRole: 'DIRECTOR',
          recipientName: null,
          createdAt: `${d.licenseExpiry}T00:00:00.000Z`
        });
      } else if (diffDays <= 90) {
        liveItems.push({
          id: `NOTIF-LIC-${d.id}-${d.licenseExpiry}`,
          type: 'DOCUMENT_EXPIRY',
          severity: 'WARNING',
          title: `${d.name} · License Expiring Soon`,
          message: `License ${d.licenseNo || ''} expires in ${diffDays}d (${d.licenseExpiry}). Schedule renewal in Employees.`,
          targetTab: 'drivers',
          targetEntityType: 'DRIVER',
          targetEntityId: d.id,
          recipientRole: 'DIRECTOR',
          recipientName: null,
          createdAt: `${d.licenseExpiry}T00:00:00.000Z`
        });
      }
    });

    // Vehicles assigned to current mechanic (for scoping)
    const mechanicVehicleIds = new Set();
    if (isMechanic) {
      workOrders.forEach(wo => {
        if ((wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === activeMechShort) {
          const v = vehicles.find(veh => veh.code === wo.vehicleCode);
          if (v) mechanicVehicleIds.add(v.id);
        }
      });
      vehicles.forEach(v => {
        const hasAssignedDiag = (v.diagnostics || []).some(
          d => (d.assignedPerson || '').split(' (')[0].trim().toLowerCase() === activeMechShort
        );
        if (hasAssignedDiag) mechanicVehicleIds.add(v.id);
      });
    }

    const merged = [...storedNotifications, ...liveItems]
      .filter(item => !item.isDismissed && !dismissedSet.has(item.id))
      .filter(item => {
        if (!isMechanic) {
          return item.recipientRole !== 'MECHANIC';
        }
        const recipShort = (item.recipientName || '').split(' (')[0].trim().toLowerCase();
        if (item.recipientRole === 'MECHANIC') {
          return !recipShort || recipShort === activeMechShort;
        }
        if (item.recipientRole === 'ALL') {
          if (recipShort && recipShort === activeMechShort) return true;
          if (item.targetEntityType === 'VEHICLE' && mechanicVehicleIds.has(item.targetEntityId)) return true;
        }
        return false;
      })
      .map(item => ({
        ...item,
        isRead: Boolean(item.isRead || readSet.has(item.id))
      }));

    // Deduplicate by id
    const seen = new Set();
    const unique = merged.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const sevRank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return unique.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      const sr = (sevRank[a.severity] ?? 2) - (sevRank[b.severity] ?? 2);
      if (sr !== 0) return sr;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }, [vehicles, drivers, workOrders, storedNotifications, notificationState, settings.currentRole, settings.currentMechanic]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const markAllNotificationsRead = () => {
    const visibleIds = notifications.map(n => n.id);
    if (visibleIds.length === 0) return;
    setNotificationState(prev => ({
      ...prev,
      readIds: Array.from(new Set([...(prev.readIds || []), ...visibleIds]))
    }));
    setStoredNotifications(prev =>
      prev.map(n => (visibleIds.includes(n.id) ? { ...n, isRead: true } : n))
    );
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidentReports));
  }, [incidentReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    document.documentElement.classList.toggle('senior-mode', settings.seniorMode);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
  }, [settings]);

  // Actions
  const toggleSeniorMode = () => {
    setSettings(prev => ({ ...prev, seniorMode: !prev.seniorMode }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const setRole = (newRole) => {
    const normalizedRole = newRole === 'MECHANIC' ? 'MECHANIC' : 'DIRECTOR';
    setSettings(prev => ({
      ...prev,
      currentRole: normalizedRole,
      currentMechanic: prev.currentMechanic || (editables.mechanics?.[0] || DEFAULT_EDITABLES.mechanics[0])
    }));
    if (normalizedRole === 'MECHANIC' && !MECHANIC_TABS.includes(activeTab)) {
      setActiveTabState('dashboard');
    } else if (normalizedRole !== 'MECHANIC' && activeTab === 'profile') {
      setActiveTabState('dashboard');
    }
    logAuditEvent('Role Switched', 'SECURITY_AUTH', `Session role changed to ${normalizedRole}`);
  };

  const setCurrentMechanic = (mechanicName) => {
    setSettings(prev => ({ ...prev, currentMechanic: mechanicName }));
    logAuditEvent('Active Mechanic Switched', 'SECURITY_AUTH', `Active mechanic view set to ${mechanicName}`);
  };

  const updateMechanicProfile = ({
    name,
    specialty,
    phone,
    email,
    department,
    branchId,
    category,
    employeeId,
    licenseNo,
    licenseType,
    licenseAcquiredDate,
    licenseExpiry
  }) => {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    if (!cleanName) return false;

    const currentFull = settings.currentMechanic || DEFAULT_EDITABLES.mechanics[0];
    const openParen = currentFull.indexOf('(');
    const oldShort = (openParen >= 0 ? currentFull.slice(0, openParen) : currentFull).trim();
    const oldNorm = oldShort.toLowerCase();
    const oldSpecialty = openParen >= 0 ? currentFull.slice(openParen + 1).replace(/\)$/, '').trim() : '';
    const cleanSpecialty = specialty !== undefined ? specialty.trim() : oldSpecialty;
    const specialtySuffix = cleanSpecialty ? ` (${cleanSpecialty})` : '';
    const newFull = `${cleanName}${specialtySuffix}`;

    const applyDriverUpdates = (d) => ({
      ...d,
      name: cleanName,
      phone: cleanPhone || d.phone,
      ...(cleanSpecialty ? { title: cleanSpecialty, role: cleanSpecialty } : {}),
      ...(email !== undefined ? { email: email.trim() } : {}),
      ...(department ? { department } : {}),
      ...(branchId ? { branchId } : {}),
      ...(category ? { category } : {}),
      ...(employeeId !== undefined && employeeId.trim() ? { employeeId: employeeId.trim() } : {}),
      ...(licenseNo !== undefined ? { licenseNo: licenseNo.trim() } : {}),
      ...(licenseType !== undefined ? { licenseType: licenseType.trim() } : {}),
      ...(licenseAcquiredDate !== undefined ? { licenseAcquiredDate } : {}),
      ...(licenseExpiry !== undefined ? { licenseExpiry } : {})
    });

    setDrivers(prev => prev.map(d => {
      if ((d.name || '').trim().toLowerCase() === oldNorm) {
        return applyDriverUpdates(d);
      }
      return d;
    }));

    setSelectedDriver(prev => {
      if (prev && (prev.name || '').trim().toLowerCase() === oldNorm) {
        return applyDriverUpdates(prev);
      }
      return prev;
    });

    setSettings(prev => ({ ...prev, currentMechanic: newFull }));

    setEditables(prev => ({
      ...prev,
      mechanics: (prev.mechanics || []).map(m =>
        m.split(' (')[0].trim().toLowerCase() === oldNorm ? newFull : m
      )
    }));

    setWorkOrders(prev => prev.map(w =>
      (w.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === oldNorm
        ? { ...w, assignedMechanic: newFull }
        : w
    ));

    setBookings(prev => prev.map(b =>
      b.type === 'MAINTENANCE' && (b.driver || '').split(' (')[0].trim().toLowerCase() === oldNorm
        ? { ...b, driver: newFull }
        : b
    ));

    setVehicles(prev => prev.map(v => ({
      ...v,
      diagnostics: Array.isArray(v.diagnostics)
        ? v.diagnostics.map(diag =>
            (diag.assignedPerson || '').split(' (')[0].trim().toLowerCase() === oldNorm
              ? { ...diag, assignedPerson: newFull }
              : diag
          )
        : v.diagnostics
    })));

    logAuditEvent('Mechanic Profile Updated', 'SECURITY_AUTH', `Updated profile for ${oldShort} → ${cleanName} (${cleanPhone || 'no phone change'}).`);
    return true;
  };

  const checkPermission = (allowedRoles, actionTitle) => {
    if (allowedRoles.includes(settings.currentRole)) {
      return true;
    }
    alert(`Permission Denied:\n\nAction "${actionTitle}" requires one of the following roles: [${allowedRoles.join(', ')}].\n\nYour active session role is: ${settings.currentRole}. Please switch your role in the top header selector to test this workflow.`);
    return false;
  };

  const logAuditEvent = (action, category, details, status = 'AUTHORIZED') => {
    const activeMechShort = (settings.currentMechanic || DEFAULT_EDITABLES.mechanics[0]).split(' (')[0].trim();
    const roleTitles = {
      DIRECTOR: 'Fleet Operations Director (Engr. R. Alcantara)',
      MECHANIC: `Assigned Mechanic (${activeMechShort})`
    };

    const newLog = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: roleTitles[settings.currentRole]?.split(' (')[1]?.replace(')', '') || 'Authorized Staff',
      role: roleTitles[settings.currentRole]?.split(' (')[0] || settings.currentRole,
      action,
      category,
      details,
      ipAddress: `192.168.10.${Math.floor(20 + Math.random() * 80)}`,
      status
    };

    setAuditLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  const reassignVehicle = (vehicleId, newBranchId, custodianDept, reason) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Reassign Vehicle Branch')) return false;

    const targetBranch = branches.find(b => b.id === newBranchId);
    if (!targetBranch) return false;

    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          branchId: newBranchId,
          custodianDepartment: custodianDept || v.custodianDepartment || 'Branch Motor Pool',
          statusReason: `Branch Custody Transfer: ${reason}`,
          coordinates: {
            lat: Number((targetBranch.coordinates.lat + (Math.random() - 0.5) * 0.015).toFixed(4)),
            lng: Number((targetBranch.coordinates.lng + (Math.random() - 0.5) * 0.015).toFixed(4))
          }
        };
      }
      return v;
    }));

    logAuditEvent(
      'Vehicle Reassigned',
      'CHAIN_OF_CUSTODY',
      `Vehicle ${vehicleId} station transferred to ${targetBranch.name} (${custodianDept || 'Branch Motor Pool'}). Justification: ${reason}`
    );
    return true;
  };

  const createWorkOrder = (woData) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER', 'MAINTENANCE'], 'Create Work Order')) return false;

    const woId = `REP-2026-${String(workOrders.length + 95).padStart(3, '0')}`;
    const initialStage = woData.currentStage || 'Queued / Inspection';
    const rawChecklist = Array.isArray(woData.checklist) && woData.checklist.length > 0
      ? woData.checklist
      : [woData.type || 'Inspection & Servicing'];
    const checklistItems = Array.isArray(woData.checklistItems) && woData.checklistItems.length > 0
      ? woData.checklistItems
      : rawChecklist.map((label, idx) => ({
          id: `CHK-${Date.now()}-${idx}`,
          label,
          done: initialStage === 'Completed / Released'
        }));

    const isUnscheduled =
      Boolean(woData.isUnscheduled) ||
      !(woData.assignedMechanic || '').trim() ||
      !(woData.scheduledDate || woData.targetCompletion);

    const startDate = isUnscheduled
      ? (woData.scheduledDate || '')
      : (woData.scheduledDate || woData.dateReported || new Date().toISOString().substring(0, 10));
    const deadlineDate = isUnscheduled
      ? (woData.targetCompletion || '')
      : (woData.targetCompletion || startDate);

    const newWO = {
      id: woId,
      ...woData,
      assignedMechanic: isUnscheduled ? (woData.assignedMechanic || '') : (woData.assignedMechanic || ''),
      checklistItems,
      status: initialStage === 'Completed / Released' ? 'Completed / Released' : 'In Shop',
      currentStage: initialStage,
      scheduledDate: startDate,
      dateReported: new Date().toISOString().substring(0, 10),
      targetCompletion: deadlineDate,
      incurredCost: Number(woData.incurredCost) || 0,
      stages: []
    };

    setWorkOrders(prev => [newWO, ...prev]);

    // Update vehicle to IN-SHOP (and optionally update next service intervals if provided)
    setVehicles(prev => prev.map(v => {
      if (v.code === woData.vehicleCode) {
        const nextKm = Number(woData.targetKm) || v.nextServiceDueKm;
        const nextDate = woData.nextServiceDate || v.nextServiceDueDate;
        return {
          ...v,
          status: initialStage === 'Completed / Released' ? 'ACTIVE' : 'IN-SHOP',
          statusReason: `Maintenance (${initialStage}): ${woData.type} — Assigned: ${newWO.assignedMechanic || 'Unassigned'}`,
          nextServiceDueKm: nextKm,
          nextServiceDueDate: nextDate
        };
      }
      return v;
    }));

    // Automatic Calendar Feed only when Scheduled (has both mechanic and schedule date)
    if (!isUnscheduled && startDate && newWO.assignedMechanic) {
      const targetVehicle = vehicles.find(v => v.code === woData.vehicleCode);
      const targetBranch = branches.find(b => b.id === (targetVehicle?.branchId || 'BR-KID'));
      const sameDay = !deadlineDate || deadlineDate === startDate;
      const autoBooking = {
        id: `BK-${woId}`,
        vehicleId: targetVehicle?.id || 'VEH-001',
        vehicleCode: woData.vehicleCode,
        driver: newWO.assignedMechanic,
        avatar: targetVehicle ? getVehicleImage(targetVehicle) : '',
        type: 'MAINTENANCE',
        title: sameDay
          ? `${woData.type || 'Maintenance Service'} (Due ${deadlineDate})`
          : `${woData.type || 'Maintenance Service'}`,
        category: woData.category || 'Preventive Maintenance (PMS)',
        date: startDate,
        deadline: deadlineDate,
        startHour: 8,
        endHour: 11,
        startTime: '08:00',
        endTime: '11:00',
        branchId: targetVehicle?.branchId || 'BR-KID',
        branch: targetBranch?.municipality || 'Station Motorpool',
        destination: woData.facility || 'COTELCO Motorpool & Diagnostic Bay',
        purpose: `${woData.description ? `${woData.description} · ` : ''}Scheduled: ${startDate} · Deadline: ${deadlineDate} (${woId})`,
        status: 'Scheduled'
      };

      setBookings(prev => [autoBooking, ...prev]);
    }

    logAuditEvent(
      'Maintenance Scheduled',
      'MAINTENANCE',
      `Scheduled ${woData.vehicleCode} for "${woData.type}" [Start: ${startDate}, Deadline: ${deadlineDate}, Stage: ${initialStage}]. Assigned to: ${woData.assignedMechanic || 'Motorpool Specialist'}.`
    );

    pushNotification({
      type: 'MAINTENANCE',
      severity: woData.priority === 'EMERGENCY' || woData.priority === 'HIGH' ? 'CRITICAL' : 'INFO',
      title: `${woData.vehicleCode} · Maintenance Scheduled`,
      message: `${woData.type} (${startDate} → Due ${deadlineDate}) · ${(woData.assignedMechanic || 'Motorpool Specialist').split(' (')[0].trim()}.`,
      targetTab: 'maintenance',
      targetEntityType: 'WORK_ORDER',
      targetEntityId: woId,
      recipientRole: 'ALL',
      recipientName: woData.assignedMechanic || null
    });

    return newWO;
  };

  const updateWorkOrderStage = (woId, newStage, updates = {}) => {
    if (!checkPermission(['DIRECTOR', 'MECHANIC'], 'Update Maintenance Stage')) return false;

    const targetWO = workOrders.find(w => w.id === woId);
    if (!targetWO) return false;

    const isCompleted = newStage === 'Completed / Released';
    const today = new Date().toISOString().substring(0, 10);

    setWorkOrders(prev => prev.map(w => {
      if (w.id === woId) {
        return {
          ...w,
          ...updates,
          currentStage: newStage,
          status: isCompleted ? 'Completed / Released' : 'In Shop',
          dateCompleted: isCompleted ? (updates.dateCompleted || today) : w.dateCompleted
        };
      }
      return w;
    }));

    // Sync Calendar booking when a work order is scheduled or its schedule/mechanic changes
    const nextMech = updates.assignedMechanic !== undefined ? updates.assignedMechanic : targetWO.assignedMechanic;
    const nextStart = updates.scheduledDate !== undefined ? updates.scheduledDate : targetWO.scheduledDate;
    const nextEnd = updates.targetCompletion !== undefined ? updates.targetCompletion : (targetWO.targetCompletion || nextStart);
    if ((updates.scheduledDate || updates.targetCompletion || updates.assignedMechanic) && nextMech && nextStart) {
      const targetVeh = vehicles.find(v => v.code === targetWO.vehicleCode);
      const targetBranch = branches.find(b => b.id === (targetVeh?.branchId || targetWO.branchId || 'BR-KID'));
      const bookingId = `BK-${woId}`;
      setBookings(prev => {
        const exists = prev.some(b => b.id === bookingId);
        if (exists) {
          return prev.map(b =>
            b.id === bookingId
              ? {
                  ...b,
                  driver: nextMech,
                  date: nextStart,
                  deadline: nextEnd || nextStart,
                  status: isCompleted ? 'Completed' : b.status
                }
              : b
          );
        }
        return [
          {
            id: bookingId,
            vehicleId: targetVeh?.id || '',
            vehicleCode: targetWO.vehicleCode,
            driver: nextMech,
            avatar: targetVeh ? getVehicleImage(targetVeh) : '',
            type: 'MAINTENANCE',
            title: targetWO.type || 'Maintenance Service',
            category: targetWO.category || 'Preventive Maintenance (PMS)',
            date: nextStart,
            deadline: nextEnd || nextStart,
            startHour: 8,
            endHour: 11,
            startTime: '08:00',
            endTime: '11:00',
            branchId: targetVeh?.branchId || targetWO.branchId || 'BR-KID',
            branch: targetBranch?.municipality || 'Station Motorpool',
            destination: targetWO.facility || 'COTELCO Motorpool & Diagnostic Bay',
            purpose: `${targetWO.description ? `${targetWO.description} · ` : ''}Scheduled: ${nextStart} · Deadline: ${nextEnd || nextStart} (${woId})`,
            status: isCompleted ? 'Completed' : 'Scheduled'
          },
          ...prev
        ];
      });
    }

    setVehicles(prev => prev.map(v => {
      if (v.code === targetWO.vehicleCode) {
        if (isCompleted) {
          const woTypeLower = (targetWO.type || '').toLowerCase();
          const activeChecklistItems = updates.checklistItems || targetWO.checklistItems || [];
          const extraItems = Array.isArray(updates.additionalWork)
            ? updates.additionalWork
            : (Array.isArray(targetWO.additionalWork) ? targetWO.additionalWork : []);
          const allTaskTextsLower = [
            woTypeLower,
            ...(targetWO.checklist || []).map(item => String(item || '').toLowerCase()),
            ...activeChecklistItems.map(item => String(item?.label || '').toLowerCase()),
            ...extraItems.map(item => String(typeof item === 'string' ? item : item?.label || '').toLowerCase())
          ].filter(Boolean);

          const updatedDiag = (v.diagnostics || buildDefaultVehicleDiagnostics(v)).map(d => {
            const dTypeLower = (d.type || '').toLowerCase();
            const isPrimaryMatch =
              dTypeLower === woTypeLower ||
              (woTypeLower.includes('oil') && dTypeLower.includes('oil')) ||
              (woTypeLower.includes('brake') && dTypeLower.includes('brake')) ||
              (woTypeLower.includes('dielectric') && dTypeLower.includes('dielectric')) ||
              (woTypeLower.includes('tire') && dTypeLower.includes('tire')) ||
              (woTypeLower.includes('battery') && dTypeLower.includes('battery'));

            const isAnyTaskMatch = allTaskTextsLower.some(t =>
              t === dTypeLower ||
              (t.includes('oil') && dTypeLower.includes('oil')) ||
              (t.includes('brake') && dTypeLower.includes('brake')) ||
              (t.includes('dielectric') && dTypeLower.includes('dielectric')) ||
              (t.includes('tire') && dTypeLower.includes('tire')) ||
              (t.includes('battery') && dTypeLower.includes('battery'))
            );

            if (isPrimaryMatch || isAnyTaskMatch) {
              const overrideKm = isPrimaryMatch ? Number(updates.intervalKmOverride) : 0;
              const interval = overrideKm > 0 ? overrideKm : (Number(d.intervalKm) || 5000);
              let nextTargetDate = (isPrimaryMatch && updates.targetDateOverride) ? updates.targetDateOverride : d.targetDate;
              if ((!isPrimaryMatch || !updates.targetDateOverride) && d.intervalMonths && d.intervalMonths !== 'CUSTOM') {
                const [y, m, day] = today.split('-').map(Number);
                const targetMonthDate = new Date(y, (m - 1) + Number(d.intervalMonths), 1);
                const maxDay = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
                targetMonthDate.setDate(Math.min(day, maxDay));
                nextTargetDate = `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, '0')}-${String(targetMonthDate.getDate()).padStart(2, '0')}`;
              }
              return {
                ...d,
                intervalKm: interval,
                lastDoneKm: v.odometerKm || d.lastDoneKm,
                targetKm: (v.odometerKm || 0) + interval,
                lastDoneDate: today,
                targetDate: nextTargetDate,
                notes: isPrimaryMatch ? (updates.mechanicNote || updates.description || d.notes) : `Updated via additional mechanic work (${today})`,
                assignedPerson: updates.assignedMechanic || targetWO.assignedMechanic || d.assignedPerson
              };
            }
            return d;
          });
          const overrideKmNum = Number(updates.intervalKmOverride);
          return {
            ...v,
            status: 'ACTIVE',
            statusReason: 'Cleared maintenance & diagnostics. Returned to active service.',
            lastServiceDate: today,
            nextServiceDueKm: overrideKmNum > 0
              ? ((v.odometerKm || 0) + overrideKmNum)
              : (Number(updates.targetKm) || Number(targetWO.targetKm) || ((v.odometerKm || 20000) + 5000)),
            nextServiceDueDate: updates.targetDateOverride || updates.nextServiceDate || targetWO.nextServiceDate || v.nextServiceDueDate,
            urgentAlert: null,
            diagnostics: updatedDiag
          };
        }
        return {
          ...v,
          status: 'IN-SHOP',
          statusReason: `Maintenance (${newStage}): ${targetWO.type} — Assigned: ${updates.assignedMechanic || targetWO.assignedMechanic}`
        };
      }
      return v;
    }));

    if (isCompleted && (updates.createReport || updates.mechanicNote)) {
      const targetVeh = vehicles.find(v => v.code === targetWO.vehicleCode);
      const nextKmVal = Number(updates.intervalKmOverride);
      const extraWorkList = (
        Array.isArray(updates.additionalWork)
          ? updates.additionalWork
          : (Array.isArray(targetWO.additionalWork) ? targetWO.additionalWork : [])
      )
        .map(item => (typeof item === 'string' ? item : item?.label || '').trim())
        .filter(Boolean);
      const extraChecklistLabels = (updates.checklistItems || targetWO.checklistItems || [])
        .filter(i => i.addedByMechanic)
        .map(i => i.label)
        .filter(Boolean);
      const combinedExtras = Array.from(new Set([...extraWorkList, ...extraChecklistLabels]));
      const extraDetails = combinedExtras.length > 0
        ? `Additional work / parts replaced: ${combinedExtras.join(', ')}`
        : null;
      const intervalDetails = [
        nextKmVal > 0 ? `Next interval: +${nextKmVal.toLocaleString()} km` : null,
        updates.targetDateOverride ? `Next due date: ${updates.targetDateOverride}` : null
      ].filter(Boolean).join(' · ');
      const noteText = (updates.mechanicNote || updates.description || '').trim();
      const fullSummary = [noteText, extraDetails, intervalDetails].filter(Boolean).join('\n') || 'Completed assigned maintenance checklist.';
      const allPartsReplaced = Array.from(new Set([
        ...(updates.checklistItems || targetWO.checklistItems || []).map(i => i.label),
        ...combinedExtras
      ])).filter(Boolean).join(', ') || targetWO.type;

      setRepairArchive(prev => {
        const existingIdx = prev.findIndex(r => r.woNo === woId);
        if (existingIdx >= 0) {
          return prev.map((r, i) => (
            i === existingIdx
              ? {
                  ...r,
                  date: today,
                  mechanic: updates.assignedMechanic || targetWO.assignedMechanic || r.mechanic,
                  serviceSummary: fullSummary,
                  partsReplaced: allPartsReplaced
                }
              : r
          ));
        }
        const voucherNo = `VCH-2026-${Math.floor(10000 + Math.random() * 90000)}`;
        const receiptId = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
        return [
          {
            id: voucherNo,
            voucherNo,
            receiptId,
            woNo: woId,
            date: today,
            vehicleCode: targetWO.vehicleCode,
            plateNo: targetWO.plateNo || targetVeh?.plateNo || 'N/A',
            model: targetVeh?.makeModel || targetWO.classification || 'Utility Vehicle',
            branchId: targetWO.branchId || targetVeh?.branchId || 'BR-KID',
            repairScope: 'IN_HOUSE',
            facility: targetWO.facility || 'In-House Motorpool',
            mechanic: updates.assignedMechanic || targetWO.assignedMechanic || 'Assigned Mechanic',
            serviceType: targetWO.type || 'Maintenance Service',
            serviceSummary: fullSummary,
            laborCost: 0,
            partsCost: 0,
            totalCost: Number(targetWO.incurredCost) || 0,
            partsReplaced: allPartsReplaced,
            approvedBy: 'Engr. Roberto M. Alcantara (Fleet Operations Director)'
          },
          ...prev
        ];
      });
    }

    pushNotification({
      type: 'MAINTENANCE',
      severity: 'INFO',
      title: `${targetWO.vehicleCode} · ${newStage}`,
      message: isCompleted && (updates.mechanicNote || updates.description)
        ? `${targetWO.type} completed — "${(updates.mechanicNote || updates.description).trim()}"`
        : `${targetWO.type} updated to "${newStage}".`,
      targetTab: isCompleted && updates.createReport ? 'auditing' : 'maintenance',
      targetEntityType: 'WORK_ORDER',
      targetEntityId: woId,
      recipientRole: newStage === 'Completed / Released' ? 'DIRECTOR' : 'ALL',
      recipientName: updates.assignedMechanic || targetWO.assignedMechanic || null
    });

    logAuditEvent(
      'Maintenance Stage Updated',
      'MAINTENANCE',
      `Updated ${targetWO.vehicleCode} (${woId}) stage to "${newStage}".`
    );
    return true;
  };

  const archiveCompletedWorkOrder = (woId) => {
    if (!checkPermission(['DIRECTOR', 'MECHANIC'], 'Archive Completed Maintenance')) return false;
    const targetWO = workOrders.find(w => w.id === woId);
    if (!targetWO) return false;

    const today = new Date().toISOString().substring(0, 10);
    const v = vehicles.find(veh => veh.code === targetWO.vehicleCode);

    setWorkOrders(prev => prev.map(w =>
      w.id === woId
        ? {
            ...w,
            status: 'Completed / Released',
            currentStage: 'Completed / Released',
            dateCompleted: w.dateCompleted || today,
            archivedFromBoard: true
          }
        : w
    ));

    setRepairArchive(prev => {
      if (prev.some(r => r.woNo === woId)) return prev;
      const voucherNo = `VCH-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const receiptId = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
      const historyRecord = {
        id: voucherNo,
        voucherNo,
        receiptId,
        woNo: woId,
        date: targetWO.dateCompleted || today,
        vehicleCode: targetWO.vehicleCode,
        plateNo: targetWO.plateNo || v?.plateNo || 'N/A',
        model: v?.makeModel || targetWO.classification || 'Utility Vehicle',
        branchId: targetWO.branchId || v?.branchId || 'BR-KID',
        repairScope: 'IN_HOUSE',
        facility: targetWO.facility || 'COTELCO Central Motorpool',
        mechanic: targetWO.assignedMechanic || 'Assigned Mechanic',
        serviceType: targetWO.type || 'Maintenance Service',
        serviceSummary: targetWO.mechanicNote || targetWO.description || targetWO.notes || 'Completed maintenance service.',
        laborCost: 0,
        partsCost: 0,
        totalCost: Number(targetWO.incurredCost) || 0,
        partsReplaced: (targetWO.checklistItems || []).map(i => i.label).join(', ') || targetWO.type,
        approvedBy: 'Engr. Roberto M. Alcantara (Fleet Operations Director)'
      };
      return [historyRecord, ...prev];
    });

    logAuditEvent(
      'Maintenance Archived to History',
      'MAINTENANCE',
      `Archived completed maintenance ${targetWO.vehicleCode} (${woId}) to Repair History.`
    );
    return true;
  };

  const deleteWorkOrder = (woId) => {
    if (!checkPermission(['DIRECTOR'], 'Delete Maintenance Work Order')) return false;
    const targetWO = workOrders.find(w => w.id === woId);
    if (!targetWO) return false;

    const remainingWOs = workOrders.filter(w => w.id !== woId);
    setWorkOrders(remainingWOs);
    setBookings(prev => prev.filter(b => b.id !== `BK-${woId}`));

    const stillInShop = remainingWOs.some(
      w => w.vehicleCode === targetWO.vehicleCode && w.status !== 'Completed / Released' && w.currentStage !== 'Completed / Released'
    );
    if (!stillInShop) {
      setVehicles(prev => prev.map(v =>
        v.code === targetWO.vehicleCode
          ? { ...v, status: 'ACTIVE', statusReason: 'Active Fleet Deployment' }
          : v
      ));
    }

    logAuditEvent(
      'Work Order Deleted',
      'MAINTENANCE',
      `Deleted work order ${woId} (${targetWO.vehicleCode} — ${targetWO.type}).`
    );
    return true;
  };

  const upsertVehicleDiagnostic = (vehicleId, diagItem) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER', 'MAINTENANCE'], 'Update Vehicle Diagnostics')) return false;

    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId && v.code !== vehicleId) return v;
      const list = Array.isArray(v.diagnostics) ? [...v.diagnostics] : buildDefaultVehicleDiagnostics(v);
      const idx = list.findIndex(item => item.id === diagItem.id || item.type.toLowerCase() === diagItem.type.toLowerCase());
      const record = {
        ...diagItem,
        id: diagItem.id || `DIAG-${v.id}-${Date.now()}`
      };

      if (idx >= 0) {
        list[idx] = { ...list[idx], ...record };
      } else {
        list.push(record);
      }

      // If it's oil or primary PMS, sync nextServiceDueKm / nextServiceDueDate for global consistency
      let nextKm = v.nextServiceDueKm;
      let nextDate = v.nextServiceDueDate;
      if (record.type.toLowerCase().includes('oil') || list.length === 1) {
        if (record.targetKm) nextKm = Number(record.targetKm);
        if (record.targetDate) nextDate = record.targetDate;
      }

      return {
        ...v,
        odometerKm: diagItem.currentOdometerKm !== undefined ? Number(diagItem.currentOdometerKm) : v.odometerKm,
        nextServiceDueKm: nextKm,
        nextServiceDueDate: nextDate,
        diagnostics: list
      };
    }));

    logAuditEvent(
      'Vehicle Diagnostic Updated',
      'MAINTENANCE',
      `Updated diagnostic "${diagItem.type}" for vehicle ${vehicleId} (Assigned: ${diagItem.assignedPerson || 'Technician'}).`
    );
    return true;
  };

  const removeVehicleDiagnostic = (vehicleId, diagId) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER', 'MAINTENANCE'], 'Remove Vehicle Diagnostic')) return false;
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId && v.code !== vehicleId) return v;
      return {
        ...v,
        diagnostics: (v.diagnostics || []).filter(d => d.id !== diagId)
      };
    }));
    logAuditEvent('Vehicle Diagnostic Removed', 'MAINTENANCE', `Removed diagnostic item ${diagId} from ${vehicleId}.`);
    return true;
  };

  const completeWorkOrder = (woId, partsCost, laborCost, summary) => {
    if (!checkPermission(['DIRECTOR', 'MAINTENANCE'], 'Clear Work Order & Generate Receipt')) return false;

    const targetWO = workOrders.find(w => w.id === woId);
    if (!targetWO) return false;

    const total = Number(partsCost) + Number(laborCost);

    // Update Work Order
    setWorkOrders(prev => prev.map(w => {
      if (w.id === woId) {
        return {
          ...w,
          status: 'Completed / Released',
          incurredCost: total,
          stages: []
        };
      }
      return w;
    }));

    // Update Vehicle to ACTIVE
    setVehicles(prev => prev.map(v => {
      if (v.code === targetWO.vehicleCode) {
        return {
          ...v,
          status: 'ACTIVE',
          statusReason: 'Returned from outside repair shop to active line service.',
          lastServiceDate: new Date().toISOString().substring(0, 10),
          urgentAlert: null
        };
      }
      return v;
    }));

    // Create Archive Voucher
    const targetVehicle = vehicles.find(v => v.code === targetWO.vehicleCode);
    const targetBranch = branches.find(b => b.id === (targetVehicle?.branchId || 'BR-KID'));
    const voucherNo = `VCH-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newVoucher = {
      voucherNo,
      receiptId: `RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
      workOrderNo: targetWO.id,
      date: new Date().toISOString().substring(0, 10),
      vehicleCode: targetWO.vehicleCode,
      plateNo: targetWO.plateNo || targetVehicle?.plateNo || 'N/A',
      model: targetVehicle?.makeModel || 'Utility Vehicle',
      branch: targetBranch?.name || 'Central Operations Headquarters',
      branchId: targetBranch?.id || targetVehicle?.branchId || 'BR-KID',
      facility: targetWO.facility || 'Authorized Dealer Service Center',
      serviceType: targetWO.type,
      serviceSummary: summary || targetWO.description,
      laborCost: Number(laborCost),
      partsCost: Number(partsCost),
      totalCost: total,
      approvedBy: 'Engr. Roberto M. Alcantara (Fleet Operations Director)',
      mechanic: targetWO.assignedMechanic || 'Authorized Service Center Lead',
      driverReceiptSign: 'COTELCO Motorpool Custodian / Lead Inspector',
      items: targetWO.partsList?.length ? targetWO.partsList.map(p => ({
        desc: p.part,
        qty: p.qty,
        unitPrice: p.cost / p.qty,
        amount: p.cost
      })) : [
        { desc: 'Outside Shop Replacement Parts & Supplies', qty: 1, unitPrice: partsCost, amount: partsCost },
        { desc: 'Outside Shop Specialized Diagnostic & Mechanical Labor', qty: 1, unitPrice: laborCost, amount: laborCost }
      ]
    };

    setRepairArchive(prev => [newVoucher, ...prev]);

    logAuditEvent(
      'Outside Repair Returned',
      'FINANCIAL_AUDIT',
      `Vehicle ${targetWO.vehicleCode} returned from ${targetWO.facility || 'outside shop'}. Incurred: ₱${total.toLocaleString()}. Voucher: ${voucherNo}`
    );

    pushNotification({
      type: 'MAINTENANCE',
      severity: 'INFO',
      title: `${targetWO.vehicleCode} · Maintenance Completed`,
      message: `Cleared from ${targetWO.facility || 'shop'} (${voucherNo}). Returned to active fleet.`,
      targetTab: 'auditing',
      targetEntityType: 'REPORT',
      targetEntityId: voucherNo,
      recipientRole: 'DIRECTOR',
      recipientName: null
    });

    return newVoucher;
  };

  const addLedgerEntry = (entryData) => {
    if (!checkPermission(['DIRECTOR', 'MAINTENANCE'], 'Record Expense Voucher')) return false;

    const voucherNo = entryData.voucherNo?.trim() || `VCH-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptId = entryData.receiptId?.trim() || `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
    const workOrderNo = entryData.workOrderNo?.trim() || `WO-EXT-${Math.floor(100 + Math.random() * 900)}`;

    const targetVehicle = vehicles.find(v => v.code === entryData.vehicleCode);
    const targetBranch = branches.find(b => b.id === (entryData.branchId || targetVehicle?.branchId || 'BR-KID'));

    const laborCost = Number(entryData.laborCost || 0);
    const partsCost = Number(entryData.partsCost || 0);
    const totalCost = laborCost + partsCost;

    const newVoucher = {
      voucherNo,
      receiptId,
      workOrderNo,
      date: entryData.date || new Date().toISOString().substring(0, 10),
      vehicleCode: entryData.vehicleCode || targetVehicle?.code || 'COTELCO-GEN',
      plateNo: targetVehicle?.plateNo || entryData.plateNo || 'N/A',
      model: targetVehicle?.makeModel || entryData.model || 'Utility Vehicle',
      branch: targetBranch?.name || entryData.branch || 'Central Operations Headquarters',
      branchId: targetBranch?.id || targetVehicle?.branchId || 'BR-KID',
      facility: entryData.facility?.trim() || 'Central Motorpool & Testing Facility',
      repairScope: entryData.repairScope || (String(entryData.facility || '').toLowerCase().includes('motorpool') ? 'IN_HOUSE' : 'OUTSIDE'),
      receiptImage: entryData.receiptImage || null,
      fileName: entryData.fileName || null,
      fileType: entryData.fileType || null,
      fileSize: entryData.fileSize || null,
      fileDataUrl: entryData.fileDataUrl || null,
      serviceType: entryData.serviceType?.trim() || 'Fleet Report',
      serviceSummary: entryData.serviceSummary?.trim() || entryData.serviceType?.trim() || 'Uploaded vehicle report',
      laborCost,
      partsCost,
      totalCost,
      approvedBy: entryData.approvedBy || 'Engr. Roberto M. Alcantara (Fleet Operations Director)',
      mechanic: entryData.mechanic?.trim() || 'Senior Motorpool Mechanic',
      driverReceiptSign: entryData.driverReceiptSign || targetVehicle?.assignedDriver || 'COTELCO Motorpool Custodian',
      items: entryData.items && entryData.items.length > 0 ? entryData.items : [
        { desc: entryData.serviceType || 'Component Parts & Supplies', qty: 1, unitPrice: partsCost, amount: partsCost },
        { desc: 'Labor & Diagnostic Service', qty: 1, unitPrice: laborCost, amount: laborCost }
      ]
    };

    setRepairArchive(prev => [newVoucher, ...prev]);

    logAuditEvent(
      'Service Report Added',
      'OPERATIONS_REPORT',
      `Recorded service report ${voucherNo} on ${newVoucher.vehicleCode} (${newVoucher.facility}).`
    );

    pushNotification({
      type: 'REPORT',
      severity: 'INFO',
      title: `${newVoucher.vehicleCode} · New Service Report`,
      message: `${newVoucher.serviceType} logged by ${(newVoucher.mechanic || 'Staff').split(' (')[0].trim()}.`,
      targetTab: 'auditing',
      targetEntityType: 'REPORT',
      targetEntityId: voucherNo,
      recipientRole: 'DIRECTOR',
      recipientName: null
    });

    return newVoucher;
  };

  const addIncidentReport = (reportData) => {
    const targetVehicle = vehicles.find(v => v.code === reportData.vehicleCode || v.id === reportData.vehicleId);
    const targetBranch = branches.find(b => b.id === (reportData.branchId || targetVehicle?.branchId || 'BR-KID'));

    const newIncident = {
      id: `INC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      vehicleCode: targetVehicle?.code || reportData.vehicleCode || 'N/A',
      plateNo: targetVehicle?.plateNo || reportData.plateNo || 'N/A',
      model: targetVehicle?.makeModel || reportData.model || 'Utility Vehicle',
      branchId: targetBranch?.id || targetVehicle?.branchId || 'BR-KID',
      branch: targetBranch?.municipality || targetBranch?.name || 'Kidapawan District',
      driverName: (reportData.driverName || '').trim() || targetVehicle?.assignedDriver || 'Field Driver',
      date: reportData.date || new Date().toISOString().substring(0, 10),
      time: reportData.time || new Date().toTimeString().slice(0, 5),
      location: (reportData.location || '').trim() || 'Field Route',
      category: reportData.category || 'Mechanical Breakdown',
      severity: reportData.severity || 'Medium',
      odometerKm: reportData.odometerKm ? Number(reportData.odometerKm) : (targetVehicle?.odometerKm || 0),
      notes: (reportData.notes || '').trim(),
      photoUrl: reportData.photoUrl || null,
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    setIncidentReports(prev => [newIncident, ...prev]);
    logAuditEvent(
      'Driver Incident Reported',
      'INCIDENT_REPORT',
      `${newIncident.driverName} filed ${newIncident.severity} incident (${newIncident.category}) on ${newIncident.vehicleCode} at ${newIncident.location}.`
    );
    return newIncident;
  };

  const updateIncidentReportStatus = (incidentId, status) => {
    setIncidentReports(prev =>
      prev.map(inc => (inc.id === incidentId ? { ...inc, status } : inc))
    );
    logAuditEvent('Incident Status Updated', 'INCIDENT_REPORT', `Updated incident ${incidentId} status to ${status}.`);
  };

  const deleteIncidentReport = (incidentId) => {
    setIncidentReports(prev => prev.filter(inc => inc.id !== incidentId));
    logAuditEvent('Incident Report Removed', 'INCIDENT_REPORT', `Removed incident report ${incidentId}.`);
  };

  const addVehicle = (vehicleData) => {
    if (!checkPermission(['DIRECTOR'], 'Register New Asset')) return false;

    const id = `VEH-${String(vehicles.length + 1).padStart(3, '0')}`;
    const branch = branches.find(b => b.id === vehicleData.branchId);

    const baseVehicle = {
      id,
      ...vehicleData,
      status: 'ACTIVE',
      urgentAlert: null,
      odometerKm: Number(vehicleData.odometerKm || 250),
      operatingHours: Number(vehicleData.operatingHours || 15),
      acquisitionCost: Number(vehicleData.acquisitionCost || 2000000),
      acquisitionDate: vehicleData.acquisitionDate || new Date().toISOString().substring(0, 10),
      supplier: vehicleData.supplier || 'Authorized Commercial Dealer',
      orCrNo: vehicleData.orCrNo || `CR-${Math.floor(100000 + Math.random() * 900000)}-A`,
      assetTag: vehicleData.assetTag || `COTELCO-FA-${vehicleData.code}`,
      ownershipType: 'COTELCO Company Fleet (Pool Asset)',
      custodianDepartment: vehicleData.custodianDepartment || 'Operations & Maintenance Motor Pool',
      warrantyPolicy: vehicleData.warrantyPolicy || '3 Years / 100,000 km Fleet Assurance',
      fuelLevelPct: 100,
      lastServiceDate: vehicleData.acquisitionDate || new Date().toISOString().substring(0, 10),
      nextServiceDueKm: Number(vehicleData.odometerKm || 250) + 5000,
      nextServiceDueDate: '2027-01-15',
      authorizedDriverIds: Array.isArray(vehicleData.authorizedDriverIds) ? vehicleData.authorizedDriverIds : [],
      coordinates: {
        lat: branch ? Number((branch.coordinates.lat + (Math.random() - 0.5) * 0.015).toFixed(4)) : 7.0089,
        lng: branch ? Number((branch.coordinates.lng + (Math.random() - 0.5) * 0.015).toFixed(4)) : 125.0898
      },
      specs: {
        payloadCapacity: 'Heavy Commercial Spec',
        transmission: 'Heavy Duty Manual'
      }
    };

    const newVehicle = {
      ...baseVehicle,
      diagnostics: Array.isArray(vehicleData.diagnostics) && vehicleData.diagnostics.length > 0
        ? vehicleData.diagnostics
        : buildDefaultVehicleDiagnostics(baseVehicle)
    };

    setVehicles(prev => [...prev, newVehicle]);

    logAuditEvent(
      'Asset Commissioned',
      'ASSET_REGISTRY',
      `Commissioned new vehicle ${newVehicle.code} (${newVehicle.plateNo}) - ${newVehicle.makeModel} to ${branch?.name}.`
    );

    pushNotification({
      type: 'SYSTEM',
      severity: 'INFO',
      title: `${newVehicle.code} · Vehicle Added`,
      message: `${newVehicle.makeModel} (${newVehicle.plateNo}) registered to ${branch?.municipality || 'station'}.`,
      targetTab: 'profiling',
      targetEntityType: 'VEHICLE',
      targetEntityId: newVehicle.id,
      recipientRole: 'DIRECTOR',
      recipientName: null
    });

    return newVehicle;
  };

  const updateVehicle = (id, updates) => {
    let targetVeh = null;
    setVehicles(prev => prev.map(v => {
      if (v.id === id) {
        const mergedSpecs = updates.specs ? { ...(v.specs || {}), ...updates.specs } : v.specs;
        let nextRegHistory = updates.registrationHistory || v.registrationHistory || [];

        if (!updates.registrationHistory) {
          const regChanged =
            (updates.registrationAcquiredDate && updates.registrationAcquiredDate !== v.registrationAcquiredDate) ||
            (updates.registrationExpiryDate && updates.registrationExpiryDate !== v.registrationExpiryDate);
          const insChanged =
            (updates.insuranceAcquiredDate && updates.insuranceAcquiredDate !== v.insuranceAcquiredDate) ||
            (updates.insuranceExpiryDate && updates.insuranceExpiryDate !== v.insuranceExpiryDate);

          if (regChanged) {
            nextRegHistory = [
              {
                id: `REG-HIST-${Date.now()}-LTO`,
                type: 'LTO Registration (OR/CR)',
                referenceNo: updates.orCrNo || v.orCrNo || 'OR/CR Renewal',
                dateAcquired: updates.registrationAcquiredDate || v.registrationAcquiredDate,
                expiryDate: updates.registrationExpiryDate || v.registrationExpiryDate,
                agency: 'LTO District Office',
                status: 'Active'
              },
              ...nextRegHistory
            ];
          }
          if (insChanged) {
            nextRegHistory = [
              {
                id: `REG-HIST-${Date.now()}-INS`,
                type: 'Comprehensive Fleet Insurance',
                referenceNo: `GSIS-POL-${v.code}`,
                dateAcquired: updates.insuranceAcquiredDate || v.insuranceAcquiredDate,
                expiryDate: updates.insuranceExpiryDate || v.insuranceExpiryDate,
                agency: 'GSIS / Commercial Fleet Insurer',
                status: 'Active'
              },
              ...nextRegHistory
            ];
          }
        }

        const updated = {
          ...v,
          ...updates,
          specs: mergedSpecs,
          registrationHistory: nextRegHistory
        };
        targetVeh = updated;
        if (selectedVehicle && selectedVehicle.id === id) {
          setSelectedVehicle(updated);
        }
        return updated;
      }
      return v;
    }));

    // Synchronize any matching custom bookings if insurance or registration dates changed
    if (updates.insuranceExpiryDate || updates.registrationExpiryDate) {
      setBookings(prev => prev.map(b => {
        if (b.id === `INS-EXP-${id}` && updates.insuranceExpiryDate) {
          return {
            ...b,
            date: updates.insuranceExpiryDate,
            purpose: `GSIS / Commercial Fleet Insurance Term: ${updates.insuranceAcquiredDate || targetVeh?.insuranceAcquiredDate || 'N/A'} — ${updates.insuranceExpiryDate}`
          };
        }
        if (b.id === `REG-EXP-${id}` && updates.registrationExpiryDate) {
          return {
            ...b,
            date: updates.registrationExpiryDate,
            purpose: `LTO OR/CR Registration Term (${updates.orCrNo || targetVeh?.orCrNo || 'OR/CR'}): ${updates.registrationAcquiredDate || targetVeh?.registrationAcquiredDate || 'N/A'} — ${updates.registrationExpiryDate}`
          };
        }
        return b;
      }));
    }

    logAuditEvent('Vehicle Profile Updated', 'ASSET_REGISTRY', `Updated technical, insurance & registration specifications for asset ${id}`);
    return true;
  };

  const applyDriverAccessChange = (v, driverId, mode) => {
    const currentList = getVehicleAuthorizedDrivers(v, drivers).map(d => d.id);
    const currentIds = Array.isArray(v.authorizedDriverIds) ? v.authorizedDriverIds : currentList;
    const exists = currentIds.includes(driverId);

    let updatedIds = currentIds;
    if (mode === 'grant' && !exists) {
      updatedIds = [...currentIds, driverId];
    } else if (mode === 'revoke' && exists) {
      updatedIds = currentIds.filter(id => id !== driverId);
    } else if (mode === 'toggle') {
      updatedIds = exists
        ? currentIds.filter(id => id !== driverId)
        : [...currentIds, driverId];
    } else {
      return v;
    }

    const d = drivers.find(item => item.id === driverId);
    const today = new Date().toISOString().substring(0, 10);
    const isGrant = mode === 'grant' || (mode === 'toggle' && !exists);
    const historyEntry = {
      id: `DH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverId: d?.id || driverId,
      driverName: d?.name || driverId,
      employeeId: d?.employeeId || 'EMP',
      title: d?.title || d?.role || 'Authorized Operator',
      department: d?.department || 'Technical / Engineering',
      action: isGrant ? 'AUTHORIZED' : 'PAST_ASSIGNED',
      date: today,
      note: isGrant ? 'Authorized for vehicle operation' : 'Previously authorized operator (access ended)'
    };
    const prevHistory = Array.isArray(v.driverHistory) ? v.driverHistory : [];

    return { ...v, authorizedDriverIds: updatedIds, driverHistory: [historyEntry, ...prevHistory] };
  };

  const syncSelectedVehicleAccess = (vehicleId, driverId, mode) => {
    setSelectedVehicle(prevSel => {
      if (!prevSel || (prevSel.id !== vehicleId && prevSel.code !== vehicleId)) return prevSel;
      return applyDriverAccessChange(prevSel, driverId, mode);
    });
  };

  const grantVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v =>
      (v.id === vehicleId || v.code === vehicleId) ? applyDriverAccessChange(v, driverId, 'grant') : v
    ));
    syncSelectedVehicleAccess(vehicleId, driverId, 'grant');
    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Granted', 'CHAIN_OF_CUSTODY', `Granted vehicle access for ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const revokeVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v =>
      (v.id === vehicleId || v.code === vehicleId) ? applyDriverAccessChange(v, driverId, 'revoke') : v
    ));
    syncSelectedVehicleAccess(vehicleId, driverId, 'revoke');
    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Revoked', 'CHAIN_OF_CUSTODY', `Revoked vehicle access for ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const toggleVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v =>
      (v.id === vehicleId || v.code === vehicleId) ? applyDriverAccessChange(v, driverId, 'toggle') : v
    ));
    syncSelectedVehicleAccess(vehicleId, driverId, 'toggle');

    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Modified', 'CHAIN_OF_CUSTODY', `Toggled operational access clearance for operator ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const addBooking = (newBooking) => {
    const isMechActor = settings.currentRole === 'MECHANIC';
    const actorName = isMechActor
      ? (settings.currentMechanic || 'Assigned Mechanic').split(' (')[0].trim()
      : 'Operations Director';

    const bookingWithId = {
      ...newBooking,
      id: newBooking.id || `BK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      status: newBooking.status || 'Scheduled',
      createdByRole: newBooking.createdByRole || settings.currentRole,
      createdBy: newBooking.createdBy || (isMechActor ? settings.currentMechanic : 'Operations Director')
    };
    setBookings(prev => [bookingWithId, ...prev]);

    const vehicleLabel = bookingWithId.vehicleCode && bookingWithId.vehicleCode !== 'NOTE'
      ? bookingWithId.vehicleCode
      : 'Calendar Note';

    logAuditEvent(
      'Vehicle Scheduled',
      newBooking.type === 'MAINTENANCE' ? 'MAINTENANCE' : 'DISPATCH',
      `${actorName} scheduled ${vehicleLabel} for ${bookingWithId.title} on ${bookingWithId.date} (${bookingWithId.startTime || ''}-${bookingWithId.endTime || ''})`
    );

    if (isMechActor) {
      const rangeStr = bookingWithId.deadline && bookingWithId.deadline > bookingWithId.date
        ? `${bookingWithId.date} → ${bookingWithId.deadline}`
        : bookingWithId.date;
      pushNotification({
        type: 'SCHEDULE',
        severity: 'INFO',
        title: `${vehicleLabel} · Schedule Added by Mechanic`,
        message: `${actorName} scheduled "${bookingWithId.title}" on ${rangeStr} (${bookingWithId.startTime || '08:00'}–${bookingWithId.endTime || '17:00'}).`,
        targetTab: 'bookings',
        targetEntityType: 'BOOKING',
        targetEntityId: bookingWithId.id,
        recipientRole: 'DIRECTOR',
        recipientName: null
      });
    }

    return bookingWithId;
  };

  const updateBooking = (id, updates) => {
    const existing = bookings.find(b => b.id === id);
    const isMechActor = settings.currentRole === 'MECHANIC';
    const actorName = isMechActor
      ? (settings.currentMechanic || 'Assigned Mechanic').split(' (')[0].trim()
      : 'Operations Director';

    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    const updated = existing ? { ...existing, ...updates } : updates;
    const changes = [];
    if (existing) {
      if (updates.date && updates.date !== existing.date) {
        changes.push(`date ${existing.date} → ${updates.date}`);
      }
      if (updates.deadline && updates.deadline !== existing.deadline) {
        changes.push(`end date → ${updates.deadline}`);
      }
      if ((updates.startTime && updates.startTime !== existing.startTime) || (updates.endTime && updates.endTime !== existing.endTime)) {
        changes.push(`time ${updates.startTime || existing.startTime}–${updates.endTime || existing.endTime}`);
      }
      if (updates.status && updates.status !== existing.status) {
        changes.push(`status: ${updates.status}`);
      }
      if (updates.title && updates.title !== existing.title) {
        changes.push(`title: "${updates.title}"`);
      }
      if (updates.driver && updates.driver !== existing.driver) {
        changes.push(`assigned: ${updates.driver.split(' (')[0]}`);
      }
    }
    const changeSummary = changes.length > 0 ? changes.join(', ') : 'schedule details updated';
    const vehicleLabel = updated.vehicleCode && updated.vehicleCode !== 'NOTE'
      ? updated.vehicleCode
      : 'Calendar Note';

    logAuditEvent(
      'Schedule Updated',
      updated.type === 'MAINTENANCE' ? 'MAINTENANCE' : 'DISPATCH',
      `${actorName} updated schedule ${id} (${vehicleLabel}): ${changeSummary}`
    );

    pushNotification({
      type: 'SCHEDULE',
      severity: updates.status === 'Completed' ? 'INFO' : 'WARNING',
      title: `${vehicleLabel} · Schedule Changed`,
      message: `${actorName} updated "${updated.title || 'Schedule'}" (${changeSummary}).`,
      targetTab: 'bookings',
      targetEntityType: 'BOOKING',
      targetEntityId: id,
      recipientRole: 'DIRECTOR',
      recipientName: null
    });
  };

  const deleteBooking = (id) => {
    const item = bookings.find(b => b.id === id);
    const isMechActor = settings.currentRole === 'MECHANIC';
    const actorName = isMechActor
      ? (settings.currentMechanic || 'Assigned Mechanic').split(' (')[0].trim()
      : 'Operations Director';

    setBookings(prev => prev.filter(b => b.id !== id));

    const vehicleLabel = item?.vehicleCode && item.vehicleCode !== 'NOTE'
      ? item.vehicleCode
      : 'Calendar Note';

    logAuditEvent(
      'Booking Cancelled',
      'DISPATCH',
      `${actorName} removed schedule ${id} for ${vehicleLabel}`
    );

    pushNotification({
      type: 'SCHEDULE',
      severity: 'WARNING',
      title: `${vehicleLabel} · Schedule Removed`,
      message: `${actorName} cancelled "${item?.title || 'Schedule'}" (${item?.date || ''}).`,
      targetTab: 'bookings',
      targetEntityType: 'BOOKING',
      targetEntityId: id,
      recipientRole: 'DIRECTOR',
      recipientName: null
    });
  };

  const addDriver = (driverData) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Register Driver')) return false;

    const id = driverData.id || `DRV-${String(drivers.length + 1).padStart(3, '0')}`;
    const newDriver = {
      id,
      name: driverData.name?.trim() || 'New Operator',
      employeeId: driverData.employeeId?.trim() || `EMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: driverData.title?.trim() || driverData.role || 'Field Service Driver',
      role: driverData.title?.trim() || driverData.role || 'Field Service Driver',
      department: driverData.department?.trim() || 'Operations & Maintenance',
      category: driverData.category || 'Light Commercial',
      branchId: driverData.branchId || 'BR-KID',
      assignedVehicleCode: driverData.assignedVehicleCode || '',
      licenseNo: driverData.licenseNo?.trim() || 'L02-24-000000',
      licenseType: driverData.licenseType || 'Professional (RC 1, 2)',
      licenseAcquiredDate: driverData.licenseAcquiredDate || new Date().toISOString().slice(0, 10),
      licenseExpiry: driverData.licenseExpiry || '2029-12-31',
      phone: driverData.phone?.trim() || '0919-000-0000',
      email: driverData.email?.trim() || '',
      status: driverData.status || 'ON-DUTY',
      totalTrips: 0,
      safetyRating: '100%',
      certifications: driverData.certifications || ['Defensive Driving Certified']
    };

    setDrivers(prev => [newDriver, ...prev]);

    if (newDriver.assignedVehicleCode) {
      setVehicles(prev => prev.map(v => {
        if (v.code === newDriver.assignedVehicleCode) {
          return { ...v, assignedDriver: newDriver.name };
        }
        return v;
      }));
    }

    logAuditEvent(
      'Employee Registered',
      'DISPATCH',
      `Registered employee ${newDriver.name} (${newDriver.title} - ${newDriver.department}) assigned to station ${newDriver.branchId}.`
    );

    return newDriver;
  };

  const updateDriver = (id, updates) => {
    if (!checkPermission(['DIRECTOR'], 'Update Driver Record')) return false;

    let renewedDriver = null;
    setDrivers(prev => prev.map(d => {
      if (d.id === id) {
        const nextHistory = Array.isArray(d.licenseHistory) ? [...d.licenseHistory] : [];
        if (updates.licenseExpiry && updates.licenseExpiry !== d.licenseExpiry) {
          nextHistory.unshift({
            id: `LIC-REN-${Date.now()}`,
            licenseNo: updates.licenseNo || d.licenseNo,
            licenseType: updates.licenseType || d.licenseType,
            dateAcquired: updates.licenseAcquiredDate || new Date().toISOString().slice(0, 10),
            expiryDate: updates.licenseExpiry,
            status: 'RENEWED'
          });
        }
        const updated = { ...d, ...updates, licenseHistory: nextHistory };
        renewedDriver = updated;
        if (updates.assignedVehicleCode && updates.assignedVehicleCode !== d.assignedVehicleCode) {
          setVehicles(vPrev => vPrev.map(v => {
            if (v.code === updates.assignedVehicleCode) return { ...v, assignedDriver: updated.name };
            if (v.code === d.assignedVehicleCode) return { ...v, assignedDriver: 'Pool Driver' };
            return v;
          }));
        }
        return updated;
      }
      return d;
    }));

    setSelectedDriver(prev => (prev && prev.id === id ? { ...prev, ...updates } : prev));

    if (updates.licenseExpiry && renewedDriver) {
      logAuditEvent(
        "Driver's License Renewed",
        'DISPATCH',
        `Updated driver's license (${renewedDriver.licenseNo}) for ${renewedDriver.name} — new expiry ${updates.licenseExpiry}.`
      );
      pushNotification({
        type: 'DOCUMENT_EXPIRY',
        severity: 'INFO',
        title: `${renewedDriver.name} · Driver's License Updated`,
        message: `License ${renewedDriver.licenseNo} valid until ${updates.licenseExpiry}.`,
        targetTab: 'drivers',
        targetEntityType: 'DRIVER',
        targetEntityId: id,
        recipientRole: 'DIRECTOR',
        recipientName: null
      });
    } else {
      logAuditEvent('Driver Updated', 'DISPATCH', `Updated driver record ${id}`);
    }
    return true;
  };

  const reassignDriverVehicle = (driverId, newVehicleCode) => {
    const d = drivers.find(item => item.id === driverId);
    if (!d) return false;
    updateDriver(driverId, { assignedVehicleCode: newVehicleCode });
    return true;
  };

  // Editables Management (Departments, Titles, Classifications, Stations)
  const addEditableItem = (categoryKey, newValue) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Add Editable Item')) return false;
    const trimmed = String(newValue || '').trim();
    if (!trimmed) return false;

    const currentList = editables[categoryKey] || [];
    if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }

    setEditables(prev => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey] || []), trimmed]
    }));

    logAuditEvent(
      'Editable Option Added',
      'SECURITY_AUTH',
      `Added "${trimmed}" to configurable ${categoryKey} options.`
    );
    return true;
  };

  const updateEditableItem = (categoryKey, oldValue, newValue) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Update Editable Item')) return false;
    const trimmed = String(newValue || '').trim();
    if (!trimmed || trimmed === oldValue) return false;

    const currentList = editables[categoryKey] || [];
    if (currentList.some(item => item !== oldValue && item.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }

    setEditables(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || []).map(item => (item === oldValue ? trimmed : item))
    }));

    // Cascade updates to existing records so data stays consistent
    if (categoryKey === 'departments') {
      setDrivers(prev => prev.map(d => (d.department === oldValue ? { ...d, department: trimmed } : d)));
      setVehicles(prev => prev.map(v => (v.custodianDepartment === oldValue ? { ...v, custodianDepartment: trimmed } : v)));
    } else if (categoryKey === 'jobTitles') {
      setDrivers(prev => prev.map(d => (d.title === oldValue || d.role === oldValue ? { ...d, title: trimmed, role: trimmed } : d)));
    } else if (categoryKey === 'employeeClassifications') {
      setDrivers(prev => prev.map(d => (d.category === oldValue ? { ...d, category: trimmed } : d)));
    } else if (categoryKey === 'vehicleClassifications') {
      setVehicles(prev => prev.map(v => (v.classification === oldValue ? { ...v, classification: trimmed } : v)));
    } else if (categoryKey === 'serviceCategories') {
      setWorkOrders(prev => prev.map(w => (w.category === oldValue ? { ...w, category: trimmed } : w)));
    } else if (categoryKey === 'mechanics') {
      setWorkOrders(prev => prev.map(w => (w.assignedMechanic === oldValue ? { ...w, assignedMechanic: trimmed } : w)));
      setVehicles(prev => prev.map(v => ({
        ...v,
        diagnostics: (v.diagnostics || []).map(d => (d.assignedPerson === oldValue ? { ...d, assignedPerson: trimmed } : d))
      })));
    } else if (categoryKey === 'diagnosticTypes') {
      setVehicles(prev => prev.map(v => ({
        ...v,
        diagnostics: (v.diagnostics || []).map(d => (d.type === oldValue ? { ...d, type: trimmed } : d))
      })));
    }

    logAuditEvent(
      'Editable Option Updated',
      'SECURITY_AUTH',
      `Renamed "${oldValue}" to "${trimmed}" in ${categoryKey} (cascaded to active records).`
    );
    return true;
  };

  const removeEditableItem = (categoryKey, valueToRemove) => {
    if (!checkPermission(['DIRECTOR'], 'Remove Editable Item')) return false;

    setEditables(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || []).filter(item => item !== valueToRemove)
    }));

    logAuditEvent(
      'Editable Option Removed',
      'SECURITY_AUTH',
      `Removed "${valueToRemove}" from configurable ${categoryKey} options.`
    );
    return true;
  };

  const addBranch = (branchData) => {
    if (!checkPermission(['DIRECTOR'], 'Add Station / Branch')) return null;
    const municipality = String(branchData.municipality || '').trim();
    const name = String(branchData.name || municipality).trim();
    if (!municipality) return null;

    const cleanCode = (branchData.code || municipality.substring(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const id = `BR-${cleanCode}-${Math.floor(10 + Math.random() * 89)}`;

    const newBranch = {
      id,
      name: name || `${municipality} Sub-Office`,
      municipality,
      address: branchData.address || `Poblacion, ${municipality}`,
      phone: branchData.phone || '0919-000-0000',
      manager: branchData.manager || 'Station Supervisor',
      coordinates: branchData.coordinates || { lat: 7.05 + (Math.random() - 0.5) * 0.2, lng: 124.9 + (Math.random() - 0.5) * 0.2 },
      capacity: Number(branchData.capacity) || 8,
      coverage: branchData.coverage || `${municipality} Distribution Grid`,
      isHQ: false
    };

    setBranches(prev => [...prev, newBranch]);
    logAuditEvent(
      'Station Added',
      'CHAIN_OF_CUSTODY',
      `Added station "${newBranch.municipality}" (${newBranch.name}) to cooperative branches.`
    );
    return newBranch;
  };

  const updateBranch = (branchId, updates) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Update Station / Branch')) return false;
    setBranches(prev => prev.map(b => (b.id === branchId ? { ...b, ...updates } : b)));
    logAuditEvent(
      'Station Updated',
      'CHAIN_OF_CUSTODY',
      `Updated station record ${branchId}.`
    );
    return true;
  };

  const removeBranch = (branchId) => {
    if (!checkPermission(['DIRECTOR'], 'Remove Station / Branch')) return false;
    const target = branches.find(b => b.id === branchId);
    if (!target) return false;
    setBranches(prev => prev.filter(b => b.id !== branchId));
    logAuditEvent(
      'Station Removed',
      'CHAIN_OF_CUSTODY',
      `Removed station "${target.municipality}" (${branchId}).`
    );
    return true;
  };

  const resetToFactoryDefaults = () => {
    if (confirm('Restore Fleet Management System to official demonstration defaults?\n\nThis will reset all vehicles, branches, work orders, receipts, bookings, drivers, editables, and audit logs.')) {
      setEditables(DEFAULT_EDITABLES);
      setBranches(DEFAULT_BRANCHES);
      setVehicles(DEFAULT_VEHICLES);
      setWorkOrders(DEFAULT_WORK_ORDERS);
      setRepairArchive(DEFAULT_REPAIR_ARCHIVE);
      setAuditLogs(DEFAULT_AUDIT_LOGS);
      setBookings(DEFAULT_BOOKINGS);
      setDrivers(DEFAULT_DRIVERS);
      setStoredNotifications([]);
      setNotificationState({ readIds: [], dismissedIds: [] });
      setSettings({
        seniorMode: false,
        highContrast: false,
        currentRole: 'DIRECTOR',
        currentMechanic: DEFAULT_EDITABLES.mechanics[0]
      });
      localStorage.clear();
      alert('System successfully restored to default demonstration data.');
    }
  };

  return (
    <FleetContext.Provider value={{
      editables,
      branches,
      vehicles,
      workOrders,
      repairArchive,
      auditLogs,
      bookings,
      drivers,
      settings,
      activeTab,
      setActiveTab,
      sidebarCollapsed,
      toggleSidebar,
      globalSearch,
      setGlobalSearch,
      focusedHealthVehicleId,
      setFocusedHealthVehicleId,
      focusedProfileVehicleId,
      setFocusedProfileVehicleId,
      focusedMaintenanceIds,
      setFocusedMaintenanceIds,
      focusedTabPulse,
      setFocusedTabPulse,
      notifications,
      unreadNotificationCount,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      selectedVehicle,
      setSelectedVehicle,
      selectedBooking,
      setSelectedBooking,
      selectedDriver,
      setSelectedDriver,
      modalType,
      setModalType,
      activeReceipt,
      setActiveReceipt,
      activeWoToComplete,
      setActiveWoToComplete,
      toggleSeniorMode,
      toggleHighContrast,
      setRole,
      setCurrentMechanic,
      updateMechanicProfile,
      checkPermission,
      reassignVehicle,
      createWorkOrder,
      updateWorkOrderStage,
      archiveCompletedWorkOrder,
      deleteWorkOrder,
      completeWorkOrder,
      upsertVehicleDiagnostic,
      removeVehicleDiagnostic,
      addLedgerEntry,
      incidentReports,
      addIncidentReport,
      updateIncidentReportStatus,
      deleteIncidentReport,
      addVehicle,
      updateVehicle,
      toggleVehicleAccess,
      grantVehicleAccess,
      revokeVehicleAccess,
      addBooking,
      updateBooking,
      deleteBooking,
      addDriver,
      updateDriver,
      reassignDriverVehicle,
      addEditableItem,
      updateEditableItem,
      removeEditableItem,
      addBranch,
      updateBranch,
      removeBranch,
      resetToFactoryDefaults
    }}>
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
