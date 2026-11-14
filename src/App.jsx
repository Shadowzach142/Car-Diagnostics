import React from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { FleetDirectory } from './components/FleetDirectory';
import { OngoingHealth } from './components/OngoingHealth';
import { MaintenanceHub } from './components/MaintenanceHub';
import { MapView } from './components/MapView';
import { RepairArchive } from './components/RepairArchive';
import { SecurityAudit } from './components/SecurityAudit';
import { EditablesConfig } from './components/EditablesConfig';

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
  const { activeTab } = useFleet();

  return (
    <div className="modern-layout-container">
      <Sidebar />

      <div className="main-content-column">
        <TopBar />

        <main className="main-viewport-canvas" id="main-content" tabIndex={-1}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'directory' && <FleetDirectory />}
          {activeTab === 'profiling' && <VehicleProfiling />}
          {activeTab === 'drivers' && <DriverRoster />}
          {activeTab === 'bookings' && <BookingsCalendar />}
          {activeTab === 'health' && <OngoingHealth />}
          {activeTab === 'maintenance' && <MaintenanceHub />}
          {activeTab === 'map-view' && <MapView />}
          {activeTab === 'auditing' && <RepairArchive />}
          {activeTab === 'editables' && <EditablesConfig />}
          {activeTab === 'governance' && <SecurityAudit />}
        </main>
      </div>

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
