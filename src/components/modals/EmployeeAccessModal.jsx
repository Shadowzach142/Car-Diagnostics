import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { getVehicleImage, getEmployeeVehiclesWithAccess } from '../../data/fleetData';
import {
  X,
  Truck,
  Plus,
  ShieldCheck,
  Check,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  Building,
  CheckCircle2
} from 'lucide-react';

export const EmployeeAccessModal = () => {
  const {
    modalType,
    setModalType,
    selectedDriver,
    vehicles = [],
    branches = [],
    grantVehicleAccess,
    revokeVehicleAccess
  } = useFleet();

  const [activeTab, setActiveTab] = useState('authorized'); // 'authorized' | 'grant'
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [recentlyGrantedId, setRecentlyGrantedId] = useState(null);

  const branch = selectedDriver ? branches.find(b => b.id === selectedDriver.branchId) : null;
  const clearedVehicles = selectedDriver ? getEmployeeVehiclesWithAccess(selectedDriver, vehicles) : [];
  const clearedCodes = new Set(clearedVehicles.map(v => v.code));
  const unclearedVehicles = selectedDriver ? vehicles.filter(v => !clearedCodes.has(v.code)) : [];
  const initials = selectedDriver ? selectedDriver.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';

  // Search and filter for uncleared vehicles in Grant Access tab (handles large datasets)
  const filteredUncleared = useMemo(() => {
    let list = unclearedVehicles;

    if (branchFilter !== 'ALL') {
      list = list.filter(v => v.branchId === branchFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(v =>
        v.code.toLowerCase().includes(q) ||
        v.plateNo.toLowerCase().includes(q) ||
        v.makeModel.toLowerCase().includes(q) ||
        v.classification.toLowerCase().includes(q)
      );
    }

    return list;
  }, [unclearedVehicles, branchFilter, searchQuery]);

  if (modalType !== 'employee-access' || !selectedDriver) return null;

  const handleGrantVehicle = (veh) => {
    grantVehicleAccess(veh.id, selectedDriver.id);
    setRecentlyGrantedId(veh.id);
    setTimeout(() => {
      setRecentlyGrantedId(null);
    }, 1800);
  };

  const handleRevoke = (vehicle) => {
    revokeVehicleAccess(vehicle.id, selectedDriver.id);
    setSelectedToRemove(prev => prev.filter(id => id !== vehicle.id));
    if (clearedVehicles.length <= 1) {
      setIsEditMode(false);
    }
  };

  const toggleSelectVehicle = (vehicleId) => {
    setSelectedToRemove(prev =>
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedToRemove.length === clearedVehicles.length) {
      setSelectedToRemove([]);
    } else {
      setSelectedToRemove(clearedVehicles.map(v => v.id));
    }
  };

  const handleBatchRevoke = () => {
    if (selectedToRemove.length === 0) return;
    selectedToRemove.forEach(vehId => {
      revokeVehicleAccess(vehId, selectedDriver.id);
    });
    const remainingCount = clearedVehicles.length - selectedToRemove.length;
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
    setBranchFilter('ALL');
    setModalType(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Truck size={18} color="var(--primary)" />
            <span>Vehicle Access Control &bull; {selectedDriver.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeTab === 'authorized' && clearedVehicles.length > 0 && (
              <button
                type="button"
                className={`btn btn-sm ${isEditMode ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  minHeight: '30px',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.65rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700
                }}
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedToRemove([]);
                }}
                title={isEditMode ? 'Finish editing' : 'Edit vehicle clearance checklist'}
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
        <div className="modal-box-body" style={{ padding: '1.15rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Employee Identity Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.88rem',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {selectedDriver.name} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {selectedDriver.employeeId}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {selectedDriver.title || selectedDriver.role} &bull; {selectedDriver.department || 'Operations & Maintenance'} &bull; {branch?.municipality || 'Central HQ'}
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
              {clearedVehicles.length} {clearedVehicles.length === 1 ? 'Vehicle' : 'Vehicles'} Cleared
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
              <span>Authorized ({clearedVehicles.length})</span>
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
              <span>Grant Access ({unclearedVehicles.length} Available)</span>
            </button>
          </div>

          {/* TAB 1: AUTHORIZED VEHICLES LIST */}
          {activeTab === 'authorized' && (
            <>
              {/* Checklist Action Bar (Visible when in Edit Mode) */}
              {isEditMode && clearedVehicles.length > 0 && (
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
                      checked={selectedToRemove.length === clearedVehicles.length && clearedVehicles.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#DC2626'
                      }}
                    />
                    <span>Select All ({clearedVehicles.length})</span>
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

              {/* List of Cleared Vehicles with Checklist Support */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {clearedVehicles.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1.5rem',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.84rem'
                  }}>
                    <div>No vehicles currently cleared for {selectedDriver.name}.</div>
                    {unclearedVehicles.length > 0 && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setActiveTab('grant')}
                        >
                          <Plus size={13} style={{ display: 'inline', marginRight: 4 }} /> Grant First Vehicle Access
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  clearedVehicles.map(veh => {
                    const vehPhoto = getVehicleImage(veh);
                    const vehBranch = branches.find(b => b.id === veh.branchId);
                    const isSelected = selectedToRemove.includes(veh.id);

                    return (
                      <div
                        key={veh.code}
                        onClick={() => {
                          if (isEditMode) toggleSelectVehicle(veh.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
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
                              onChange={() => toggleSelectVehicle(veh.id)}
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

                          <img
                            src={vehPhoto}
                            alt={veh.code}
                            style={{
                              width: '48px',
                              height: '34px',
                              borderRadius: '4px',
                              objectFit: 'cover',
                              border: isSelected ? '1px solid #FECACA' : '1px solid var(--border-subtle)',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                              {veh.code} <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {veh.plateNo}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                              {veh.makeModel} &bull; {veh.classification} &bull; {vehBranch?.municipality || 'District'}
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
                              handleRevoke(veh);
                            }}
                            title={`Remove access immediately for ${veh.code}`}
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

          {/* TAB 2: GRANT ACCESS DIRECTORY (Clean Search + Fixed Station Select) */}
          {activeTab === 'grant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Fixed-Height Search + Station Select Row (No Horizontal Scrollbar / Clipping) */}
              <div className="access-filter-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
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
                    placeholder="Search by code, plate, model..."
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

                <select
                  className="form-select"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  style={{ height: '36px', fontSize: '0.8rem', minWidth: 'min(100%, 155px)' }}
                  aria-label="Filter by station"
                >
                  <option value="ALL">All Stations ({unclearedVehicles.length})</option>
                  {branches.map(b => {
                    const count = unclearedVehicles.filter(v => v.branchId === b.id).length;
                    if (count === 0) return null;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.municipality} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Scrollable Scannable Cards (Single Clean Scroll Container) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
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
                    {unclearedVehicles.length === 0
                      ? 'All cooperative fleet assets are already authorized for this employee.'
                      : 'No available vehicles match the search or station filter.'}
                  </div>
                ) : (
                  filteredUncleared.map(veh => {
                    const vehPhoto = getVehicleImage(veh);
                    const vehBranch = branches.find(b => b.id === veh.branchId);
                    const isJustGranted = recentlyGrantedId === veh.id;

                    return (
                      <div
                        key={veh.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          background: isJustGranted ? '#F0FDF4' : 'var(--bg-surface)',
                          border: isJustGranted ? '1.5px solid #86EFAC' : '1px solid var(--border-light)',
                          borderRadius: '10px',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                          <img
                            src={vehPhoto}
                            alt={veh.code}
                            style={{
                              width: '52px',
                              height: '38px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-light)',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                              {veh.code} <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {veh.plateNo}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                              {veh.makeModel} &bull; {veh.classification} &bull; {vehBranch?.municipality || 'District'}
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
                            padding: '0.25rem 0.65rem',
                            background: '#DCFCE7',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={13} /> Granted
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
                            onClick={() => handleGrantVehicle(veh)}
                            title={`Authorize ${selectedDriver.name} to operate ${veh.code}`}
                          >
                            <Plus size={13} /> Grant Access
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
                <ChevronLeft size={14} /> Back to Authorized ({clearedVehicles.length})
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
