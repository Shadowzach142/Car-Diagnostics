/**
 * COTELCO Fleet Management - Enterprise Formatters & String Utilities
 */

/**
 * Parses raw alert and status reason into a short semantic badge (max 3 words)
 * and a separate clean plain-text issue name.
 */
export const parseVehicleAlert = (v) => {
  if (!v) {
    return {
      badgeText: 'Active',
      badgeType: 'badge-success',
      issueText: 'Operational'
    };
  }

  const alertStr = v.urgentAlert || '';
  const reason = v.statusReason || '';

  // 1. OFFLINE status
  if (v.status === 'OFFLINE') {
    let issue = reason || alertStr || 'Mechanical Breakdown';
    issue = issue.replace(/^OFFLINE:\s*/i, '').replace(/\(PO\s*#[^)]+\)/i, '').trim();
    if (issue.length > 40) issue = issue.substring(0, 37) + '...';
    return {
      badgeText: 'Offline',
      badgeType: 'badge-danger',
      issueText: issue || 'Under repair'
    };
  }

  // 2. IN-SHOP status
  if (v.status === 'IN-SHOP') {
    let issue = reason || alertStr || 'Under Repair';
    issue = issue
      .replace(/^Under Active Motorpool Repair:\s*/i, '')
      .replace(/^Under Maintenance:\s*/i, '')
      .trim();
    if (issue.length > 40) issue = issue.substring(0, 37) + '...';
    return {
      badgeText: 'In-Shop',
      badgeType: 'badge-warning',
      issueText: issue || 'Active repair'
    };
  }

  // 3. Urgent alerts for Active vehicles
  if (alertStr) {
    // Check for days overdue
    const daysMatch = alertStr.match(/(\d+)\s*days?\s*past\s*due/i);
    if (daysMatch) {
      let issue = alertStr
        .replace(/^CRITICAL:\s*/i, '')
        .replace(/\([^)]+\)/g, '')
        .replace(/Overdue/i, '')
        .trim();
      return {
        badgeText: `Overdue · ${daysMatch[1]}d`,
        badgeType: 'badge-danger',
        issueText: issue || 'Dielectric Recertification'
      };
    }

    // Check for mileage due
    const kmMatch = alertStr.match(/Due\s*(?:in|Soon)\s*\(?(\d[\d,]*\s*km)\)?/i) || alertStr.match(/(\d[\d,]*\s*km)/i);
    if (kmMatch) {
      let issue = alertStr
        .replace(/^Preventive\s*/i, '')
        .replace(/Milestone.*$/i, '')
        .replace(/Service.*$/i, 'Service')
        .replace(/\([^)]+\)/g, '')
        .replace(/Approaching/i, '')
        .trim();
      return {
        badgeText: `Due · ${kmMatch[1]}`,
        badgeType: 'badge-warning',
        issueText: issue || 'Preventive Maintenance'
      };
    }

    let shortIssue = alertStr.replace(/^CRITICAL:\s*/i, '').replace(/^URGENT:\s*/i, '');
    if (shortIssue.length > 36) shortIssue = shortIssue.substring(0, 33) + '...';
    return {
      badgeText: 'Due Soon',
      badgeType: 'badge-warning',
      issueText: shortIssue
    };
  }

  // 4. Default Healthy Active
  return {
    badgeText: 'Active',
    badgeType: 'badge-success',
    issueText: 'Scheduled check'
  };
};

/**
 * Format currency in Philippine Peso
 */
export const peso = (n) => `₱${(Number(n) || 0).toLocaleString()}`;

/**
 * Concise vehicle option label: "FLT-BT-01 · NDI-4092 (Isuzu 16m Boom)"
 * Strips verbose engine/chassis specs and redundant [ACTIVE] tags to prevent bloat.
 */
export const formatVehicleShort = (v) => {
  if (!v) return '';
  const rawModel = v.makeModel || '';
  const shortModel = rawModel
    .replace(/2\.8L\s*4[×x]4\s*Double\s*Cab/i, '')
    .replace(/3\.0L\s*4[×x]4\s*Utility/i, '')
    .replace(/4[×x]4\s*GLX/i, '')
    .replace(/Commuter\s*Special\s*Purpose/i, 'Van')
    .replace(/Forward\s*FTR/i, '')
    .replace(/500\s*Series/i, '')
    .replace(/Heavy\s*Pole\s*Setter\s*&\s*Crane/i, 'Digger Derrick')
    .replace(/700\s*Series\s*10-Wheeler\s*15T\s*Crane/i, '15T Crane')
    .replace(/Trail\s*Patrol/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const statusNote = v.status && v.status !== 'ACTIVE'
    ? ` · ${v.status === 'IN-SHOP' ? 'In-Shop' : 'Offline'}`
    : '';

  return `${v.code} · ${v.plateNo} (${shortModel})${statusNote}`;
};

/**
 * Standard vehicle classification mapping for organized select groups
 */
export const VEHICLE_GROUPS = [
  { key: 'Pickup', label: 'Pickup Trucks' },
  { key: 'Bucket Truck', label: 'Boom & Bucket Trucks' },
  { key: 'Truck', label: 'Heavy Utility & Cranes' },
  { key: 'Van', label: 'Emergency Vans' },
  { key: 'Motorcycle', label: 'Motorcycles' }
];

/**
 * Truncate text to a maximum word count
 */
export const truncateWords = (str, maxWords = 4) => {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(' ') + '...';
};

/**
 * COTELCO Official Electric Utility Fleet Preventive Maintenance Schedule (PMS) Matrix
 */
export const PMS_STANDARDS = [
  {
    code: 'PMS-LVL-A',
    level: 'Level A Service',
    interval: '5,000 km / 3 Months',
    appliesTo: 'All Light Commercial & Patrol Vehicles (Pickups, Vans, Patrol Bikes)',
    scope: 'Genuine OEM synthetic/mineral engine oil renewal, oil filter replacement, tire pressure check, 25-point visual chassis, fluids, and safety inspection.'
  },
  {
    code: 'PMS-LVL-B',
    level: 'Level B Service',
    interval: '10,000 km / 6 Months',
    appliesTo: 'All Fleet Vehicles (Pickups, Vans, Utility Trucks)',
    scope: 'Full synthetic oil replacement, engine air filter, diesel fuel filter check, front/rear brake pad inspection, computerized tire rotation, steering linkage check.'
  },
  {
    code: 'PMS-LVL-C',
    level: 'Level C Major Service',
    interval: '20,000 km / 40,000 km (12 Months)',
    appliesTo: 'All Heavy & Commercial Utility Vehicles',
    scope: 'Heavy drivetrain overhaul: manual transmission fluid, differential gear oil, brake fluid flush, radiator coolant exchange, suspension bushing lubrication.'
  },
  {
    code: 'PMS-ELEC-BOOM',
    level: 'Dielectric Boom Safety Recertification',
    interval: 'Annual / 12 Months (Mandatory)',
    appliesTo: 'Bucket Trucks (FLT-BT Series: 14m, 16m, 18m)',
    scope: 'ANSI/SIA A92.2 & OSHA 1910.269 compliance: High-pot laboratory dielectric test (46kV / 69kV), fiberglass boom acoustic testing, hydraulic outrigger pressure seal bench check.'
  },
  {
    code: 'PMS-CRANE-RIG',
    level: 'Heavy Crane & Rigging Safety Certification',
    interval: 'Semi-Annual / 6 Months',
    appliesTo: 'Digger Derricks & Mobile Cranes (FLT-DD, FLT-CR)',
    scope: 'DOLE/OSHA utility crane safety inspection: Wire rope non-destructive magnetic testing, hydraulic winch torque load testing, outrigger hydraulic lock valve test.'
  }
];

/**
 * Resolves realistic PMS interval and compliance status for an electric utility fleet asset
 */
export const getPmsDetails = (vehicle) => {
  if (!vehicle) {
    return {
      milestone: 'Routine 10,000 km PMS Check',
      compliance: 'COMPLIANT',
      badgeText: 'PMS Compliant',
      badgeType: 'badge-success',
      intervalKm: 10000,
      targetDate: '2026-11-30',
      remainingKm: 2500
    };
  }

  const {
    classification = '',
    makeModel = '',
    status = 'ACTIVE',
    statusReason = '',
    urgentAlert = '',
    odometerKm = 0,
    nextServiceDueKm = 0,
    nextServiceDueDate = ''
  } = vehicle;

  // 1. Outside Shop
  if (status === 'IN-SHOP') {
    return {
      milestone: statusReason.replace(/^Under Active Motorpool Repair:\s*/i, '').replace(/^Under Maintenance:\s*/i, '') || 'Outside Overhaul & Certification',
      compliance: 'IN_SHOP',
      badgeText: 'In Outside Shop',
      badgeType: 'badge-warning',
      intervalKm: nextServiceDueKm,
      targetDate: nextServiceDueDate || 'Current Dispatch',
      remainingKm: 0
    };
  }

  // 2. Offline
  if (status === 'OFFLINE') {
    return {
      milestone: statusReason || 'Mechanical Grounding / Inspection Needed',
      compliance: 'OFFLINE',
      badgeText: 'Offline',
      badgeType: 'badge-danger',
      intervalKm: nextServiceDueKm,
      targetDate: 'Urgent Action',
      remainingKm: 0
    };
  }

  // Determine standard milestone based on vehicle type and mileage
  let milestone = '10,000 km Periodic Maintenance';
  const c = classification.toLowerCase();
  const m = makeModel.toLowerCase();

  if (c.includes('bucket') || m.includes('boom')) {
    if (odometerKm > 30000) {
      milestone = 'Annual 46kV/69kV Dielectric Boom High-Pot Test & Hydraulic Service';
    } else {
      milestone = '10,000 km Hydraulic Line & Bucket Safety Inspection';
    }
  } else if (c.includes('truck') || m.includes('crane') || m.includes('derrick')) {
    milestone = 'Semi-Annual Crane Outrigger Pressure & Winch Safety Recertification';
  } else if (c.includes('pickup')) {
    if (odometerKm >= 50000) {
      milestone = '50,000 km Major Drivetrain & Differential Fluid Service';
    } else if (odometerKm >= 20000) {
      milestone = '20,000 km Brake Overhaul, Multi-Point & Tire Alignment';
    } else {
      milestone = '10,000 km Periodic Engine Oil & Filter Service';
    }
  } else if (c.includes('van')) {
    milestone = '15,000 km Diesel Fuel Filter & Brake Safety Inspection';
  } else if (c.includes('motorcycle')) {
    milestone = '3,000 km Chain, Sprocket & Engine Lubrication Service';
  }

  // Override if urgent alert is set
  if (urgentAlert) {
    const cleanAlert = urgentAlert.replace(/^CRITICAL:\s*/i, '').replace(/^URGENT:\s*/i, '').trim();
    return {
      milestone: cleanAlert,
      compliance: 'OVERDUE',
      badgeText: 'PMS Overdue',
      badgeType: 'badge-danger',
      intervalKm: nextServiceDueKm,
      targetDate: nextServiceDueDate || 'Immediate',
      remainingKm: nextServiceDueKm ? Math.max(0, nextServiceDueKm - odometerKm) : 0
    };
  }

  // Check mileage thresholds
  const remaining = nextServiceDueKm ? nextServiceDueKm - odometerKm : 5000;
  if (nextServiceDueKm && odometerKm >= nextServiceDueKm) {
    return {
      milestone,
      compliance: 'OVERDUE',
      badgeText: 'PMS Overdue',
      badgeType: 'badge-danger',
      intervalKm: nextServiceDueKm,
      targetDate: nextServiceDueDate || 'Overdue',
      remainingKm: 0
    };
  }

  if (remaining <= 2000) {
    return {
      milestone,
      compliance: 'DUE_SOON',
      badgeText: 'Due Soon',
      badgeType: 'badge-warning',
      intervalKm: nextServiceDueKm,
      targetDate: nextServiceDueDate || 'Within 30 Days',
      remainingKm: remaining
    };
  }

  return {
    milestone,
    compliance: 'COMPLIANT',
    badgeText: 'PMS Compliant',
    badgeType: 'badge-success',
    intervalKm: nextServiceDueKm,
    targetDate: nextServiceDueDate || '2026-12-15',
    remainingKm: remaining
  };
};


