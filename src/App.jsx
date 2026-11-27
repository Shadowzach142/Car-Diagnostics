import React from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { OngoingHealth } from './components/OngoingHealth';
import { MaintenanceHub } from './components/MaintenanceHub';
import { RepairArchive } from './components/RepairArchive';
import { ArchiveHub } from './components/ArchiveHub';
import { EditablesConfig } from './components/EditablesConfig';
import { MechanicProfile } from './components/MechanicProfile';
import { DriverDashboard } from './components/DriverDashboard';
import { DriverVehicles } from './components/DriverVehicles';
import { DriverTrips } from './components/DriverTrips';
import { DriverProfile } from './components/DriverProfile';
import { LogTripModal } from './components/modals/LogTripModal';

import { VehicleDetailModal } from './components/modals/VehicleDetailModal';
import { ReassignModal } from './components/modals/ReassignModal';
import { NewWorkOrderModal } from './components/modals/NewWorkOrderModal';
import { CompleteWorkOrderModal } from './components/modals/CompleteWorkOrderModal';
import { AddVehicleModal } from './components/modals/AddVehicleModal';
import { ReceiptVoucherModal } from './components/modals/ReceiptVoucherModal';
import { AddLedgerModal } from './components/modals/AddLedgerModal';
import { BookingModal } from './components/modals/BookingModal';
import { BookingDetailModal } from './components/modals/BookingDetailModal';
import { BookingsCalendar } from './components/BookingsCalendar';
import { VehicleProfiling } from './components/VehicleProfiling';
import { DriverRoster } from './components/DriverRoster';
import { AddDriverModal } from './components/modals/AddDriverModal';
import { DriverDetailModal } from './components/modals/DriverDetailModal';
import { ReassignDriverModal } from './components/modals/ReassignDriverModal';
import { VehicleAccessModal } from './components/modals/VehicleAccessModal';
import { EmployeeAccessModal } from './components/modals/EmployeeAccessModal';

const AppContent = () => {
  const { activeTab, settings } = useFleet();
  const isMechanic = settings?.currentRole === 'MECHANIC';
  const isDriver = settings?.currentRole === 'DRIVER';
  const mechanicAllowedTabs = ['dashboard', 'profiling', 'bookings', 'health', 'maintenance', 'auditing', 'profile'];
  const driverAllowedTabs = ['dashboard', 'profiling', 'bookings', 'auditing', 'profile'];
  const effectiveTab = (isMechanic && !mechanicAllowedTabs.includes(activeTab)) || (isDriver && !driverAllowedTabs.includes(activeTab))
    ? 'dashboard'
    : activeTab;

  return (
    <div className="modern-layout-container">
      <Sidebar />

      <div className="main-content-column">
        <TopBar />

        <main className="main-viewport-canvas" id="main-content" tabIndex={-1}>
          <div key={effectiveTab} className="tab-page-enter">
            {effectiveTab === 'dashboard' && (isDriver ? <DriverDashboard /> : <Dashboard />)}
            {effectiveTab === 'profiling' && (isDriver ? <DriverVehicles /> : <VehicleProfiling />)}
            {effectiveTab === 'drivers' && <DriverRoster />}
            {effectiveTab === 'bookings' && <BookingsCalendar />}
            {effectiveTab === 'health' && <OngoingHealth />}
            {effectiveTab === 'maintenance' && <MaintenanceHub />}
            {effectiveTab === 'auditing' && (isDriver ? <DriverTrips /> : <RepairArchive />)}
            {effectiveTab === 'archive' && <ArchiveHub />}
            {effectiveTab === 'editables' && <EditablesConfig />}
            {effectiveTab === 'profile' && (isDriver ? <DriverProfile /> : <MechanicProfile />)}
          </div>
        </main>
      </div>

      <LogTripModal />
      <VehicleDetailModal />
      <ReassignModal />
      <NewWorkOrderModal />
      <CompleteWorkOrderModal />
      <AddVehicleModal />
      <ReceiptVoucherModal />
      <AddLedgerModal />
      <BookingModal />
      <BookingDetailModal />
      <AddDriverModal />
      <DriverDetailModal />
      <ReassignDriverModal />
      <VehicleAccessModal />
      <EmployeeAccessModal />
    </div>
  );
};

export default function App() {
  return (
    <FleetProvider>
      <AppContent />
    </FleetProvider>
  );
}
