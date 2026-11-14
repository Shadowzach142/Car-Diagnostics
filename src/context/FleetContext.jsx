import React, { createContext, useContext, useState, useEffect } from 'react';
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
  VEHICLES: 'flt_vehicles_react_v4',
  WORK_ORDERS: 'flt_work_orders_react_v4',
  REPAIRS: 'flt_repairs_react_v4',
  AUDIT_LOGS: 'flt_audit_logs_react_v4',
  BOOKINGS: 'flt_bookings_react_v4',
  DRIVERS: 'flt_drivers_react_v4',
  SETTINGS: 'flt_settings_react_v4'
};

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
        mechanics: Array.isArray(parsed.mechanics) && parsed.mechanics.length > 0 ? parsed.mechanics : DEFAULT_EDITABLES.mechanics,
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
    const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    const baseList = saved ? (() => { try { return JSON.parse(saved); } catch { return DEFAULT_VEHICLES; } })() : DEFAULT_VEHICLES;
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
        diagnostics: Array.isArray(v.diagnostics) && v.diagnostics.length > 0
          ? v.diagnostics
          : buildDefaultVehicleDiagnostics(v)
      };
    });
  });

  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
    if (!saved) return DEFAULT_WORK_ORDERS;
    try {
      const parsed = JSON.parse(saved);
      return parsed.map(w => ({
        ...w,
        currentStage: w.currentStage || (w.status === 'Completed / Released' ? 'Completed / Released' : 'Active Repair / Servicing'),
        assignedMechanic: w.assignedMechanic || 'Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)'
      }));
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
      return parsed.map(d => {
        const def = DEFAULT_DRIVERS.find(x => x.id === d.id);
        const rawDept = d.department || def?.department || 'Technical / Engineering';
        const migratedDept = LEGACY_DEPARTMENT_MAP[rawDept] || rawDept;
        return {
          ...d,
          title: d.title || d.role || def?.title || 'Operator',
          role: d.title || d.role || def?.role || 'Operator',
          department: migratedDept
        };
      });
    } catch {
      return DEFAULT_DRIVERS;
    }
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      seniorMode: false,
      highContrast: false,
      currentRole: 'DIRECTOR' // 'DIRECTOR', 'DISPATCHER', 'MAINTENANCE'
    };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('flt_sidebar_collapsed') === 'true';
  });
  const [globalSearch, setGlobalSearch] = useState('');

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
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  }, [drivers]);

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
    setSettings(prev => ({ ...prev, currentRole: newRole }));
    logAuditEvent('Role Switched', 'SECURITY_AUTH', `Session role changed to ${newRole}`);
  };

  const checkPermission = (allowedRoles, actionTitle) => {
    if (allowedRoles.includes(settings.currentRole)) {
      return true;
    }
    alert(`Permission Denied:\n\nAction "${actionTitle}" requires one of the following roles: [${allowedRoles.join(', ')}].\n\nYour active session role is: ${settings.currentRole}. Please switch your role in the top header selector to test this workflow.`);
    return false;
  };

  const logAuditEvent = (action, category, details, status = 'AUTHORIZED') => {
    const roleTitles = {
      DIRECTOR: 'Fleet Operations Director (Engr. R. Alcantara)',
      DISPATCHER: 'Branch Dispatcher (S. Gomez)',
      MAINTENANCE: 'Motorpool Maintenance Officer (J. Dela Cruz)'
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
    const newWO = {
      id: woId,
      ...woData,
      status: initialStage === 'Completed / Released' ? 'Completed / Released' : 'In Shop',
      currentStage: initialStage,
      dateReported: new Date().toISOString().substring(0, 10),
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
          statusReason: `Maintenance (${initialStage}): ${woData.type} — Assigned: ${woData.assignedMechanic || 'Technician'}`,
          nextServiceDueKm: nextKm,
          nextServiceDueDate: nextDate
        };
      }
      return v;
    }));

    // Automatic Calendar Feed: Record maintenance booking on the calendar timeline
    const targetVehicle = vehicles.find(v => v.code === woData.vehicleCode);
    const targetBranch = branches.find(b => b.id === (targetVehicle?.branchId || 'BR-KID'));
    const autoBooking = {
      id: `BK-${woId}`,
      vehicleId: targetVehicle?.id || 'VEH-001',
      vehicleCode: woData.vehicleCode,
      driver: woData.assignedMechanic || targetVehicle?.assignedDriver || 'Maintenance Specialist',
      avatar: targetVehicle ? getVehicleImage(targetVehicle) : '',
      type: 'MAINTENANCE',
      title: woData.type || 'Maintenance Service',
      category: woData.category || 'Preventive Maintenance (PMS)',
      date: new Date().toISOString().substring(0, 10),
      startHour: 8,
      endHour: 11,
      startTime: '08:00',
      endTime: '11:00',
      branchId: targetVehicle?.branchId || 'BR-KID',
      branch: targetBranch?.municipality || 'Station Motorpool',
      destination: woData.facility || 'COTELCO Motorpool & Diagnostic Bay',
      purpose: woData.description || `Maintenance service (${woId})`,
      status: 'Scheduled'
    };
    setBookings(prev => [autoBooking, ...prev]);

    logAuditEvent(
      'Maintenance Scheduled',
      'MAINTENANCE',
      `Scheduled ${woData.vehicleCode} for "${woData.type}" [Stage: ${initialStage}]. Assigned to: ${woData.assignedMechanic || 'Motorpool Specialist'}.`
    );
    return newWO;
  };

  const updateWorkOrderStage = (woId, newStage, updates = {}) => {
    if (!checkPermission(['DIRECTOR', 'DISPATCHER', 'MAINTENANCE'], 'Update Maintenance Stage')) return false;

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

    setVehicles(prev => prev.map(v => {
      if (v.code === targetWO.vehicleCode) {
        if (isCompleted) {
          const updatedDiag = (v.diagnostics || buildDefaultVehicleDiagnostics(v)).map(d => {
            const matchType = targetWO.type?.toLowerCase().includes('oil') && d.type.toLowerCase().includes('oil');
            if (matchType) {
              const interval = Number(d.intervalKm) || 5000;
              return {
                ...d,
                lastDoneKm: v.odometerKm || d.lastDoneKm,
                targetKm: (v.odometerKm || 0) + interval,
                lastDoneDate: today,
                assignedPerson: updates.assignedMechanic || targetWO.assignedMechanic || d.assignedPerson
              };
            }
            return d;
          });
          return {
            ...v,
            status: 'ACTIVE',
            statusReason: 'Cleared maintenance & diagnostics. Returned to active service.',
            lastServiceDate: today,
            nextServiceDueKm: Number(updates.targetKm) || Number(targetWO.targetKm) || ((v.odometerKm || 20000) + 5000),
            nextServiceDueDate: updates.nextServiceDate || targetWO.nextServiceDate || v.nextServiceDueDate,
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

    logAuditEvent(
      'Maintenance Stage Updated',
      'MAINTENANCE',
      `Updated ${targetWO.vehicleCode} (${woId}) stage to "${newStage}".`
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
      serviceType: entryData.serviceType?.trim() || 'Maintenance Service Expense',
      serviceSummary: entryData.serviceSummary?.trim() || entryData.serviceType?.trim() || 'Motorpool parts & service expenditure',
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
      'Ledger Entry Added',
      'FINANCIAL_AUDIT',
      `Recorded expense voucher ${voucherNo} on ${newVoucher.vehicleCode}. Amount: ₱${totalCost.toLocaleString()}`
    );

    return newVoucher;
  };

  const addVehicle = (vehicleData) => {
    if (!checkPermission(['DIRECTOR'], 'Register New Asset')) return false;

    const id = `VEH-${String(vehicles.length + 1).padStart(3, '0')}`;
    const branch = branches.find(b => b.id === vehicleData.branchId);

    const newVehicle = {
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
      nextServiceDueKm: 5000,
      nextServiceDueDate: '2027-01-15',
      coordinates: {
        lat: branch ? Number((branch.coordinates.lat + (Math.random() - 0.5) * 0.015).toFixed(4)) : 7.0089,
        lng: branch ? Number((branch.coordinates.lng + (Math.random() - 0.5) * 0.015).toFixed(4)) : 125.0898
      },
      specs: {
        payloadCapacity: 'Heavy Commercial Spec',
        transmission: 'Heavy Duty Manual'
      }
    };

    setVehicles(prev => [...prev, newVehicle]);

    logAuditEvent(
      'Asset Commissioned',
      'ASSET_REGISTRY',
      `Commissioned new vehicle ${newVehicle.code} (${newVehicle.plateNo}) - ${newVehicle.makeModel} to ${branch?.name}.`
    );

    return newVehicle;
  };

  const updateVehicle = (id, updates) => {
    let targetVeh = null;
    setVehicles(prev => prev.map(v => {
      if (v.id === id) {
        const mergedSpecs = updates.specs ? { ...(v.specs || {}), ...updates.specs } : v.specs;
        const updated = { ...v, ...updates, specs: mergedSpecs };
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

  const grantVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId || v.code === vehicleId) {
        const currentList = getVehicleAuthorizedDrivers(v, drivers).map(d => d.id);
        const currentIds = Array.isArray(v.authorizedDriverIds) ? v.authorizedDriverIds : currentList;
        if (!currentIds.includes(driverId)) {
          const updatedIds = [...currentIds, driverId];
          const updated = { ...v, authorizedDriverIds: updatedIds };
          if (selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.code === v.code)) {
            setSelectedVehicle(updated);
          }
          return updated;
        }
      }
      return v;
    }));
    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Granted', 'CHAIN_OF_CUSTODY', `Granted vehicle access for ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const revokeVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId || v.code === vehicleId) {
        const currentList = getVehicleAuthorizedDrivers(v, drivers).map(d => d.id);
        const currentIds = Array.isArray(v.authorizedDriverIds) ? v.authorizedDriverIds : currentList;
        const updatedIds = currentIds.filter(id => id !== driverId);
        const updated = { ...v, authorizedDriverIds: updatedIds };
        if (selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.code === v.code)) {
          setSelectedVehicle(updated);
        }
        return updated;
      }
      return v;
    }));
    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Revoked', 'CHAIN_OF_CUSTODY', `Revoked vehicle access for ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const toggleVehicleAccess = (vehicleId, driverId) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId || v.code === vehicleId) {
        const currentList = getVehicleAuthorizedDrivers(v, drivers).map(d => d.id);
        const currentIds = Array.isArray(v.authorizedDriverIds)
          ? v.authorizedDriverIds
          : currentList;

        const exists = currentIds.includes(driverId);
        const updatedIds = exists
          ? currentIds.filter(id => id !== driverId)
          : [...currentIds, driverId];

        const updated = { ...v, authorizedDriverIds: updatedIds };
        if (selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.code === v.code)) {
          setSelectedVehicle(updated);
        }
        return updated;
      }
      return v;
    }));

    const d = drivers.find(item => item.id === driverId);
    logAuditEvent('Vehicle Access Modified', 'CHAIN_OF_CUSTODY', `Toggled operational access clearance for operator ${d?.name || driverId} on asset ${vehicleId}`);
    return true;
  };

  const addBooking = (newBooking) => {
    const bookingWithId = {
      ...newBooking,
      id: newBooking.id || `BK-${new Date().getFullYear()}-${String(bookings.length + 1).padStart(3, '0')}`,
      status: newBooking.status || 'Scheduled'
    };
    setBookings(prev => [bookingWithId, ...prev]);
    logAuditEvent(
      'Vehicle Scheduled',
      newBooking.type === 'MAINTENANCE' ? 'MAINTENANCE' : 'DISPATCH',
      `Scheduled ${newBooking.vehicleCode} for ${newBooking.title} on ${newBooking.date} (${newBooking.startTime || ''}-${newBooking.endTime || ''})`
    );
    return bookingWithId;
  };

  const updateBooking = (id, updates) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    logAuditEvent('Booking Updated', 'DISPATCH', `Updated booking record ${id}`);
  };

  const deleteBooking = (id) => {
    const item = bookings.find(b => b.id === id);
    setBookings(prev => prev.filter(b => b.id !== id));
    logAuditEvent('Booking Cancelled', 'DISPATCH', `Cancelled booking ${id} for ${item?.vehicleCode || 'vehicle'}`);
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
      licenseExpiry: driverData.licenseExpiry || '2028-12-31',
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
    if (!checkPermission(['DIRECTOR', 'DISPATCHER'], 'Update Driver Record')) return false;

    setDrivers(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates };
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

    logAuditEvent('Driver Updated', 'DISPATCH', `Updated driver record ${id}`);
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
      setSettings({
        seniorMode: false,
        highContrast: false,
        currentRole: 'DIRECTOR'
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
      checkPermission,
      reassignVehicle,
      createWorkOrder,
      updateWorkOrderStage,
      completeWorkOrder,
      upsertVehicleDiagnostic,
      removeVehicleDiagnostic,
      addLedgerEntry,
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
