import React, { useState, useMemo, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { getEmployeeVehiclesWithAccess } from '../data/fleetData';
import {
  Users,
  Plus,
  RotateCcw,
  LayoutGrid,
  List,
  Truck,
  MapPin,
  Phone,
  Eye,
  Building2,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  AlertTriangle
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

const LicenseValidityBadge = ({ state }) => {
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
        padding: '0.14rem 0.45rem',
        borderRadius: '5px',
        fontSize: '0.64rem',
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

export const DriverRoster = () => {
  const {
    editables = {},
    drivers = [],
    vehicles = [],
    branches = [],
    globalSearch,
    setModalType,
    setSelectedDriver,
    addEditableItem,
    focusedTabPulse,
    setFocusedTabPulse
  } = useFleet();

  const departments = editables.departments || [
    'Area',
    'Technical / Engineering',
    'OGM - Office of the General Manager',
    'Institutional Services',
    'Audit Department',
    'Finance',
    'Core Plan',
    'CPRST'
  ];
  const employeeClassifications = editables.employeeClassifications || [
    'Heavy Equipment',
    'Light Commercial',
    'Passenger / Emergency',
    'Patrol Motorcycle'
  ];

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [deptError, setDeptError] = useState('');

  useEffect(() => {
    if (focusedTabPulse !== 'drivers') return;
    setDepartmentFilter('ALL');
    setViewMode('cards');
    const clearTimer = setTimeout(() => {
      setFocusedTabPulse(null);
    }, 2400);
    return () => clearTimeout(clearTimer);
  }, [focusedTabPulse, setFocusedTabPulse]);

  // Filter logic
  const filteredDrivers = useMemo(() => {
    let list = drivers;

    if (branchFilter !== 'ALL') {
      list = list.filter(d => d.branchId === branchFilter);
    }

    if (departmentFilter !== 'ALL') {
      list = list.filter(d => (d.department || 'Technical / Engineering') === departmentFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter(d => d.category === categoryFilter);
    }

    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return list;

    return list.filter(d => {
      const cleared = getEmployeeVehiclesWithAccess(d, vehicles);
      const searchFields = [
        d.name,
        d.employeeId,
        d.title,
        d.role,
        d.department,
        d.category,
        d.licenseNo,
        d.phone,
        ...cleared.flatMap(v => [v.code, v.plateNo, v.makeModel])
      ];
      return searchFields.some(f => String(f || '').toLowerCase().includes(q));
    });
  }, [drivers, vehicles, branchFilter, departmentFilter, categoryFilter, globalSearch]);

  const resetFilters = () => {
    setBranchFilter('ALL');
    setDepartmentFilter('ALL');
    setCategoryFilter('ALL');
  };

  const hasActiveFilters = branchFilter !== 'ALL' || departmentFilter !== 'ALL' || categoryFilter !== 'ALL';

  const departmentGroups = useMemo(() => {
    const knownDepts = departmentFilter !== 'ALL' ? [departmentFilter] : [...departments];
    const extraDepts = [];

    filteredDrivers.forEach((d) => {
      const dept = d.department || 'Technical / Engineering';
      if (!knownDepts.includes(dept) && !extraDepts.includes(dept)) {
        extraDepts.push(dept);
      }
    });

    const orderedDepts = [...knownDepts, ...extraDepts];
    const isFilteredByOther = branchFilter !== 'ALL' || categoryFilter !== 'ALL' || Boolean((globalSearch || '').trim());

    return orderedDepts
      .map((deptName) => ({
        name: deptName,
        members: filteredDrivers.filter(
          (d) => (d.department || 'Technical / Engineering') === deptName
        )
      }))
      .filter((group) => (isFilteredByOther ? group.members.length > 0 : true));
  }, [departments, filteredDrivers, departmentFilter, branchFilter, categoryFilter, globalSearch]);

  const handleCreateDepartment = (e) => {
    e.preventDefault();
    const trimmed = newDepartmentName.trim();
    if (!trimmed) {
      setDeptError('Enter a department name.');
      return;
    }
    if (departments.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      setDeptError('That department already exists.');
      return;
    }
    const ok = addEditableItem('departments', trimmed);
    if (ok) {
      setNewDepartmentName('');
      setDeptError('');
      setAddingDepartment(false);
    } else {
      setDeptError('Unable to add department.');
    }
  };

  return (
    <div className="page">
      {/* Zone 2: Page Toolbar */}
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter branch station"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.municipality}</option>
          ))}
        </select>

        <select
          className="form-select toolbar-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          aria-label="Filter department"
        >
          <option value="ALL">All departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select
          className="form-select toolbar-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter employee category"
        >
          <option value="ALL">All classifications</option>
          {employeeClassifications.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button type="button" className="btn btn-sm btn-outline" onClick={resetFilters}>
            <RotateCcw size={14} /> Reset
          </button>
        )}

        {globalSearch && (
          <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
            Search: &ldquo;{globalSearch}&rdquo;
          </span>
        )}

        <span className="spacer" />

        <span className="stat-chip">Employees <strong>{filteredDrivers.length}</strong></span>

        <div className="segmented no-print" role="group" aria-label="View toggle">
          <button
            type="button"
            className={viewMode === 'cards' ? 'active' : ''}
            onClick={() => setViewMode('cards')}
            title="Card grid view"
            aria-label="Card grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
            title="Table list view"
            aria-label="Table list view"
          >
            <List size={15} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary no-print"
          onClick={() => setModalType('add-driver')}
          title="Register new employee or certified operator"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Zone 3: Page Body */}
      <div className="page-body">
        {viewMode === 'cards' ? (
          departmentFilter === 'ALL' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
              gap: '1rem'
            }}>
              {departmentGroups.map((group) => {
                const expiredInDept = group.members.filter(m => getLicenseValidity(m.licenseExpiry).tone === 'expired').length;
                const expiringInDept = group.members.filter(m => getLicenseValidity(m.licenseExpiry).tone === 'expiring').length;
                const alertCount = expiredInDept + expiringInDept;

                return (
                <button
                  key={group.name}
                  type="button"
                  className={`data-card ${focusedTabPulse === 'drivers' ? 'health-focus-pulse' : ''}`}
                  onClick={() => setDepartmentFilter(group.name)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: alertCount > 0 ? '1.5px solid #FCA5A5' : '1px solid var(--border-light)',
                    borderRadius: '14px',
                    padding: '1.2rem',
                    minHeight: '148px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.16s ease, box-shadow 0.16s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: alertCount > 0 ? '#FEF2F2' : 'var(--bg-surface-subtle)',
                      border: alertCount > 0 ? '1px solid #FECACA' : '1px solid var(--border-light)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: alertCount > 0 ? '#DC2626' : 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      <Building2 size={17} />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {alertCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.16rem 0.5rem',
                          borderRadius: '999px',
                          background: '#DC2626',
                          color: '#FFFFFF',
                          fontSize: '0.66rem',
                          fontWeight: 800
                        }}>
                          <AlertTriangle size={11} /> {alertCount} License {alertCount === 1 ? 'Alert' : 'Alerts'}
                        </span>
                      )}
                      <ChevronRight size={17} color="var(--text-tertiary)" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25 }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {group.members.length} {group.members.length === 1 ? 'Employee' : 'Employees'}
                    </div>
                  </div>
                </button>
                );
              })}

              {/* Empty Box at the end: Add department */}
              <div
                className="no-print"
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1.5px dashed var(--border-medium)',
                  borderRadius: '14px',
                  minHeight: '148px',
                  padding: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {addingDepartment ? (
                  <form
                    onSubmit={handleCreateDepartment}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Department name..."
                      value={newDepartmentName}
                      onChange={(e) => {
                        setNewDepartmentName(e.target.value);
                        if (deptError) setDeptError('');
                      }}
                      autoFocus
                      style={{ minHeight: '38px', background: 'var(--bg-surface)' }}
                    />
                    {deptError && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--bad-text)', fontWeight: 600 }}>
                        {deptError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        <Plus size={14} /> Add
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setAddingDepartment(false);
                          setNewDepartmentName('');
                          setDeptError('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingDepartment(true);
                      setDeptError('');
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={20} />
                    <span>Add department</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <section
              aria-label={`${departmentFilter} department`}
              style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.1rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', minWidth: 0 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setDepartmentFilter('ALL')}
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    <ArrowLeft size={14} /> All departments
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <Building2 size={16} color="var(--text-secondary)" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {departmentFilter}
                    </h2>
                  </div>
                </div>

                <span className="stat-chip">
                  {filteredDrivers.length} {filteredDrivers.length === 1 ? 'Employee' : 'Employees'}
                </span>
              </div>

              {filteredDrivers.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '2.5rem 1rem' }}>
                  <Users size={34} color="var(--text-tertiary)" style={{ marginBottom: '0.65rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '0.2rem' }}>No employees in this department</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    Add an employee or adjust your branch/classification filters.
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                  gap: '1rem'
                }}>
                  {filteredDrivers.map(d => {
                    const clearedVehicles = getEmployeeVehiclesWithAccess(d, vehicles);
                    const branch = branches.find(b => b.id === d.branchId);
                    const licState = getLicenseValidity(d.licenseExpiry);
                    const hasLicenseAlert = licState.tone === 'expired' || licState.tone === 'expiring';
                    const initials = d.name
                      .replace(/^Engr\.\s+/i, '')
                      .split(' ')
                      .filter(Boolean)
                      .map(w => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div
                        key={d.id}
                        className="data-card"
                        style={{
                          background: 'var(--bg-surface)',
                          border: hasLicenseAlert ? '1.5px solid #FCA5A5' : '1px solid var(--border-light)',
                          borderRadius: '14px',
                          padding: '1.2rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div>
                          {/* Top Row: Avatar + Name + Title + ID Pill + Dept */}
                          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.95rem' }}>
                            <div style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '12px',
                              background: '#1E293B',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.02rem',
                              letterSpacing: '0.03em',
                              flexShrink: 0
                            }}>
                              {initials}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                  {d.name}
                                </strong>
                              </div>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--text-secondary)',
                                  marginTop: '3px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={d.title || d.role}
                              >
                                {d.title || d.role}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '5px' }}>
                                <span
                                  className="mono"
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: 'var(--text-main)',
                                    background: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '5px',
                                    padding: '1px 7px'
                                  }}
                                >
                                  {d.employeeId}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '5px',
                                    padding: '1px 6px'
                                  }}
                                >
                                  {d.department || 'Technical / Engineering'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Vehicles with Access Chips Row */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriver(d);
                              setModalType('employee-access');
                            }}
                            title={`Manage vehicle access clearances for ${d.name}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              flexWrap: 'wrap',
                              background: 'transparent',
                              border: 'none',
                              padding: '0.15rem 0',
                              marginBottom: '0.9rem',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            {clearedVehicles.length > 0 ? (
                              <>
                                {clearedVehicles.slice(0, 2).map(v => (
                                  <span
                                    key={v.id}
                                    className="mono"
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: 'var(--text-main)',
                                      background: 'var(--bg-surface-subtle)',
                                      border: '1px solid var(--border-light)',
                                      borderRadius: '999px',
                                      padding: '2px 8px'
                                    }}
                                  >
                                    {v.code}
                                  </span>
                                ))}
                                {clearedVehicles.length > 2 && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      color: 'var(--text-secondary)',
                                      background: 'var(--bg-surface-subtle)',
                                      border: '1px solid var(--border-light)',
                                      borderRadius: '999px',
                                      padding: '2px 7px'
                                    }}
                                  >
                                    +{clearedVehicles.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: 'var(--bg-surface-subtle)',
                                  border: '1px dashed var(--border-medium)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--text-tertiary)'
                                }}
                              >
                                +
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.67rem',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                color: 'var(--text-tertiary)'
                              }}
                            >
                              VEHICLES WITH ACCESS ({clearedVehicles.length})
                            </span>
                          </button>

                          {/* Clean Icon-Led Info Rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.95rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                              <MapPin size={14} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  STATION
                                </div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {branch?.municipality ? `${branch.municipality} District` : 'Central HQ'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                              <Phone size={14} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  CONTACT PHONE
                                </div>
                                <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {d.phone || '0919-550-2211'}
                                </div>
                              </div>
                            </div>

                            {/* Driver's License & Expiry Monitoring Box */}
                            <div
                              style={{
                                marginTop: '0.2rem',
                                padding: '0.58rem 0.72rem',
                                borderRadius: '9px',
                                background:
                                  licState.tone === 'expired'
                                    ? '#FEF2F2'
                                    : licState.tone === 'expiring'
                                    ? '#FFFBEB'
                                    : 'var(--bg-surface-subtle)',
                                border:
                                  licState.tone === 'expired'
                                    ? '1px solid #FECACA'
                                    : licState.tone === 'expiring'
                                    ? '1px solid #FDE68A'
                                    : '1px solid var(--border-light)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.32rem', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  <CreditCard size={12} /> DRIVER&apos;S LICENSE
                                </span>
                                <LicenseValidityBadge state={licState} />
                              </div>
                              <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {d.licenseNo || 'L02-22-000000'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                <span>{d.licenseType || 'Professional (RC 1, 2)'}</span>
                                <span className="mono" style={{ fontWeight: 700, color: licState.tone === 'expired' ? '#DC2626' : licState.tone === 'expiring' ? '#B45309' : 'var(--text-main)' }}>
                                  Exp: {d.licenseExpiry || '2027-08-15'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: 2-Button Equal Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                          gap: '0.5rem',
                          paddingTop: '0.8rem',
                          borderTop: '1px solid var(--border-light)'
                        }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={() => {
                              setSelectedDriver(d);
                              setModalType('employee-access');
                            }}
                            title={`Manage vehicle clearances for ${d.name}`}
                          >
                            <Truck size={13} /> Access
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={() => {
                              setSelectedDriver(d);
                              setModalType('driver-detail');
                            }}
                            title="Open full employee profile"
                          >
                            <Eye size={13} /> View Profile
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )
        ) : filteredDrivers.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <Users size={36} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>No employees match filter</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Try adjusting your branch or classification filters, or clear your search term.
            </div>
          </div>
        ) : (
          /* Table List View */
          <div className="table-wrap">
            <table className="data-table" aria-label="COTELCO employee roster">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role &amp; Classification</th>
                  <th>Driver&apos;s License &amp; Expiry</th>
                  <th>Branch Station</th>
                  <th>Vehicles with Access</th>
                  <th>Contact Phone</th>
                  <th style={{ textAlign: 'right' }} className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(d => {
                  const clearedVehicles = getEmployeeVehiclesWithAccess(d, vehicles);
                  const branch = branches.find(b => b.id === d.branchId);
                  const licState = getLicenseValidity(d.licenseExpiry);
                  const initials = d.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#1E293B',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.88rem' }}>{d.name}</strong>
                            <span className="cell-sub mono">{d.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="cell-strong">{d.title || d.role}</span>
                        <span className="cell-sub">{d.department || 'Technical / Engineering'} &bull; {d.category}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            {d.licenseNo || 'L02-22-000000'}
                          </span>
                          <LicenseValidityBadge state={licState} />
                        </div>
                        <span className="cell-sub mono">
                          Exp: {d.licenseExpiry || '2027-08-15'} &bull; {d.licenseType || 'Professional'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {branch?.municipality || 'District Office'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setSelectedDriver(d);
                            setModalType('employee-access');
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                          title={`Manage vehicle authorizations for ${d.name}`}
                        >
                          <Truck size={12} /> {clearedVehicles.length} Cleared &bull; Manage
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {d.phone || '0919-550-2211'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="no-print">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setSelectedDriver(d);
                            setModalType('driver-detail');
                          }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
