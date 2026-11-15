import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, DEFAULT_EDITABLES } from '../data/fleetData';
import {
  User,
  Wrench,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Phone,
  Edit2,
  Activity,
  FileText,
  X,
  Check
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

export const MechanicProfile = () => {
  const {
    settings,
    drivers = [],
    workOrders = [],
    vehicles = [],
    branches = [],
    bookings = [],
    repairArchive = [],
    editables = {},
    setActiveTab,
    updateMechanicProfile
  } = useFleet();

  const departments = editables.departments || DEFAULT_EDITABLES.departments || [];
  const employeeClassifications = editables.employeeClassifications || DEFAULT_EDITABLES.employeeClassifications || [];

  const mechFull = settings?.currentMechanic || DEFAULT_EDITABLES.mechanics[0];
  const openParen = mechFull.indexOf('(');
  const mechName = (openParen >= 0 ? mechFull.slice(0, openParen) : mechFull).trim();
  const mechSpecialty = openParen >= 0
    ? mechFull.slice(openParen + 1).replace(/\)$/, '').trim()
    : 'Fleet Maintenance Specialist';
  const mechNorm = mechName.toLowerCase();

  const matchedDriver = drivers.find(
    d => (d.name || '').trim().toLowerCase() === mechNorm
  );
  const mechPhone = matchedDriver?.phone || '0919-550-2211';
  const mechEmail = matchedDriver?.email || '';
  const mechDepartment = matchedDriver?.department || departments[1] || 'Technical / Engineering';
  const mechBranchId = matchedDriver?.branchId || branches[0]?.id || 'BR-KID';
  const mechBranch = branches.find(b => b.id === mechBranchId);
  const mechCategory = matchedDriver?.category || employeeClassifications[0] || 'Heavy Equipment';
  const mechEmployeeId = matchedDriver?.employeeId || 'COTELCO-MECH';
  const mechLicenseNo = matchedDriver?.licenseNo || '';

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: mechName,
    specialty: mechSpecialty,
    phone: mechPhone,
    email: mechEmail,
    department: mechDepartment,
    branchId: mechBranchId,
    category: mechCategory,
    employeeId: mechEmployeeId,
    licenseNo: mechLicenseNo
  });

  const initials = mechName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MC';

  const myOrders = useMemo(() => {
    return workOrders.filter(
      wo => (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechNorm
    );
  }, [workOrders, mechNorm]);

  const activeOrders = myOrders.filter(wo => wo.status !== COMPLETED);
  const completedOrders = myOrders.filter(wo => wo.status === COMPLETED);

  const myScheduledCount = useMemo(() => {
    return (bookings || []).filter(b => {
      if (b.type !== 'MAINTENANCE' || b.status === 'Completed') return false;
      return (b.driver || '').split(' (')[0].trim().toLowerCase() === mechNorm;
    }).length;
  }, [bookings, mechNorm]);

  const myVehicles = useMemo(() => {
    const orderCodes = new Set(myOrders.map(wo => wo.vehicleCode));
    const assigned = vehicles.filter(v => orderCodes.has(v.code));
    if (assigned.length > 0) return assigned;
    return vehicles.filter(v => v.branchId === mechBranchId);
  }, [vehicles, myOrders, mechBranchId]);

  const myRecentReports = useMemo(() => {
    return [...(repairArchive || [])]
      .filter(r => (r.mechanic || '').split(' (')[0].trim().toLowerCase() === mechNorm)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5);
  }, [repairArchive, mechNorm]);

  const openEditModal = () => {
    setProfileForm({
      name: mechName,
      specialty: mechSpecialty,
      phone: mechPhone,
      email: mechEmail,
      department: mechDepartment,
      branchId: mechBranchId,
      category: mechCategory,
      employeeId: mechEmployeeId,
      licenseNo: mechLicenseNo
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    const ok = updateMechanicProfile({
      name: profileForm.name.trim(),
      specialty: profileForm.specialty.trim(),
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      department: profileForm.department,
      branchId: profileForm.branchId,
      category: profileForm.category,
      employeeId: profileForm.employeeId.trim(),
      licenseNo: profileForm.licenseNo.trim()
    });
    if (ok) setIsEditingProfile(false);
  };

  return (
    <div className="dashboard-single-screen">
      {/* Profile Identity Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-light)',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.15rem',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {mechName}
              </h2>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {mechSpecialty}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{mechEmployeeId}</span>
                <span>&bull;</span>
                <span>{mechDepartment}</span>
                <span>&bull;</span>
                <span>{mechBranch?.municipality ? `${mechBranch.municipality} District` : 'Central HQ'}</span>
                <span>&bull;</span>
                <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <Phone size={11} /> {mechPhone}
                </span>
                {mechEmail && (
                  <>
                    <span>&bull;</span>
                    <span>{mechEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={openEditModal}
            >
              <Edit2 size={14} /> Edit Profile
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActiveTab('profiling')}
            >
              <ClipboardList size={14} /> Car Profiling
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActiveTab('health')}
            >
              <Activity size={14} /> Ongoing Health
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActiveTab('bookings')}
            >
              <CalendarDays size={14} /> My Calendar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setActiveTab('auditing')}
            >
              <FileText size={14} /> Reports
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('maintenance')}
            >
              <Wrench size={14} /> My Maintenance
            </button>
          </div>
        </div>

        {/* Neutral 2-Box Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            padding: '0.75rem 0.9rem'
          }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <User size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> ROLE &amp; CLEARANCE
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '3px' }}>
              Assigned Mechanic
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              Scoped to Dashboard, Car Profiling, Calendar, Ongoing Health, Maintenance, Reports &amp; Profile
            </span>
          </div>

          <div style={{
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            padding: '0.75rem 0.9rem'
          }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <ClipboardList size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} /> ASSIGNED WORKLOAD
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '3px' }}>
              {activeOrders.length} Active &bull; {completedOrders.length} Completed
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              {myScheduledCount} scheduled maintenance {myScheduledCount === 1 ? 'entry' : 'entries'} on calendar
            </span>
          </div>
        </div>
      </div>

      {/* Assigned Maintenance History */}
      <section className="card dash-panel" aria-labelledby="mech-profile-orders">
        <div className="card-head">
          <div>
            <h3 className="card-title" id="mech-profile-orders">My Assigned Vehicles &amp; Work Orders</h3>
            <div className="card-sub">{myOrders.length} total maintenance assignments for {mechName}</div>
          </div>
        </div>

        <div className="alert-list">
          {myOrders.length === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={26} color="#16A34A" />
              <strong>No work orders assigned yet</strong>
            </div>
          )}
          {myOrders.map(wo => {
            const v = vehicles.find(veh => veh.code === wo.vehicleCode);
            const branch = branches.find(b => b.id === (wo.branchId || v?.branchId));
            const isDone = wo.status === COMPLETED;

            return (
              <div key={wo.id} className="alert-row" style={{ gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '32px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#E5E7EB',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {v && (
                    <img
                      src={getVehicleImage(v)}
                      alt={wo.vehicleCode}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                  <div className="alert-top">
                    <strong>{wo.vehicleCode}</strong>
                    <span className="muted">&bull; {wo.plateNo || v?.plateNo || '—'}</span>
                    {branch && <span className="badge badge-muted">{branch.name}</span>}
                  </div>
                  <div className="alert-sub">
                    {wo.type} &bull; Reported {wo.dateReported}
                  </div>
                </div>

                <span className={`badge ${isDone ? 'badge-ok' : 'badge-warn'}`} style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <><CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />Completed</>
                  ) : (
                    <><Clock size={12} style={{ marginRight: 4, verticalAlign: '-1px' }} />{wo.currentStage || 'In Progress'}</>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ongoing Health of Assigned Cars */}
      <section className="card dash-panel" aria-labelledby="mech-profile-health">
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card-title" id="mech-profile-health">Ongoing Health of My Cars</h3>
            <div className="card-sub">{myVehicles.length} assigned / station vehicles tracked</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setActiveTab('health')}>
            <Activity size={14} /> Open Ongoing Health
          </button>
        </div>

        <div className="alert-list">
          {myVehicles.length === 0 ? (
            <div className="empty-state">
              <strong>No vehicles assigned yet</strong>
            </div>
          ) : (
            myVehicles.map(v => {
              const branch = branches.find(b => b.id === v.branchId);
              const diags = v.diagnostics || [];
              const firstDiag = diags[0];
              const secondDiag = diags[1];

              return (
                <div key={v.id} className="alert-row" style={{ gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '32px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#E5E7EB',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <img
                      src={getVehicleImage(v)}
                      alt={v.code}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                    <div className="alert-top">
                      <strong>{v.code}</strong>
                      <span className="muted">&bull; {v.plateNo}</span>
                      {branch && <span className="badge badge-muted">{branch.name}</span>}
                    </div>
                    <div className="alert-sub">
                      {firstDiag ? `${firstDiag.name}: ${firstDiag.remainingLabel || firstDiag.nextDueDate || 'Tracked'}` : v.makeModel}
                      {secondDiag ? ` • ${secondDiag.name}: ${secondDiag.remainingLabel || secondDiag.nextDueDate || 'Tracked'}` : ''}
                    </div>
                  </div>

                  <span className={`badge ${v.status === 'ACTIVE' ? 'badge-ok' : 'badge-warn'}`} style={{ flexShrink: 0 }}>
                    {v.status === 'IN-SHOP' ? 'In Maintenance' : v.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Recent Reports */}
      <section className="card dash-panel" aria-labelledby="mech-profile-reports">
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card-title" id="mech-profile-reports">Recent Reports</h3>
            <div className="card-sub">Latest service &amp; filed reports for {mechName}&apos;s vehicles</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setActiveTab('auditing')}>
            <FileText size={14} /> Open Reports
          </button>
        </div>

        <div className="alert-list">
          {myRecentReports.length === 0 ? (
            <div className="empty-state">
              <strong>No recent reports logged</strong>
            </div>
          ) : (
            myRecentReports.map((r, idx) => (
              <div key={r.voucherNo || idx} className="alert-row" style={{ gap: '12px' }}>
                <div className="alert-main" style={{ flex: 1, minWidth: 0 }}>
                  <div className="alert-top">
                    <strong>{r.vehicleCode}</strong>
                    <span className="muted">&bull; {r.plateNo}</span>
                    <span className="badge badge-muted mono">{r.voucherNo}</span>
                  </div>
                  <div className="alert-sub">
                    {r.serviceType} &bull; {r.date} &bull; {r.facility}
                  </div>
                </div>
                <span className="badge badge-ok" style={{ flexShrink: 0 }}>
                  {r.fileName ? r.fileName : 'Logged'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)}>
          <div className="modal-box" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Edit2 size={18} color="var(--primary)" />
                <span>Edit My Profile</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setIsEditingProfile(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="modal-box-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '0.85rem', maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rogelio D. Bautista"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Job Title / Specialty *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.specialty}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
                    placeholder="e.g. Senior Heavy Hydraulics & Boom Mechanic"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 0918-440-1922"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. rogelio.bautista@cotelco.coop"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Employee ID</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={profileForm.employeeId}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="e.g. EMP-2017-015"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Driver / Technician License No.</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={profileForm.licenseNo}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, licenseNo: e.target.value }))}
                    placeholder="e.g. LTO-12-883920"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                  >
                    {!departments.includes(profileForm.department) && profileForm.department && (
                      <option value={profileForm.department}>{profileForm.department}</option>
                    )}
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Assigned Station</label>
                  <select
                    className="form-select"
                    value={profileForm.branchId}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, branchId: e.target.value }))}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.municipality}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label">Classification / Category</label>
                  <select
                    className="form-select"
                    value={profileForm.category}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {!employeeClassifications.includes(profileForm.category) && profileForm.category && (
                      <option value={profileForm.category}>{profileForm.category}</option>
                    )}
                    {employeeClassifications.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Check size={15} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
