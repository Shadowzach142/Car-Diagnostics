/**
 * Centralized Fleet Management System - Master Fleet Data Architecture
 * Minimized, authentic demonstration dataset for COTELCO Electric Cooperative
 */

export const DEFAULT_EDITABLES = {
  departments: [
    "Area",
    "Technical / Engineering",
    "OGM - Office of the General Manager",
    "Institutional Services",
    "Audit Department",
    "Finance",
    "Core Plan",
    "CPRST"
  ],
  jobTitles: [
    "Senior Aerial Boom Operator",
    "Heavy Digger Derrick Specialist",
    "Master Heavy Crane Operator",
    "Lead Lineman & Field Driver",
    "Emergency Response Driver",
    "Emergency Trouble Crew Driver",
    "Line Patrol & Grid Scout",
    "Field Service Driver",
    "Mobile Diagnostic Lab Driver",
    "Substation Field Technician",
    "West District Lineman & Field Driver"
  ],
  employeeClassifications: [
    "Heavy Equipment",
    "Light Commercial",
    "Passenger / Emergency",
    "Patrol Motorcycle"
  ],
  vehicleClassifications: [
    "Bucket Truck",
    "Truck",
    "Pickup",
    "Van",
    "Motorcycle",
    "Car / Sedan"
  ],
  serviceCategories: [
    "Preventive Maintenance (PMS)",
    "Dielectric / Safety Certification",
    "Engine & Drivetrain",
    "Brakes & Suspension",
    "Electrical & Battery",
    "Tires & Alignment",
    "Corrective Repair",
    "Other Outside Work"
  ],
  serviceTasksByCategory: {
    "Preventive Maintenance (PMS)": [
      "Engine Oil & Oil Filter Change (5,000 km)",
      "10,000 km Periodic Maintenance Service",
      "20,000 km Major Drivetrain & Fluid Service",
      "Air Filter & Diesel Fuel Filter Replacement",
      "Radiator Coolant Flush & Pressure Check",
      "3,000 km Patrol Motorcycle Oil & Chain Service"
    ],
    "Dielectric / Safety Certification": [
      "Annual 46kV Dielectric Boom High-Pot Test",
      "Fiberglass Boom Acoustic Emission Inspection",
      "Hydraulic Outrigger Pressure & Lock Valve Test",
      "Semi-Annual Crane Winch & Wire Rope Load Test",
      "Insulated Bucket Liner & Hotstick Dielectric Check"
    ],
    "Engine & Drivetrain": [
      "Diesel Fuel Injector Calibration & Cleaning",
      "Turbocharger & Intercooler Hose Inspection",
      "Clutch Disc, Pressure Plate & Release Bearing Overhaul",
      "Manual Transmission & Differential Gear Oil Renewal",
      "Timing Belt / Timing Chain Tensioner Replacement",
      "Engine Overheating & Water Pump Diagnostic"
    ],
    "Brakes & Suspension": [
      "Front & Rear Brake Pad / Shoe Replacement",
      "Brake Rotor Resurfacing & Caliper Servicing",
      "Brake Fluid Flush & Master Cylinder Bleed",
      "Upper & Lower Suspension Ball Joint Overhaul",
      "Leaf Spring, Shock Absorber & Stabilizer Link Repair",
      "Power Steering Rack & Tie Rod End Replacement"
    ],
    "Electrical & Battery": [
      "24V / 12V Heavy Duty Battery Replacement",
      "Alternator Charging Output & Starter Motor Repair",
      "ECU / OBD-II Diagnostic Fault Code Scan",
      "Emergency Strobe Beacon & Work Floodlight Wiring",
      "Two-Way Dispatch Radio & GPS Transponder Check"
    ],
    "Tires & Alignment": [
      "Tire Replacement & Wheel Alignment (Scheduled)",
      "Tire Replacement & Wheel Alignment (External Appearance / Wear)",
      "Computerized 4-Wheel Laser Alignment",
      "Heavy Truck Dual-Wheel Rotation & Lug Torque Check",
      "Spare Tire Carrier & Sidewall Puncture Repair"
    ],
    "Corrective Repair": [
      "Hydraulic Boom Hose Burst & Seal Replacement",
      "PTO (Power Take-Off) Pump Pressure Repair",
      "Air Conditioning Compressor & Evaporator Service",
      "Body, Chassis & Utility Bed Structural Welding"
    ],
    "Other Outside Work": [
      "LTO Emission Testing & Roadworthiness Inspection",
      "Comprehensive Multi-Point Safety Diagnostic",
      "Custom Utility Tool Vault & Rack Fabrication"
    ]
  },
  mechanics: [
    "Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)",
    "Rogelio D. Bautista (Senior Heavy Hydraulics & Boom Mechanic)",
    "Ernesto C. Solis (Master Diesel & Drivetrain Technician)",
    "Jerome P. Navarro (Automotive Electrical & OBD-II Specialist)",
    "Dante M. Soriano (Brake, Suspension & Chassis Specialist)"
  ],
  diagnosticTypes: [
    "Engine Oil & Filter Change",
    "Brake Pads & Fluid Check",
    "Tire Replacement",
    "External Tire Appearance Check",
    "Hydraulic Boom & Outrigger Fluid",
    "Dielectric High-Pot Safety Test",
    "Battery & Alternator Health",
    "Transmission & Differential Fluid",
    "Air & Fuel Filter Element",
    "Coolant & Radiator System"
  ]
};

export const WORK_ORDER_STAGES = [
  "Queued / Inspection",
  "Diagnosing",
  "Active Repair / Servicing",
  "Awaiting Parts",
  "Quality & Safety Check",
  "Completed / Released"
];

export const buildDefaultVehicleDiagnostics = (v) => {
  const odo = Number(v?.odometerKm) || 20000;
  const code = String(v?.code || '').toUpperCase();
  const c = String(v?.classification || '').toLowerCase();
  const isBoom = c.includes('bucket') || c.includes('truck');
  const isBike = c.includes('motorcycle');
  const isOfficeCar = c.includes('van') || c.includes('sedan') || c.includes('car') || c.includes('suv');

  // Staggered maintenance cycles across default fleet so dashboard reflects a realistic live cycle
  const cycleByCode = {
    'FLT-BT-01': { oilLeft: 1100, brkLeft: 4200, dielDate: '2026-12-15', tireDate: '2027-01-10' },
    'FLT-DD-01': { oilLeft: 4200, brkLeft: 7400, dielDate: '2027-02-20', tireDate: '2027-02-20' },
    'FLT-PU-01': { oilLeft: -350, brkLeft: 2100, tireDate: '2026-11-28' },
    'FLT-PU-02': { oilLeft: 3100, brkLeft: 950, tireDate: '2027-01-15' },
    'FLT-ER-01': { oilLeft: 4600, brkLeft: 8600, tireDate: '2027-04-10' },
    'FLT-MC-01': { oilLeft: 850, brkLeft: 3400, tireDate: '2027-01-20' }
  };

  const preset = cycleByCode[code] || {
    oilLeft: isBike ? 1800 : 3500,
    brkLeft: 6500,
    dielDate: '2027-01-15',
    tireDate: isOfficeCar ? '2027-04-10' : '2027-01-10'
  };

  const oilInterval = isBike ? 3000 : 5000;
  const brkInterval = 10000;

  const items = [
    {
      id: `DIAG-${v?.id || 'VEH'}-OIL`,
      type: "Engine Oil & Filter Change",
      trackMode: "BOTH", // 'KM' | 'DATE' | 'BOTH'
      lastDoneKm: Math.max(0, odo + preset.oilLeft - oilInterval),
      intervalKm: oilInterval,
      targetKm: odo + preset.oilLeft,
      lastDoneDate: v?.lastServiceDate || "2026-08-20",
      intervalMonths: 3,
      targetDate: v?.nextServiceDueDate || "2026-11-25",
      assignedPerson: isBoom
        ? "Rogelio D. Bautista (Senior Heavy Hydraulics & Boom Mechanic)"
        : "Ernesto C. Solis (Master Diesel & Drivetrain Technician)",
      notes: "Synthetic diesel/motor oil & OEM filter element"
    },
    {
      id: `DIAG-${v?.id || 'VEH'}-BRK`,
      type: "Brake Pads & Fluid Check",
      trackMode: "KM",
      lastDoneKm: Math.max(0, odo + preset.brkLeft - brkInterval),
      intervalKm: brkInterval,
      targetKm: odo + preset.brkLeft,
      lastDoneDate: v?.lastServiceDate || "2026-08-20",
      intervalMonths: 6,
      targetDate: "2027-02-15",
      assignedPerson: "Dante M. Soriano (Brake, Suspension & Chassis Specialist)",
      notes: "Front/rear lining thickness & hydraulic brake pressure"
    }
  ];

  if (isBoom) {
    items.push({
      id: `DIAG-${v?.id || 'VEH'}-DIEL`,
      type: "Dielectric High-Pot Safety Test",
      trackMode: "DATE",
      lastDoneKm: odo,
      intervalKm: 15000,
      targetKm: odo + 15000,
      lastDoneDate: "2026-06-15",
      intervalMonths: 6,
      targetDate: preset.dielDate || "2026-12-15",
      assignedPerson: "Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)",
      notes: "46kV insulation & hydraulic outrigger seal check"
    });
  } else {
    items.push({
      id: `DIAG-${v?.id || 'VEH'}-TIRE`,
      type: "Tire Replacement",
      trackMode: "DATE",
      lastDoneKm: Math.max(0, odo - 4200),
      intervalKm: 10000,
      targetKm: odo + 5800,
      lastDoneDate: "2026-07-10",
      intervalMonths: isOfficeCar ? 9 : 6,
      targetDate: preset.tireDate || (isOfficeCar ? "2027-04-10" : "2027-01-10"),
      assignedPerson: "Dante M. Soriano (Brake, Suspension & Chassis Specialist)",
      notes: isOfficeCar
        ? "Office car: replace every 9 months (or earlier based on external appearance; includes alignment)"
        : "Maintenance car: replace semi-annually / 2x a year (or earlier based on external appearance; includes alignment)"
    });
  }

  return items;
};

export const DEFAULT_BRANCHES = [
  {
    id: "BR-KID",
    name: "Central Operations Headquarters",
    municipality: "Kidapawan District",
    address: "Brgy. Manubuan, Kidapawan District",
    phone: "(064) 577-1234 / 0919-065-2201",
    manager: "Engr. Roberto M. Alcantara",
    coordinates: { lat: 7.0089, lng: 125.0898 },
    capacity: 15,
    coverage: "Central Grid, East Feeder, North Transmission",
    isHQ: true
  },
  {
    id: "BR-MID",
    name: "Midsayap Area Sub-Office",
    municipality: "Midsayap Sector",
    address: "Poblacion Sector 8, Midsayap",
    phone: "(064) 229-8765 / 0928-500-1122",
    manager: "Engr. Salvador D. Gomez",
    coordinates: { lat: 7.1915, lng: 124.5317 },
    capacity: 10,
    coverage: "West Lowland Grid, Feeder Lines 1-4",
    isHQ: false
  },
  {
    id: "BR-KAB",
    name: "Kabacan Field Service Center",
    municipality: "Kabacan Sector",
    address: "Poblacion Center, Kabacan",
    phone: "(064) 544-2199 / 0939-112-8877",
    manager: "Reynaldo B. Pimentel",
    coordinates: { lat: 7.1122, lng: 124.8361 },
    capacity: 8,
    coverage: "Agri-Industrial Feeder, University Grid",
    isHQ: false
  },
  {
    id: "BR-MAK",
    name: "Makilala Sub-Office & Substation",
    municipality: "Makilala Sector",
    address: "National Highway, Poblacion Makilala",
    phone: "(064) 572-8800 / 0920-334-5511",
    manager: "Danilo C. Valenzuela",
    coordinates: { lat: 6.9631, lng: 125.0931 },
    capacity: 6,
    coverage: "Highland Transmission Span, South Ridge",
    isHQ: false
  }
];

export const DEFAULT_VEHICLE_IMAGES = {
  "Pickup": "/vehicles/pickup-toyota-hilux.jpg",
  "Van": "/vehicles/van-toyota-hiace.jpg",
  "Truck": "/vehicles/truck-digger-derrick.jpg",
  "Bucket Truck": "/vehicles/bucket-truck-isuzu.jpg",
  "Motorcycle": "/vehicles/bike-honda-crf150l.jpg",
  "Car / Sedan": "/vehicles/van-toyota-hiace.jpg",
  "Other": "/vehicles/pickup-toyota-hilux.jpg",
  "default": "/vehicles/pickup-toyota-hilux.jpg"
};

export const getVehicleImage = (vehicle) => {
  if (!vehicle) return '/vehicles/pickup-toyota-hilux.jpg';

  if (vehicle.image && !vehicle.image.includes('unsplash.com')) return vehicle.image;
  if (vehicle.imageUrl && !vehicle.imageUrl.includes('unsplash.com')) return vehicle.imageUrl;

  const code = String(vehicle.code || '').toUpperCase();
  const model = String(vehicle.makeModel || '').toLowerCase();
  const c = String(vehicle.classification || '').toLowerCase();

  // 1. Boom & Bucket Trucks (FLT-BT)
  if (code.includes('BT') || c.includes('bucket') || model.includes('boom')) {
    return '/vehicles/bucket-truck-isuzu.jpg';
  }

  // 2. Digger Derrick heavy pole setter (FLT-DD)
  if (code.includes('DD') || model.includes('pole setter') || model.includes('digger') || model.includes('derrick')) {
    return '/vehicles/truck-digger-derrick.jpg';
  }

  // 3. Heavy 15T Mobile Crane (FLT-CR)
  if (code.includes('CR') || model.includes('crane') || (model.includes('hino') && model.includes('700'))) {
    return '/vehicles/truck-hino-crane.jpg';
  }

  // 4. Pickup Trucks by specific model (FLT-PU)
  if (model.includes('hilux')) {
    return '/vehicles/pickup-toyota-hilux.jpg';
  }
  if (model.includes('strada')) {
    return '/vehicles/pickup-mitsubishi-strada.jpg';
  }
  if (model.includes('d-max') || model.includes('dmax')) {
    return '/vehicles/pickup-isuzu-dmax.jpg';
  }
  if (code.includes('PU') || c.includes('pickup')) {
    return '/vehicles/pickup-toyota-hilux.jpg';
  }

  // 5. Emergency Vans by specific model (FLT-ER)
  if (model.includes('hiace')) {
    return '/vehicles/van-toyota-hiace.jpg';
  }
  if (model.includes('urvan') || model.includes('nv350')) {
    return '/vehicles/van-nissan-urvan.jpg';
  }
  if (code.includes('ER') || c.includes('van')) {
    return '/vehicles/van-toyota-hiace.jpg';
  }

  // 6. Dual-sport patrol motorcycles (FLT-MC)
  if (code.includes('MC') || c.includes('motorcycle') || c.includes('bike') || model.includes('crf') || model.includes('honda')) {
    return '/vehicles/bike-honda-crf150l.jpg';
  }

  if (c.includes('truck')) return '/vehicles/truck-digger-derrick.jpg';
  return '/vehicles/pickup-toyota-hilux.jpg';
};

export const getVehicleSupplier = (vehicle) => {
  if (!vehicle) return 'Authorized Commercial Fleet Automotive Dealer';
  if (vehicle.supplier) return vehicle.supplier;
  const model = vehicle.makeModel || '';
  if (model.includes('Isuzu')) return 'Isuzu Gencars Davao / Southern Mindanao';
  if (model.includes('Toyota')) return 'Toyota Davao City Inc. - Commercial Fleet';
  if (model.includes('Hino')) return 'Hino Motors Philippines - General Santos';
  if (model.includes('Mitsubishi')) return 'Mitsubishi Motors Mindanao - Cotabato';
  if (model.includes('Yamaha')) return 'Yamaha Motor Philippines - Mindanao Hub';
  return 'Authorized Commercial Fleet Automotive Dealer';
};

export const getVehicleOrCr = (vehicle) => {
  if (!vehicle) return 'CR-2024-00101-A';
  if (vehicle.orCrNo) return vehicle.orCrNo;
  const cleanPlate = (vehicle.plateNo || 'NDI101').replace('-', '');
  return `CR-${vehicle.year || 2022}-${cleanPlate}-A`;
};

export const getVehicleAssetTag = (vehicle) => {
  if (!vehicle) return 'COTELCO-FA-001';
  if (vehicle.assetTag) return vehicle.assetTag;
  const codeNum = (vehicle.code || 'FLT-01').replace(/[^0-9]/g, '');
  return `COTELCO-FA-${vehicle.year || 2022}-${codeNum || '01'}`;
};

export const getVehicleWarranty = (vehicle) => {
  if (!vehicle) return '3 Years / 100,000 km Fleet Assurance';
  if (vehicle.warrantyPolicy) return vehicle.warrantyPolicy;
  return '3 Years / 100,000 km Fleet Assurance';
};

export const DEFAULT_VEHICLES = [
  {
    id: "VEH-001",
    code: "FLT-BT-01",
    plateNo: "NDI-4092",
    vin: "JALFTR34K-7001842",
    engineNo: "6HK1-592811",
    classification: "Bucket Truck",
    makeModel: "Isuzu Forward FTR 16m Boom",
    year: 2022,
    branchId: "BR-KID",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "Operations & Maintenance Motor Pool",
    supplier: "Isuzu Gencars Davao / Southern Mindanao",
    orCrNo: "CR-2022-4092-A",
    assetTag: "COTELCO-FA-2022-01",
    status: "ACTIVE",
    statusReason: "Normal line service. Cleared for 3-phase live electrical repairs.",
    odometerKm: 34250,
    operatingHours: 1840,
    fuelType: "Diesel",
    fuelLevelPct: 85,
    acquisitionCost: 5850000,
    acquisitionDate: "2022-03-15",
    insuranceAcquiredDate: "2023-10-20",
    insuranceExpiryDate: "2026-10-20",
    registrationAcquiredDate: "2023-10-23",
    registrationExpiryDate: "2026-10-23",
    lastServiceDate: "2026-08-20",
    nextServiceDueKm: 38000,
    nextServiceDueDate: "2026-11-20",
    urgentAlert: null,
    coordinates: { lat: 7.0125, lng: 125.0850 },
    assignedDriver: "Danilo C. Santos",
    authorizedDriverIds: ["DRV-001", "DRV-002", "DRV-003"],
    specs: {
      reach: "16.2 Meters High-Reach",
      bucketCapacity: "250 kg (2-Man Insulated)",
      dielectricRating: "46 kV Category C High-Pot",
      outriggers: "Hydraulic H-Type 4-Point",
      transmission: "6-Speed Heavy Manual"
    }
  },
  {
    id: "VEH-002",
    code: "FLT-DD-01",
    plateNo: "NDI-8812",
    vin: "ISZ-GIGA-991204",
    engineNo: "6WG1-901244",
    classification: "Truck",
    makeModel: "Isuzu Giga Heavy Pole Setter & Crane",
    year: 2021,
    branchId: "BR-KID",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "Heavy Engineering & Pole Construction",
    supplier: "Isuzu Gencars Davao / Southern Mindanao",
    orCrNo: "CR-2021-8812-A",
    assetTag: "COTELCO-FA-2021-04",
    status: "ACTIVE",
    statusReason: "Normal line service. Primary pole erection and line expansion truck.",
    odometerKm: 41800,
    operatingHours: 2890,
    fuelType: "Diesel",
    fuelLevelPct: 78,
    acquisitionCost: 7200000,
    acquisitionDate: "2021-06-20",
    insuranceAcquiredDate: "2023-10-22",
    insuranceExpiryDate: "2026-10-22",
    registrationAcquiredDate: "2023-11-12",
    registrationExpiryDate: "2026-11-12",
    lastServiceDate: "2026-06-15",
    nextServiceDueKm: 45000,
    nextServiceDueDate: "2026-12-15",
    urgentAlert: null,
    coordinates: { lat: 7.0145, lng: 125.0920 },
    assignedDriver: "Rodrigo T. Mendoza",
    authorizedDriverIds: ["DRV-002", "DRV-001"],
    specs: {
      reach: "14.5m Digger Derrick Boom",
      bucketCapacity: "Auger Capacity 24-inch Hole",
      dielectricRating: "Heavy Mechanical Class",
      outriggers: "Dual Front/Rear Radial Outriggers",
      transmission: "7-Speed Heavy Manual"
    }
  },
  {
    id: "VEH-003",
    code: "FLT-PU-01",
    plateNo: "MAA-2290",
    vin: "MROHA8CD4-9918231",
    engineNo: "1GD-FTV-882190",
    classification: "Pickup",
    makeModel: "Toyota Hilux 2.8L 4x4 Double Cab",
    year: 2023,
    branchId: "BR-KID",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "Technical Services & Feeder Patrol",
    supplier: "Toyota Davao City Inc. - Commercial Fleet",
    orCrNo: "CR-2023-2290-A",
    assetTag: "COTELCO-FA-2023-05",
    status: "ACTIVE",
    statusReason: "Normal line service. Dispatched for rapid feeder patrol and lineman response.",
    odometerKm: 52400,
    operatingHours: 2150,
    fuelType: "Diesel",
    fuelLevelPct: 92,
    acquisitionCost: 1980000,
    acquisitionDate: "2023-04-10",
    insuranceAcquiredDate: "2023-10-21",
    insuranceExpiryDate: "2026-10-21",
    registrationAcquiredDate: "2023-10-28",
    registrationExpiryDate: "2026-10-28",
    lastServiceDate: "2026-09-18",
    nextServiceDueKm: 60000,
    nextServiceDueDate: "2026-12-05",
    urgentAlert: null,
    coordinates: { lat: 7.0095, lng: 125.0880 },
    assignedDriver: "Wilfredo J. Aquino",
    authorizedDriverIds: ["DRV-003", "DRV-001", "DRV-004"],
    specs: {
      reach: "N/A (Utility Double Cab)",
      bucketCapacity: "Cargo Bed 1,000 kg",
      dielectricRating: "Equipped with Insulated Lineman Tool Vault",
      outriggers: "N/A",
      transmission: "6-Speed Automatic 4WD"
    }
  },
  {
    id: "VEH-004",
    code: "FLT-PU-02",
    plateNo: "NDI-6105",
    vin: "MMC-KL1T-440129",
    engineNo: "4N15-882910",
    classification: "Pickup",
    makeModel: "Mitsubishi Strada 4x4 GLX",
    year: 2022,
    branchId: "BR-MID",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "West District Maintenance Unit",
    supplier: "Mitsubishi Motors Mindanao - Cotabato",
    orCrNo: "CR-2022-6105-A",
    assetTag: "COTELCO-FA-2022-08",
    status: "IN-SHOP",
    statusReason: "Outside Repair at Mitsubishi Motors Mindanao: Front suspension ball joint & stabilizer overhaul.",
    odometerKm: 48900,
    operatingHours: 2420,
    fuelType: "Diesel",
    fuelLevelPct: 45,
    acquisitionCost: 1850000,
    acquisitionDate: "2022-09-15",
    insuranceAcquiredDate: "2023-11-05",
    insuranceExpiryDate: "2026-11-05",
    registrationAcquiredDate: "2023-11-18",
    registrationExpiryDate: "2026-11-18",
    lastServiceDate: "2026-05-10",
    nextServiceDueKm: 50000,
    nextServiceDueDate: "2026-10-22",
    urgentAlert: null,
    coordinates: { lat: 7.1890, lng: 124.5290 },
    assignedDriver: "Nestor B. Perez",
    authorizedDriverIds: ["DRV-006", "DRV-003", "DRV-004"],
    specs: {
      reach: "N/A (Utility Double Cab)",
      bucketCapacity: "Cargo Bed 950 kg",
      dielectricRating: "Standard Utility",
      outriggers: "N/A",
      transmission: "6-Speed Manual 4WD"
    }
  },
  {
    id: "VEH-005",
    code: "FLT-ER-01",
    plateNo: "LAA-9901",
    vin: "TOY-HCE-339102",
    engineNo: "1GD-771920",
    classification: "Van",
    makeModel: "Toyota Hiace Commuter Special Purpose",
    year: 2023,
    branchId: "BR-KAB",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "Emergency Disaster & Grid Restoration",
    supplier: "Toyota Davao City Inc. - Commercial Fleet",
    orCrNo: "CR-2023-9901-A",
    assetTag: "COTELCO-FA-2023-09",
    status: "ACTIVE",
    statusReason: "Normal line service. Standby for rapid storm disaster & crew deployment.",
    odometerKm: 22400,
    operatingHours: 920,
    fuelType: "Diesel",
    fuelLevelPct: 88,
    acquisitionCost: 2250000,
    acquisitionDate: "2023-08-12",
    insuranceAcquiredDate: "2023-12-02",
    insuranceExpiryDate: "2026-12-02",
    registrationAcquiredDate: "2023-12-15",
    registrationExpiryDate: "2026-12-15",
    lastServiceDate: "2026-07-20",
    nextServiceDueKm: 25000,
    nextServiceDueDate: "2026-11-28",
    urgentAlert: null,
    coordinates: { lat: 7.1140, lng: 124.8390 },
    assignedDriver: "Leandro B. Tolentino",
    authorizedDriverIds: ["DRV-004", "DRV-003", "DRV-001"],
    specs: {
      reach: "N/A (Commuter Van)",
      bucketCapacity: "12 Linemen Crew Transport",
      dielectricRating: "First Aid & Live-Line Gear Storage",
      outriggers: "N/A",
      transmission: "6-Speed Manual"
    }
  },
  {
    id: "VEH-006",
    code: "FLT-MC-01",
    plateNo: "904-NDI",
    vin: "HND-CRF-559102",
    engineNo: "MD44E-229104",
    classification: "Motorcycle",
    makeModel: "Honda CRF150L Trail Patrol",
    year: 2023,
    branchId: "BR-MAK",
    ownershipType: "COTELCO Company Fleet (Pool Asset)",
    custodianDepartment: "Substation Perimeter & Rural Feeder Patrol",
    supplier: "Yamaha / Honda Motor Mindanao Hub",
    orCrNo: "CR-2023-904-A",
    assetTag: "COTELCO-FA-2023-13",
    status: "ACTIVE",
    statusReason: "Normal line service. Off-grid highland right-of-way inspection unit.",
    odometerKm: 8750,
    operatingHours: 410,
    fuelType: "Gasoline",
    fuelLevelPct: 90,
    acquisitionCost: 145000,
    acquisitionDate: "2023-03-05",
    insuranceAcquiredDate: "2024-03-05",
    insuranceExpiryDate: "2027-03-05",
    registrationAcquiredDate: "2024-03-10",
    registrationExpiryDate: "2027-03-10",
    lastServiceDate: "2026-08-10",
    nextServiceDueKm: 10000,
    nextServiceDueDate: "2026-12-10",
    urgentAlert: null,
    coordinates: { lat: 6.9650, lng: 125.0960 },
    assignedDriver: "Arnel V. Macaraeg",
    authorizedDriverIds: ["DRV-005", "DRV-003"],
    specs: {
      reach: "N/A (Off-road Motorcycle)",
      bucketCapacity: "Single Rider + Tool Rack",
      dielectricRating: "Insulated Meter Tester Kit",
      outriggers: "N/A",
      transmission: "5-Speed Manual Clutch"
    }
  }
];

export const DEFAULT_DRIVERS = [
  {
    id: "DRV-001",
    name: "Danilo C. Santos",
    employeeId: "EMP-2018-042",
    title: "Senior Aerial Boom Operator",
    role: "Senior Aerial Boom Operator",
    department: "Technical / Engineering",
    category: "Heavy Equipment",
    branchId: "BR-KID",
    assignedVehicleCode: "FLT-BT-01",
    licenseNo: "L02-12-882910",
    licenseType: "Professional (RC 1, 2, 3)",
    licenseAcquiredDate: "2022-08-15",
    licenseExpiry: "2027-08-15",
    phone: "0919-451-2291",
    email: "danilo.santos@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 184,
    safetyRating: "99.4%",
    certifications: ["TESDA Heavy Equipment NC II", "Dielectric Live-Line Safety Level 3", "Defensive Driving Certified"]
  },
  {
    id: "DRV-002",
    name: "Rodrigo T. Mendoza",
    employeeId: "EMP-2017-029",
    title: "Heavy Digger Derrick Specialist",
    role: "Heavy Digger Derrick Specialist",
    department: "Technical / Engineering",
    category: "Heavy Equipment",
    branchId: "BR-KID",
    assignedVehicleCode: "FLT-DD-01",
    licenseNo: "L02-11-773819",
    licenseType: "Professional (RC 1, 2, 3, 8)",
    licenseAcquiredDate: "2022-05-18",
    licenseExpiry: "2027-05-18",
    phone: "0918-772-3311",
    email: "rodrigo.mendoza@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 168,
    safetyRating: "99.2%",
    certifications: ["TESDA Heavy Equipment Rigging NC III", "DOLE Crane Safety Inspection"]
  },
  {
    id: "DRV-003",
    name: "Wilfredo J. Aquino",
    employeeId: "EMP-2020-088",
    title: "Lead Lineman & Field Driver",
    role: "Lead Lineman & Field Driver",
    department: "Technical / Engineering",
    category: "Light Commercial",
    branchId: "BR-KID",
    assignedVehicleCode: "FLT-PU-01",
    licenseNo: "L02-15-449102",
    licenseType: "Professional (RC 1, 2)",
    licenseAcquiredDate: "2021-10-15",
    licenseExpiry: "2026-10-15",
    phone: "0939-224-8855",
    email: "wilfredo.aquino@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 195,
    safetyRating: "99.6%",
    certifications: ["Defensive Driving Level 2", "Emergency First Response Certified"]
  },
  {
    id: "DRV-004",
    name: "Leandro B. Tolentino",
    employeeId: "EMP-2021-061",
    title: "Emergency Response Driver",
    role: "Emergency Response Driver",
    department: "Institutional Services",
    category: "Passenger / Emergency",
    branchId: "BR-KAB",
    assignedVehicleCode: "FLT-ER-01",
    licenseNo: "L02-16-778811",
    licenseType: "Professional (RC 1, 2)",
    licenseAcquiredDate: "2023-01-14",
    licenseExpiry: "2028-01-14",
    phone: "0947-882-9933",
    email: "leandro.tolentino@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 142,
    safetyRating: "98.7%",
    certifications: ["TESDA Emergency Vehicle Operations", "First Aid Red Cross"]
  },
  {
    id: "DRV-005",
    name: "Arnel V. Macaraeg",
    employeeId: "EMP-2022-019",
    title: "Line Patrol & Grid Scout",
    role: "Line Patrol & Grid Scout",
    department: "Area",
    category: "Patrol Motorcycle",
    branchId: "BR-MAK",
    assignedVehicleCode: "FLT-MC-01",
    licenseNo: "L02-17-229104",
    licenseType: "Professional (RC 1)",
    licenseAcquiredDate: "2023-09-02",
    licenseExpiry: "2028-09-02",
    phone: "0920-331-5544",
    email: "arnel.macaraeg@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 220,
    safetyRating: "99.8%",
    certifications: ["Mountain Trail Riding Safety", "Substation Perimeter Security"]
  },
  {
    id: "DRV-006",
    name: "Nestor B. Perez",
    employeeId: "EMP-2019-053",
    title: "West District Lineman & Field Driver",
    role: "West District Lineman & Field Driver",
    department: "Area",
    category: "Light Commercial",
    branchId: "BR-MID",
    assignedVehicleCode: "FLT-PU-02",
    licenseNo: "L02-14-663819",
    licenseType: "Professional (RC 1, 2)",
    licenseAcquiredDate: "2021-12-18",
    licenseExpiry: "2026-12-18",
    phone: "0921-554-1188",
    email: "nestor.perez@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 156,
    safetyRating: "99.1%",
    certifications: ["Defensive Driving Certified", "Overhead Line Safety NC II"]
  },
  {
    id: "DRV-007",
    name: "Engr. Mateo R. Villanueva",
    employeeId: "EMP-2016-014",
    title: "Lead Fleet Diagnostic Specialist",
    role: "Lead Fleet Diagnostic Specialist",
    department: "Technical / Engineering",
    category: "Heavy Equipment",
    branchId: "BR-KID",
    assignedVehicleCode: null,
    licenseNo: "L02-10-551204",
    licenseType: "Professional (RC 1, 2, 3)",
    licenseAcquiredDate: "2023-04-12",
    licenseExpiry: "2028-04-12",
    phone: "0917-612-8801",
    email: "mateo.villanueva@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 48,
    safetyRating: "99.7%",
    certifications: ["TESDA Automotive Servicing NC IV", "Heavy Fleet Diagnostics Master"]
  },
  {
    id: "DRV-008",
    name: "Rogelio D. Bautista",
    employeeId: "EMP-2018-031",
    title: "Senior Heavy Hydraulics & Boom Mechanic",
    role: "Senior Heavy Hydraulics & Boom Mechanic",
    department: "Technical / Engineering",
    category: "Heavy Equipment",
    branchId: "BR-KID",
    assignedVehicleCode: null,
    licenseNo: "L02-13-774120",
    licenseType: "Professional (RC 1, 2, 3)",
    licenseAcquiredDate: "2022-09-30",
    licenseExpiry: "2027-09-30",
    phone: "0918-440-1922",
    email: "rogelio.bautista@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 36,
    safetyRating: "99.5%",
    certifications: ["Hydraulic Boom & Outrigger Certification", "TESDA Heavy Equipment Servicing NC III"]
  },
  {
    id: "DRV-009",
    name: "Ernesto C. Solis",
    employeeId: "EMP-2019-047",
    title: "Master Diesel & Drivetrain Technician",
    role: "Master Diesel & Drivetrain Technician",
    department: "Technical / Engineering",
    category: "Heavy Equipment",
    branchId: "BR-KID",
    assignedVehicleCode: null,
    licenseNo: "L02-14-319842",
    licenseType: "Professional (RC 1, 2, 3)",
    licenseAcquiredDate: "2023-02-19",
    licenseExpiry: "2028-02-19",
    phone: "0920-518-7734",
    email: "ernesto.solis@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 29,
    safetyRating: "99.3%",
    certifications: ["Common Rail Diesel Injection Specialist", "TESDA Diesel Engine Overhaul NC III"]
  },
  {
    id: "DRV-010",
    name: "Jerome P. Navarro",
    employeeId: "EMP-2020-073",
    title: "Automotive Electrical & OBD-II Specialist",
    role: "Automotive Electrical & OBD-II Specialist",
    department: "Technical / Engineering",
    category: "Light Commercial",
    branchId: "BR-KAB",
    assignedVehicleCode: null,
    licenseNo: "L02-16-882411",
    licenseType: "Professional (RC 1, 2)",
    licenseAcquiredDate: "2023-07-08",
    licenseExpiry: "2028-07-08",
    phone: "0939-881-4409",
    email: "jerome.navarro@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 31,
    safetyRating: "99.4%",
    certifications: ["Automotive Electrical & ECU Diagnostics NC III", "Alternator & High-Current Systems"]
  },
  {
    id: "DRV-011",
    name: "Dante M. Soriano",
    employeeId: "EMP-2021-055",
    title: "Brake, Suspension & Chassis Specialist",
    role: "Brake, Suspension & Chassis Specialist",
    department: "Technical / Engineering",
    category: "Light Commercial",
    branchId: "BR-MID",
    assignedVehicleCode: null,
    licenseNo: "L02-17-662019",
    licenseType: "Professional (RC 1, 2)",
    licenseAcquiredDate: "2022-12-05",
    licenseExpiry: "2027-12-05",
    phone: "0947-332-9105",
    email: "dante.soriano@cotelco.com.ph",
    status: "ON-DUTY",
    totalTrips: 24,
    safetyRating: "99.2%",
    certifications: ["Air & Hydraulic Brake Overhaul NC II", "Wheel Alignment & Suspension Certification"]
  }
];

export const getVehicleAuthorizedDrivers = (vehicle, drivers = []) => {
  if (!vehicle) return [];
  if (Array.isArray(vehicle.authorizedDriverIds)) {
    return drivers.filter(d => vehicle.authorizedDriverIds.includes(d.id));
  }

  const assigned = drivers.filter(d =>
    d.assignedVehicleCode === vehicle.code ||
    (vehicle.assignedDriver && d.name === vehicle.assignedDriver)
  );

  const primaryId = assigned[0]?.id;
  const list = drivers.filter(d => {
    if (d.id === primaryId) return true;
    if (vehicle.classification === 'Bucket Truck' || vehicle.classification === 'Truck') {
      return d.category === 'Heavy Equipment' || d.certifications?.some(c => c.includes('Heavy Equipment') || c.includes('Dielectric'));
    }
    if (vehicle.classification === 'Pickup' || vehicle.classification === 'Van') {
      return d.category === 'Light Commercial' || d.category === 'Passenger / Emergency' || d.branchId === vehicle.branchId;
    }
    if (vehicle.classification === 'Motorcycle') {
      return d.category === 'Patrol Motorcycle' || d.licenseType?.includes('RC 1');
    }
    return d.branchId === vehicle.branchId;
  });

  const assignedIds = new Set(assigned.map(a => a.id));
  const otherAuthorized = list.filter(d => !assignedIds.has(d.id));
  return [...assigned, ...otherAuthorized];
};

export const getEmployeeVehiclesWithAccess = (driver, vehicles = []) => {
  if (!driver) return [];
  return vehicles.filter(v => {
    if (Array.isArray(v.authorizedDriverIds)) {
      return v.authorizedDriverIds.includes(driver.id);
    }
    const authDrivers = getVehicleAuthorizedDrivers(v, [driver]);
    return authDrivers.some(d => d.id === driver.id);
  });
};

export const DEFAULT_WORK_ORDERS = [
  {
    id: "REP-2026-091",
    vehicleCode: "FLT-PU-02",
    plateNo: "NDI-6105",
    classification: "Pickup",
    branchId: "BR-MID",
    type: "Upper & Lower Suspension Ball Joint Overhaul",
    category: "Brakes & Suspension",
    priority: "HIGH",
    status: "In Shop",
    currentStage: "Active Repair / Servicing",
    dateReported: "2026-10-15",
    targetCompletion: "2026-11-22",
    reportedBy: "Nestor B. Perez",
    assignedMechanic: "Dante M. Soriano (Brake, Suspension & Chassis Specialist)",
    facility: "Mitsubishi Motors Mindanao - Cotabato",
    estimatedCost: 38000,
    incurredCost: 12000,
    targetKm: 55000,
    nextServiceDate: "2027-05-15",
    description: "Lower and upper suspension ball joint replacement; stabilizer link bushings and computerized 4-wheel alignment following rough rural feeder patrols.",
    stages: [],
    partsList: [
      { part: "Heavy Duty Ball Joints (Set of 4)", qty: 1, cost: 16500 },
      { part: "Polyurethane Stabilizer Bushing Set", qty: 1, cost: 5500 },
      { part: "Labor & Laser Wheel Alignment", qty: 1, cost: 6000 }
    ]
  },
  {
    id: "REP-2026-092",
    vehicleCode: "FLT-DD-01",
    plateNo: "NDI-8812",
    classification: "Truck",
    branchId: "BR-KID",
    type: "Hydraulic Outrigger Pressure & Lock Valve Test",
    category: "Dielectric / Safety Certification",
    priority: "ROUTINE",
    status: "In Shop",
    currentStage: "Queued / Inspection",
    scheduledDate: "2026-11-23",
    dateReported: "2026-11-12",
    targetCompletion: "2026-11-26",
    reportedBy: "Rodrigo T. Mendoza",
    assignedMechanic: "Rogelio D. Bautista (Senior Heavy Hydraulics & Boom Mechanic)",
    facility: "COTELCO Central Motorpool & Diagnostic Bay",
    estimatedCost: 18500,
    incurredCost: 0,
    targetKm: 50000,
    nextServiceDate: "2027-05-12",
    description: "Semi-annual hydraulic outrigger pressure check, auger gearbox oil inspection, and boom lock valve diagnostic.",
    stages: [],
    partsList: []
  },
  {
    id: "REP-2026-093",
    vehicleCode: "FLT-ER-01",
    plateNo: "ZAB-7741",
    classification: "Van",
    branchId: "BR-KAB",
    type: "Brake Pads & Fluid Check + Cabin A/C Inspection",
    category: "Brakes & Suspension",
    priority: "HIGH",
    status: "In Shop",
    currentStage: "Queued / Inspection",
    scheduledDate: "",
    dateReported: "2026-11-21",
    targetCompletion: "",
    reportedBy: "Leandro B. Tolentino",
    assignedMechanic: "",
    facility: "COTELCO Central Motorpool & Diagnostic Bay",
    estimatedCost: 0,
    incurredCost: 0,
    targetKm: 32000,
    nextServiceDate: "2027-05-21",
    description: "Driver reported soft brake pedal feel during emergency dispatch. Needs mechanic assignment and schedule date.",
    stages: [],
    partsList: []
  },
  {
    id: "REP-2026-089",
    vehicleCode: "FLT-BT-01",
    plateNo: "NDI-4092",
    classification: "Bucket Truck",
    branchId: "BR-KID",
    type: "Annual 46kV Dielectric Boom High-Pot Test",
    category: "Dielectric / Safety Certification",
    priority: "ROUTINE",
    status: "Completed / Released",
    currentStage: "Completed / Released",
    dateReported: "2026-09-10",
    targetCompletion: "2026-09-16",
    dateCompleted: "2026-09-16",
    reportedBy: "Danilo C. Santos",
    assignedMechanic: "Engr. Mateo R. Villanueva (Lead Fleet Diagnostic Specialist)",
    facility: "Isuzu Gencars Davao / Southern Mindanao",
    estimatedCost: 48500,
    incurredCost: 48500,
    targetKm: 40000,
    nextServiceDate: "2027-09-16",
    diagnosticSummary: "Passed 46kV high-pot insulation test; zero leakage current; hydraulic seals verified to 3,000 PSI.",
    description: "Mandatory 46kV dielectric high-pot laboratory testing, acoustic emission test of fiberglass boom, hydraulic outrigger fluid renewal, and 30,000 km periodic service.",
    stages: [],
    partsList: [
      { part: "Dielectric High-Pot Lab Certification (46kV)", qty: 1, cost: 22000 },
      { part: "Genuine Shell Tellus S2 V 46 Hydraulic Fluid (Drum)", qty: 1, cost: 16500 },
      { part: "OEM Oil & Fuel Filter Replacement + Labor", qty: 1, cost: 10000 }
    ]
  },
  {
    id: "REP-2026-085",
    vehicleCode: "FLT-PU-01",
    plateNo: "MAA-2290",
    classification: "Pickup",
    branchId: "BR-KID",
    type: "Engine Oil & Oil Filter Change (5,000 km)",
    category: "Preventive Maintenance (PMS)",
    priority: "ROUTINE",
    status: "Completed / Released",
    currentStage: "Completed / Released",
    archivedFromBoard: true,
    dateReported: "2026-09-17",
    targetCompletion: "2026-09-18",
    dateCompleted: "2026-09-18",
    reportedBy: "Wilfredo J. Aquino",
    assignedMechanic: "Ernesto C. Solis (Master Diesel & Drivetrain Technician)",
    facility: "Toyota Davao City Inc. - Commercial Fleet",
    estimatedCost: 12500,
    incurredCost: 12500,
    targetKm: 57400,
    nextServiceDate: "2026-12-18",
    diagnosticSummary: "Renewed 5W-30 synthetic diesel oil, OEM oil filter, and cabin air filter. Next oil change at 57,400 km.",
    description: "Routine 5,000 km oil change and 25-point diagnostic safety check.",
    stages: [],
    partsList: []
  }
];

export const DEFAULT_REPAIR_ARCHIVE = [
  {
    voucherNo: "VCH-2026-00412",
    receiptId: "RCPT-98124",
    workOrderNo: "REP-2026-074",
    date: "2026-09-18",
    vehicleCode: "FLT-PU-01",
    plateNo: "MAA-2290",
    model: "Toyota Hilux 2.8L 4x4",
    branch: "Central Operations Headquarters",
    branchId: "BR-KID",
    facility: "Toyota Davao City Inc. - Commercial Fleet",
    serviceType: "50,000 KM Preventive Maintenance & Brake Overhaul",
    serviceSummary: "Routine 50k service, fully synthetic 5W-30 engine oil, OEM oil filter, air filter, rear brake shoe cleaning and front ceramic brake pad replacement.",
    laborCost: 6500,
    partsCost: 24850,
    totalCost: 31350,
    approvedBy: "Engr. Roberto M. Alcantara (Fleet Operations Director)",
    mechanic: "Lead Certified Technician (Toyota Davao)",
    driverReceiptSign: "Wilfredo J. Aquino (Lead Lineman)",
    items: [
      { desc: "Castrol Magnatec Diesel 5W-30 (8 Liters)", qty: 8, unitPrice: 850, amount: 6800 },
      { desc: "Genuine Heavy Duty Oil Filter Element", qty: 1, unitPrice: 950, amount: 950 },
      { desc: "Air Filter Element & Cabin Filter", qty: 1, unitPrice: 2200, amount: 2200 },
      { desc: "Front Ceramic Brake Pad Set (Genuine OEM)", qty: 1, unitPrice: 5800, amount: 5800 },
      { desc: "50,000 km Multi-Point Diagnostic & Brake Labor", qty: 1, unitPrice: 6500, amount: 6500 }
    ]
  },
  {
    voucherNo: "VCH-2026-00415",
    receiptId: "RCPT-98129",
    workOrderNo: "REP-2026-089",
    date: "2026-09-16",
    vehicleCode: "FLT-BT-01",
    plateNo: "NDI-4092",
    model: "Isuzu Forward FTR 16m Boom",
    branch: "Central Operations Headquarters",
    branchId: "BR-KID",
    facility: "Isuzu Gencars Davao / Southern Mindanao",
    serviceType: "Annual Dielectric Boom Recertification & 30,000 km PMS",
    serviceSummary: "Certified 46kV dielectric insulation high-pot pass; hydraulic outrigger fluid renewal; 30,000 km multi-point service; cleared for 3-phase live line operation.",
    laborCost: 16000,
    partsCost: 32500,
    totalCost: 48500,
    approvedBy: "Engr. Roberto M. Alcantara (Fleet Operations Director)",
    mechanic: "Chief Master Technician (Isuzu Gencars)",
    driverReceiptSign: "Danilo C. Santos (Senior Operator)",
    items: [
      { desc: "46kV Dielectric Laboratory Insulation Testing & Pass Certificate", qty: 1, unitPrice: 22000, amount: 22000 },
      { desc: "Shell Tellus S2 V 46 Hydraulic Fluid Renewal", qty: 1, unitPrice: 10500, amount: 10500 },
      { desc: "30,000 km Comprehensive Diagnostic & Hydraulic Labor", qty: 1, unitPrice: 16000, amount: 16000 }
    ]
  }
];

export const DEFAULT_AUDIT_LOGS = [
  {
    id: "LOG-90142",
    timestamp: "2026-10-17 08:30:15",
    user: "Engr. R. Alcantara",
    role: "Fleet Operations Director",
    action: "Role Switched",
    category: "SECURITY_AUTH",
    details: "Session role changed to DIRECTOR. Elevated executive authorization active.",
    ipAddress: "192.168.10.22",
    status: "AUTHORIZED"
  },
  {
    id: "LOG-90140",
    timestamp: "2026-10-15 14:20:00",
    user: "Engr. R. Alcantara",
    role: "Fleet Operations Director",
    action: "Outside Repair Logged",
    category: "MAINTENANCE",
    details: "Dispatched vehicle FLT-PU-02 to Mitsubishi Motors Mindanao for Front Suspension & Steering Overhaul. Log: REP-2026-091.",
    ipAddress: "192.168.10.22",
    status: "AUTHORIZED"
  },
  {
    id: "LOG-90135",
    timestamp: "2026-09-18 16:45:10",
    user: "Engr. R. Alcantara",
    role: "Fleet Operations Director",
    action: "Expense Voucher Archived",
    category: "FINANCIAL_AUDIT",
    details: "Archived audited voucher VCH-2026-00412 for FLT-PU-01 (₱31,350 PHP).",
    ipAddress: "192.168.10.22",
    status: "AUTHORIZED"
  }
];

export const DEFAULT_BOOKINGS = [
  {
    id: "BK-001",
    vehicleId: "VEH-001",
    vehicleCode: "FLT-BT-01",
    driver: "Danilo C. Santos",
    avatar: "/vehicles/bucket-truck-isuzu.jpg",
    type: "MAINTENANCE",
    title: "Feeder 4 Hotstick Insulator Repair",
    category: "Live-Line Repair",
    date: new Date().toISOString().substring(0, 10),
    startHour: 8,
    endHour: 12,
    startTime: "08:00",
    endTime: "12:00",
    branchId: "BR-KID",
    branch: "Kidapawan District",
    destination: "Brgy. Paco Feeder 4 Lateral",
    purpose: "Replace cracked 13.8kV suspension insulator on live 3-phase grid line.",
    status: "Confirmed"
  },
  {
    id: "BK-002",
    vehicleId: "VEH-003",
    vehicleCode: "FLT-PU-01",
    driver: "Wilfredo J. Aquino",
    avatar: "/vehicles/pickup-toyota-hilux.jpg",
    type: "DISPATCH",
    title: "Substation Transformer Routine Inspection",
    category: "Inspection",
    date: new Date().toISOString().substring(0, 10),
    startHour: 13,
    endHour: 16,
    startTime: "13:00",
    endTime: "16:00",
    branchId: "BR-KID",
    branch: "Kidapawan District",
    destination: "Manubuan Primary Substation",
    purpose: "Oil temperature monitoring and silica gel breather inspection.",
    status: "Confirmed"
  },
  {
    id: "BK-003",
    vehicleId: "VEH-006",
    vehicleCode: "FLT-MC-01",
    driver: "Arnel V. Macaraeg",
    avatar: "/vehicles/bike-honda-crf150l.jpg",
    type: "PATROL",
    title: "Mountain Feeder Right-of-Way Patrol",
    category: "Right-of-Way Patrol",
    date: new Date().toISOString().substring(0, 10),
    startHour: 9,
    endHour: 11,
    startTime: "09:00",
    endTime: "11:30",
    branchId: "BR-MAK",
    branch: "Makilala Sector",
    destination: "Barangay New Bulatukan Foothills",
    purpose: "Vegetation clearance check and bamboo intrusion monitoring along 3-phase line.",
    status: "Confirmed"
  }
];

/* ===========================================================================
   Driver Trip Logs (DRIVER role)
   Common routes are APPROXIMATE one-way road distances in km. Drivers can always
   override the distance (Custom km / Odometer range). Maps to dbo.TripRoutes
   (reference data) and dbo.TripLogs (transactions) in docs/BACKEND_READINESS.md.
   =========================================================================== */
export const COMMON_TRIP_ROUTES = [
  { id: 'RT-KID-LOCAL', from: 'Kidapawan', to: 'Within Kidapawan (local rounds)', km: 12 },
  { id: 'RT-KID-MAT', from: 'Kidapawan', to: 'Matalam', km: 21 },
  { id: 'RT-KID-MAK', from: 'Kidapawan', to: 'Makilala', km: 28 },
  { id: 'RT-KID-ANT', from: 'Kidapawan', to: 'Antipas', km: 25 },
  { id: 'RT-KID-MAG', from: 'Kidapawan', to: 'Magpet', km: 30 },
  { id: 'RT-KID-MLA', from: 'Kidapawan', to: "M'lang", km: 36 },
  { id: 'RT-KID-KAB', from: 'Kidapawan', to: 'Kabacan', km: 47 },
  { id: 'RT-KID-MID', from: 'Kidapawan', to: 'Midsayap', km: 50 },
  { id: 'RT-KID-CAR', from: 'Kidapawan', to: 'Carmen', km: 60 },
  { id: 'RT-KID-COT', from: 'Kidapawan', to: 'Cotabato City', km: 90 },
  { id: 'RT-KID-DVO', from: 'Kidapawan', to: 'Davao City', km: 120 }
];

export const TRIP_PURPOSES = [
  'Line / Feeder Inspection',
  'Field Service / Repair Crew',
  'Meter Reading & Collection',
  'Official Errand / Delivery',
  'Meeting / Training',
  'Hauling / Materials Pickup',
  'Other'
];

const _isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DEFAULT_TRIP_LOGS = [
  {
    id: 'TRIP-0001',
    vehicleId: 'VEH-001',
    vehicleCode: 'FLT-BT-01',
    plateNo: 'NDI-4092',
    driverId: 'DRV-001',
    driverName: 'Danilo C. Santos',
    date: _isoDaysAgo(1),
    routeId: 'RT-KID-MAT',
    from: 'Kidapawan',
    to: 'Matalam',
    roundTrip: true,
    distanceKm: 42,
    inputMode: 'ROUTE',
    odometerStart: null,
    odometerEnd: null,
    purpose: 'Line / Feeder Inspection',
    notes: '',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'TRIP-0002',
    vehicleId: 'VEH-001',
    vehicleCode: 'FLT-BT-01',
    plateNo: 'NDI-4092',
    driverId: 'DRV-001',
    driverName: 'Danilo C. Santos',
    date: _isoDaysAgo(3),
    routeId: 'RT-KID-MAK',
    from: 'Kidapawan',
    to: 'Makilala',
    roundTrip: true,
    distanceKm: 56,
    inputMode: 'ROUTE',
    odometerStart: null,
    odometerEnd: null,
    purpose: 'Field Service / Repair Crew',
    notes: '',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

/* Places for the Custom From / To dropdowns. kmFromHub = approximate road km from Kidapawan (HQ).
   Pair distance: via Kidapawan (district roads radiate from HQ). Drivers can use "Odometer range" for exact figures. */
export const TRIP_PLACES = [
  { id: 'Kidapawan', kmFromHub: 0 },
  { id: 'Antipas', kmFromHub: 25 },
  { id: 'Matalam', kmFromHub: 21 },
  { id: 'Makilala', kmFromHub: 28 },
  { id: 'Magpet', kmFromHub: 30 },
  { id: "M'lang", kmFromHub: 36 },
  { id: 'Kabacan', kmFromHub: 47 },
  { id: 'Midsayap', kmFromHub: 50 },
  { id: 'Carmen', kmFromHub: 60 },
  { id: 'Cotabato City', kmFromHub: 90 },
  { id: 'Davao City', kmFromHub: 120 }
];

export const getTripDistance = (from, to) => {
  const a = TRIP_PLACES.find(p => p.id === from);
  const b = TRIP_PLACES.find(p => p.id === to);
  if (!a || !b || a.id === b.id) return 0;
  if (a.kmFromHub === 0) return b.kmFromHub;
  if (b.kmFromHub === 0) return a.kmFromHub;
  return a.kmFromHub + b.kmFromHub;
};
