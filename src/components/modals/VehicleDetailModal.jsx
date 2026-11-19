import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFleet } from '../../context/FleetContext';
import {
  getVehicleImage,
  getVehicleOrCr,
  getVehicleAssetTag,
  getVehicleAuthorizedDrivers
} from '../../data/fleetData';
import { computeVehicleHealthScore } from '../../utils/healthScore';
import {
  X,
  Edit3,
  Check,
  Activity,
  Users,
  Wrench,
  FileText,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Camera
} from 'lucide-react';

const addYearsToDate = (dateStr, yearsToAdd) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return '';
  const d = new Date(parts[0] + yearsToAdd, parts[1] - 1, parts[2]);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getValidityState = (expiryStr) => {
  if (!expiryStr) return { label: 'VALID', tone: 'valid' };
  const exp = new Date(expiryStr);
  if (isNaN(exp)) return { label: 'VALID', tone: 'valid' };
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'EXPIRED', tone: 'expired' };
  if (diffDays <= 90) return { label: 'EXPIRING SOON', tone: 'expiring' };
  return { label: 'VALID', tone: 'valid' };
};

const getInitials = (name) =>
  (name || '')
    .replace(/^Engr\.\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OP';

const ValidityBadge = ({ state }) => {
  const styles =
    state.tone === 'expired'
      ? { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' }
      : state.tone === 'expiring'
      ? { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' }
      : { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.18rem 0.5rem',
        borderRadius: '5px',
        fontSize: '0.66rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color
      }}
    >
      {state.label}
    </span>
  );
};

export const VehicleDetailModal = () => {
  const {
    selectedVehicle,
    vehicles = [],
    modalType,
    setModalType,
    setSelectedVehicle,
    branches = [],
    drivers = [],
    workOrders = [],
    repairArchive = [],
    bookings = [],
    editables = {},
    updateVehicle,
    revokeVehicleAccess
  } = useFleet();

  const vehicleClassifications = editables.vehicleClassifications || [
    'Bucket Truck',
    'Truck',
    'Pickup',
    'Van',
    'Motorcycle',
    'Car / Sedan'
  ];

  const [activeProfileTab, setActiveProfileTab] = useState('overview'); // 'overview' | 'drivers' | 'maintenance' | 'paperwork'
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({});
  const photoInputRef = useRef(null);

  const vehicle = vehicles.find(v => v.id === selectedVehicle?.id) || selectedVehicle;

  useEffect(() => {
    if (vehicle) {
      const specs = vehicle.specs || {};
      const defaultAcq = vehicle.acquisitionDate || `${vehicle.year || 2022}-03-15`;
      const insAcq = vehicle.insuranceAcquiredDate || '2023-10-20';
      const insExp = vehicle.insuranceExpiryDate || addYearsToDate(insAcq, 3);
      const regAcq = vehicle.registrationAcquiredDate || '2023-10-23';
      const regExp = vehicle.registrationExpiryDate || addYearsToDate(regAcq, 3);

      setFormState({
        imageUrl: vehicle.image || vehicle.imageUrl || '',
        code: vehicle.code || '',
        plateNo: vehicle.plateNo || '',
        makeModel: vehicle.makeModel || '',
        year: vehicle.year || 2022,
        classification: vehicle.classification || 'Pickup',
        branchId: vehicle.branchId || 'BR-KID',
        odometerKm: vehicle.odometerKm || 0,
        operatingHours: vehicle.operatingHours || 0,
        acquisitionDate: defaultAcq,
        insuranceAcquiredDate: insAcq,
        insuranceExpiryDate: insExp,
        registrationAcquiredDate: regAcq,
        registrationExpiryDate: regExp,
        transmission: specs.transmission || 'Heavy Duty Manual',
        fuelType: vehicle.fuelType || 'Diesel',
        vin: vehicle.vin || '',
        engineNo: vehicle.engineNo || '',
        orCrNo: getVehicleOrCr(vehicle),
        assetTag: getVehicleAssetTag(vehicle),
        acquisitionCost: vehicle.acquisitionCost || 2100000,
        reach: specs.reach || 'Standard Ground Utility',
        bucketCapacity: specs.bucketCapacity || 'Standard Payload',
        dielectricRating: specs.dielectricRating || 'Standard Commercial'
      });
      setIsEditing(false);
      setActiveProfileTab('overview');
    }
  }, [vehicle?.id, modalType]);

  // Build Historical Driver Log (authorized + past driverHistory + past trip dispatches + baseline history)
  const pastDriverLogs = useMemo(() => {
    if (!vehicle) return [];
    const logs = [];
    const customHist = Array.isArray(vehicle.driverHistory) ? vehicle.driverHistory : [];
    customHist.forEach(item => logs.push(item));

    // Past & scheduled dispatches from bookings
    const vehDispatches = (bookings || []).filter(
      b => (b.vehicleCode === vehicle.code || b.vehicleId === vehicle.id) && b.type === 'DISPATCH'
    );
    vehDispatches.forEach(b => {
      const matchedDriver = drivers.find(d => d.name === b.driver);
      logs.push({
        id: `BK-DRV-${b.id}`,
        driverName: b.driver || 'Pool Operator',
        employeeId: matchedDriver?.employeeId || 'COTELCO-OP',
        title: matchedDriver?.title || 'Field Dispatch Operator',
        department: matchedDriver?.department || 'Technical / Engineering',
        action: 'DISPATCH_TRIP',
        date: b.date,
        note: `${b.title} — ${b.destination || 'Field Grid Operation'}`
      });
    });

    // Historical baseline operator assignments since vehicle acquisition
    const baseYear = Number(vehicle.year) || 2022;
    const poolOperators = drivers.slice(0, 4);
    if (poolOperators.length > 0) {
      const histOp1 = poolOperators[(vehicle.code.charCodeAt(vehicle.code.length - 1) || 0) % poolOperators.length];
      const histOp2 = poolOperators[((vehicle.code.charCodeAt(vehicle.code.length - 1) || 0) + 1) % poolOperators.length];
      if (histOp1) {
        logs.push({
          id: `SEED-DH-1-${vehicle.id}`,
          driverName: histOp1.name,
          employeeId: histOp1.employeeId,
          title: histOp1.title || histOp1.role,
          department: histOp1.department,
          action: 'PAST_ASSIGNED',
          date: `${baseYear + 1}-04-10`,
          note: `Assigned operator during ${baseYear + 1}–${baseYear + 2} feeder & district deployment`
        });
      }
      if (histOp2 && histOp2.id !== histOp1?.id) {
        logs.push({
          id: `SEED-DH-2-${vehicle.id}`,
          driverName: histOp2.name,
          employeeId: histOp2.employeeId,
          title: histOp2.title || histOp2.role,
          department: histOp2.department,
          action: 'PAST_ASSIGNED',
          date: `${baseYear}-05-18`,
          note: `Initial commissioning & field custody operator (${baseYear})`
        });
      }
    }

    return logs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [vehicle, bookings, drivers]);

  // Build Complete Maintenance History (workOrders + repairArchive + historical PMS baseline)
  const maintenanceHistory = useMemo(() => {
    if (!vehicle) return [];
    const list = [];

    // 1. Work Orders (Active & Completed)
    workOrders
      .filter(wo => wo.vehicleCode === vehicle.code)
      .forEach(wo => {
        list.push({
          id: wo.id,
          date: wo.dateCompleted || wo.dateReported || '2026-10-01',
          title: wo.type,
          category: wo.category || 'Maintenance Service',
          specialist: (wo.assignedMechanic || 'Motorpool Specialist').split(' (')[0].trim(),
          status: wo.status === 'Completed / Released' ? 'Completed' : (wo.currentStage || 'In Progress'),
          isCompleted: wo.status === 'Completed / Released',
          note: wo.description || wo.notes || `Work Order ${wo.id}`
        });
      });

    // 2. Repair Archive (Audited Historical Vouchers)
    repairArchive
      .filter(r => r.vehicleCode === vehicle.code)
      .forEach(r => {
        if (!list.some(item => item.id === r.woNo)) {
          list.push({
            id: r.voucherNo || r.id,
            date: r.date || '2025-11-15',
            title: r.serviceType || 'Periodic Maintenance & Overhaul',
            category: 'Audited Repair Ledger',
            specialist: r.facility || 'COTELCO Motorpool',
            status: 'Completed',
            isCompleted: true,
            note: `Voucher ${r.voucherNo || r.id} • Cleared & Audited`
          });
        }
      });

    // 3. Historical Baseline PMS Logs from prior years
    const baseYear = Number(vehicle.year) || 2022;
    list.push(
      {
        id: `HIST-PMS-${vehicle.code}-2`,
        date: `${baseYear + 1}-09-14`,
        title: '20,000 km Comprehensive Preventive Maintenance & Brake Service',
        category: 'Preventive Maintenance (PMS)',
        specialist: 'Engr. Mateo R. Villanueva',
        status: 'Completed',
        isCompleted: true,
        note: 'Full fluid replacement, brake lining inspection, and safety check'
      },
      {
        id: `HIST-PMS-${vehicle.code}-1`,
        date: `${baseYear}-11-05`,
        title: 'Initial 5,000 km Commissioning & Factory Break-In Service',
        category: 'Commissioning PMS',
        specialist: 'Rogelio D. Bautista',
        status: 'Completed',
        isCompleted: true,
        note: 'Engine oil & filter change, chassis torque check, and LTO safety clearance'
      }
    );

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [vehicle, workOrders, repairArchive]);

  // Build Paperwork & Registration History Log
  const registrationHistoryList = useMemo(() => {
    if (!vehicle) return [];
    const customLogs = Array.isArray(vehicle.registrationHistory) ? vehicle.registrationHistory : [];
    const baseYear = Number(vehicle.year) || 2022;
    const orCr = getVehicleOrCr(vehicle);
    const regAcq = vehicle.registrationAcquiredDate || '2023-10-23';
    const regExp = vehicle.registrationExpiryDate || '2026-10-23';
    const insAcq = vehicle.insuranceAcquiredDate || '2023-10-20';
    const insExp = vehicle.insuranceExpiryDate || '2026-10-20';

    const seeded = [
      {
        id: `CUR-LTO-${vehicle.id}`,
        type: 'LTO Registration (OR/CR)',
        referenceNo: orCr,
        dateAcquired: regAcq,
        expiryDate: regExp,
        agency: 'LTO Region XII District Office',
        status: getValidityState(regExp).label
      },
      {
        id: `CUR-INS-${vehicle.id}`,
        type: 'GSIS / Commercial Fleet Insurance',
        referenceNo: `POL-${vehicle.code}-${regAcq.slice(0, 4)}`,
        dateAcquired: insAcq,
        expiryDate: insExp,
        agency: 'GSIS General Insurance',
        status: getValidityState(insExp).label
      },
      {
        id: `INIT-LTO-${vehicle.id}`,
        type: 'Initial LTO New Vehicle Registration',
        referenceNo: `${orCr}-INIT`,
        dateAcquired: `${baseYear}-03-20`,
        expiryDate: `${baseYear + 3}-03-20`,
        agency: 'LTO Regional Office',
        status: 'ARCHIVED'
      },
      {
        id: `INIT-INS-${vehicle.id}`,
        type: 'Initial Comprehensive & TPL Insurance',
        referenceNo: `POL-${vehicle.code}-${baseYear}`,
        dateAcquired: `${baseYear}-03-15`,
        expiryDate: `${baseYear + 1}-03-15`,
        agency: 'GSIS General Insurance',
        status: 'ARCHIVED'
      }
    ];

    return [...customLogs, ...seeded];
  }, [vehicle]);

  if (modalType !== 'vehicle-detail' || !vehicle) return null;

  const branch = branches.find(b => b.id === (formState.branchId || vehicle.branchId));
  const vehiclePhoto = getVehicleImage(vehicle);
  const authorizedDrivers = getVehicleAuthorizedDrivers(vehicle, drivers);
  const insState = getValidityState(formState.insuranceExpiryDate || vehicle.insuranceExpiryDate);
  const regState = getValidityState(formState.registrationExpiryDate || vehicle.registrationExpiryDate);

  const handleFieldChange = (key, val) => {
    setFormState(prev => ({ ...prev, [key]: val }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          handleFieldChange('imageUrl', canvas.toDataURL('image/jpeg', 0.85));
        } else {
          handleFieldChange('imageUrl', dataUrl);
        }
      };
      img.onerror = () => handleFieldChange('imageUrl', dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    updateVehicle(vehicle.id, {
      image: formState.imageUrl || undefined,
      imageUrl: formState.imageUrl || undefined,
      code: formState.code,
      plateNo: formState.plateNo,
      makeModel: formState.makeModel,
      year: Number(formState.year) || vehicle.year,
      classification: formState.classification,
      branchId: formState.branchId,
      odometerKm: Number(formState.odometerKm) || 0,
      operatingHours: Number(formState.operatingHours) || 0,
      acquisitionDate: formState.acquisitionDate,
      insuranceAcquiredDate: formState.insuranceAcquiredDate,
      insuranceExpiryDate: formState.insuranceExpiryDate,
      registrationAcquiredDate: formState.registrationAcquiredDate,
      registrationExpiryDate: formState.registrationExpiryDate,
      fuelType: formState.fuelType,
      vin: formState.vin,
      engineNo: formState.engineNo,
      orCrNo: formState.orCrNo,
      assetTag: formState.assetTag,
      acquisitionCost: Number(formState.acquisitionCost) || 0,
      specs: {
        ...(vehicle.specs || {}),
        transmission: formState.transmission,
        reach: formState.reach,
        bucketCapacity: formState.bucketCapacity,
        dielectricRating: formState.dielectricRating
      }
    });
    setIsEditing(false);
  };

  const specCardStyle = {
    background: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    padding: '0.75rem 0.9rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '0.35rem'
  };

  const labelStyle = {
    fontSize: '0.64rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-tertiary)'
  };

  const valueStyle = {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text-main)'
  };

  const renderSpecBox = ({ key, label, display, type = 'text', mono = false }) => (
    <div key={key} style={specCardStyle}>
      <span style={labelStyle}>{label}</span>
      {isEditing ? (
        type === 'branch-select' ? (
          <select
            className="form-select"
            style={{ fontSize: '0.82rem', padding: '0.28rem 0.5rem', minHeight: '32px' }}
            value={formState.branchId}
            onChange={(e) => handleFieldChange('branchId', e.target.value)}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.municipality} District</option>
            ))}
          </select>
        ) : (
          <input
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            className={`form-input ${mono ? 'mono' : ''}`}
            style={{ fontSize: '0.82rem', padding: '0.28rem 0.5rem', minHeight: '32px' }}
            value={formState[key] ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
          />
        )
      ) : (
        <strong className={mono ? 'mono' : ''} style={valueStyle}>
          {display || 'N/A'}
        </strong>
      )}
    </div>
  );

  const TABS = [
    { id: 'overview', label: 'Overview & Specs' },
    { id: 'drivers', label: 'Driver History' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'paperwork', label: 'Paperwork & Registration' }
  ];

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '820px', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
        {/* Top Profile Summary Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center', minWidth: 0, flex: '1 1 240px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '112px', height: '82px', flexShrink: 0 }}>
                <img
                  src={(isEditing ? formState.imageUrl : '') || vehiclePhoto}
                  alt={vehicle.code}
                  onClick={() => {
                    if (isEditing) photoInputRef.current?.click();
                  }}
                  style={{
                    width: '112px',
                    height: '82px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: isEditing ? '1px solid var(--text-main)' : '1px solid var(--border-light)',
                    background: 'var(--bg-surface-subtle)',
                    cursor: isEditing ? 'pointer' : 'default',
                    display: 'block'
                  }}
                  title={isEditing ? 'Click to upload a new vehicle photo' : undefined}
                />
                {isEditing && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        left: '4px',
                        right: '4px',
                        bottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.35rem',
                        borderRadius: '7px',
                        border: '1px solid rgba(255,255,255,0.22)',
                        background: 'rgba(15, 23, 42, 0.78)',
                        color: '#FFFFFF',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <Camera size={11} /> Change Photo
                    </button>
                  </>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {!isEditing ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {vehicle.code}
                      </h2>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {vehicle.classification}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {vehicle.makeModel} ({vehicle.year})
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Plate: <strong className="mono" style={{ color: 'var(--text-secondary)' }}>{vehicle.plateNo}</strong>
                    </div>
                  </>
                ) : (
                  <div className="responsive-grid-2" style={{ gap: '0.45rem', maxWidth: '460px' }}>
                    <div>
                      <span style={{ ...labelStyle, fontSize: '0.58rem', display: 'block', marginBottom: '2px' }}>Vehicle Code / Name</span>
                      <input
                        type="text"
                        className="form-input mono"
                        style={{ fontSize: '0.82rem', padding: '0.26rem 0.5rem', minHeight: '32px' }}
                        value={formState.code || ''}
                        onChange={(e) => handleFieldChange('code', e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ ...labelStyle, fontSize: '0.58rem', display: 'block', marginBottom: '2px' }}>Plate Number</span>
                      <input
                        type="text"
                        className="form-input mono"
                        style={{ fontSize: '0.82rem', padding: '0.26rem 0.5rem', minHeight: '32px' }}
                        value={formState.plateNo || ''}
                        onChange={(e) => handleFieldChange('plateNo', e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ ...labelStyle, fontSize: '0.58rem', display: 'block', marginBottom: '2px' }}>Make &amp; Model</span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.82rem', padding: '0.26rem 0.5rem', minHeight: '32px' }}
                        value={formState.makeModel || ''}
                        onChange={(e) => handleFieldChange('makeModel', e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ ...labelStyle, fontSize: '0.58rem', display: 'block', marginBottom: '2px' }}>Classification</span>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.82rem', padding: '0.26rem 0.5rem', minHeight: '32px' }}
                        value={formState.classification || ''}
                        onChange={(e) => handleFieldChange('classification', e.target.value)}
                      >
                        {!vehicleClassifications.includes(formState.classification) && formState.classification && (
                          <option value={formState.classification}>{formState.classification}</option>
                        )}
                        {vehicleClassifications.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={{ ...labelStyle, fontSize: '0.58rem', display: 'block', marginBottom: '2px' }}>Model Year</span>
                      <input
                        type="number"
                        className="form-input mono"
                        style={{ fontSize: '0.82rem', padding: '0.26rem 0.5rem', minHeight: '32px' }}
                        value={formState.year || ''}
                        onChange={(e) => handleFieldChange('year', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Authorized Personnel Pill */}
                <button
                  type="button"
                  onClick={() => setActiveProfileTab('drivers')}
                  style={{
                    marginTop: '0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.22rem 0.65rem 0.22rem 0.35rem',
                    borderRadius: '999px',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {authorizedDrivers.slice(0, 3).map((d, i) => (
                      <span
                        key={d.id}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#E2E8F0',
                          border: '1.5px solid #FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.56rem',
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          marginLeft: i === 0 ? 0 : '-5px'
                        }}
                      >
                        {getInitials(d.name)}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Authorized: <strong style={{ color: 'var(--text-main)' }}>{authorizedDrivers.length} Personnel</strong>
                  </span>
                </button>
              </div>
            </div>

            {/* Top-Right Edit & Close Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                  >
                    <Check size={14} /> Save Specs
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 size={14} /> Edit Specs
                </button>
              )}
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setModalType(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 4-Tab Segmented Navigation Bar (Fixed Height, Never Shifts Layout) */}
          <div
            role="tablist"
            aria-label="Vehicle profile sections"
            className="modal-tabs-4"
            style={{
              marginTop: '1.1rem',
              gap: '4px',
              background: 'var(--bg-surface-subtle)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)'
            }}
          >
            {TABS.map(tab => {
              const active = activeProfileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveProfileTab(tab.id)}
                  style={{
                    height: '34px',
                    borderRadius: '7px',
                    border: active ? '1px solid var(--border-light)' : '1px solid transparent',
                    background: active ? 'var(--bg-surface)' : 'transparent',
                    color: active ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: active ? 'var(--shadow-xs)' : 'none',
                    transition: 'background 0.15s ease, color 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body (Fixed height container so switching tabs never jumps modal size) */}
        <div className="modal-box-body vehicle-detail-body">
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeProfileTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Derived Vehicle Health Score (pure model, computed at render) */}
              {(() => {
                const health = computeVehicleHealthScore(vehicle, workOrders);
                const barColor =
                  health.score >= 70 ? 'var(--ok-dot)' : health.score >= 55 ? 'var(--warn-dot)' : 'var(--bad-dot)';
                const topFactors = health.factors.slice(0, 3);
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      <Activity size={13} /> HEALTH SCORE
                    </div>
                    <div style={{ ...specCardStyle, minHeight: '132px', padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                          <strong style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', lineHeight: 1 }}>
                            {health.score}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                          <span className={`badge ${health.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                            {health.gradeLabel}
                          </span>
                        </div>
                        <div style={{ flex: 1, maxWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ height: '8px', borderRadius: '999px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                            <div style={{ width: `${health.score}%`, height: '100%', background: barColor, borderRadius: '999px', transition: 'width 0.3s var(--ease)' }} />
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                            {health.breakdown.diagnostics.pct}% diagnostics · {health.breakdown.pms.pct}% PMS · {health.breakdown.repairs.pct}% repairs · {health.breakdown.compliance.pct}% paperwork
                          </span>
                        </div>
                      </div>
                      {topFactors.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {topFactors.map((f, i) => (
                            <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          No active issues — all tracked systems in good standing.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Technical & Utility Identifiers */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  <Wrench size={13} /> TECHNICAL &amp; UTILITY SPECIFICATIONS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '0.65rem' }}>
                  {renderSpecBox({
                    key: 'branchId',
                    label: 'ASSIGNED STATION',
                    type: 'branch-select',
                    display: branch?.municipality ? `${branch.municipality} District` : 'Central HQ'
                  })}
                  {renderSpecBox({
                    key: 'reach',
                    label: 'REACH / BOOM SPEC',
                    display: formState.reach
                  })}
                  {renderSpecBox({
                    key: 'bucketCapacity',
                    label: 'PAYLOAD / CAPACITY',
                    display: formState.bucketCapacity
                  })}
                  {renderSpecBox({
                    key: 'dielectricRating',
                    label: 'SAFETY / INSULATION',
                    display: formState.dielectricRating
                  })}
                  {renderSpecBox({
                    key: 'transmission',
                    label: 'TRANSMISSION',
                    display: formState.transmission
                  })}
                  {renderSpecBox({
                    key: 'vin',
                    label: 'VIN / CHASSIS NO',
                    mono: true,
                    display: formState.vin
                  })}
                  {renderSpecBox({
                    key: 'engineNo',
                    label: 'ENGINE SERIAL NO',
                    mono: true,
                    display: formState.engineNo
                  })}
                  {renderSpecBox({
                    key: 'assetTag',
                    label: 'COOPERATIVE ASSET TAG',
                    mono: true,
                    display: formState.assetTag
                  })}
                  {renderSpecBox({
                    key: 'acquisitionCost',
                    label: 'ACQUISITION COST',
                    type: 'number',
                    display: `₱${Number(formState.acquisitionCost || 0).toLocaleString()} PHP`
                  })}
                </div>
              </div>

              {/* Insurance & Registration Summary */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <CalendarDays size={13} /> INSURANCE &amp; REGISTRATION VALIDITY
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => setActiveProfileTab('paperwork')}
                  >
                    View Registration Logs
                  </button>
                </div>
                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  <div style={specCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={labelStyle}>INSURANCE COVERAGE</span>
                      <ValidityBadge state={insState} />
                    </div>
                    <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {formState.insuranceAcquiredDate} &rarr; {formState.insuranceExpiryDate}
                    </div>
                  </div>
                  <div style={specCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={labelStyle}>LTO REGISTRATION (OR/CR)</span>
                      <ValidityBadge state={regState} />
                    </div>
                    <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {formState.registrationAcquiredDate} &rarr; {formState.registrationExpiryDate}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DRIVER HISTORY */}
          {activeProfileTab === 'drivers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Currently Authorized Personnel */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <Users size={13} /> CURRENTLY AUTHORIZED DRIVERS ({authorizedDrivers.length})
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-primary"
                    onClick={() => setModalType('vehicle-access')}
                  >
                    <Plus size={12} /> Manage Access
                  </button>
                </div>

                {authorizedDrivers.length === 0 ? (
                  <div style={{ ...specCardStyle, color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                    No drivers currently authorized for this vehicle. Click &ldquo;Manage Access&rdquo; to grant clearance.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {authorizedDrivers.map(d => (
                      <div
                        key={d.id}
                        style={{
                          ...specCardStyle,
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '0.6rem 0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                          <span
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#1E293B',
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {getInitials(d.name)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                              {d.name} <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>&bull; {d.employeeId}</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {d.title || d.role} &bull; {d.department}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-ok">Authorized</span>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => revokeVehicleAccess(vehicle.id, d.id)}
                            title="Revoke current access (moves to past history)"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Driver Assignments & Dispatch Log */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  <Clock size={13} /> PAST ASSIGNED DRIVERS &amp; DISPATCH LOG ({pastDriverLogs.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {pastDriverLogs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        ...specCardStyle,
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: '0.6rem 0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {getInitials(log.driverName)}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {log.driverName}{' '}
                            <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                              &bull; {log.employeeId}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {log.note}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="badge badge-muted">
                          {log.action === 'DISPATCH_TRIP'
                            ? 'Trip Dispatch'
                            : log.action === 'AUTHORIZED'
                            ? 'Access Granted'
                            : 'Past Operator'}
                        </span>
                        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {log.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE (COMPLETE HISTORY) */}
          {activeProfileTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <Wrench size={13} /> COMPLETE MAINTENANCE &amp; REPAIR HISTORY ({maintenanceHistory.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {maintenanceHistory.map(item => (
                    <div
                      key={item.id}
                      style={{
                        ...specCardStyle,
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.specialist} &bull; {item.note}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className={`badge ${item.isCompleted ? 'badge-ok' : 'badge-warn'}`}>
                          {item.status}
                        </span>
                        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {item.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAPERWORK & REGISTRATION */}
          {activeProfileTab === 'paperwork' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Current Paperwork & Validity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <FileText size={13} /> CURRENT PAPERWORK &amp; REGISTRATION VALIDITY
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={12} /> Update / Log Renewal
                    </button>
                  )}
                </div>

                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  {/* Insurance Card */}
                  <div style={specCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={labelStyle}>INSURANCE COVERAGE</span>
                      <ValidityBadge state={insState} />
                    </div>
                    {isEditing ? (
                      <div className="responsive-grid-2" style={{ gap: '0.5rem', marginTop: '0.35rem' }}>
                        <div>
                          <span style={{ ...labelStyle, fontSize: '0.58rem' }}>Date Acquired</span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            value={formState.insuranceAcquiredDate || ''}
                            onChange={(e) => handleFieldChange('insuranceAcquiredDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <span style={{ ...labelStyle, fontSize: '0.58rem' }}>Expiry Date</span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            value={formState.insuranceExpiryDate || ''}
                            onChange={(e) => handleFieldChange('insuranceExpiryDate', e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                          Acquired: {formState.insuranceAcquiredDate} &bull; Exp: {formState.insuranceExpiryDate}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          GSIS Commercial Utility Fleet Policy
                        </div>
                      </>
                    )}
                  </div>

                  {/* LTO Registration Card */}
                  <div style={specCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={labelStyle}>LTO REGISTRATION (OR/CR)</span>
                      <ValidityBadge state={regState} />
                    </div>
                    {isEditing ? (
                      <div className="responsive-grid-2" style={{ gap: '0.5rem', marginTop: '0.35rem' }}>
                        <div>
                          <span style={{ ...labelStyle, fontSize: '0.58rem' }}>Date Registered</span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            value={formState.registrationAcquiredDate || ''}
                            onChange={(e) => handleFieldChange('registrationAcquiredDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <span style={{ ...labelStyle, fontSize: '0.58rem' }}>Expiry Date</span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            value={formState.registrationExpiryDate || ''}
                            onChange={(e) => handleFieldChange('registrationExpiryDate', e.target.value)}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ ...labelStyle, fontSize: '0.58rem' }}>OR/CR Certificate No.</span>
                          <input
                            type="text"
                            className="form-input mono"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            value={formState.orCrNo || ''}
                            onChange={(e) => handleFieldChange('orCrNo', e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                          Registered: {formState.registrationAcquiredDate} &bull; Exp: {formState.registrationExpiryDate}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          OR/CR No: <span className="mono">{formState.orCrNo}</span> &bull; Tag: <span className="mono">{formState.assetTag}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-Year Registration & Insurance History Logs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  <CalendarDays size={13} /> REGISTRATION &amp; INSURANCE RENEWAL HISTORY ({registrationHistoryList.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {registrationHistoryList.map(rec => (
                    <div
                      key={rec.id}
                      style={{
                        ...specCardStyle,
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {rec.type}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Ref: <span className="mono">{rec.referenceNo}</span> &bull; {rec.agency}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                          className={`badge ${
                            rec.status === 'VALID' || rec.status === 'Active'
                              ? 'badge-ok'
                              : rec.status === 'EXPIRING SOON'
                              ? 'badge-warn'
                              : 'badge-muted'
                          }`}
                        >
                          {rec.status}
                        </span>
                        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {rec.dateAcquired} &rarr; {rec.expiryDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
