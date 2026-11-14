import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import {
  getVehicleImage,
  getVehicleOrCr,
  getVehicleAssetTag,
  getVehicleAuthorizedDrivers
} from '../../data/fleetData';
import {
  X,
  Truck,
  Users,
  Edit3,
  Check,
  CalendarDays
} from 'lucide-react';

// Helper to add N years to a YYYY-MM-DD date string
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

// Helper to calculate number of term years between two dates
const calcYearsTerm = (startDate, endDate, fallback = 3) => {
  if (!startDate || !endDate) return `${fallback} Years`;
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = (e - s) / (1000 * 60 * 60 * 24);
    const years = Math.round(diffDays / 365.25);
    if (years <= 0) return `${fallback} Years`;
    return years === 1 ? '1 Year' : `${years} Years`;
  } catch {
    return `${fallback} Years`;
  }
};

export const VehicleDetailModal = () => {
  const {
    selectedVehicle,
    modalType,
    setModalType,
    branches,
    drivers,
    updateVehicle
  } = useFleet();

  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({});

  useEffect(() => {
    if (selectedVehicle) {
      const specs = selectedVehicle.specs || {};
      const defaultAcq = selectedVehicle.acquisitionDate || `${selectedVehicle.year || 2022}-03-15`;
      const insAcq = selectedVehicle.insuranceAcquiredDate || '2023-10-20';
      const insExp = selectedVehicle.insuranceExpiryDate || addYearsToDate(insAcq, 3);
      const regAcq = selectedVehicle.registrationAcquiredDate || '2023-10-23';
      const regExp = selectedVehicle.registrationExpiryDate || addYearsToDate(regAcq, 3);

      setFormState({
        code: selectedVehicle.code || '',
        plateNo: selectedVehicle.plateNo || '',
        makeModel: selectedVehicle.makeModel || '',
        year: selectedVehicle.year || 2022,
        classification: selectedVehicle.classification || 'Pickup',
        branchId: selectedVehicle.branchId || 'BR-KID',
        acquisitionDate: defaultAcq,
        insuranceAcquiredDate: insAcq,
        insuranceExpiryDate: insExp,
        registrationAcquiredDate: regAcq,
        registrationExpiryDate: regExp,
        transmission: specs.transmission || 'Heavy Duty Manual',
        fuelType: selectedVehicle.fuelType || 'Diesel',
        vin: selectedVehicle.vin || '',
        engineNo: selectedVehicle.engineNo || '',
        orCrNo: getVehicleOrCr(selectedVehicle),
        assetTag: getVehicleAssetTag(selectedVehicle),
        acquisitionCost: selectedVehicle.acquisitionCost || 2100000,
        reach: specs.reach || 'Standard Ground Utility',
        bucketCapacity: specs.bucketCapacity || 'Standard Payload',
        dielectricRating: specs.dielectricRating || 'Standard Commercial'
      });
      setIsEditing(false);
    }
  }, [selectedVehicle, modalType]);

  if (modalType !== 'vehicle-detail' || !selectedVehicle) return null;

  const branch = branches.find(b => b.id === (formState.branchId || selectedVehicle.branchId));
  const vehiclePhoto = getVehicleImage(selectedVehicle);
  const assignedDriver = (drivers || []).find(d => d.assignedVehicleCode === selectedVehicle.code) ||
    (drivers || []).find(d => d.name === selectedVehicle.assignedDriver);

  const statusClass = selectedVehicle.status === 'ACTIVE'
    ? 'badge-success'
    : selectedVehicle.status === 'IN-SHOP'
    ? 'badge-warning'
    : 'badge-danger';

  const handleFieldChange = (key, val) => {
    setFormState(prev => ({ ...prev, [key]: val }));
  };

  const applyTermPreset = (acquiredKey, expiryKey, years) => {
    const startVal = formState[acquiredKey] || new Date().toISOString().substring(0, 10);
    const computedEnd = addYearsToDate(startVal, years);
    setFormState(prev => ({
      ...prev,
      [acquiredKey]: startVal,
      [expiryKey]: computedEnd
    }));
  };

  const handleSave = () => {
    updateVehicle(selectedVehicle.id, {
      code: formState.code,
      plateNo: formState.plateNo,
      makeModel: formState.makeModel,
      year: Number(formState.year) || selectedVehicle.year,
      classification: formState.classification,
      branchId: formState.branchId,
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
        ...(selectedVehicle.specs || {}),
        transmission: formState.transmission,
        reach: formState.reach,
        bucketCapacity: formState.bucketCapacity,
        dielectricRating: formState.dielectricRating
      }
    });
    setIsEditing(false);
  };

  // Highlighted Key Boxes (Important utility, deployment & valuation specs)
  const highlightedBoxes = [
    {
      key: 'branchId',
      label: 'Branch Station',
      type: 'branch-select',
      display: branch?.municipality || 'Central HQ'
    },
    {
      key: 'dielectricRating',
      label: 'Safety / Insulation',
      type: 'text',
      display: formState.dielectricRating
    },
    {
      key: 'bucketCapacity',
      label: 'Payload / Capacity',
      type: 'text',
      display: formState.bucketCapacity
    },
    {
      key: 'reach',
      label: 'Reach / Height',
      type: 'text',
      display: formState.reach
    },
    {
      key: 'acquisitionCost',
      label: 'Acquisition Cost',
      type: 'number',
      display: `₱${Number(formState.acquisitionCost || 0).toLocaleString()} PHP`
    },
    {
      key: 'vin',
      label: 'VIN / Chassis No',
      type: 'text',
      mono: true,
      display: formState.vin
    }
  ];

  // Secondary Technical & Registration Boxes
  const standardBoxes = [
    {
      key: 'engineNo',
      label: 'Engine No',
      type: 'text',
      mono: true,
      display: formState.engineNo
    },
    {
      key: 'transmission',
      label: 'Transmission',
      type: 'text',
      display: formState.transmission
    },
    {
      key: 'fuelType',
      label: 'Fuel / Power',
      type: 'text',
      display: formState.fuelType
    },
    {
      key: 'orCrNo',
      label: 'LTO OR/CR No',
      type: 'text',
      mono: true,
      display: formState.orCrNo
    },
    {
      key: 'assetTag',
      label: 'Asset Tag',
      type: 'text',
      mono: true,
      display: formState.assetTag
    },
    {
      key: 'acquisitionDate',
      label: 'Date Bought',
      type: 'date',
      display: formState.acquisitionDate
    }
  ];

  const getBoxStyle = () => {
    return {
      background: 'var(--bg-surface-subtle)',
      border: '1px solid var(--border-light)',
      borderRadius: '6px',
      padding: '0.65rem 0.85rem'
    };
  };

  const renderBox = (box) => (
    <div
      key={box.key}
      style={{
        ...getBoxStyle(),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.35rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
        <span style={{
          fontSize: '0.66rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--text-tertiary)'
        }}>
          {box.label}
        </span>
      </div>

      {isEditing ? (
        box.type === 'branch-select' ? (
          <select
            className="form-select"
            style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', minHeight: '32px' }}
            value={formState.branchId}
            onChange={(e) => handleFieldChange('branchId', e.target.value)}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.municipality}</option>
            ))}
          </select>
        ) : (
          <input
            type={box.type === 'number' ? 'number' : box.type === 'date' ? 'date' : 'text'}
            className="form-input"
            style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', minHeight: '32px' }}
            value={formState[box.key] ?? ''}
            onChange={(e) => handleFieldChange(box.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        )
      ) : (
        <strong
          className={box.mono ? 'mono' : ''}
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.3,
            wordBreak: 'break-word',
            marginTop: '2px'
          }}
        >
          {box.display || 'N/A'}
        </strong>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with Single Top-Right Edit Button */}
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Truck size={20} color="var(--primary)" />
            <span>Vehicle Profile &bull; {selectedVehicle.code}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                title="Edit vehicle specifications, insurance & registration dates"
              >
                <Edit3 size={14} /> Edit Specs
              </button>
            )}
            <button
              type="button"
              className="modal-box-close"
              onClick={() => setModalType(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-box-body" style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          {/* Top Identity Hero Card */}
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            background: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1rem 1.15rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              width: '140px',
              height: '95px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#E5E7EB',
              border: '1px solid var(--border-medium)'
            }}>
              <img
                src={vehiclePhoto}
                alt={selectedVehicle.makeModel}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedVehicle.code}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  {selectedVehicle.classification}
                </span>
              </div>

              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                {selectedVehicle.makeModel} ({selectedVehicle.year})
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                <span className="mono" style={{ fontWeight: 700 }}>Plate: {selectedVehicle.plateNo}</span>
              </div>

              <button
                type="button"
                onClick={() => setModalType('vehicle-access')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.76rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
                title="View employees with access to this vehicle"
              >
                <Users size={13} color="var(--text-secondary)" />
                <span>Employees with Access: <strong>{getVehicleAuthorizedDrivers(selectedVehicle, drivers).length} Personnel</strong></span>
              </button>
            </div>
          </div>

          {/* Group 1: Insurance & LTO Registration Validity (Synced to Calendar Tab) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.55rem'
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-tertiary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <CalendarDays size={14} color="var(--text-secondary)" /> Insurance &amp; LTO Registration Validity
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '0.75rem'
            }}>
              {/* Box A: Insurance Coverage */}
              <div style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.45rem'
              }}>
                {/* Top Row: Title on Left, Term Years on Top Right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-tertiary)'
                  }}>
                    Insurance Coverage
                  </span>
                  <span className="mono" style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {calcYearsTerm(formState.insuranceAcquiredDate, formState.insuranceExpiryDate, 3)}
                  </span>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          DATE ACQUIRED
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.45rem', minHeight: '30px' }}
                          value={formState.insuranceAcquiredDate || ''}
                          onChange={(e) => handleFieldChange('insuranceAcquiredDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          EXPIRATION DATE
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.45rem', minHeight: '30px' }}
                          value={formState.insuranceExpiryDate || ''}
                          onChange={(e) => handleFieldChange('insuranceExpiryDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Middle / Bottom of Card: Date Acquired & Exp */
                  <div style={{ marginTop: '0.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          DATE ACQUIRED
                        </span>
                        <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                          {formState.insuranceAcquiredDate || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          EXPIRATION DATE
                        </span>
                        <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                          {formState.insuranceExpiryDate || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                      GSIS / Comprehensive Fleet Policy
                    </div>
                  </div>
                )}
              </div>

              {/* Box B: LTO Registration */}
              <div style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.45rem'
              }}>
                {/* Top Row: Title on Left, Term Years on Top Right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-tertiary)'
                  }}>
                    LTO Registration
                  </span>
                  <span className="mono" style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {calcYearsTerm(formState.registrationAcquiredDate, formState.registrationExpiryDate, 3)}
                  </span>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          DATE REGISTERED
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.45rem', minHeight: '30px' }}
                          value={formState.registrationAcquiredDate || ''}
                          onChange={(e) => handleFieldChange('registrationAcquiredDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          EXPIRATION DATE
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.45rem', minHeight: '30px' }}
                          value={formState.registrationExpiryDate || ''}
                          onChange={(e) => handleFieldChange('registrationExpiryDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Middle / Bottom of Card: Date Registered & Exp */
                  <div style={{ marginTop: '0.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          DATE REGISTERED
                        </span>
                        <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                          {formState.registrationAcquiredDate || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          EXPIRATION DATE
                        </span>
                        <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                          {formState.registrationExpiryDate || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                      LTO Official Receipt &bull; OR/CR: {formState.orCrNo}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group 2: Highlighted Priority Specifications (Spaced & Accented) */}
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: '0.65rem'
            }}>
              Key Operational &amp; Safety Highlights
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
              gap: '0.85rem'
            }}>
              {highlightedBoxes.map(renderBox)}
            </div>
          </div>

          {/* Group 3: Technical & Registration Details (Spaced Cleanly Below) */}
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-tertiary)',
              marginBottom: '0.65rem'
            }}>
              Mechanical &amp; Registration Identifiers
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
              gap: '0.85rem'
            }}>
              {standardBoxes.map(renderBox)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-box-footer" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setModalType(null)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
