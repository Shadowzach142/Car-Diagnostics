import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { DEFAULT_VEHICLE_IMAGES } from '../../data/fleetData';
import {
  X,
  Plus,
  Image as ImageIcon,
  Upload,
  Check,
  Building,
  Calendar,
  Receipt,
  ShieldCheck,
  FileText,
  Truck
} from 'lucide-react';

export const AddVehicleModal = () => {
  const {
    modalType,
    setModalType,
    editables = {},
    branches,
    addVehicle
  } = useFleet();

  const vehicleClassifications = editables.vehicleClassifications || [
    'Pickup',
    'Van',
    'Truck',
    'Bucket Truck',
    'Motorcycle',
    'Car / Sedan'
  ];
  const custodianDepartments = editables.departments || [
    'Area',
    'Technical / Engineering',
    'OGM - Office of the General Manager',
    'Institutional Services',
    'Audit Department',
    'Finance',
    'Core Plan',
    'CPRST'
  ];

  const [code, setCode] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [year, setYear] = useState(2024);
  const [classification, setClassification] = useState(vehicleClassifications[0] || 'Pickup');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'BR-KID');
  const [custodianDepartment, setCustodianDepartment] = useState(custodianDepartments[0] || 'Technical / Engineering');
  const [acquisitionDate, setAcquisitionDate] = useState('2024-03-15');
  const [insuranceAcquiredDate, setInsuranceAcquiredDate] = useState('2024-03-15');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('2027-03-15');
  const [registrationAcquiredDate, setRegistrationAcquiredDate] = useState('2024-03-15');
  const [registrationExpiryDate, setRegistrationExpiryDate] = useState('2027-03-15');
  const [cost, setCost] = useState(2100000);
  const [supplier, setSupplier] = useState('');
  const [orCrNo, setOrCrNo] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [vin, setVin] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [warrantyPolicy, setWarrantyPolicy] = useState('3 Years / 100,000 km Fleet Assurance');
  const [image, setImage] = useState(DEFAULT_VEHICLE_IMAGES['Pickup']);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    if (modalType === 'add-vehicle') {
      const defaultClass = vehicleClassifications[0] || 'Pickup';
      setCode('');
      setPlateNo('');
      setMakeModel('');
      setYear(2024);
      setClassification(defaultClass);
      setBranchId(branches[0]?.id || 'BR-KID');
      setCustodianDepartment(custodianDepartments[0] || 'Technical / Engineering');
      setSupplier('');
      setOrCrNo('');
      setAssetTag('');
      setVin('');
      setEngineNo('');
      setFuelType('Diesel');
      setImage(DEFAULT_VEHICLE_IMAGES[defaultClass] || DEFAULT_VEHICLE_IMAGES['Pickup']);
      setImageUrlInput('');
    }
  }, [modalType, vehicleClassifications, branches, custodianDepartments]);

  if (modalType !== 'add-vehicle') return null;

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Change default image when classification changes if no custom image was set
  const handleClassificationChange = (newClass) => {
    setClassification(newClass);
    if (!image || Object.values(DEFAULT_VEHICLE_IMAGES).includes(image)) {
      setImage(DEFAULT_VEHICLE_IMAGES[newClass] || DEFAULT_VEHICLE_IMAGES.default);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const newVeh = addVehicle({
      code: cleanCode,
      plateNo: plateNo.trim().toUpperCase(),
      makeModel: makeModel.trim(),
      year: Number(year),
      classification,
      branchId,
      ownershipType: 'COTELCO Company Fleet (Pool Asset)',
      custodianDepartment: custodianDepartment || 'Operations & Maintenance Motor Pool',
      acquisitionDate: acquisitionDate || new Date().toISOString().substring(0, 10),
      insuranceAcquiredDate: insuranceAcquiredDate || acquisitionDate || '2024-03-15',
      insuranceExpiryDate: insuranceExpiryDate || '2027-03-15',
      registrationAcquiredDate: registrationAcquiredDate || acquisitionDate || '2024-03-15',
      registrationExpiryDate: registrationExpiryDate || '2027-03-15',
      acquisitionCost: Number(cost) || 2100000,
      supplier: supplier.trim() || 'Authorized Automotive Dealer',
      orCrNo: orCrNo.trim() || `CR-${Math.floor(100000 + Math.random() * 900000)}-A`,
      assetTag: assetTag.trim() || `COTELCO-FA-${cleanCode}`,
      warrantyPolicy: warrantyPolicy.trim() || '3 Years / 100,000 km Fleet Assurance',
      vin: vin.trim() || `VIN-${year}-${Math.floor(100000 + Math.random() * 900000)}`,
      engineNo: engineNo.trim() || `ENG-${Math.floor(10000 + Math.random() * 90000)}`,
      fuelType: fuelType || 'Diesel',
      image: image || DEFAULT_VEHICLE_IMAGES[classification] || DEFAULT_VEHICLE_IMAGES.default,
      statusReason: 'Newly commissioned utility asset. Cleared intake safety check.',
      odometerKm: 250,
      operatingHours: 15
    });

    if (newVeh) {
      setModalType(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Plus size={20} color="#D4ED31" />
            <span>Register Company Vehicle</span>
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
          <div className="modal-box-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Notice banner clarifying company fleet pool status */}
            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.15rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)'
            }}>
              <ShieldCheck size={18} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>
                <strong>COTELCO Company Fleet Asset:</strong> Vehicles are shared utility pool resources assigned to a branch motor pool. Linemen and drivers are dispatched dynamically per work order or trip schedule.
              </span>
            </div>

            {/* 1. Vehicle Photo Upload / Preset Section */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={15} /> Vehicle Photo:
              </label>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Photo Preview Box */}
                <div style={{
                  width: '120px',
                  height: '80px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  background: 'var(--bg-hover)',
                  border: '1.5px solid var(--border-medium)',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {image ? (
                    <img
                      src={image}
                      alt="Vehicle preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>

                {/* Upload & URL Controls */}
                <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} /> Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {image && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setImage('')}
                        style={{ color: 'var(--bad-text)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    className="form-input"
                    style={{ minHeight: '34px', fontSize: '0.8rem' }}
                    placeholder="Or paste image web link..."
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      if (e.target.value) setImage(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section Divider: Basic Specifications */}
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.35rem',
              marginBottom: '0.85rem'
            }}>
              1. Basic Identity &amp; Classification
            </div>

            {/* Core Specs Grid */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Fleet Code: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. FLT-PU-07"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Plate Number: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NDI-7788"
                  value={plateNo}
                  onChange={(e) => setPlateNo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Make &amp; Model: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Toyota Hilux 4x4 Single Cab"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Year: *</label>
                <input
                  type="number"
                  className="form-input"
                  min="2010"
                  max="2027"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Classification: *</label>
                <select
                  className="form-select"
                  value={classification}
                  onChange={(e) => handleClassificationChange(e.target.value)}
                  required
                >
                  {vehicleClassifications.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Branch Station: *</label>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Divider: Acquisition & Purchase Record */}
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.35rem',
              marginBottom: '0.85rem'
            }}>
              2. Acquisition &amp; Commercial Purchase Record
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={13} /> Date Bought / Acquired: *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Receipt size={13} /> Purchase Cost (₱ PHP): *
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="50000"
                  step="25000"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Supplier / Dealership / Vendor:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Toyota Davao City Inc. / Isuzu Cotabato"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LTO Official Receipt / CR No.:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CR-992104-A"
                  value={orCrNo}
                  onChange={(e) => setOrCrNo(e.target.value)}
                />
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">COTELCO Property / Asset Tag No.:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. COTELCO-FA-2024-055"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Warranty / Policy Coverage:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 3 Years / 100,000 km Fleet Assurance"
                  value={warrantyPolicy}
                  onChange={(e) => setWarrantyPolicy(e.target.value)}
                />
              </div>
            </div>

            {/* Insurance & LTO Registration Validity (3-Year Default Calendar Inputs) */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Insurance Date Acquired:</label>
                <input
                  type="date"
                  className="form-input"
                  value={insuranceAcquiredDate}
                  onChange={(e) => setInsuranceAcquiredDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Insurance Date of Expiration:</label>
                <input
                  type="date"
                  className="form-input"
                  value={insuranceExpiryDate}
                  onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">LTO Registration Acquired:</label>
                <input
                  type="date"
                  className="form-input"
                  value={registrationAcquiredDate}
                  onChange={(e) => setRegistrationAcquiredDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">LTO Registration Expiration:</label>
                <input
                  type="date"
                  className="form-input"
                  value={registrationExpiryDate}
                  onChange={(e) => setRegistrationExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Section Divider: Engineering & Custody Pool */}
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.35rem',
              marginBottom: '0.85rem'
            }}>
              3. Engineering Specs &amp; Motor Pool Placement
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Custodian Department / Pool:</label>
                <select
                  className="form-select"
                  value={custodianDepartment}
                  onChange={(e) => setCustodianDepartment(e.target.value)}
                >
                  {custodianDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Type:</label>
                <select
                  className="form-select"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                >
                  <option value="Diesel">Diesel (Euro 4 / Euro 5)</option>
                  <option value="Gasoline">Gasoline (Unleaded)</option>
                  <option value="Electric">Electric / EV</option>
                  <option value="Hybrid">Diesel/Electric Hybrid</option>
                </select>
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Chassis / VIN Number:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. JALFTR34K-7001842"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Engine Serial Number:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 6HK1-592811"
                  value={engineNo}
                  onChange={(e) => setEngineNo(e.target.value)}
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
              <Check size={16} /> Register Company Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
