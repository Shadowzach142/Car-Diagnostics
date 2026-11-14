import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { X, UserPlus, Phone, Building, Briefcase, Layers, Sliders } from 'lucide-react';

export const AddDriverModal = () => {
  const {
    modalType,
    setModalType,
    setActiveTab,
    editables = {},
    branches,
    addDriver
  } = useFleet();

  const jobTitles = editables.jobTitles || ['Senior Aerial Boom Operator'];
  const departments = editables.departments || ['Area', 'Technical / Engineering'];
  const employeeClassifications = editables.employeeClassifications || ['Heavy Equipment', 'Light Commercial', 'Passenger / Emergency', 'Patrol Motorcycle'];

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState(`EMP-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState(jobTitles[0] || 'Senior Aerial Boom Operator');
  const [department, setDepartment] = useState(departments[0] || 'Technical / Engineering');
  const [category, setCategory] = useState(employeeClassifications[0] || 'Heavy Equipment');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'BR-KID');
  const [phone, setPhone] = useState('0919-550-2211');

  useEffect(() => {
    if (modalType === 'add-driver') {
      if (!jobTitles.includes(title) && jobTitles.length > 0) setTitle(jobTitles[0]);
      if (!departments.includes(department) && departments.length > 0) setDepartment(departments[0]);
      if (!employeeClassifications.includes(category) && employeeClassifications.length > 0) setCategory(employeeClassifications[0]);
    }
  }, [modalType]);

  if (modalType !== 'add-driver') return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addDriver({
      name: name.trim(),
      employeeId: employeeId.trim(),
      title: title.trim(),
      role: title.trim(),
      department: department.trim(),
      category,
      branchId,
      licenseNo: 'N/A',
      licenseExpiry: '2028-12-31',
      licenseType: 'Authorized Cooperative Operator',
      phone: phone.trim(),
      status: 'ACTIVE'
    });

    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <UserPlus size={18} color="var(--primary)" />
            <span>Register Employee</span>
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

        <form onSubmit={handleSubmit}>
          <div className="modal-box-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
                Register a cooperative employee to assign vehicle clearance and dispatch permissions.
              </p>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={() => {
                  setModalType(null);
                  setActiveTab('editables');
                }}
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem' }}
                title="Add or edit departments, titles, and classifications"
              >
                <Sliders size={12} /> Manage Editables
              </button>
            </div>

            {/* Row 1: Name and Employee ID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Employee Full Name: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rolando S. Magallanes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID: *</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row 2: Title and Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Briefcase size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Title: *
                </label>
                <select
                  className="form-select"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                >
                  {jobTitles.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Layers size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Department: *
                </label>
                <select
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Station, Contact Phone, and Classification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Building size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Station: *
                </label>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.municipality}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Contact Phone: *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0919-000-0000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classification: *</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {employeeClassifications.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalType(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Register Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
