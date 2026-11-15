import React, { useState, useMemo } from 'react';
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
  Eye
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
            gap: '1.15rem'
          }}>
            {filteredDrivers.map(d => {
              const clearedVehicles = getEmployeeVehiclesWithAccess(d, vehicles);
              const branch = branches.find(b => b.id === d.branchId);
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
                    border: '1px solid var(--border-light)',
                    borderRadius: '14px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Top Row: Avatar + Name + Category Pill + Title + ID Pill + Dept */}
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

                    {/* Vehicles with Access Chips Row (Matches Car Profiling's Authorized Chips Row) */}
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

                    {/* Clean Icon-Led Info Rows (Matches Car Profiling) */}
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
                    </div>
                  </div>

                  {/* Card Footer: 2-Button Equal Grid (Matches Car Profiling) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
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
