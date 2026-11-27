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
  AlertTriangle,
  X,
  Activity,
  Wrench,
  FileText,
  CalendarDays,
  CheckCheck
} from 'lucide-react';

const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Readiness & active alerts' },
  profiling: { title: 'Car Profiling', subtitle: 'Technical dossiers & specs' },
  drivers: { title: 'Employees', subtitle: 'Workforce roster & vehicle authorizations' },
  bookings: { title: 'Calendar', subtitle: 'Dispatches & timetable' },
  health: { title: 'Ongoing Health', subtitle: 'Change oil intervals, mileage countdowns & vehicle diagnostics' },
  maintenance: { title: 'Maintenance', subtitle: 'Active maintenance steps, completed service & assigned technicians' },
  auditing: { title: 'Reports', subtitle: 'Current month vehicle & driver service reports' },
  archive: { title: 'Archive', subtitle: 'Monthly categorized reports, maintenance history, driver dispatches & registration renewals' },
  editables: { title: 'Editables', subtitle: 'Manage departments, titles, stations & classifications' },
  profile: { title: 'My Profile', subtitle: 'Mechanic profile & assigned workload' }
};

const ROLES = [
  { id: 'DIRECTOR', label: 'Operations Director' },
  { id: 'MECHANIC', label: 'Assigned Mechanic' },
  { id: 'DRIVER', label: 'Authorized Driver' }
];

// Driver-specific wording for shared tabs
const DRIVER_PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Your vehicles, trips & license at a glance' },
  profiling: { title: 'Car Profiling', subtitle: 'Vehicles you are authorized to drive' },
  bookings: { title: 'Calendar', subtitle: 'Vehicle availability & your license expiry' },
  auditing: { title: 'Reports', subtitle: 'Your trip logs & mileage' },
  profile: { title: 'My Profile', subtitle: 'Driver details & license' }
};

const initials = (label) =>
  label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export const TopBar = () => {
  const {
    activeTab,
    setActiveTab,
    settings,
    setRole,
    setCurrentMechanic,
    setCurrentDriver,
    activeDriver,
    toggleSeniorMode,
    toggleHighContrast,
    resetToFactoryDefaults,
    globalSearch,
    setGlobalSearch,
    editables = {},
    notifications = [],
    unreadNotificationCount = 0,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    setFocusedHealthVehicleId,
    setFocusedProfileVehicleId,
    setFocusedMaintenanceIds,
    drivers = [],
    setSelectedDriver,
    setModalType
  } = useFleet();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);

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

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const isMechanic = settings.currentRole === 'MECHANIC';
  const isDriver = settings.currentRole === 'DRIVER';
  const meta = (isDriver && DRIVER_PAGE_META[activeTab]) || PAGE_META[activeTab] || PAGE_META.dashboard;
  const mechanicsList = editables.mechanics || [];
  const activeMechanic = settings.currentMechanic || mechanicsList[0] || '';
  const activeMechShort = activeMechanic.split(' (')[0].trim();

  const visibleNotifications = notifFilter === 'UNREAD'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleOpenNotification = (notif) => {
    if (markNotificationRead) markNotificationRead(notif.id);
    setNotifOpen(false);
    if (notif.targetTab === 'profiling' && notif.targetEntityId && setFocusedProfileVehicleId) {
      setFocusedProfileVehicleId(notif.targetEntityId);
    } else if (notif.targetTab === 'health' && notif.targetEntityId && setFocusedHealthVehicleId) {
      setFocusedHealthVehicleId(notif.targetEntityId);
    } else if (notif.targetTab === 'maintenance' && notif.targetEntityId && setFocusedMaintenanceIds) {
      setFocusedMaintenanceIds([notif.targetEntityId]);
    } else if (notif.targetEntityType === 'DRIVER' && notif.targetEntityId) {
      if (isDriver) {
        // Drivers get their own profile, never the Director's employee modal
        if (setActiveTab) setActiveTab('profile');
        return;
      }
      const targetDriver = drivers.find(d => d.id === notif.targetEntityId);
      if (targetDriver && setSelectedDriver && setModalType) {
        setSelectedDriver(targetDriver);
        setModalType('driver-detail');
      }
    }
    if (notif.targetTab && setActiveTab) {
      setActiveTab(notif.targetTab);
    }
  };

  const renderNotifIcon = (notif) => {
    const color = notif.severity === 'CRITICAL'
      ? '#DC2626'
      : notif.severity === 'WARNING'
      ? '#D97706'
      : '#475569';
    if (notif.type === 'HEALTH_ALERT') return <Activity size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />;
    if (notif.type === 'MAINTENANCE') return <Wrench size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />;
    if (notif.type === 'SCHEDULE') return <CalendarDays size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />;
    if (notif.type === 'REPORT') return <FileText size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />;
    return <AlertTriangle size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />;
  };

  const role = ROLES.find(r => r.id === settings.currentRole) || ROLES[0];
  const displayName = isMechanic
    ? (activeMechShort || role.label)
    : isDriver
    ? (activeDriver?.name || role.label)
    : role.label;

  const submitSearch = (e) => {
    e.preventDefault();
  };

  return (
    <>
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
          className="topbar-icon-btn mobile-search-toggle"
          onClick={() => {
            setMobileSearchOpen((o) => !o);
            setNotifOpen(false);
            setProfileOpen(false);
          }}
          aria-pressed={mobileSearchOpen || Boolean(globalSearch)}
          aria-label="Toggle fleet search"
          title="Search fleet"
        >
          {mobileSearchOpen ? <X size={19} /> : <Search size={19} />}
        </button>

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
            aria-label={`${unreadNotificationCount} unread notifications`}
            aria-expanded={notifOpen}
          >
            <Bell size={19} />
            {unreadNotificationCount > 0 && (
              <span className="notification-dot">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="topbar-dropdown-panel notif-dropdown">
              <div className="dropdown-header" style={{ flexWrap: 'wrap', gap: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <strong>Notifications</strong>
                  <span className={`badge ${unreadNotificationCount > 0 ? 'badge-danger' : 'badge-neutral'}`}>
                    {unreadNotificationCount} unread
                  </span>
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead && markAllNotificationsRead()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => setNotifFilter('ALL')}
                  style={{
                    flex: 1,
                    padding: '0.28rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    background: notifFilter === 'ALL' ? '#1E293B' : 'var(--bg-surface)',
                    color: notifFilter === 'ALL' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('UNREAD')}
                  style={{
                    flex: 1,
                    padding: '0.28rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    background: notifFilter === 'UNREAD' ? '#1E293B' : 'var(--bg-surface)',
                    color: notifFilter === 'UNREAD' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Unread ({unreadNotificationCount})
                </button>
              </div>

              <div className="dropdown-body">
                {visibleNotifications.length === 0 ? (
                  <div className="empty-notif">
                    {notifFilter === 'UNREAD' ? 'All caught up — no unread notifications.' : 'No active notifications.'}
                  </div>
                ) : (
                  visibleNotifications.slice(0, 15).map(n => (
                    <div
                      key={n.id}
                      className="notif-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenNotification(n);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        background: n.isRead ? 'transparent' : 'var(--bg-surface-subtle)',
                        alignItems: 'flex-start'
                      }}
                    >
                      {renderNotifIcon(n)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem', marginBottom: 2 }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: n.isRead ? 600 : 800 }}>
                            {n.title}
                          </strong>
                          {!n.isRead && (
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: n.severity === 'CRITICAL' ? '#DC2626' : '#65A30D',
                                flexShrink: 0
                              }}
                              title="Unread"
                            />
                          )}
                        </span>
                        <span className="notif-desc" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                          {n.message}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dismissNotification) dismissNotification(n.id);
                        }}
                        aria-label="Dismiss notification"
                        title="Dismiss"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '2px',
                          flexShrink: 0
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
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
            <span className="profile-avatar-circle">{initials(displayName)}</span>
            <span className="profile-text-cluster">
              <span className="profile-user-name">{displayName}</span>
              <span className="profile-user-role">{isMechanic ? 'Assigned Mechanic' : isDriver ? 'Authorized Driver' : 'Active Role'}</span>
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
                    onClick={() => {
                      setRole(r.id);
                      if (r.id === 'DIRECTOR') setProfileOpen(false);
                    }}
                  >
                    <span>{r.label}</span>
                    {settings.currentRole === r.id && <Check size={15} />}
                  </button>
                ))}
              </div>

              {isMechanic && mechanicsList.length > 0 && (
                <div className="dropdown-section">
                  <div className="dropdown-section-label">Active Mechanic</div>
                  <select
                    className="form-select"
                    value={activeMechanic}
                    onChange={(e) => {
                      setCurrentMechanic(e.target.value);
                      setProfileOpen(false);
                    }}
                    aria-label="Select active mechanic"
                    style={{ fontSize: '0.8rem', minHeight: '34px' }}
                  >
                    {mechanicsList.map(m => (
                      <option key={m} value={m}>{m.split(' (')[0].trim()}</option>
                    ))}
                  </select>
                </div>
              )}

              {isDriver && drivers.length > 0 && (
                <div className="dropdown-section">
                  <div className="dropdown-section-label">Active Driver</div>
                  <select
                    className="form-select"
                    value={activeDriver?.id || ''}
                    onChange={(e) => {
                      setCurrentDriver(e.target.value);
                      setProfileOpen(false);
                    }}
                    aria-label="Select active driver"
                    style={{ fontSize: '0.8rem', minHeight: '34px' }}
                  >
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
    {(mobileSearchOpen || Boolean(globalSearch)) && (
      <div className="topbar-mobile-search-row">
        <form className="topbar-search-form" onSubmit={submitSearch} role="search">
          <Search size={17} className="search-icon" />
          <input
            ref={mobileSearchRef}
            type="search"
            className="topbar-search-input"
            placeholder="Search vehicle, plate, or model..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label="Search the fleet"
          />
          {(globalSearch || mobileSearchOpen) && (
            <button
              type="button"
              className="topbar-icon-btn"
              style={{ width: '30px', height: '30px' }}
              onClick={() => {
                if (globalSearch) setGlobalSearch('');
                else setMobileSearchOpen(false);
              }}
              aria-label={globalSearch ? 'Clear search' : 'Close search'}
            >
              <X size={15} />
            </button>
          )}
        </form>
      </div>
    )}
    </>
  );
};
