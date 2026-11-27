import React, { useState, useEffect, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage, getEmployeeVehiclesWithAccess } from '../../data/fleetData';
import {
  X,
  User,
  Building,
  Phone,
  Plus,
  Check,
  Edit2,
  FolderArchive,
  ChevronRight,
  ArrowLeft,
  Calendar,
  CreditCard
} from 'lucide-react';

const getLicenseValidity = (expiryStr) => {
  if (!expiryStr) return { label: 'VALID', tone: 'valid', diffDays: 365 };
  const exp = new Date(expiryStr);
  if (isNaN(exp)) return { label: 'VALID', tone: 'valid', diffDays: 365 };
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'EXPIRED', tone: 'expired', diffDays };
  if (diffDays <= 90) return { label: 'EXPIRING SOON', tone: 'expiring', diffDays };
  return { label: 'VALID', tone: 'valid', diffDays };
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatArchiveMonthLabel = (ym) => {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return 'Archived Records';
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return `Month of ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
};

export const DriverDetailModal = () => {
  const {
    modalType,
    setModalType,
    selectedDriver,
    vehicles = [],
    branches = [],
    bookings = [],
    repairArchive = [],
    revokeVehicleAccess,
    updateDriver
  } = useFleet();

  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const [licenseForm, setLicenseForm] = useState({
    licenseNo: '',
    licenseType: 'Professional (RC 1, 2)',
    licenseAcquiredDate: '',
    licenseExpiry: ''
  });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'archive'
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState(null);
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  useEffect(() => {
    setIsEditingAccess(false);
    setIsEditingLicense(false);
    setActiveTab('overview');
    setSelectedArchiveMonth(null);
    if (selectedDriver) {
      setLicenseForm({
        licenseNo: selectedDriver.licenseNo || 'L02-22-000000',
        licenseType: selectedDriver.licenseType || 'Professional (RC 1, 2)',
        licenseAcquiredDate: selectedDriver.licenseAcquiredDate || '2022-08-15',
        licenseExpiry: selectedDriver.licenseExpiry || '2027-08-15'
      });
    }
  }, [modalType, selectedDriver?.id]);

  const employeeReports = useMemo(() => {
    if (!selectedDriver) return [];
    const empNameNorm = (selectedDriver.name || '').trim().toLowerCase();
    return (repairArchive || [])
      .filter(r => (r.mechanic || '').split(' (')[0].trim().toLowerCase() === empNameNorm)
      .map(r => ({
        id: `REP-${r.voucherNo || r.id}`,
        date: r.date || '',
        title: `${r.vehicleCode ? `${r.vehicleCode} • ` : ''}${r.serviceType || 'Maintenance Report'}`,
        sub: r.serviceSummary || r.facility || 'Central Motorpool Report',
        badge: 'REPORT',
        tone: 'badge-ok'
      }))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [selectedDriver, repairArchive]);

  const employeeDriverHistory = useMemo(() => {
    if (!selectedDriver) return [];
    const empNameNorm = (selectedDriver.name || '').trim().toLowerCase();
    return (bookings || [])
      .filter(b => (b.driver || '').trim().toLowerCase() === empNameNorm)
      .map(b => ({
        id: `BK-${b.id}`,
        date: b.date || '',
        title: b.title || 'Field Dispatch',
        sub: `${b.vehicleCode ? `${b.vehicleCode} • ` : ''}${b.startTime || '08:00'}-${b.endTime || '17:00'} • ${b.destination || 'Field Grid'}`,
        badge: b.type || 'DISPATCH',
        tone: b.type === 'MAINTENANCE' ? 'badge-warning' : 'badge-muted'
      }))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [selectedDriver, bookings]);

  const currentMonthReports = useMemo(
    () => employeeReports.filter(r => String(r.date || '').slice(0, 7) === currentMonthKey),
    [employeeReports, currentMonthKey]
  );

  const currentMonthDriverHistory = useMemo(
    () => employeeDriverHistory.filter(r => String(r.date || '').slice(0, 7) === currentMonthKey),
    [employeeDriverHistory, currentMonthKey]
  );

  const archiveMonthGroups = useMemo(() => {
    const map = new Map();
    const ensureGroup = (ym) => {
      const key = /^\d{4}-\d{2}$/.test(ym) ? ym : 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          label: formatArchiveMonthLabel(key),
          reports: [],
          driverHistory: []
        });
      }
      return map.get(key);
    };

    employeeReports.forEach(r => {
      const ym = String(r.date || '').slice(0, 7);
      ensureGroup(ym).reports.push(r);
    });

    employeeDriverHistory.forEach(h => {
      const ym = String(h.date || '').slice(0, 7);
      ensureGroup(ym).driverHistory.push(h);
    });

    return Array.from(map.values())
      .map(g => ({
        ...g,
        totalCount: g.reports.length + g.driverHistory.length
      }))
      .sort((a, b) => String(b.monthKey).localeCompare(String(a.monthKey)));
  }, [employeeReports, employeeDriverHistory]);

  const activeArchiveGroup = useMemo(
    () => archiveMonthGroups.find(g => g.monthKey === selectedArchiveMonth) || null,
    [archiveMonthGroups, selectedArchiveMonth]
  );

  if (modalType !== 'driver-detail' || !selectedDriver) return null;

  const branch = branches.find(b => b.id === selectedDriver.branchId);
  const clearedVehicles = getEmployeeVehiclesWithAccess(selectedDriver, vehicles);
  const clearedCodes = new Set(clearedVehicles.map(v => v.code));
  const unclearedVehicles = vehicles.filter(v => !clearedCodes.has(v.code));
  const initials = selectedDriver.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleRevokeAccess = (vehicle) => {
    revokeVehicleAccess(vehicle.id, selectedDriver.id);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-box-header">
          <div className="modal-box-title">
            <User size={18} color="var(--primary)" />
            <span>Employee Profile &bull; {selectedDriver.name}</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-box-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
          {/* Driver Identity Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {selectedDriver.name}
              </h3>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span className="mono">{selectedDriver.employeeId}</span> &bull; {selectedDriver.title || selectedDriver.role}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {selectedDriver.department || 'Technical / Engineering'} &bull; {selectedDriver.category}
              </div>
            </div>
          </div>

          {/* 2-Tab Segmented Bar: Overview & This Month vs Archive */}
          <div
            role="tablist"
            aria-label="Employee profile tabs"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4px',
              background: 'var(--bg-surface-subtle)',
              padding: '4px',
              borderRadius: '9px',
              border: '1px solid var(--border-light)',
              marginBottom: '1rem'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => {
                setActiveTab('overview');
                setSelectedArchiveMonth(null);
              }}
              style={{
                height: '33px',
                borderRadius: '6px',
                border: activeTab === 'overview' ? '1px solid var(--border-light)' : '1px solid transparent',
                background: activeTab === 'overview' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'overview' ? 'var(--text-main)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'overview' ? 700 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Overview &amp; This Month
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'archive'}
              onClick={() => setActiveTab('archive')}
              style={{
                height: '33px',
                borderRadius: '6px',
                border: activeTab === 'archive' ? '1px solid var(--border-light)' : '1px solid transparent',
                background: activeTab === 'archive' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'archive' ? 'var(--text-main)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'archive' ? 700 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Archive ({archiveMonthGroups.length})
            </button>
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* Station & Contact Phone (Subtle 2-Box Info Grid matching Car Profiling) */}
              <div className="responsive-grid-2" style={{
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Building size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> STATION
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                    {branch?.municipality || 'Central HQ'}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {branch?.code || 'Central Station'}
                  </span>
                </div>

                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Phone size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> CONTACT PHONE
                  </span>
                  <span className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                    {selectedDriver.phone || '0919-550-2211'}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    COTELCO Radio / SMS Dispatch
                  </span>
                </div>
              </div>

              {/* Driver's License Tracking & Expiry Monitoring Card */}
              {(() => {
                const licState = getLicenseValidity(
                  isEditingLicense ? licenseForm.licenseExpiry : selectedDriver.licenseExpiry
                );
                const badgeStyle =
                  licState.tone === 'expired'
                    ? { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' }
                    : licState.tone === 'expiring'
                    ? { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' }
                    : { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' };

                return (
                  <div
                    style={{
                      marginBottom: '1rem',
                      background:
                        licState.tone === 'expired'
                          ? '#FEF2F2'
                          : licState.tone === 'expiring'
                          ? '#FFFBEB'
                          : 'var(--bg-surface-subtle)',
                      border:
                        licState.tone === 'expired'
                          ? '1.5px solid #FCA5A5'
                          : licState.tone === 'expiring'
                          ? '1.5px solid #FDE68A'
                          : '1px solid var(--border-light)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CreditCard size={13} /> DRIVER&apos;S LICENSE &amp; EXPIRY MONITORING
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.15rem 0.48rem',
                            borderRadius: '5px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            background: badgeStyle.bg,
                            border: `1px solid ${badgeStyle.border}`,
                            color: badgeStyle.color
                          }}
                        >
                          {licState.label}
                        </span>
                      </div>

                      {!isEditingLicense ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--bg-surface)' }}
                          onClick={() => setIsEditingLicense(true)}
                        >
                          <Edit2 size={12} /> Update / Renew License
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--bg-surface)' }}
                            onClick={() => {
                              setIsEditingLicense(false);
                              setLicenseForm({
                                licenseNo: selectedDriver.licenseNo || 'L02-22-000000',
                                licenseType: selectedDriver.licenseType || 'Professional (RC 1, 2)',
                                licenseAcquiredDate: selectedDriver.licenseAcquiredDate || '2022-08-15',
                                licenseExpiry: selectedDriver.licenseExpiry || '2027-08-15'
                              });
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                            onClick={() => {
                              updateDriver(selectedDriver.id, {
                                licenseNo: licenseForm.licenseNo.trim() || selectedDriver.licenseNo,
                                licenseType: licenseForm.licenseType.trim() || selectedDriver.licenseType,
                                licenseAcquiredDate: licenseForm.licenseAcquiredDate,
                                licenseExpiry: licenseForm.licenseExpiry
                              });
                              setIsEditingLicense(false);
                            }}
                          >
                            <Check size={12} /> Save Renewal
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingLicense ? (
                      <div className="responsive-grid-2" style={{ gap: '0.55rem', marginTop: '0.35rem' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            License No.
                          </span>
                          <input
                            type="text"
                            className="form-input mono"
                            style={{ fontSize: '0.8rem', padding: '0.28rem 0.5rem', background: 'var(--bg-surface)' }}
                            value={licenseForm.licenseNo}
                            onChange={(e) => setLicenseForm(prev => ({ ...prev, licenseNo: e.target.value }))}
                          />
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            License Type / DL Codes
                          </span>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: '0.8rem', padding: '0.28rem 0.5rem', background: 'var(--bg-surface)' }}
                            value={licenseForm.licenseType}
                            onChange={(e) => setLicenseForm(prev => ({ ...prev, licenseType: e.target.value }))}
                          />
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Date Issued / Renewed
                          </span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.8rem', padding: '0.28rem 0.5rem', background: 'var(--bg-surface)' }}
                            value={licenseForm.licenseAcquiredDate}
                            onChange={(e) => setLicenseForm(prev => ({ ...prev, licenseAcquiredDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Expiry Date
                          </span>
                          <input
                            type="date"
                            className="form-input mono"
                            style={{ fontSize: '0.8rem', padding: '0.28rem 0.5rem', background: 'var(--bg-surface)' }}
                            value={licenseForm.licenseExpiry}
                            onChange={(e) => setLicenseForm(prev => ({ ...prev, licenseExpiry: e.target.value }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div className="mono" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {selectedDriver.licenseNo || 'L02-22-000000'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {selectedDriver.licenseType || 'Professional (RC 1, 2)'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: licState.tone === 'expired' ? '#DC2626' : licState.tone === 'expiring' ? '#B45309' : 'var(--text-main)' }}>
                            Issued: {selectedDriver.licenseAcquiredDate || '2022-08-15'} &bull; Exp: {selectedDriver.licenseExpiry || '2027-08-15'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {licState.tone === 'expired'
                              ? `Expired ${Math.abs(licState.diffDays)} days ago — renewal required`
                              : licState.tone === 'expiring'
                              ? `Expires in ${licState.diffDays} days — schedule renewal`
                              : `Valid (${licState.diffDays} days remaining)`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Vehicles with Access (Head Access Control: Add & Remove) */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Vehicles with Access ({clearedVehicles.length})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {clearedVehicles.length > 0 && (
                      <button
                        type="button"
                        className={`btn btn-xs ${isEditingAccess ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setIsEditingAccess(!isEditingAccess)}
                      >
                        {isEditingAccess ? <Check size={12} /> : <Edit2 size={12} />}
                        <span>{isEditingAccess ? 'Done' : 'Edit'}</span>
                      </button>
                    )}
                    {!isEditingAccess && unclearedVehicles.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setModalType('employee-access')}
                        title="Open vehicle access control manager"
                      >
                        <Plus size={12} /> Grant Access
                      </button>
                    )}
                  </div>
                </div>

                {clearedVehicles.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                    No vehicles currently cleared for this employee.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {clearedVehicles.map(veh => (
                      <div
                        key={veh.code}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                          <img
                            src={getVehicleImage(veh)}
                            alt={veh.code}
                            style={{
                              width: '44px',
                              height: '32px',
                              borderRadius: '4px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-medium)',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                              {veh.code} <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {veh.plateNo}</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {veh.makeModel} &bull; {veh.classification}
                            </div>
                          </div>
                        </div>

                        {isEditingAccess && (
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            style={{
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.5rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              flexShrink: 0
                            }}
                            onClick={() => handleRevokeAccess(veh)}
                            title={`Revoke access to ${veh.code} for ${selectedDriver.name}`}
                          >
                            <X size={12} /> Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1. Separate Recent Reports (Current Month) */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recent Reports &bull; {formatArchiveMonthLabel(currentMonthKey)} ({currentMonthReports.length})
                  </span>
                </div>
                {currentMonthReports.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.8rem'
                  }}>
                    No reports submitted in {formatArchiveMonthLabel(currentMonthKey)}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {currentMonthReports.map(rec => (
                      <div
                        key={rec.id}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{rec.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {rec.date} &bull; {rec.sub}
                          </div>
                        </div>
                        <span className={`badge ${rec.tone}`} style={{ fontSize: '0.66rem', flexShrink: 0 }}>
                          {rec.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Separate Driver & Dispatch History (Current Month) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Driver &amp; Dispatch History &bull; {formatArchiveMonthLabel(currentMonthKey)} ({currentMonthDriverHistory.length})
                  </span>
                </div>
                {currentMonthDriverHistory.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.8rem'
                  }}>
                    No driver dispatch logs in {formatArchiveMonthLabel(currentMonthKey)}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {currentMonthDriverHistory.map(rec => (
                      <div
                        key={rec.id}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{rec.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {rec.date} &bull; {rec.sub}
                          </div>
                        </div>
                        <span className={`badge ${rec.tone}`} style={{ fontSize: '0.66rem', flexShrink: 0 }}>
                          {rec.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : !activeArchiveGroup ? (
            <div>
              <div style={{ marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                  Monthly Reports &amp; Driver History Archive ({archiveMonthGroups.length} Months)
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Categorized by month. Click a monthly folder to view separated reports and driver history.
                </span>
              </div>

              {archiveMonthGroups.length === 0 ? (
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.82rem'
                }}>
                  No archived reports or history found for this employee.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
                  gap: '0.65rem'
                }}>
                  {archiveMonthGroups.map(group => (
                    <button
                      key={group.monthKey}
                      type="button"
                      onClick={() => setSelectedArchiveMonth(group.monthKey)}
                      style={{
                        textAlign: 'left',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '10px',
                        padding: '0.8rem 0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FolderArchive size={16} color="var(--text-main)" />
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {group.label}
                          </span>
                        </div>
                        <ChevronRight size={15} color="var(--text-tertiary)" />
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {group.reports.length} Report{group.reports.length === 1 ? '' : 's'} &bull;{' '}
                        {group.driverHistory.length} Driver History
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.75rem',
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => setSelectedArchiveMonth(null)}
                  >
                    <ArrowLeft size={12} /> All Months
                  </button>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                      {activeArchiveGroup.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {activeArchiveGroup.reports.length} Report{activeArchiveGroup.reports.length === 1 ? '' : 's'} &bull;{' '}
                      {activeArchiveGroup.driverHistory.length} Driver History
                    </div>
                  </div>
                </div>
              </div>

              {/* Separate Section 1: Archived Reports */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                  Reports ({activeArchiveGroup.reports.length})
                </span>
                {activeArchiveGroup.reports.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', padding: '0.35rem 0' }}>
                    No reports submitted in {activeArchiveGroup.label}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeArchiveGroup.reports.map(rec => (
                      <div
                        key={rec.id}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.55rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{rec.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {rec.date} &bull; {rec.sub}
                          </div>
                        </div>
                        <span className={`badge ${rec.tone}`} style={{ fontSize: '0.66rem', flexShrink: 0 }}>
                          {rec.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Separate Section 2: Archived Driver & Dispatch History */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                  Driver &amp; Dispatch History ({activeArchiveGroup.driverHistory.length})
                </span>
                {activeArchiveGroup.driverHistory.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', padding: '0.35rem 0' }}>
                    No driver history in {activeArchiveGroup.label}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeArchiveGroup.driverHistory.map(rec => (
                      <div
                        key={rec.id}
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.55rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{rec.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {rec.date} &bull; {rec.sub}
                          </div>
                        </div>
                        <span className={`badge ${rec.tone}`} style={{ fontSize: '0.66rem', flexShrink: 0 }}>
                          {rec.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
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
