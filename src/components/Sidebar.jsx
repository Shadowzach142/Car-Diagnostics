import React from 'react';
import { useFleet } from '../context/FleetContext';
import {
  LayoutDashboard,
  Truck,
  Car,
  CalendarDays,
  Activity,
  Wrench,
  MapPin,
  Receipt,
  ShieldCheck,
  Users,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const COMPLETED = 'Completed / Released';

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    workOrders,
    bookings
  } = useFleet();

  const openOrders = workOrders.filter(w => w.status !== COMPLETED).length;
  const activeBookingsCount = (bookings || []).filter(b => b.status !== 'Completed').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Fleet Directory', icon: Truck },
    { id: 'profiling', label: 'Car Profiling', icon: Car },
    { id: 'drivers', label: 'Employees', icon: Users },
    { id: 'bookings', label: 'Calendar', icon: CalendarDays, badge: activeBookingsCount },
    { id: 'health', label: 'Ongoing Health', icon: Activity },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, badge: openOrders },
    { id: 'map-view', label: 'Branch Map', icon: MapPin },
    { id: 'auditing', label: 'Repair Ledger', icon: Receipt },
    { id: 'editables', label: 'Editables', icon: Sliders },
    { id: 'governance', label: 'Security & Audit', icon: ShieldCheck }
  ];

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
