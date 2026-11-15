# COTELCO Fleet Management System — Official Workspace Rule Book

> **CRITICAL ARCHITECTURAL DIRECTIVE**:  
> **DO NOT implement the backend or connect to the MS SQL database until the user explicitly requests it.**  
> Keep all state management in `FleetContext.jsx` and `fleetData.js` fully functional, decoupled, and architecturally aligned so future server and MS SQL integration requires zero redesign.

---

## 1. System Overview & Core Principles

The COTELCO Fleet Management System is an enterprise utility fleet operations platform designed for electric cooperatives (Cotabato Electric Cooperative, Inc.). It handles vehicle profiling, workforce clearance, preventive maintenance scheduling, work order lifecycles, and audit governance.

### Architectural Tenets:
1. **Decoupled State Management**: All business logic and mutations run through `FleetContext.jsx`. Components never mutate state directly; they dispatch actions (`grantVehicleAccess`, `revokeVehicleAccess`, `createWorkOrder`, `completeWorkOrder`, `addVehicle`, `updateVehicle`, etc.).
2. **Future-Proof Data Contracts**: State objects conform to relational database normalization standards so they map directly to Microsoft SQL Server (MS SQL) tables without requiring data transformation layers.
3. **Head Perspective Authority**: The active session role (Operations Director / Head) possesses executive clearance authority to add/remove vehicle access, authorize work orders, and oversee branch custody.
4. **Clean, Non-Flashy Enterprise UI**: Minimalist, understated typography and neutral palettes. Avoid high-saturation pastels, thick accent borders, or flashy decorative widgets.

---

## 1.1 Application Structure (Project Map)

**Stack**: React 19 + Vite 8 (JavaScript/JSX), `lucide-react` icons, `leaflet` for the Branch Map. No router and no backend: navigation is a single `activeTab` string in `FleetContext`, and persistence is `localStorage`.

```
COTELCO/
├── AGENTS.md / RULEBOOK.md      # Rule books (keep both in sync)
├── index.html, vite.config.js, package.json
├── public/vehicles/*.jpg        # Vehicle photographs (referenced by ImageUrl)
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Shell: Sidebar + TopBar + active page + ALL modals
    ├── index.css                # Global design tokens (CSS variables) and styles
    ├── context/
    │   └── FleetContext.jsx     # Single source of truth: state, mutations, audit logging, localStorage
    ├── data/
    │   └── fleetData.js         # Seed data (DEFAULT_*), constants, relational helper functions
    ├── utils/
    │   └── formatters.js        # Pure formatting/parsing helpers
    └── components/
        ├── Sidebar.jsx, TopBar.jsx          # Navigation + header (PAGE_META titles live in TopBar)
        ├── Dashboard.jsx                    # tab: dashboard
        ├── FleetDirectory.jsx               # tab: directory
        ├── VehicleProfiling.jsx             # tab: profiling   (label: Car Profiling)
        ├── DriverRoster.jsx                 # tab: drivers     (label: Employees)
        ├── BookingsCalendar.jsx             # tab: bookings    (label: Calendar)
        ├── OngoingHealth.jsx                # tab: health      (label: Ongoing Health)
        ├── MaintenanceHub.jsx               # tab: maintenance (label: Maintenance)
        ├── MapView.jsx                      # tab: map-view    (Branch Map)
        ├── RepairArchive.jsx                # tab: auditing    (Repair Ledger)
        ├── EditablesConfig.jsx              # tab: editables   (Editables: Departments, Titles, Stations, Classifications)
        ├── SecurityAudit.jsx                # tab: governance  (Security & Audit)
        ├── common/VehicleSelect.jsx         # Shared vehicle picker
        └── modals/                          # One file per dialog (see below)
```

### Navigation Map (`activeTab` → Component → Sidebar label)
| `activeTab` | Component | Sidebar Label |
|---|---|---|
| `dashboard` | `Dashboard` | Dashboard |
| `directory` | `FleetDirectory` | Fleet Directory |
| `profiling` | `VehicleProfiling` | Car Profiling |
| `drivers` | `DriverRoster` | Employees |
| `bookings` | `BookingsCalendar` | Calendar |
| `health` | `OngoingHealth` | Ongoing Health |
| `maintenance` | `MaintenanceHub` | Maintenance |
| `map-view` | `MapView` | Branch Map |
| `auditing` | `RepairArchive` | Repair Ledger |
| `editables` | `EditablesConfig` | Editables |
| `governance` | `SecurityAudit` | Security & Audit |

> Internal IDs (`drivers`, `bookings`, `DriverRoster`, `BookingsCalendar`, `selectedDriver`) are legacy names kept for stability. **Only user-visible labels were renamed** (Drivers → Employees, Bookings → Calendar). Do not rename internal identifiers casually; if you do, update `Sidebar.jsx`, `TopBar.jsx` (`PAGE_META`), `App.jsx`, and `FleetContext.jsx` together.

### Configurable Editables (`editables` State)
- Configurable dropdown lists (`departments`, `jobTitles`, `employeeClassifications`, `vehicleClassifications`, `serviceCategories`, `mechanics`, `diagnosticTypes`) and `branches` (Stations) are managed in the **Editables** tab (`EditablesConfig.jsx`) via `FleetContext` (`addEditableItem`, `updateEditableItem`, `removeEditableItem`, `addBranch`, `updateBranch`, `removeBranch`).
- Default COTELCO Departments: `Area`, `Technical / Engineering`, `OGM - Office of the General Manager`, `Institutional Services`, `Audit Department`, `Finance`, `Core Plan`, `CPRST`.
- Renaming an option in `EditablesConfig` automatically cascades the new name across existing employee, vehicle, diagnostic, or work order records in `FleetContext`.

### Ongoing Health (`OngoingHealth.jsx`) & Maintenance (`MaintenanceHub.jsx`) Sidebar Tabs
- **Sidebar Tab 1 — `Ongoing Health` (`OngoingHealth.jsx`)**: Displays each vehicle in a clean 2-box card (`CHANGE OIL` and secondary diagnostic) showing remaining km / target date and assigned specialist. Clicking a box or `Edit Diagnostics` opens the modal to configure intervals by **Odometer (`KM`)**, **Calendar (`DATE`)**, or **Both (`BOTH`)** (`upsertVehicleDiagnostic`, `removeVehicleDiagnostic`).
- **Sidebar Tab 2 — `Maintenance` (`MaintenanceHub.jsx`)**: Includes a clean 2-button toggle (`Needs Maintenance` vs. `Done with Maintenance`) to inspect vehicles undergoing maintenance steps (`Queued / Inspection` → `Diagnosing` → `Active Repair / Servicing` → `Awaiting Parts` → `Quality & Safety Check`) or cleared (`Completed / Released`), with a single-line step dropdown (`updateWorkOrderStage`) and a 2-box summary (`TASK` / `ASSIGNED TO` or `SERVICED BY` / `NEXT DUE`).
- **Add Car to Maintenance (`NewWorkOrderModal.jsx`)**: Uses a category-filtered task dropdown (`serviceTasksByCategory[category]`) plus an `Other` custom input option, assigned repair specialist selector, and next interval setting (KM / Date) without financial clutter.

### Modal System
- Modals are all mounted once in `App.jsx`; each renders `null` unless `modalType` (from `FleetContext`) matches its key. Open with `setModalType('<key>')`, close with `setModalType(null)`. The target record is passed via `selectedVehicle`, `selectedDriver`, or `selectedBooking`.
- Keys: `vehicle-detail`, `add-vehicle`, `vehicle-access`, `reassign`, `driver-detail`, `add-driver`, `employee-access`, `reassign-driver-vehicle`, `new-booking`, `booking-detail`, `new-wo`, `complete-wo`, `receipt-voucher`, `add-ledger` (files in `src/components/modals/`).
- **Adding a new modal**: create the file in `modals/`, mount it in `App.jsx`, trigger it with a unique `modalType`, and route all mutations through `FleetContext`.

### Data Flow (Must Be Preserved)
```
Component ──(dispatch action)──► FleetContext (mutation + audit log) ──► state ──► localStorage
    ▲                                                                       │
    └─────────────── useFleet() reads state & derived helpers ◄─────────────┘
```
- Relational helpers live in `fleetData.js` (e.g. `getVehicleAuthorizedDrivers`, `getEmployeeVehiclesWithAccess`) and must stay pure so they map to SQL joins/views later.
- Cross-module effects live in `FleetContext` only: creating a work order sets the vehicle `IN-SHOP` and adds a calendar entry; completing it restores `ACTIVE` and writes a repair voucher; every grant/revoke writes an audit log.
- **Ongoing Health (`Add Cars`) & Car Profiling (`AddVehicleModal` → `FleetContext.addVehicle`) Connection**: Clicking **Add Cars** in **Ongoing Health** opens a Car Profiling vehicle picker first so users select an existing profiled vehicle to add/configure diagnostic trackers (with a `+ Register New Car in Profiling` option if the vehicle is not in Car Profiling yet). Registering a new vehicle via `AddVehicleModal` writes one unified record to `vehicles[]` with initialized `diagnostics` (`buildDefaultVehicleDiagnostics`) and `authorizedDriverIds: []`, automatically connecting it across tabs:
  - **Car Profiling** (`VehicleProfiling.jsx`) & **Fleet Directory** (`FleetDirectory.jsx`): Immediately displays the vehicle's profile, specs, and operator access count.
  - **Ongoing Health** (`OngoingHealth.jsx`): Appears with default diagnostic intervals (`Engine Oil & Filter Change`, `Brake Pads & Fluid Check`, etc.) ready to customize or send **To Maintenance**.
  - **Employees** (`DriverRoster.jsx`): Available in `EmployeeAccessModal` and `VehicleAccessModal` for operator clearance.
  - **Calendar** (`BookingsCalendar.jsx`): Auto-generates Insurance and LTO Registration compliance milestones from the vehicle's validity dates.
  - **Branch Map** (`MapView.jsx`) & **Security & Audit** (`SecurityAudit.jsx`): Plots the asset at its assigned station's coordinates and logs an `Asset Commissioned` audit entry.
- localStorage keys are versioned in `STORAGE_KEYS` (e.g. `flt_bookings_react_v4`). If a stored shape changes, add a migration in the `useState` initializer (see the `drivers` title/department migration) or bump the key.

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

### Where To Change What
| Task | Edit |
|---|---|
| Rename a menu item / page title | `Sidebar.jsx` (`navItems`) + `TopBar.jsx` (`PAGE_META`) |
| Add a new page | New component in `components/`, add to `App.jsx`, `Sidebar.jsx`, `TopBar.jsx` |
| Add/rename an employee or vehicle field | `fleetData.js` seed, `FleetContext` add/update function, forms/modals, then the SQL tables in Section 2 |
| Change colors/spacing globally | CSS variables in `index.css` (follow Section 3) |
| Business rule or cross-tab effect | `FleetContext.jsx` only, never inside a component |

### Pre-Delivery Checklist
1. `npm run build` passes with zero errors.
2. State changes go through `FleetContext` and write an audit entry where applicable.
3. UI follows Section 3 (neutral colors, no flashy accents, no banned labels).
4. Update **both** `AGENTS.md` and `RULEBOOK.md` when structure, schema, or UI standards change.
5. No backend/MS SQL code until the user explicitly asks.

---

## 2. MS SQL Database Schema Alignment Guide (For Future Integration)

When the company instructs the team to integrate with their MS SQL Server, the database must follow this normalized schema. All frontend keys match these entities 1:1.

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
| `Department` | `NVARCHAR(100)` | `NOT NULL` | E.g. `Operations & Maintenance` |
| `Category` | `VARCHAR(50)` | `NOT NULL` | `Heavy Equipment`, `Light Commercial`, `Passenger / Emergency`, `Patrol Motorcycle` |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Assigned home station |
| `ContactPhone` | `VARCHAR(20)` | `NOT NULL` | Mobile / radio dispatch contact |
| `Email` | `VARCHAR(100)` | `NULL` | Email address |
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
| `DateReported` | `DATE` | `NOT NULL` | Reporting date |
| `TargetCompletion` | `DATE` | `NULL` | Estimated completion date |
| `Facility` | `NVARCHAR(150)` | `NOT NULL` | Authorized workshop name |
| `AssignedMechanic` | `NVARCHAR(100)` | `NOT NULL` | Lead mechanic |
| `ReportedBy` | `NVARCHAR(100)` | `NOT NULL` | Reporting employee |
| `EstimatedCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Initial estimate |
| `IncurredCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Final total |

#### 6. `dbo.RepairVouchers` (Audited Vouchers & Official Receipts)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `VoucherNo` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `VCH-2026-48201` |
| `ReceiptId` | `VARCHAR(30)` | `NOT NULL, UNIQUE` | E.g. `RCPT-839201` |
| `WorkOrderNo` | `VARCHAR(20)` | `NOT NULL` | Originating Work Order |
| `VoucherDate` | `DATE` | `NOT NULL` | Date finalized |
| `VehicleCode` | `VARCHAR(20)` | `NOT NULL` | Vehicle code |
| `PlateNo` | `VARCHAR(20)` | `NOT NULL` | Plate number |
| `BranchId` | `VARCHAR(10)` | `FOREIGN KEY -> Branches(BranchId)` | Station |
| `Facility` | `NVARCHAR(150)` | `NOT NULL` | Outside service center |
| `LaborCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Labor amount |
| `PartsCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Parts amount |
| `TotalCost` | `DECIMAL(18, 2)` | `NOT NULL DEFAULT 0` | Sum of labor + parts |
| `ApprovedBy` | `NVARCHAR(150)` | `NOT NULL` | Director approval signature |

#### 7. `dbo.Bookings` (Dispatch & Maintenance Schedule Calendar)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `BookingId` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `BK-2026-001` |
| `VehicleCode` | `VARCHAR(20)` | `NOT NULL` | Vehicle code |
| `DriverName` | `NVARCHAR(100)` | `NOT NULL` | Operator name |
| `BookingType` | `VARCHAR(30)` | `NOT NULL` | `DISPATCH`, `MAINTENANCE`, `COMPLIANCE` |
| `Title` | `NVARCHAR(150)` | `NOT NULL` | Booking title |
| `Category` | `NVARCHAR(50)` | `NOT NULL` | Category label |
| `BookingDate` | `DATE` | `NOT NULL` | Scheduled date (`YYYY-MM-DD`) |
| `StartTime` | `VARCHAR(10)` | `NOT NULL` | E.g. `08:00` |
| `EndTime` | `VARCHAR(10)` | `NOT NULL` | E.g. `12:00` |
| `Destination` | `NVARCHAR(150)` | `NOT NULL` | Destination / site |
| `Purpose` | `NVARCHAR(500)` | `NULL` | Task purpose |
| `Status` | `VARCHAR(30)` | `NOT NULL` | `Scheduled`, `In-Progress`, `Completed`, `Cancelled` |

#### 8. `dbo.AuditLogs` (Append-Only Governance & Audit Trail)
| Column | MS SQL Data Type | Constraints | Description |
|---|---|---|---|
| `LogId` | `VARCHAR(30)` | `PRIMARY KEY` | E.g. `LOG-83921` |
| `Timestamp` | `DATETIME2(0)` | `NOT NULL DEFAULT SYSUTCDATETIME()` | Log timestamp |
| `UserName` | `NVARCHAR(100)` | `NOT NULL` | User identity |
| `UserRole` | `VARCHAR(30)` | `NOT NULL` | `DIRECTOR`, `DISPATCHER`, `MAINTENANCE` |
| `ActionType` | `VARCHAR(50)` | `NOT NULL` | Action description |
| `Category` | `VARCHAR(50)` | `NOT NULL` | `CHAIN_OF_CUSTODY`, `SECURITY_AUTH`, etc. |
| `Details` | `NVARCHAR(MAX)` | `NOT NULL` | Detailed explanation |
| `IpAddress` | `VARCHAR(45)` | `NOT NULL` | Client IP |
| `Status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'AUTHORIZED'` | Outcome |

---

## 3. UI/UX & Design Guidelines (Permanently Enforced)

### Color Palette & Visual Tone
- **Subdued & Neutral**: All specification boxes and validity cards use `var(--bg-surface-subtle)` (soft slate off-white), `1px solid var(--border-light)` (clean crisp 1px border), and `6px` radius.
- **NEVER use bright saturated backgrounds** (e.g. bright pastel yellow `#FFFBEB`, bright purple `#F5F3FF`, or bright blue `#EFF6FF`).
- **NEVER use thick 4px colored accent stripes** on cards or detail modal boxes.
- **Accent Theme**: Official COTELCO lime accent (`var(--primary)`, `#D4ED31`) is reserved strictly for primary interactive call-to-actions (e.g. `Add Vehicle`, `Add Employee`, `Done`, `Save`).

### Stability & No Dynamic Layout Movement
- **Never make everything dynamically move**: Switching tabs, toggling modes (e.g. `By KM` / `By Date` / `Both`), or selecting options inside forms/modals MUST NOT mount/unmount rows in a way that causes inputs, buttons, or modal heights to jump or shift positions.
- Keep form rows in **fixed, predictable positions** — dim and disable inactive fields (`opacity` + `disabled`) instead of removing them from the layout.
- Avoid wrapping pill bars that reflow unpredictably; use clean fixed-height segmented tabs or a single `<select>` picker.

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
  - NEVER use native inline `<select>` dropdowns to grant access: native dropdowns cause jarring layout shifts, push modal content down, and truncate asset descriptions when handling large cooperative datasets.
  - Modals use stable segmented tabs: `Authorized (X)` and `Grant Access (Y Available)`.
  - The `Grant Access` view features a real-time search bar, quick filter chips (by station or department), and rich scannable cards displaying full details (photos/avatars, codes, plates, titles, departments, and municipalities without truncation).
  - Personnel or assets are cleared instantly with a single-click `+ Grant Access` or `+ Authorize` action accompanied by smooth checkmark confirmation.
- **Checklist Removal Pattern (Edit Mode Top-Right)**:
  - Do NOT clutter access modal rows with persistent red "Remove" buttons by default.
  - Provide an **"Edit" button in the top-right** of the modal header (next to the close button).
  - Clicking "Edit" reveals an interactive checklist:
    - Checkbox on each item row with click-to-toggle selection.
    - Checklist toolbar featuring "Select All" and a batch action: `Remove Access (X)`.
    - When not in edit mode, rows display cleanly without trailing status badges (`Cleared`) or persistent remove buttons.
- **Enterprise Section Naming**: Use concise terminology — e.g. `Recent Reports (X)` instead of `Recent Dispatches & Activity`.
- Every grant and revocation automatically logs an append-only audit trail event in `FleetContext`.

### Simplified Card & Tabbed Profile Pattern (Car Profiling & Across Tabs)
- **Scannable Card Summary (`VehicleProfiling.jsx`)**:
  - Cards display only essential top-level details without visual clutter: thumbnail, `Code` + `Year` pill, `Make/Model`, `Plate` pill, overlapping circular `AUTHORIZED` avatar chips (clickable to manage access), `STATION` & `SPEC / TYPE` rows, `INSURANCE` & `LTO REG` status pills (`VALID`, `EXPIRING SOON`, `EXPIRED`), and a single full-width `View Profile` button.
- **4-Tab Vehicle Profile Modal (`VehicleDetailModal.jsx`)**:
  - Clicking `View Profile` opens a fixed-height 4-tab modal so users can navigate directly to what they need without scrolling through a long wall of boxes:
    1. **`Overview & Specs`**: Live status & usage (`Current Status`, `Odometer`, `Engine / PTO Hours`, `Fuel / Power`), technical/utility specifications, and insurance/registration validity summary.
    2. **`Driver History`**: Currently authorized personnel (with `+ Manage Access` and `Revoke`) plus a chronological log of **past assigned drivers and trip dispatches** (`vehicle.driverHistory` + historical dispatches).
    3. **`Maintenance`**: Both the **Vehicle Maintenance Checklist** (what still needs to be done, remaining km/due dates, and `+ Send to Maintenance`) and the **Complete Maintenance & Repair History** (all current and historical work orders and repair vouchers from prior years).
    4. **`Paperwork & Registration`**: Active insurance and LTO OR/CR validity cards (editable via `Update / Log Renewal`) plus a multi-year **Registration & Insurance Renewal History** log (`vehicle.registrationHistory`).
- **2-Role System (`DIRECTOR` vs. `MECHANIC`)**:
  - **Operations Director (`DIRECTOR`)**: Full access across all tabs; cannot mark a maintenance work order as `Done` directly (clicking `Done` prompts to switch to the assigned mechanic).
  - **Assigned Mechanic (`MECHANIC`)**: Visibility is strictly scoped to their own **Dashboard**, **Calendar** (`bookings` filtered to their maintenance jobs), **Maintenance** (`maintenance` filtered to their assigned work orders), and **My Profile** (`profile`). Only internal employees appear in the assigned mechanic lists.

---

## 4. Backend Transition Strategy (When Requested by User)

When the company instructs backend implementation:
1. **API Service Layer**: Introduce `src/services/api.js` that abstracts API calls (`fetch` / `axios`).
2. **Controller Endpoints**:
   - `GET /api/vehicles` & `PUT /api/vehicles/{id}`
   - `GET /api/employees` & `POST /api/employees`
   - `POST /api/vehicles/{id}/access/{employeeId}` (Grant Access)
   - `DELETE /api/vehicles/{id}/access/{employeeId}` (Revoke Access)
   - `GET /api/work-orders` & `POST /api/work-orders` & `POST /api/work-orders/{id}/complete`
   - `GET /api/bookings` & `POST /api/bookings`
   - `GET /api/audit-logs`
3. **Database Driver**: Use Node.js `mssql` (TDS protocol) or ASP.NET Core EF Core to communicate directly with MS SQL Server using parametrized stored procedures or queries to prevent SQL injection.
4. **Zero Frontend Rewrite**: Because `FleetContext` already isolates all mutation methods, swapping `localStorage` with the API service layer requires modifying only `FleetContext` internals without changing any components.

