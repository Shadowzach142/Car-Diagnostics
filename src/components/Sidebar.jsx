import React from 'react';
import { useFleet } from '../context/FleetContext';
import {
  LayoutDashboard,
  Car,
  CalendarDays,
  Activity,
  Wrench,
  FileText,
  FolderArchive,
  Users,
  User,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

const isExpiringOrExpired = (expiryStr) => {
  if (!expiryStr) return false;
  const exp = new Date(expiryStr);
  if (isNaN(exp)) return false;
  const diffDays = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays <= 90;
};

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    vehicles = [],
    drivers = [],
    workOrders,
    bookings,
    settings
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechShort = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();

  const visibleWorkOrders = isMechanic
    ? workOrders.filter(w => (w.assignedMechanic || '').split(' (')[0].trim().toLowerCase() === mechShort)
    : workOrders;

  const openOrders = visibleWorkOrders.filter(w => w.status !== COMPLETED).length;
  const visibleBookings = isMechanic
    ? (bookings || []).filter(b => b.type === 'MAINTENANCE' && (b.driver || '').split(' (')[0].trim().toLowerCase() === mechShort)
    : (bookings || []);
  const activeBookingsCount = visibleBookings.filter(b => b.status !== 'Completed').length;

  let unresolvedDocsCount = 0;
  if (!isMechanic) {
    (vehicles || []).forEach(v => {
      if (isExpiringOrExpired(v.insuranceExpiryDate)) unresolvedDocsCount += 1;
      if (isExpiringOrExpired(v.registrationExpiryDate)) unresolvedDocsCount += 1;
    });
  }

  const unresolvedLicensesCount = !isMechanic
    ? (drivers || []).filter(d => isExpiringOrExpired(d.licenseExpiry)).length
    : 0;

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiling', label: 'Car Profiling', icon: Car, badge: unresolvedDocsCount },
    { id: 'drivers', label: 'Employees', icon: Users, badge: unresolvedLicensesCount },
    { id: 'bookings', label: 'Calendar', icon: CalendarDays, badge: activeBookingsCount },
    { id: 'health', label: 'Ongoing Health', icon: Activity },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, badge: openOrders },
    { id: 'auditing', label: 'Reports', icon: FileText },
    { id: 'archive', label: 'Archive', icon: FolderArchive },
    { id: 'editables', label: 'Editables', icon: Sliders }
  ];

  const navItems = isMechanic
    ? [
        ...allNavItems.filter(item => ['dashboard', 'profiling', 'bookings', 'health', 'maintenance', 'auditing'].includes(item.id)),
        { id: 'profile', label: 'My Profile', icon: User }
      ]
    : allNavItems;

  return (
    <aside
      className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-head">
        {!sidebarCollapsed && <span className="sidebar-head-label">Menu</span>}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.badge > 0;

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-item-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span className="nav-item-label">{item.label}</span>
              {hasBadge && <span className="nav-item-badge">{item.badge}</span>}
              {hasBadge && <span className="nav-item-dot" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
