import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import {
  Layers,
  Briefcase,
  Building,
  Users,
  Truck,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sliders
} from 'lucide-react';

const EDITABLE_SECTIONS = [
  {
    key: 'departments',
    title: 'Departments',
    subtitle: 'Official cooperative departments for employee assignment and vehicle custody',
    placeholder: 'e.g. Institutional Services, Core Plan, CPRST...',
    icon: Layers,
    group: 'WORKFORCE'
  },
  {
    key: 'jobTitles',
    title: 'Job Titles',
    subtitle: 'Standardized workforce designations and operator titles',
    placeholder: 'e.g. Senior Lineman, Substation Engineer...',
    icon: Briefcase,
    group: 'WORKFORCE'
  },
  {
    key: 'employeeClassifications',
    title: 'Employee Classifications',
    subtitle: 'Operator clearance categories used across employee profiles',
    placeholder: 'e.g. Heavy Equipment, Light Commercial...',
    icon: Users,
    group: 'WORKFORCE'
  },
  {
    key: 'vehicleClassifications',
    title: 'Vehicle Classifications',
    subtitle: 'Asset types for fleet directory and car profiling',
    placeholder: 'e.g. Bucket Truck, Pickup, Service Van...',
    icon: Truck,
    group: 'FLEET'
  },
  {
    key: 'serviceCategories',
    title: 'Maintenance Service Categories',
    subtitle: 'Work order and preventive maintenance (PMS) categories',
    placeholder: 'e.g. Hydraulic Overhaul, Preventive Maintenance (PMS)...',
    icon: Wrench,
    group: 'FLEET'
  },
  {
    key: 'mechanics',
    title: 'Assigned Repair Personnel / Mechanics',
    subtitle: 'Authorized technicians and repair teams selectable in Maintenance & Diagnostics',
    placeholder: 'e.g. Engr. Mateo R. Villanueva (Lead Diagnostic Specialist)...',
    icon: Users,
    group: 'FLEET'
  },
  {
    key: 'diagnosticTypes',
    title: 'Vehicle Diagnostic & Interval Items',
    subtitle: 'Changeable health items tracked by odometer (km) or date (e.g. Engine Oil, Brakes)',
    placeholder: 'e.g. Engine Oil & Filter Change, Coolant Flush...',
    icon: Sliders,
    group: 'FLEET'
  }
];

export const EditablesConfig = () => {
  const {
    editables = {},
    branches = [],
    drivers = [],
    vehicles = [],
    workOrders = [],
    globalSearch,
    addEditableItem,
    updateEditableItem,
    removeEditableItem,
    addBranch,
    updateBranch,
    removeBranch
  } = useFleet();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [newItemInputs, setNewItemInputs] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { sectionKey, originalValue }
  const [editingValue, setEditingValue] = useState('');

  // Station (Branch) states
  const [newBranchMunicipality, setNewBranchMunicipality] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editingBranchForm, setEditingBranchForm] = useState({ municipality: '', name: '', phone: '' });

  const q = (globalSearch || '').toLowerCase().trim();

  // Compute usage counts so the user knows how many records use each option
  const getUsageCount = (sectionKey, itemValue) => {
    if (sectionKey === 'departments') {
      return drivers.filter(d => d.department === itemValue).length;
    }
    if (sectionKey === 'jobTitles') {
      return drivers.filter(d => (d.title || d.role) === itemValue).length;
    }
    if (sectionKey === 'employeeClassifications') {
      return drivers.filter(d => d.category === itemValue).length;
    }
    if (sectionKey === 'vehicleClassifications') {
      return vehicles.filter(v => v.classification === itemValue).length;
    }
    if (sectionKey === 'serviceCategories') {
      return workOrders.filter(w => w.category === itemValue).length;
    }
    if (sectionKey === 'mechanics') {
      return workOrders.filter(w => w.assignedMechanic === itemValue).length;
    }
    if (sectionKey === 'diagnosticTypes') {
      return vehicles.reduce((acc, v) => acc + ((v.diagnostics || []).some(d => d.type === itemValue) ? 1 : 0), 0);
    }
    return 0;
  };

  const getUsageLabel = (sectionKey, count) => {
    if (sectionKey === 'vehicleClassifications' || sectionKey === 'diagnosticTypes') {
      return `${count} ${count === 1 ? 'vehicle' : 'vehicles'}`;
    }
    if (sectionKey === 'serviceCategories' || sectionKey === 'mechanics') {
      return `${count} ${count === 1 ? 'task' : 'tasks'}`;
    }
    return `${count} ${count === 1 ? 'employee' : 'employees'}`;
  };

  const handleAddItem = (e, sectionKey) => {
    e.preventDefault();
    const val = (newItemInputs[sectionKey] || '').trim();
    if (!val) return;
    const ok = addEditableItem(sectionKey, val);
    if (ok) {
      setNewItemInputs(prev => ({ ...prev, [sectionKey]: '' }));
    } else {
      alert(`"${val}" already exists in this list or could not be added.`);
    }
  };

  const startEditingItem = (sectionKey, itemValue) => {
    setEditingCell({ sectionKey, originalValue: itemValue });
    setEditingValue(itemValue);
  };

  const saveEditedItem = () => {
    if (!editingCell) return;
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== editingCell.originalValue) {
      updateEditableItem(editingCell.sectionKey, editingCell.originalValue, trimmed);
    }
    setEditingCell(null);
    setEditingValue('');
  };

  const handleDeleteItem = (sectionKey, itemValue) => {
    const count = getUsageCount(sectionKey, itemValue);
    const msg = count > 0
      ? `Remove "${itemValue}" from the selectable options?\n\nNote: ${count} existing record(s) currently use this value.`
      : `Remove "${itemValue}" from this list?`;
    if (confirm(msg)) {
      removeEditableItem(sectionKey, itemValue);
    }
  };

  const handleAddStation = (e) => {
    e.preventDefault();
    if (!newBranchMunicipality.trim()) return;
    const added = addBranch({
      municipality: newBranchMunicipality.trim(),
      name: newBranchName.trim() || `${newBranchMunicipality.trim()} Sub-Office`,
      phone: newBranchPhone.trim() || '0919-000-0000'
    });
    if (added) {
      setNewBranchMunicipality('');
      setNewBranchName('');
      setNewBranchPhone('');
    }
  };

  const startEditingBranch = (b) => {
    setEditingBranchId(b.id);
    setEditingBranchForm({
      municipality: b.municipality || '',
      name: b.name || '',
      phone: b.phone || ''
    });
  };

  const saveEditedBranch = (branchId) => {
    if (!editingBranchForm.municipality.trim()) return;
    updateBranch(branchId, {
      municipality: editingBranchForm.municipality.trim(),
      name: editingBranchForm.name.trim() || `${editingBranchForm.municipality.trim()} Sub-Office`,
      phone: editingBranchForm.phone.trim()
    });
    setEditingBranchId(null);
  };

  const handleDeleteBranch = (b) => {
    const vehCount = vehicles.filter(v => v.branchId === b.id).length;
    const empCount = drivers.filter(d => d.branchId === b.id).length;
    const msg = (vehCount > 0 || empCount > 0)
      ? `Remove station "${b.municipality}"?\n\nCurrently assigned: ${vehCount} vehicle(s) and ${empCount} employee(s).`
      : `Remove station "${b.municipality}"?`;
    if (confirm(msg)) {
      removeBranch(b.id);
    }
  };

  const visibleSections = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return EDITABLE_SECTIONS;
    return EDITABLE_SECTIONS.filter(s => s.key === activeCategoryFilter);
  }, [activeCategoryFilter]);

  const showBranchesCard = activeCategoryFilter === 'ALL' || activeCategoryFilter === 'branches';

  return (
    <div className="page">
      {/* Zone 2: Page Toolbar */}
      <div className="page-toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Lists' },
            { id: 'departments', label: `Departments (${(editables.departments || []).length})` },
            { id: 'jobTitles', label: `Job Titles (${(editables.jobTitles || []).length})` },
            { id: 'branches', label: `Stations (${branches.length})` },
            { id: 'mechanics', label: `Repair Personnel (${(editables.mechanics || []).length})` },
            { id: 'diagnosticTypes', label: `Diagnostics (${(editables.diagnosticTypes || []).length})` },
            { id: 'serviceCategories', label: `Service Categories (${(editables.serviceCategories || []).length})` }
          ].map(tab => {
            const isActive = activeCategoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryFilter(tab.id)}
                className="btn btn-sm"
                style={{
                  background: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border-light)'}`,
                  fontWeight: isActive ? 700 : 600,
                  padding: '0.38rem 0.75rem',
                  fontSize: '0.78rem'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="toolbar-spacer" />

        <span className="toolbar-count" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Sliders size={13} />
          Changes sync immediately to all forms &amp; filters
        </span>
      </div>

      {/* Main Grid of Editable Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: activeCategoryFilter === 'ALL' ? 'repeat(auto-fill, minmax(460px, 1fr))' : '1fr',
          gap: '1.15rem',
          alignItems: 'start'
        }}
      >
        {visibleSections.map((section) => {
          const Icon = section.icon;
          const rawItems = editables[section.key] || [];
          const items = q
            ? rawItems.filter(item => item.toLowerCase().includes(q))
            : rawItems;

          return (
            <div
              key={section.key}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {section.title}
                      </h2>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-light)',
                          padding: '0.12rem 0.5rem',
                          borderRadius: '999px'
                        }}
                      >
                        {rawItems.length}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                      {section.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add New Option Input Bar */}
              <form
                onSubmit={(e) => handleAddItem(e, section.key)}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  background: 'var(--bg-surface-subtle)',
                  padding: '0.55rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)'
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder={section.placeholder}
                  value={newItemInputs[section.key] || ''}
                  onChange={(e) => setNewItemInputs(prev => ({ ...prev, [section.key]: e.target.value }))}
                  style={{
                    flex: 1,
                    minHeight: '34px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-card)'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: '34px', padding: '0 0.85rem', flexShrink: 0 }}
                >
                  <Plus size={14} /> Add
                </button>
              </form>

              {/* List of Editable Items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  maxHeight: activeCategoryFilter === 'ALL' ? '320px' : 'none',
                  overflowY: 'auto',
                  paddingRight: '2px'
                }}
              >
                {items.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                      background: 'var(--bg-surface-subtle)',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-light)'
                    }}
                  >
                    No matching options found.
                  </div>
                ) : (
                  items.map((item) => {
                    const isEditing =
                      editingCell?.sectionKey === section.key &&
                      editingCell?.originalValue === item;
                    const usageCount = getUsageCount(section.key, item);

                    return (
                      <div
                        key={item}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.65rem',
                          padding: '0.55rem 0.75rem',
                          background: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px'
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1 }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedItem();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              style={{ minHeight: '30px', fontSize: '0.82rem', flex: 1 }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={saveEditedItem}
                              style={{ minHeight: '30px', padding: '0 0.6rem' }}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setEditingCell(null)}
                              style={{ minHeight: '30px', padding: '0 0.5rem' }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {item}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  color: usageCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                                  background: 'var(--bg-surface-subtle)',
                                  border: '1px solid var(--border-light)',
                                  padding: '0.12rem 0.48rem',
                                  borderRadius: '4px'
                                }}
                              >
                                {getUsageLabel(section.key, usageCount)}
                              </span>

                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => startEditingItem(section.key, item)}
                                style={{ minHeight: '28px', padding: '0 0.45rem' }}
                                title={`Rename ${item}`}
                                aria-label={`Rename ${item}`}
                              >
                                <Pencil size={13} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleDeleteItem(section.key, item)}
                                style={{ minHeight: '28px', padding: '0 0.45rem', color: 'var(--bad-text)' }}
                                title={`Remove ${item}`}
                                aria-label={`Remove ${item}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Stations / Branches Editable Card */}
        {showBranchesCard && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.95rem',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    flexShrink: 0
                  }}
                >
                  <Building size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Stations &amp; Sub-Offices
                    </h2>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '999px'
                      }}
                    >
                      {branches.length}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                    District stations and sector sub-offices for vehicle and employee assignment
                  </p>
                </div>
              </div>
            </div>

            {/* Add Station Form */}
            <form
              onSubmit={handleAddStation}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 1.2fr auto',
                gap: '0.5rem',
                background: 'var(--bg-surface-subtle)',
                padding: '0.55rem',
                borderRadius: '6px',
                border: '1px solid var(--border-light)'
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Station / Sector (e.g. Matalam Sector)"
                value={newBranchMunicipality}
                onChange={(e) => setNewBranchMunicipality(e.target.value)}
                style={{ minHeight: '34px', fontSize: '0.82rem', background: 'var(--bg-card)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Office Name (e.g. Matalam Area Sub-Office)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                style={{ minHeight: '34px', fontSize: '0.82rem', background: 'var(--bg-card)' }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ minHeight: '34px', padding: '0 0.85rem', flexShrink: 0 }}
              >
                <Plus size={14} /> Add
              </button>
            </form>

            {/* Stations List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                maxHeight: activeCategoryFilter === 'ALL' ? '320px' : 'none',
                overflowY: 'auto',
                paddingRight: '2px'
              }}
            >
              {branches
                .filter(b => !q || b.municipality.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
                .map((b) => {
                  const isEditing = editingBranchId === b.id;
                  const vehCount = vehicles.filter(v => v.branchId === b.id).length;
                  const empCount = drivers.filter(d => d.branchId === b.id).length;

                  return (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        background: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px'
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={editingBranchForm.municipality}
                            onChange={(e) => setEditingBranchForm(prev => ({ ...prev, municipality: e.target.value }))}
                            placeholder="Municipality / Sector"
                            style={{ minHeight: '30px', fontSize: '0.82rem', flex: 1 }}
                            autoFocus
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={editingBranchForm.name}
                            onChange={(e) => setEditingBranchForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Sub-Office Name"
                            style={{ minHeight: '30px', fontSize: '0.82rem', flex: 1.2 }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => saveEditedBranch(b.id)}
                            style={{ minHeight: '30px', padding: '0 0.6rem' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditingBranchId(null)}
                            style={{ minHeight: '30px', padding: '0 0.5rem' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {b.municipality}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {b.name}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                background: 'var(--bg-surface-subtle)',
                                border: '1px solid var(--border-light)',
                                padding: '0.12rem 0.48rem',
                                borderRadius: '4px'
                              }}
                            >
                              {empCount} emp • {vehCount} veh
                            </span>

                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => startEditingBranch(b)}
                              style={{ minHeight: '28px', padding: '0 0.45rem' }}
                              title={`Edit ${b.municipality}`}
                            >
                              <Pencil size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleDeleteBranch(b)}
                              style={{ minHeight: '28px', padding: '0 0.45rem', color: 'var(--bad-text)' }}
                              title={`Remove ${b.municipality}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

