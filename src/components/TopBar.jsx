import React, { useState, useEffect, useRef } from 'react';
import { useFleet } from '../context/FleetContext';
import { parseVehicleAlert } from '../utils/formatters';
import {
  Search,
  Bell,
  ChevronDown,
  Type,
  Contrast,
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';

const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Readiness & active alerts' },
  directory: { title: 'Fleet Directory', subtitle: 'Master vehicle inventory' },
  profiling: { title: 'Car Profiling', subtitle: 'Technical dossiers & specs' },
  drivers: { title: 'Employees', subtitle: 'Workforce roster & vehicle authorizations' },
  bookings: { title: 'Calendar', subtitle: 'Dispatches & timetable' },
  health: { title: 'Ongoing Health', subtitle: 'Change oil intervals, mileage countdowns & vehicle diagnostics' },
  maintenance: { title: 'Maintenance', subtitle: 'Active maintenance steps, completed service & assigned technicians' },
  'map-view': { title: 'Branch Map', subtitle: 'Geospatial deployment corridor' },
  auditing: { title: 'Repair Ledger', subtitle: 'Audited expenses & vouchers' },
  editables: { title: 'Editables', subtitle: 'Manage departments, titles, stations & classifications' },
  governance: { title: 'Security & Audit', subtitle: 'Role permissions & logs' }
};

const ROLES = [
  { id: 'DIRECTOR', label: 'Operations Director' },
  { id: 'DISPATCHER', label: 'Branch Dispatcher' },
  { id: 'MAINTENANCE', label: 'Maintenance Officer' }
];

const initials = (label) =>
  label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export const TopBar = () => {
  const {
    activeTab,
    settings,
    setRole,
    toggleSeniorMode,
    toggleHighContrast,
    resetToFactoryDefaults,
    globalSearch,
    setGlobalSearch,
    vehicles,
    setSelectedVehicle,
    setModalType
  } = useFleet();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const meta = PAGE_META[activeTab] || PAGE_META.dashboard;
  const flagged = vehicles.filter(v => v.urgentAlert || v.status !== 'ACTIVE');
  const role = ROLES.find(r => r.id === settings.currentRole) || ROLES[0];

  const submitSearch = (e) => {
    e.preventDefault();
  };

  return (
    <header className="app-topbar">
      <div className="topbar-title-block">
        <h1 className="topbar-page-title">{meta.title}</h1>
        <p className="topbar-page-subtitle">{meta.subtitle}</p>
      </div>

      <div className="topbar-center">
        <form className="topbar-search-form" onSubmit={submitSearch} role="search">
          <Search size={17} className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            className="topbar-search-input"
            placeholder="Search vehicle, plate, or model..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label="Search the fleet"
          />
          <span className="search-cmd-chip">{isMac ? '⌘ K' : 'Ctrl K'}</span>
        </form>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="topbar-icon-btn"
          onClick={toggleHighContrast}
          aria-pressed={settings.highContrast}
          title="Toggle high contrast"
          aria-label="Toggle high contrast"
        >
          <Contrast size={19} />
        </button>

        <div className="relative-container" ref={notifRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            aria-label={`${flagged.length} fleet alerts`}
            aria-expanded={notifOpen}
          >
            <Bell size={19} />
            {flagged.length > 0 && <span className="notification-dot">{flagged.length}</span>}
          </button>

          {notifOpen && (
            <div className="topbar-dropdown-panel notif-dropdown">
              <div className="dropdown-header">
                <strong>Fleet alerts</strong>
                <span className="badge badge-warning">{flagged.length}</span>
              </div>
              <div className="dropdown-body">
                {flagged.length === 0 ? (
                  <div className="empty-notif">All vehicles are ready.</div>
                ) : (
                  flagged.slice(0, 6).map(v => {
                    const parsed = parseVehicleAlert(v);
                    return (
                      <div
                        key={v.id}
                        className="notif-item"
                        style={{ cursor: 'default' }}
                      >
                        <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <strong style={{ fontSize: '0.82rem' }}>{v.code} · {v.plateNo}</strong>
                            <span className={`badge ${parsed.badgeType}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                              {parsed.badgeText}
                            </span>
                          </span>
                          <span className="notif-desc" style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {parsed.issueText}
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative-container" ref={profileRef}>
          <button
            type="button"
            className="topbar-profile-chip"
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            aria-expanded={profileOpen}
          >
            <span className="profile-avatar-circle">{initials(role.label)}</span>
            <span className="profile-text-cluster">
              <span className="profile-user-name">{role.label}</span>
              <span className="profile-user-role">Active Role</span>
            </span>
            <ChevronDown size={15} color="#9CA3AF" />
          </button>

          {profileOpen && (
            <div className="topbar-dropdown-panel profile-dropdown">
              <div className="dropdown-section">
                <div className="dropdown-section-label">Switch role</div>
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`role-select-item ${settings.currentRole === r.id ? 'active' : ''}`}
                    onClick={() => { setRole(r.id); setProfileOpen(false); }}
                  >
                    <span>{r.label}</span>
                    {settings.currentRole === r.id && <Check size={15} />}
                  </button>
                ))}
              </div>

              <div className="dropdown-section">
                <div className="dropdown-section-label">Accessibility</div>
                <button
                  type="button"
                  className={`role-select-item ${settings.seniorMode ? 'active' : ''}`}
                  onClick={() => { toggleSeniorMode(); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Type size={15} /> Large text
                  </span>
                  {settings.seniorMode && <Check size={15} />}
                </button>
              </div>

              <div className="dropdown-footer-actions">
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => { resetToFactoryDefaults(); setProfileOpen(false); }}
                >
                  <RotateCcw size={14} /> Reset demo data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
