# COTELCO Fleet Management System — Official Workspace Rule Book

> **CRITICAL ARCHITECTURAL DIRECTIVE**:  
> **Target Backend Stack: Express.js (Node.js) + Microsoft SQL Server (`mssql`).**  
> **DO NOT implement the Express.js backend or connect to MS SQL Server until the user explicitly requests it.**  
> Keep all state management in `FleetContext.jsx` and `fleetData.js` fully functional, decoupled, and architecturally aligned with [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md) so future Express.js and MS SQL integration requires zero UI redesign.

---

## 1. System Overview & Core Principles

The COTELCO Fleet Management System is an enterprise utility fleet operations platform designed for electric cooperatives (Cotabato Electric Cooperative, Inc.). It handles vehicle profiling, workforce department organization and clearance, ongoing vehicle health tracking, preventive maintenance workflows, service reports, and audit governance.

### Architectural Tenets:
1. **Decoupled State Management**: All business logic and mutations run through `FleetContext.jsx`. Components never mutate state directly; they dispatch actions (`grantVehicleAccess`, `revokeVehicleAccess`, `createWorkOrder`, `updateWorkOrderStage`, `completeWorkOrder`, `addVehicle`, `updateVehicle`, `addEditableItem`, etc.).
2. **Future-Proof Data Contracts**: State objects conform to relational database normalization standards so they map directly to Microsoft SQL Server (MS SQL) tables without requiring data transformation layers.
3. **2-Role Operational Separation**: The app supports **Operations Director (`DIRECTOR`)** and **Assigned Mechanic (`MECHANIC`)** perspectives with strict tab, record, and action scoping.
4. **Clean, Non-Flashy, Mobile-Ready Enterprise UI**: Minimalist, understated typography, neutral palettes, stable layouts (no dynamic shifting), and full mobile responsiveness (`360px`–`768px` and desktop).

---

## 1.1 Application Structure (Project Map)

**Stack**: React 19 + Vite 8 (JavaScript/JSX), `lucide-react` icons. No router and no backend: navigation is a single `activeTab` string in `FleetContext`, and persistence is `localStorage`.

```
COTELCO/
├── AGENTS.md / RULEBOOK.md      # Rule books (always keep both in sync)
├── docs/
│   └── BACKEND_READINESS.md     # Express.js + MS SQL Server API contract & reference DDL (planning only)
├── index.html, vite.config.js, package.json
├── public/vehicles/*.jpg        # Vehicle photographs (referenced by ImageUrl)
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Shell: Sidebar + TopBar + active page + ALL modals
    ├── index.css                # Global design tokens, responsive rules, animations
    ├── context/
    │   └── FleetContext.jsx     # Single source of truth: state, mutations, audit logging, localStorage
    ├── data/
    │   └── fleetData.js         # Seed data (DEFAULT_*), constants, relational helper functions
    ├── utils/
    │   └── formatters.js        # Pure formatting/parsing helpers
    └── components/
        ├── Sidebar.jsx, TopBar.jsx          # Navigation + header + mobile search (PAGE_META in TopBar)
        ├── Dashboard.jsx                    # tab: dashboard   (Operator command center / Mechanic 4-panel overview)
        ├── VehicleProfiling.jsx             # tab: profiling   (label: Car Profiling)
        ├── DriverRoster.jsx                 # tab: drivers     (label: Employees — clickable department boxes)
        ├── BookingsCalendar.jsx             # tab: bookings    (label: Calendar — drag-drop + Expiry Dates Only filter)
        ├── OngoingHealth.jsx                # tab: health      (label: Ongoing Health)
        ├── MaintenanceHub.jsx               # tab: maintenance (label: Maintenance — 3-column Kanban)
        ├── RepairArchive.jsx                # tab: auditing    (label: Reports — current month)
        ├── ArchiveHub.jsx                   # tab: archive     (label: Archive — monthly categorized folders)
        ├── EditablesConfig.jsx              # tab: editables   (Editables: Departments, Titles, Stations, Classifications)
        ├── MechanicProfile.jsx              # tab: profile     (label: My Profile — License + My Archive for Mechanic)
        ├── common/                          # VehicleSelect.jsx, PersonnelPickerModal.jsx, DateRangeCalendarModal.jsx
        └── modals/                          # One file per dialog (see below)
```

### Navigation Map (`activeTab` → Component → Sidebar label → Role Access)
| `activeTab` | Component | Sidebar Label | Roles |
|---|---|---|---|
| `dashboard` | `Dashboard` | Dashboard | `DIRECTOR`, `MECHANIC` |
| `profiling` | `VehicleProfiling` | Car Profiling | `DIRECTOR`, `MECHANIC` (scoped) |
| `drivers` | `DriverRoster` | Employees | `DIRECTOR` |
| `bookings` | `BookingsCalendar` | Calendar | `DIRECTOR`, `MECHANIC` (scoped) |
| `health` | `OngoingHealth` | Ongoing Health | `DIRECTOR`, `MECHANIC` (read-only, scoped) |
| `maintenance` | `MaintenanceHub` | Maintenance | `DIRECTOR`, `MECHANIC` (scoped) |
| `auditing` | `RepairArchive` | Reports | `DIRECTOR`, `MECHANIC` (scoped) |
| `archive` | `ArchiveHub` | Archive | `DIRECTOR` |
| `editables` | `EditablesConfig` | Editables | `DIRECTOR` |
| `profile` | `MechanicProfile` | My Profile | `MECHANIC` |

> Internal IDs (`drivers`, `bookings`, `auditing`, `DriverRoster`, `BookingsCalendar`, `RepairArchive`, `selectedDriver`) are legacy names kept for stability. **Only user-visible labels were renamed** (Drivers → Employees, Bookings → Calendar, Repair Ledger → Reports). Do not rename internal identifiers casually; if you do, update `Sidebar.jsx`, `TopBar.jsx` (`PAGE_META`), `App.jsx`, and `FleetContext.jsx` together.

### Configurable Editables (`editables` State)
- Configurable dropdown lists (`departments`, `jobTitles`, `employeeClassifications`, `vehicleClassifications`, `serviceCategories`, `serviceTasksByCategory`, `mechanics`, `diagnosticTypes`) and `branches` (Stations) are managed in the **Editables** tab (`EditablesConfig.jsx`) via `FleetContext` (`addEditableItem`, `updateEditableItem`, `removeEditableItem`, `addBranch`, `updateBranch`, `removeBranch`).
- Default COTELCO Departments: `Area`, `Technical / Engineering`, `OGM - Office of the General Manager`, `Institutional Services`, `Audit Department`, `Finance`, `Core Plan`, `CPRST`.
- Departments can also be created directly from the **Add department** dashed box at the end of the **Employees** (`DriverRoster.jsx`) department grid via `addEditableItem('departments', ...)`.
- Renaming an option in `EditablesConfig` automatically cascades the new name across existing employee, vehicle, diagnostic, or work order records in `FleetContext`.

### Key Page Workflows
- **Operator & Mechanic Dashboards (`Dashboard.jsx`)**:
  - **Operator (`DIRECTOR`)**: Top action bar with quick shortcuts (**Ongoing Health**, **Reports**, **Car Profiling**), 4 interactive KPI cards (`Ongoing health alerts`, `Maintenance pipeline`, `Workforce & reports`, and red `Document & License Expiry` covering vehicle insurance, LTO registration, and driver's licenses), segmented **Alerts & Health** / **In Maintenance** / **Doc & License Expiry** panel, and right-hand **Availability & health** donut.
  - **Mechanic (`MECHANIC`)**: Generalized 4-panel all-at-once overview displaying `Maintenance Queue`, `Upcoming Schedules`, `Ongoing Vehicle Health`, and `Done & Recent Reports` without requiring extra clicks to inspect status.
- **Employees (`DriverRoster.jsx`)**:
  - Card view opens with **clickable Department Boxes** showing department name, `Building2` icon, employee count, red license-expiry alert badge (when any employee in the department is expired/expiring), and chevron, plus an empty dashed **Add department** box at the end of the grid for inline department creation.
  - Clicking a department box filters into that department (`departmentFilter`) with a **← All departments** back button and the employee cards grid inside (with Driver's License status badges and inline renewal in `DriverDetailModal.jsx`).
- **Calendar (`BookingsCalendar.jsx`)**:
  - Supports both `DIRECTOR` and `MECHANIC` scheduling (`+ Add Schedule` / `Add Calendar Note`), full drag-and-drop rescheduling in Month & Week views (preserving multi-day `date → deadline` spans), mechanic-to-director `SCHEDULE` diff notifications, and an **`Expiry Dates Only`** red-highlighted filter toggle for Insurance, LTO, and Driver's License expirations.
- **Ongoing Health (`OngoingHealth.jsx`) & Maintenance (`MaintenanceHub.jsx`)**:
  - **Ongoing Health**: Displays each vehicle in a clean 2-box card (`CHANGE OIL` and secondary diagnostic) showing remaining km / target date and assigned specialist. For `DIRECTOR`, clicking a box or `Edit Diagnostics` configures intervals by **Odometer (`KM`)**, **Calendar (`DATE`)**, or **Both (`BOTH`)** (`upsertVehicleDiagnostic`, `removeVehicleDiagnostic`). For `MECHANIC`, Ongoing Health is read-only and scoped to their assigned vehicles (no `Edit Diagnostics` or `To Maintenance` buttons).
  - **Maintenance**: 3-column Kanban (`For Maintenance` → `Under Maintenance` → `Done`) supporting Scheduled vs. Unscheduled orders, a slide-over detail drawer (`Next Service Interval` shown in the mechanic drawer only when `Done`), and **Additional Work / Parts Replaced** (quick-tap chips + custom items) that sync matching diagnostic resets back to Ongoing Health and append to Reports.
  - **Add Car to Maintenance (`NewWorkOrderModal.jsx`)**: Category-filtered task dropdown (`serviceTasksByCategory[category]`) plus an `Other` custom input option, `PersonnelPickerField` specialist selector, `DateRangeCalendarField` schedule picker, and next interval setting (KM / Date) without financial clutter.
- **Reports (`RepairArchive.jsx` & `AddLedgerModal.jsx`), Archive (`ArchiveHub.jsx`), & Mechanic Profile (`MechanicProfile.jsx`)**:
  - **Reports**: Current-month outside shop and in-house motorpool service/repair reports with photo attachments (`MECHANIC` scoped to own reports/assigned vehicles).
  - **Archive (`DIRECTOR`)**: Categorized monthly folders (`Reports Archive`, `Maintenance History`, `Driver History`, `Paperwork History`).
  - **My Profile (`MECHANIC`)**: Clean header with `Edit Profile` only (no tab redirects), Driver's License tracking card + edit fields (`updateMechanicProfile`), current-month `Recent Reports`, and a **`My Archive`** tab organizing the mechanic's own reports and maintenance history by month.

### Modal System & Mandatory Modern Interactive Pickers
- Modals are all mounted once in `App.jsx`; each renders `null` unless `modalType` (from `FleetContext`) matches its key. Open with `setModalType('<key>')`, close with `setModalType(null)`. Target records are passed via `selectedVehicle`, `selectedDriver`, or `selectedBooking`.
- Keys: `vehicle-detail`, `add-vehicle`, `vehicle-access`, `reassign`, `driver-detail`, `add-driver`, `employee-access`, `reassign-driver-vehicle`, `new-booking`, `booking-detail`, `new-wo`, `complete-wo`, `receipt-voucher`, `add-ledger` (files in `src/components/modals/`).
- **Mandatory Modern Pickers (Never Use Outdated Native Dropdowns / Raw Date Pairs for Schedules & Personnel)**:
  - **Personnel / Assigned Specialist Selection**: ALWAYS use `PersonnelPickerField` (`src/components/common/PersonnelPickerModal.jsx`) — an avatar summary card with a `Change` button that opens the searchable **Department-Box Employee Directory Popup**. Never use a long native `<select>` dropdown for employees or mechanics.
  - **Schedule Duration / Date Range Selection**: ALWAYS use `DateRangeCalendarField` (`src/components/common/DateRangeCalendarModal.jsx`) — a duration summary card (`Start → Due · X days`) with a `Change` button that opens the interactive **Click-and-Drag Calendar Popup** (with green `TODAY` indicator and `START` / `DUE` range highlight). Never use raw paired Start/End `<input type="date">` boxes for scheduling.
- **Adding a new modal**: create the file in `modals/`, mount it in `App.jsx`, trigger it with a unique `modalType`, and route all mutations through `FleetContext`.

### Data Flow (Must Be Preserved)
```
Component ──(dispatch action)──► FleetContext (mutation + audit log) ──► state ──► localStorage
    ▲                                                                       │
    └─────────────── useFleet() reads state & derived helpers ◄─────────────┘
```
- Relational helpers live in `fleetData.js` (e.g. `getVehicleAuthorizedDrivers`, `getEmployeeVehiclesWithAccess`) and must stay pure so they map to SQL joins/views later.
- Cross-module effects live in `FleetContext` only: creating a work order sets the vehicle `IN-SHOP` and adds a calendar entry; completing it restores `ACTIVE` and writes a repair voucher; every grant/revoke writes an audit log.
- **Ongoing Health (`Add Cars`) & Car Profiling (`AddVehicleModal` → `FleetContext.addVehicle`) Connection**: Clicking **Add Cars** in **Ongoing Health** opens a Car Profiling vehicle picker first so users select an existing profiled vehicle to add/configure diagnostic trackers (with a `+ Register New Car in Profiling` option if the vehicle is not in Car Profiling yet). Registering a new vehicle via `AddVehicleModal` writes one unified record to `vehicles[]` with initialized `diagnostics` (`buildDefaultVehicleDiagnostics`) and `authorizedDriverIds: []`, automatically connecting it across **Dashboard**, **Car Profiling**, **Ongoing Health**, **Employees**, **Calendar**, and **Security & Audit**.
- `localStorage` keys are versioned in `STORAGE_KEYS` (e.g. `flt_bookings_react_v4`). If a stored shape changes, add a migration in the `useState` initializer or bump the key.

### Field-Name Mapping (Frontend → MS SQL)
| Frontend (`fleetData.js`) | SQL column |
|---|---|
| `drivers[]` (UI label: Employees) | `dbo.Employees` |
| `driver.title` (`role` kept as mirror) | `JobTitle` |
| `driver.department` | `Department` |
| `driver.employeeId` | `CompanyIdNo` |
| `vehicle.authorizedDriverIds[]` | `dbo.VehicleAccess` rows |
| `bookings[]` | `dbo.Bookings` |
| `workOrders[]`, `repairArchive[]` | `dbo.WorkOrders`, `dbo.RepairVouchers` |
| `auditLogs[]` | `dbo.AuditLogs` |
| `notifications[]` | `dbo.Notifications` |

### Where To Change What
| Task | Edit |
|---|---|
| Rename a menu item / page title | `Sidebar.jsx` (`allNavItems`) + `TopBar.jsx` (`PAGE_META`) |
| Add a new page | New component in `components/`, add to `App.jsx`, `Sidebar.jsx`, `TopBar.jsx` |
| Add/rename an employee or vehicle field | `fleetData.js` seed, `FleetContext` add/update function, forms/modals, then the SQL tables in Section 2 |
| Change colors/spacing/mobile rules globally | CSS variables and media queries in `index.css` (follow Section 3) |
| Business rule or cross-tab effect | `FleetContext.jsx` only, never inside a component |

### Pre-Delivery Checklist
1. `npm run build` (`npm.cmd run build` on Windows) passes with zero errors.
2. State changes go through `FleetContext` and write an audit entry where applicable.
3. UI follows Section 3 (neutral colors, no flashy accents, no banned labels, mobile-safe grids with `min(100%, ...)`).
4. Never call React hooks (`useState`, `useMemo`, `useEffect`) after conditional early `return` statements (e.g. role-based returns).
5. Update **both** `AGENTS.md` and `RULEBOOK.md` (and `docs/BACKEND_READINESS.md` if data shapes or mutations change) whenever structure, schema, or UI standards change.
6. No Express.js server or MS SQL Server implementation code until the user explicitly asks.

---

## 2. MS SQL Database Schema Alignment Guide (For Future Integration)

When the company instructs the team to integrate with **Express.js + Microsoft SQL Server**, the database must follow this normalized schema. All frontend keys match these entities 1:1.

> **Complete Reference DDL**: See [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md) (§9) for the full, copy-ready SQL Server reference DDL, including sequences (`seq_WorkOrderNo`, `seq_VoucherNo`, `seq_BookingNo`, etc.), `dbo.Users`, `dbo.EditableOptions`, `dbo.EmployeeCertifications`, `dbo.EmployeeLicenseHistory`, `dbo.VehicleDriverHistory`, `dbo.VehicleRegistrationHistory`, `dbo.VehicleDiagnostics`, `dbo.WorkOrderChecklistItems`, `dbo.WorkOrderParts`, `dbo.Attachments`, `dbo.IncidentReports`, `dbo.NotificationUserState`, and `dbo.vw_ExpiryAlerts`. The tables below summarize the core entities.

### Entity-Relationship Diagram (ERD)

```
[Branches] 1 ────< [Vehicles] 1 ────< [WorkOrders] 1 ────< [WorkOrderParts]
   │                      │                  │
   │                      │                  └─── 1:1 ───> [RepairVouchers]
   │                      │
   │                      └───< [VehicleAccess] >─── 1 [Employees]
   │                                                         │
   └──< [Bookings] >─────────────────────────────────────────┘
```

### Table Definitions & MS SQL Data Types

#### 1. `dbo.Branches` (Sub-Offices & Districts)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `BranchId` | `VARCHAR(10)` | `PRIMARY KEY` | Unique ID (e.g. `BR-KID`, `BR-MID`) |
| `Code` | `VARCHAR(10)` | `NOT NULL, UNIQUE` | Short code |
| `Name` | `NVARCHAR(100)` | `NOT NULL` | Branch name |
| `Municipality` | `NVARCHAR(100)` | `NOT NULL` | Town/district |
| `Latitude` | `DECIMAL(9, 6)` | `NOT NULL` | GPS latitude |
| `Longitude` | `DECIMAL(9, 6)` | `NOT NULL` | GPS longitude |
| `ManagerName` | `NVARCHAR(100)` | `NULL` | District manager |
| `ContactPhone` | `VARCHAR(20)` | `NULL` | Station contact |

#### 2. `dbo.Vehicles` (Utility Fleet Assets)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `VehicleId` | `VARCHAR(10)` | `PRIMARY KEY` | System ID (e.g. `VEH-001`) |
| `Code` | `VARCHAR(20)` | `NOT NULL, UNIQUE` | Fleet code (e.g. `FLT-BT-01`) |
| `PlateNo` | `VARCHAR(20)` | `NOT NULL, UNIQUE` | LTO plate number |
| `MakeModel` | `NVARCHAR(100)` | `NOT NULL` | E.g. `Isuzu Forward FTR 16m Boom` |
| `ModelYear` | `INT` | `NOT NULL` | E.g. `2022` |
| `Classification` | `VARCHAR(50)` | `NOT NULL` | `Bucket Truck`, `Truck`, `Pickup`, `Van`, `Motorcycle` |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Station custody |
| `Status` | `VARCHAR(20)` | `NOT NULL` | `ACTIVE`, `IN-SHOP`, `OFFLINE` |
| `StatusReason` | `NVARCHAR(255)` | `NULL` | Current placement or repair note |
| `OdometerKm` | `INT` | `NOT NULL DEFAULT 0` | Current mileage |
| `OperatingHours` | `INT` | `NOT NULL DEFAULT 0` | Heavy equipment engine hours |
| `AcquisitionCost` | `DECIMAL(18, 2)` | `NOT NULL` | Purchase cost in PHP (₱) |
| `AcquisitionDate` | `DATE` | `NOT NULL` | Purchase date (`YYYY-MM-DD`) |
| `InsuranceAcquiredDate` | `DATE` | `NULL` | Policy start date |
| `InsuranceExpiryDate` | `DATE` | `NULL` | Policy expiration date |
| `RegistrationAcquiredDate` | `DATE` | `NULL` | LTO registration date |
| `RegistrationExpiryDate` | `DATE` | `NULL` | LTO expiration date |
| `OrCrNo` | `VARCHAR(50)` | `NULL` | LTO OR/CR certificate number |
| `AssetTag` | `VARCHAR(50)` | `NULL` | Cooperative fixed asset tag |
| `Vin` | `VARCHAR(50)` | `NULL` | Chassis / VIN number |
| `EngineNo` | `VARCHAR(50)` | `NULL` | Engine serial number |
| `Transmission` | `NVARCHAR(50)` | `NULL` | Transmission type |
| `FuelType` | `VARCHAR(30)` | `NULL` | `Diesel`, `Gasoline`, `Electric` |
| `DielectricRating` | `NVARCHAR(50)` | `NULL` | High-voltage insulation rating (e.g. `46 kV Category C`) |
| `ReachHeight` | `NVARCHAR(50)` | `NULL` | E.g. `16.2 Meters High-Reach` |
| `BucketCapacity` | `NVARCHAR(50)` | `NULL` | E.g. `250 kg (2-Man Insulated)` |
| `ImageUrl` | `NVARCHAR(255)` | `NULL` | Asset photograph path |

#### 3. `dbo.Employees` (Workforce & Operators)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `EmployeeId` | `VARCHAR(10)` | `PRIMARY KEY` | System ID (e.g. `DRV-001`) |
| `CompanyIdNo` | `VARCHAR(20)` | `NOT NULL, UNIQUE` | E.g. `EMP-2018-042` |
| `FullName` | `NVARCHAR(100)` | `NOT NULL` | Complete name |
| `JobTitle` | `NVARCHAR(100)` | `NOT NULL` | E.g. `Senior Aerial Boom Operator` |
| `Department` | `NVARCHAR(100)` | `NOT NULL` | E.g. `Technical / Engineering` |
| `Category` | `VARCHAR(50)` | `NOT NULL` | `Heavy Equipment`, `Light Commercial`, `Passenger / Emergency`, `Patrol Motorcycle` |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Assigned home station |
| `LicenseNo` | `VARCHAR(30)` | `NOT NULL` | LTO Driver's License number (e.g. `L02-12-882910`) |
| `LicenseType` | `NVARCHAR(60)` | `NOT NULL` | Restriction / DL codes (e.g. `Professional (RC 1, 2, 3)`) |
| `LicenseAcquiredDate` | `DATE` | `NULL` | Driver's license issued / last renewed date |
| `LicenseExpiryDate` | `DATE` | `NOT NULL` | Driver's license expiration date (`YYYY-MM-DD`) |
| `ContactPhone` | `VARCHAR(20)` | `NOT NULL` | Mobile / radio dispatch contact |
| `Email` | `NVARCHAR(100)` | `NULL` | Email address |
| `IsMechanic` | `BIT` | `NOT NULL DEFAULT 0` | Flags internal maintenance specialists (`editables.mechanics`) |
| `IsActive` | `BIT` | `NOT NULL DEFAULT 1` | Employment / clearance status |

#### 4. `dbo.VehicleAccess` (Junction Table: Many-to-Many Access Control)
*Replaces frontend `authorizedDriverIds` array with pure relational foreign keys.*
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `VehicleId` | `VARCHAR(10)` | `FOREIGN KEY -> Vehicles(VehicleId)` | Target vehicle |
| `EmployeeId` | `VARCHAR(10)` | `FOREIGN KEY -> Employees(EmployeeId)` | Authorized operator |
| `GrantedAt` | `DATETIME2(0)` | `NOT NULL DEFAULT SYSUTCDATETIME()` | Timestamp access granted |
| `GrantedByRole` | `VARCHAR(50)` | `NOT NULL DEFAULT 'DIRECTOR'` | Role granting clearance |
| *Composite PK* | `(VehicleId, EmployeeId)` | `PRIMARY KEY` | Guarantees uniqueness |

#### 5. `dbo.WorkOrders` (Maintenance & Overhaul Lifecycles)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `WorkOrderId` | `VARCHAR(20)` | `PRIMARY KEY` | E.g. `REP-2026-091` |
| `VehicleCode` | `VARCHAR(20)` | `FOREIGN KEY -> Vehicles(Code)` | Vehicle undergoing repair |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Originating branch |
| `ServiceType` | `NVARCHAR(150)` | `NOT NULL` | E.g. `Front Suspension & Steering Overhaul` |
| `Category` | `VARCHAR(50)` | `NOT NULL` | `Brakes & Suspension`, `Hydraulics`, `Engine`, etc. |
| `Priority` | `VARCHAR(20)` | `NOT NULL` | `LOW`, `NORMAL`, `HIGH`, `EMERGENCY` |
| `Status` | `VARCHAR(30)` | `NOT NULL` | `Pending`, `In Shop`, `Completed / Released` |
| `CurrentStage` | `NVARCHAR(60)` | `NULL` | Pipeline stage (e.g. `Queued / Inspection`, `Active Repair / Servicing`) |
| `DateReported` | `DATE` | `NOT NULL` | Reporting date |
| `ScheduledDate` | `DATE` | `NULL` | Scheduled start date (`NULL` until scheduled) |
| `TargetCompletion` | `DATE` | `NULL` | Estimated completion date |
| `Facility` | `NVARCHAR(150)` | `NULL` | Authorized workshop name |
| `AssignedMechanicId` | `VARCHAR(10)` | `FOREIGN KEY -> Employees(EmployeeId), NULL` | Assigned internal mechanic (`NULL` = unassigned) |
| `ReportedBy` | `NVARCHAR(100)` | `NULL` | Reporting employee |
| `EstimatedCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Initial estimate |
| `IncurredCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Final total |
| `ArchivedFromBoard` | `BIT` | `NOT NULL DEFAULT 0` | `1` once sent to Reports |
| `IsScheduled` | `BIT (PERSISTED)` | `COMPUTED` | `1` when `AssignedMechanicId` and a schedule/due date exist |

#### 6. `dbo.RepairVouchers` (Service / Repair Reports & Official Receipts)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `VoucherNo` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `VCH-2026-48201` |
| `ReceiptId` | `VARCHAR(30)` | `NOT NULL, UNIQUE` | E.g. `RCPT-839201` |
| `WorkOrderNo` | `VARCHAR(20)` | `NOT NULL` | Originating Work Order |
| `VoucherDate` | `DATE` | `NOT NULL` | Date finalized |
| `VehicleCode` | `VARCHAR(20)` | `NOT NULL` | Vehicle code |
| `PlateNo` | `VARCHAR(20)` | `NOT NULL` | Plate number |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Station |
| `Facility` | `NVARCHAR(150)` | `NOT NULL` | Outside service center or In-House Motorpool |
| `LaborCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Labor amount |
| `PartsCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Parts amount |
| `TotalCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Sum of labor + parts |
| `ApprovedBy` | `NVARCHAR(150)` | `NOT NULL` | Director approval signature |

#### 7. `dbo.Bookings` (Dispatch & Maintenance Schedule Calendar)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `BookingId` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `BK-2026-001` |
| `VehicleCode` | `VARCHAR(20)` | `FOREIGN KEY -> Vehicles(Code), NULL` | Vehicle code (`NULL` for standalone Calendar Notes) |
| `AssignedEmployeeId` | `VARCHAR(10)` | `FOREIGN KEY -> Employees(EmployeeId), NULL` | Assigned operator/mechanic |
| `DriverNameText` | `NVARCHAR(150)` | `NULL` | Fallback label when no employee (`Operations Note`, `Pool Operator`) |
| `BookingType` | `VARCHAR(20)` | `NOT NULL` | `DISPATCH`, `MAINTENANCE` (expiry dates are derived, not stored) |
| `Title` | `NVARCHAR(150)` | `NOT NULL` | Booking title |
| `Category` | `NVARCHAR(60)` | `NOT NULL` | Category label |
| `StartDate` | `DATE` | `NOT NULL` | Scheduled start date (`YYYY-MM-DD`, frontend `date`) |
| `EndDate` | `DATE` | `NULL` | Multi-day end/due date (`YYYY-MM-DD`, frontend `deadline`) |
| `StartTime` | `TIME(0)` | `NOT NULL` | E.g. `08:00` |
| `EndTime` | `TIME(0)` | `NOT NULL` | E.g. `12:00` |
| `Destination` | `NVARCHAR(150)` | `NULL` | Destination / site |
| `Purpose` | `NVARCHAR(500)` | `NULL` | Task purpose |
| `Status` | `VARCHAR(20)` | `NOT NULL` | `Scheduled`, `In Progress`, `Completed`, `Cancelled` |
| `SourceWorkOrderId` | `VARCHAR(20)` | `FOREIGN KEY -> WorkOrders(WorkOrderId), NULL` | Links scheduled work orders to calendar entries |

#### 8. `dbo.AuditLogs` (Append-Only Governance & Audit Trail)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `LogId` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `LOG-83921` |
| `Timestamp` | `DATETIME2(0)` | `NOT NULL DEFAULT SYSUTCDATETIME()` | Log timestamp |
| `UserName` | `NVARCHAR(100)` | `NOT NULL` | User identity |
| `UserRole` | `VARCHAR(30)` | `NOT NULL` | `DIRECTOR`, `MECHANIC` |
| `ActionType` | `VARCHAR(50)` | `NOT NULL` | Action description |
| `Category` | `VARCHAR(50)` | `NOT NULL` | `CHAIN_OF_CUSTODY`, `SECURITY_AUTH`, etc. |
| `Details` | `NVARCHAR(MAX)` | `NOT NULL` | Detailed explanation |
| `IpAddress` | `VARCHAR(45)` | `NOT NULL` | Client IP |
| `Status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'AUTHORIZED'` | Outcome |

#### 9. `dbo.Notifications` (Role-Scoped Operational Alerts & Event Feed)
*Per-user read/dismiss flags live in `dbo.NotificationUserState` (see `docs/BACKEND_READINESS.md` §9).*
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `NotificationId` | `VARCHAR(80)` | `PRIMARY KEY` | Unique ID (e.g. `NOTIF-DOC-VEH-001-INS`) |
| `Type` | `VARCHAR(30)` | `NOT NULL` | `DOCUMENT_EXPIRY`, `HEALTH_ALERT`, `MAINTENANCE`, `SCHEDULE`, `REPORT`, `SYSTEM` |
| `Severity` | `VARCHAR(20)` | `NOT NULL` | `CRITICAL`, `WARNING`, `INFO` |
| `Title` | `NVARCHAR(150)` | `NOT NULL` | Short notification heading |
| `Message` | `NVARCHAR(500)` | `NOT NULL` | Actionable notification summary |
| `TargetTab` | `VARCHAR(30)` | `NOT NULL` | Destination UI tab (`profiling`, `health`, `maintenance`, `auditing`, `bookings`, `drivers`) |
| `TargetEntityType` | `VARCHAR(30)` | `NULL` | `VEHICLE`, `WORK_ORDER`, `REPORT`, `BOOKING`, `DRIVER` |
| `TargetEntityId` | `VARCHAR(40)` | `NULL` | Related record ID for focus highlighting |
| `RecipientRole` | `VARCHAR(20)` | `NOT NULL DEFAULT 'ALL'` | `ALL`, `DIRECTOR`, `MECHANIC` |
| `RecipientEmployeeId` | `VARCHAR(10)` | `FOREIGN KEY -> Employees(EmployeeId), NULL` | Specific mechanic/employee ID if targeted |
| `CreatedAt` | `DATETIME2(0)` | `NOT NULL DEFAULT SYSUTCDATETIME()` | Timestamp created |

---

## 3. UI/UX & Design Guidelines (Permanently Enforced)

### Color Palette & Visual Tone
- **Subdued & Neutral**: All specification boxes, department containers, and validity cards use `var(--bg-surface-subtle)` (soft slate off-white), `1px solid var(--border-light)` (clean crisp 1px border), and clean rounded corners.
- **NEVER use bright saturated backgrounds** (e.g. bright pastel yellow `#FFFBEB`, bright purple `#F5F3FF`, or bright blue `#EFF6FF`).
- **NEVER use thick 4px colored accent stripes** on cards or detail modal boxes.
- **Accent Theme**: Official COTELCO lime accent (`var(--primary)`, `#D4ED31`) is reserved strictly for primary interactive call-to-actions (e.g. `Add Vehicle`, `Add Employee`, `Done`, `Save`, `Go to Maintenance`).

### Stability & No Dynamic Layout Movement
- **Never make everything dynamically move**: Switching tabs, toggling modes (e.g. `By KM` / `By Date` / `Both`), or selecting options inside forms/modals MUST NOT mount/unmount rows in a way that causes inputs, buttons, or modal heights to jump or shift positions.
- Keep form rows in **fixed, predictable positions** — dim and disable inactive fields (`opacity` + `disabled`) instead of removing them from the layout.
- Avoid wrapping pill bars that reflow unpredictably; use clean fixed-height segmented tabs or a single `<select>` picker.

### Mobile Compatibility & Responsive Standards
- **Viewport Sizing**: Use dynamic viewport height (`100dvh`, `calc(100dvh - 62px)`, `92dvh` for modals) with `100vh` fallbacks and `width: 100%` (avoid `100vw` horizontal overflow).
- **Safe Responsive Grids**: Always wrap `auto-fill` / `auto-fit` grid minimums with `min(100%, <px>)` (e.g. `repeat(auto-fill, minmax(min(100%, 290px), 1fr))`) so cards never clip on `360px` phones.
- **Reusable Responsive Classes (`src/index.css`)**: Prefer `.responsive-grid-2`, `.responsive-grid-3`, `.modal-tabs-4` (`4` cols desktop → `2×2` on `<= 600px`), `.vehicle-detail-body`, `.access-filter-row`, `.form-row`, and `.form-col` instead of rigid inline `1fr 1fr` or pixel-fixed grids.
- **Mobile Navigation & TopBar**: On `<= 960px`, expose global search via `.mobile-search-toggle` and `.topbar-mobile-search-row`; on `<= 768px`, anchor `.topbar-dropdown-panel` to viewport bounds (`left: 0.65rem; right: 0.65rem`) and render `.app-sidebar` as a horizontally scrollable bottom bar with `scroll-snap-type: x proximity`.

### Card & Label Formatting
- **Validity Card Hierarchy**:
  - **Top-Right**: Number of years badge (e.g. `3 Years`).
  - **Middle/Bottom**: Date Acquired and Expiration Date grid with policy / OR-CR details.
- **No Primary Assigned Badges**:
  - All vehicles are cooperative pool assets.
  - Do NOT display `"Primary Assigned"`, `"Primary Custodian"`, or `"Primary Operator"` badges.
  - Use clean `"Vehicles with Access (X)"` and `"Employees with Access (X)"` counts.

### Access Control & Head Perspective
- **Bidirectional Access Management**:
  - In **Employees** tab: Head can click `Vehicles with Access` to open `EmployeeAccessModal` or open `DriverDetailModal` to Grant or Revoke vehicle clearances.
  - In **Car Profiling** tab: Head can click `Employees with Access` to open `VehicleAccessModal` to Authorize or Revoke employee clearances.
- **High-Volume Grant Access Directory (No Clumsy Dropdowns)**:
  - NEVER use native inline `<select>` dropdowns to grant access.
  - Modals use stable segmented tabs: `Authorized (X)` and `Grant Access (Y Available)`.
  - The `Grant Access` view features a real-time search bar, filter selector (by station or department), and rich scannable cards with single-click `+ Grant Access` or `+ Authorize`.
- **Checklist Removal Pattern (Edit Mode Top-Right)**:
  - Do NOT clutter access modal rows with persistent red "Remove" buttons by default.
  - Provide an **"Edit" button in the top-right** of the modal header (next to the close button) that toggles checkbox selection and a batch `Remove Access (X)` bar.
- **Enterprise Section Naming**: Use concise terminology — e.g. `Recent Reports (X)` instead of `Recent Dispatches & Activity`.
- Every grant and revocation automatically logs an append-only audit trail event in `FleetContext`.

### Simplified Card & Tabbed Profile Pattern
- **Scannable Card Summary (`VehicleProfiling.jsx`)**:
  - Cards display thumbnail, `Code` + `Year` pill, `Make/Model`, `Plate` pill, overlapping circular `AUTHORIZED` avatar chips (clickable to manage access), `STATION` & `SPEC / TYPE` rows, `INSURANCE` & `LTO REG` status pills (`VALID`, `EXPIRING SOON`, `EXPIRED`), and footer actions (`View Profile` & `Car Health`).
- **4-Tab Vehicle Profile Modal (`VehicleDetailModal.jsx`)**:
  1. **`Overview & Specs`**: Live status & usage (`Current Status`, `Odometer`, `Engine / PTO Hours`, `Fuel / Power`), technical/utility specifications, and insurance/registration validity summary.
  2. **`Driver History`**: Currently authorized personnel (with `+ Manage Access` and `Revoke`) plus a chronological log of past assigned drivers and trip dispatches.
  3. **`Maintenance`**: Vehicle Maintenance Checklist (remaining km/due dates and `+ Send to Maintenance`) and Complete Maintenance & Repair History.
  4. **`Paperwork & Registration`**: Active insurance and LTO OR/CR validity cards (editable via `Update / Log Renewal`) plus multi-year Registration & Insurance Renewal History.
- **2-Role System (`DIRECTOR` vs. `MECHANIC`)**:
  - **Operations Director (`DIRECTOR`)**: Full access across all operational tabs (`dashboard`, `profiling`, `drivers`, `bookings`, `health`, `maintenance`, `auditing`, `archive`, `editables`). Cannot mark a maintenance work order as `Done` directly (clicking `Done` prompts to switch to the assigned mechanic).
  - **Assigned Mechanic (`MECHANIC`)**: Strictly scoped to their own **Dashboard** (4-panel all-at-once overview covering Maintenance Queue, Upcoming Schedules, Ongoing Vehicle Health, and Done & Recent Reports), **Car Profiling** (assigned vehicles only), **Calendar** (their schedules, with `+ Add Schedule` notifying the Director), **Ongoing Health** (read-only view of their assigned vehicles — no edit or send-to-maintenance actions), **Maintenance** (their assigned work orders, with Additional Work tracking and Next Service Interval on Done orders), **Reports** (their own current-month reports and assigned vehicles), and **My Profile** (`profile`, with `Edit Profile`, Driver's License tracking, and `My Archive` monthly folders). Only internal employees appear in assigned mechanic lists.

---

## 4. Backend Transition Strategy — Express.js + MS SQL Server (When Requested by User)

**Authoritative Spec**: [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md) (full REST API `/api/v1` contract, RBAC scoping matrix, SQL transactions, row-to-object mappers, and complete SQL Server reference DDL).

When the user explicitly instructs backend implementation:
1. **Express.js Server (`server/`)**: Create a sibling `server/` project (never inside `src/`) layered as `routes → controllers → services (SQL transactions) → repositories (parametrized queries)`, with JWT authentication (`dbo.Users`), role + SQL-level mechanic scoping middleware, request validation, multipart attachment uploads (`dbo.Attachments`), and server-side audit logging (`dbo.AuditLogs`).
2. **Database Driver (`mssql`)**: Use the official Node.js **`mssql`** (TDS protocol) connection pool against **Microsoft SQL Server** with strictly parametrized queries (`@param`) and `BEGIN TRAN … COMMIT` transactions for multi-table workflows (work order completion, diagnostic resets, voucher generation, booking sync, editable rename cascades).
3. **REST API Contract (`/api/v1`)**:
   - Auth & Bootstrap: `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/bootstrap`
   - Core Resources: `/api/v1/vehicles` (+ `/access`, `/diagnostics`), `/api/v1/employees` (+ `/license`, `/profile/me`), `/api/v1/work-orders` (+ `/stage`, `/archive`, `/complete`), `/api/v1/reports` (+ `/attachments`), `/api/v1/bookings`, `/api/v1/branches`, `/api/v1/editables`, `/api/v1/incidents`, `/api/v1/audit-logs`, `/api/v1/notifications`, `/api/v1/archive`
4. **Frontend Seam (`src/services/api.js` + Vite Proxy)**: Add `src/services/api.js` and a Vite `/api` dev proxy. Swap `localStorage` initializers and mutations inside `FleetContext.jsx` to call the Express API while keeping the exported `useFleet()` contract identical — **zero component rewrites required**. Keep only browser UI preferences (`seniorMode`, `highContrast`, `sidebarCollapsed`) in `localStorage`.
