import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage, getVehicleAuthorizedDrivers } from '../../data/fleetData';
import {
  X,
  Users,
  Plus,
  Check,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

export const VehicleAccessModal = () => {
  const {
    modalType,
    setModalType,
    selectedVehicle,
    drivers = [],
    branches = [],
    grantVehicleAccess,
    revokeVehicleAccess
  } = useFleet();

  const [activeTab, setActiveTab] = useState('authorized'); // 'authorized' | 'grant'
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [recentlyGrantedId, setRecentlyGrantedId] = useState(null);

  const branch = selectedVehicle ? branches.find(b => b.id === selectedVehicle.branchId) : null;
  const vehiclePhoto = selectedVehicle ? getVehicleImage(selectedVehicle) : '';
  const authorizedDrivers = selectedVehicle ? getVehicleAuthorizedDrivers(selectedVehicle, drivers) : [];
  const authIds = new Set(authorizedDrivers.map(d => d.id));
  const unclearedDrivers = selectedVehicle ? drivers.filter(d => !authIds.has(d.id)) : [];

  // Search and filter for uncleared employees (handles large workforce datasets)
  const filteredUncleared = useMemo(() => {
    let list = unclearedDrivers;

    if (deptFilter !== 'ALL') {
      list = list.filter(d => (d.department || 'Operations & Maintenance') === deptFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(d => {
        const dBranch = branches.find(b => b.id === d.branchId);
        return (
          d.name.toLowerCase().includes(q) ||
          d.employeeId.toLowerCase().includes(q) ||
          (d.title || d.role || '').toLowerCase().includes(q) ||
          (d.department || '').toLowerCase().includes(q) ||
          (dBranch?.municipality || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [unclearedDrivers, deptFilter, searchQuery, branches]);

  const handleGrantDriver = (driver) => {
    grantVehicleAccess(selectedVehicle.id, driver.id);
    setRecentlyGrantedId(driver.id);
    setTimeout(() => {
      setRecentlyGrantedId(null);
    }, 1800);
  };

  const handleRevoke = (driverId) => {
    revokeVehicleAccess(selectedVehicle.id, driverId);
    setSelectedToRemove(prev => prev.filter(id => id !== driverId));
    if (authorizedDrivers.length <= 1) {
      setIsEditMode(false);
    }
  };

  const toggleSelectDriver = (driverId) => {
    setSelectedToRemove(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleSelectAll = () => {
    if (selectedToRemove.length === authorizedDrivers.length) {
      setSelectedToRemove([]);
    } else {
      setSelectedToRemove(authorizedDrivers.map(d => d.id));
    }
  };

  const handleBatchRevoke = () => {
    if (selectedToRemove.length === 0) return;
    selectedToRemove.forEach(driverId => {
      revokeVehicleAccess(selectedVehicle.id, driverId);
    });
    const remainingCount = authorizedDrivers.length - selectedToRemove.length;
    setSelectedToRemove([]);
    if (remainingCount <= 0) {
      setIsEditMode(false);
    }
  };

  const handleClose = () => {
    setIsEditMode(false);
    setSelectedToRemove([]);
    setActiveTab('authorized');
    setSearchQuery('');
    setDeptFilter('ALL');
    setModalType(null);
  };

  // Distinct departments among uncleared drivers
  const departments = useMemo(() => {
    const set = new Set();
    unclearedDrivers.forEach(d => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [unclearedDrivers]);

  if (modalType !== 'vehicle-access' || !selectedVehicle) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Users size={18} color="var(--primary)" />
            <span>Employees with Access &bull; {selectedVehicle.code}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeTab === 'authorized' && authorizedDrivers.length > 0 && (
              <button
                type="button"
                className={`btn btn-xs ${isEditMode ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.22rem 0.65rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700
                }}
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedToRemove([]);
                }}
                title={isEditMode ? 'Finish editing' : 'Edit authorization checklist'}
              >
                {isEditMode ? (
                  <>
                    <Check size={13} />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="modal-box-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-box-body" style={{ padding: '1.2rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '74vh', overflowY: 'auto' }}>
          {/* Compact Vehicle Identity */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem'
          }}>
            <img
              src={vehiclePhoto}
              alt={selectedVehicle.code}
              style={{
                width: '52px',
                height: '38px',
                borderRadius: '5px',
                objectFit: 'cover',
                border: '1px solid var(--border-medium)',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {selectedVehicle.code} <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {selectedVehicle.plateNo}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {selectedVehicle.makeModel} &bull; {branch?.municipality || 'Central HQ'}
              </div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              flexShrink: 0
            }}>
              {authorizedDrivers.length} Personnel
            </span>
          </div>

          {/* Clean Segmented Tab Navigation: No Layout Shifting */}
          <div className="segmented" style={{ width: '100%', display: 'flex' }}>
            <button
              type="button"
              className={activeTab === 'authorized' ? 'active' : ''}
              onClick={() => {
                setActiveTab('authorized');
                setIsEditMode(false);
              }}
              style={{
                flex: 1,
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <ShieldCheck size={14} color={activeTab === 'authorized' ? 'var(--primary-dark, #4D7C0F)' : '#059669'} />
              <span>Authorized ({authorizedDrivers.length})</span>
            </button>

            <button
              type="button"
              className={activeTab === 'grant' ? 'active' : ''}
              onClick={() => {
                setActiveTab('grant');
                setIsEditMode(false);
              }}
              style={{
                flex: 1,
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Plus size={14} color={activeTab === 'grant' ? 'var(--primary-dark, #4D7C0F)' : 'var(--text-secondary)'} />
              <span>Grant Access ({unclearedDrivers.length} Available)</span>
            </button>
          </div>

          {/* TAB 1: AUTHORIZED PERSONNEL LIST */}
          {activeTab === 'authorized' && (
            <>
              {/* Checklist Action Bar (Visible in Edit Mode) */}
              {isEditMode && authorizedDrivers.length > 0 && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '0.55rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#991B1B',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedToRemove.length === authorizedDrivers.length && authorizedDrivers.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#DC2626'
                      }}
                    />
                    <span>Select All ({authorizedDrivers.length})</span>
                  </label>

                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={selectedToRemove.length === 0}
                    style={{
                      background: selectedToRemove.length > 0 ? '#DC2626' : '#E2E8F0',
                      color: selectedToRemove.length > 0 ? '#FFFFFF' : '#94A3B8',
                      border: 'none',
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: selectedToRemove.length > 0 ? 'pointer' : 'not-allowed',
                      fontWeight: 700,
                      borderRadius: '6px'
                    }}
                    onClick={handleBatchRevoke}
                  >
                    <Trash2 size={13} />
                    <span>Remove Access {selectedToRemove.length > 0 ? `(${selectedToRemove.length})` : ''}</span>
                  </button>
                </div>
              )}

              {/* List of Authorized Drivers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {authorizedDrivers.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1.5rem',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.84rem'
                  }}>
                    <div>No authorized employees cleared for this vehicle.</div>
                    {unclearedDrivers.length > 0 && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setActiveTab('grant')}
                        >
                          <Plus size={13} style={{ display: 'inline', marginRight: 4 }} /> Authorize First Employee
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  authorizedDrivers.map(d => {
                    const initials = d.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    const isSelected = selectedToRemove.includes(d.id);

                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          if (isEditMode) toggleSelectDriver(d.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.55rem 0.8rem',
                          background: isSelected ? '#FEF2F2' : 'var(--bg-surface)',
                          border: isSelected ? '1.5px solid #FCA5A5' : '1px solid var(--border-light)',
                          borderRadius: '8px',
                          justifyContent: 'space-between',
                          cursor: isEditMode ? 'pointer' : 'default',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                          {/* Checklist Checkbox in Edit Mode */}
                          {isEditMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectDriver(d.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#DC2626',
                                flexShrink: 0
                              }}
                            />
                          )}

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

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{d.name}</strong>
                              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{d.employeeId}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              {d.title || d.role} &bull; {d.department || 'Operations & Maintenance'}
                            </div>
                          </div>
                        </div>

                        {isEditMode && (
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            style={{
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              background: isSelected ? '#FEE2E2' : 'transparent',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.5rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevoke(d.id);
                            }}
                            title={`Remove access immediately for ${d.name}`}
                          >
                            <X size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: GRANT ACCESS DIRECTORY (Clean Search + Fixed Department Select) */}
          {activeTab === 'grant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Fixed-Height Search + Department Select Row */}
              <div className={departments.length > 0 ? 'access-filter-row' : undefined} style={{ gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    color="var(--text-tertiary)"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '10px', fontSize: '0.82rem', height: '36px' }}
                    placeholder="Search by name, ID, title, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)' }}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {departments.length > 0 && (
                  <select
                    className="form-select"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{ height: '36px', fontSize: '0.8rem', minWidth: 'min(100%, 165px)' }}
                    aria-label="Filter by department"
                  >
                    <option value="ALL">All Departments ({unclearedDrivers.length})</option>
                    {departments.map(dept => {
                      const count = unclearedDrivers.filter(d => d.department === dept).length;
                      return (
                        <option key={dept} value={dept}>
                          {dept} ({count})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Scrollable Scannable Cards (Single Clean Scroll Container) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                {filteredUncleared.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1.5rem',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.84rem'
                  }}>
                    {unclearedDrivers.length === 0
                      ? 'All cooperative personnel are already authorized for this vehicle.'
                      : 'No available personnel match the search or department filter.'}
                  </div>
                ) : (
                  filteredUncleared.map(d => {
                    const initials = d.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    const dBranch = branches.find(b => b.id === d.branchId);
                    const isJustGranted = recentlyGrantedId === d.id;

                    return (
                      <div
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.55rem 0.8rem',
                          background: isJustGranted ? '#F0FDF4' : 'var(--bg-surface)',
                          border: isJustGranted ? '1.5px solid #86EFAC' : '1px solid var(--border-light)',
                          borderRadius: '8px',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
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

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{d.name}</strong>
                              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{d.employeeId}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              {d.title || d.role} &bull; {d.department || 'Operations & Maintenance'} &bull; {dBranch?.municipality || 'District'}
                            </div>
                          </div>
                        </div>

                        {isJustGranted ? (
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#16A34A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.6rem',
                            background: '#DCFCE7',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={13} /> Authorized
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{
                              minHeight: '32px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '8px',
                              color: 'var(--text-main)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              flexShrink: 0,
                              whiteSpace: 'nowrap'
                            }}
                            onClick={() => handleGrantDriver(d)}
                            title={`Authorize ${d.name} for ${selectedVehicle.code}`}
                          >
                            <Plus size={13} /> Authorize
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-box-footer" style={{
          display: 'flex',
          justifyContent: activeTab === 'grant' ? 'space-between' : 'flex-end',
          alignItems: 'center',
          padding: '0.85rem 1.35rem',
          borderTop: '1px solid var(--border-light)'
        }}>
          {activeTab === 'grant' ? (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveTab('authorized')}
                style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ChevronLeft size={14} /> Back to Authorized ({authorizedDrivers.length})
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClose}
              >
                Done
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
