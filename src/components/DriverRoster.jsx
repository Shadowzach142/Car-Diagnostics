import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getEmployeeVehiclesWithAccess } from '../data/fleetData';
import {
  Users,
  Plus,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronRight,
  Truck,
  UserCheck
} from 'lucide-react';

export const DriverRoster = () => {
  const {
    editables = {},
    drivers = [],
    vehicles = [],
    branches = [],
    globalSearch,
    setModalType,
    setSelectedDriver
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
        {filteredDrivers.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <Users size={36} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>No employees match filter</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Try adjusting your branch or classification filters, or clear your search term.
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1rem'
          }}>
            {filteredDrivers.map(d => {
              const clearedVehicles = getEmployeeVehiclesWithAccess(d, vehicles);
              const branch = branches.find(b => b.id === d.branchId);
              const initials = d.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

              return (
                <div
                  key={d.id}
                  className="data-card"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Header: Avatar, Name & Employee ID, Role & Category */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
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

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                          {d.name} <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>&bull; {d.employeeId}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.title || d.role}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          {d.department || 'Technical / Engineering'} &bull; {d.category}
                        </div>
                      </div>
                    </div>

                    {/* Compact, Non-Flashy Vehicles with Access Button (Head Access Control) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver(d);
                        setModalType('employee-access');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      className="vehicle-access-trigger-btn"
                      title={`Manage vehicle access clearances for ${d.name}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Truck size={14} color="var(--text-secondary)" />
                        <span>Vehicles with Access ({clearedVehicles.length})</span>
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                        Manage <ChevronRight size={13} />
                      </span>
                    </button>

                    {/* Compact, Subtle Neutral 2-Box Info Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      marginBottom: '0.85rem'
                    }}>
                      {/* Box 1: Station */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          STATION
                        </span>
                        <span style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {branch?.municipality || 'Central HQ'}
                        </span>
                      </div>

                      {/* Box 2: Contact Phone */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.65rem'
                      }}>
                        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          CONTACT PHONE
                        </span>
                        <span className="mono" style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.phone || '0919-550-2211'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => {
                        setSelectedDriver(d);
                        setModalType('driver-detail');
                      }}
                      title="Open full employee profile"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table List View */
          <div className="table-wrap">
            <table className="data-table" aria-label="COTELCO employee roster">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role &amp; Classification</th>
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
