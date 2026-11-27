import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  Building2,
  ChevronRight,
  ArrowLeft,
  Check
} from 'lucide-react';

const getInitials = (name) =>
  (name || '')
    .replace(/^Engr\.\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OP';

/**
 * Reusable Personnel Trigger Card + Department-Box Employee Directory Popup.
 * Standard COTELCO UI pattern (replaces long native <select> employee dropdowns).
 */
export const PersonnelPickerField = ({
  label = 'Assigned Personnel',
  value = '',
  onChange,
  drivers = [],
  departments = [],
  readOnly = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);

  const normalizedValue = (value || '').split(' (')[0].trim().toLowerCase();

  const matchedDriver = useMemo(
    () => drivers.find((d) => (d.name || '').trim().toLowerCase() === normalizedValue) || null,
    [drivers, normalizedValue]
  );

  const displayName = matchedDriver?.name || (value || 'Select Personnel').split(' (')[0].trim();
  const displaySub = matchedDriver
    ? `${matchedDriver.title || matchedDriver.role} · ${matchedDriver.department || 'Technical / Engineering'}`
    : (value ? 'Assigned Staff' : 'Click Change to choose from directory');

  const deptGroups = useMemo(() => {
    const known = [...departments];
    drivers.forEach((d) => {
      const dept = d.department || 'Technical / Engineering';
      if (!known.includes(dept)) known.push(dept);
    });
    return known.map((name) => ({
      name,
      members: drivers.filter((d) => (d.department || 'Technical / Engineering') === name)
    }));
  }, [drivers, departments]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = selectedDept
      ? drivers.filter((d) => (d.department || 'Technical / Engineering') === selectedDept)
      : drivers;
    if (!q) return list;
    return list.filter((d) =>
      [d.name, d.employeeId, d.title, d.role, d.department]
        .some((f) => String(f || '').toLowerCase().includes(q))
    );
  }, [drivers, selectedDept, search]);

  const handleOpen = () => {
    if (readOnly) return;
    setSearch('');
    setSelectedDept(null);
    setOpen(true);
  };

  const handleSelect = (driver) => {
    onChange(driver.name, driver);
    setOpen(false);
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      {label && <label className="form-label">{label}</label>}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          padding: '0.5rem 0.7rem',
          borderRadius: '10px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#1E293B',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.74rem',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            {getInitials(displayName)}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displaySub}
            </div>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleOpen}
            style={{ flexShrink: 0 }}
          >
            <Users size={13} /> Change
          </button>
        )}
      </div>

      {open && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1300 }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-box-header">
              <div className="modal-box-title">
                <Users size={18} />
                <span>Select Assigned Personnel</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setOpen(false)}
                aria-label="Close personnel picker"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)'
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee name, ID, role, or department..."
                  style={{ paddingLeft: '2.2rem' }}
                  autoFocus
                />
              </div>

              {!search.trim() && !selectedDept ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
                    gap: '0.65rem'
                  }}
                >
                  {deptGroups.map((group) => (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => setSelectedDept(group.name)}
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
                        <Building2 size={16} color="var(--text-secondary)" />
                        <ChevronRight size={15} color="var(--text-tertiary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {group.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {group.members.length} {group.members.length === 1 ? 'Employee' : 'Employees'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {selectedDept && !search.trim() && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() => setSelectedDept(null)}
                      >
                        <ArrowLeft size={13} /> All departments
                      </button>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {selectedDept} ({filteredMembers.length})
                      </span>
                    </div>
                  )}

                  {filteredMembers.length === 0 ? (
                    <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                      No matching employees found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {filteredMembers.map((d) => {
                        const isSelected = (d.name || '').trim().toLowerCase() === normalizedValue;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleSelect(d)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.65rem',
                              padding: '0.6rem 0.8rem',
                              borderRadius: '9px',
                              border: isSelected ? '1.5px solid var(--text-main)' : '1px solid var(--border-light)',
                              background: isSelected ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: '#1E293B',
                                  color: '#FFFFFF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}
                              >
                                {getInitials(d.name)}
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                  {d.name}{' '}
                                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                    &bull; {d.employeeId}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                  {d.title || d.role} &bull; {d.department || 'Technical / Engineering'}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="var(--text-main)" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
