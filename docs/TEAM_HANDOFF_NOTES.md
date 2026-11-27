# COTELCO Fleet Management System — Team Hand-off & Release Notes

**Last Updated:** November 2026  
**Current Branch / Commit:** `main`  
**Frontend Stack:** React 19 + Vite 8 (`lucide-react`, custom enterprise CSS design system)  
**Target Backend Stack (Ready for Implementation):** **Express.js (Node.js) + Microsoft SQL Server (`mssql`)**

> **Important Note for All Developers:**  
> The frontend application is **100% functional** using decoupled state in `src/context/FleetContext.jsx` backed by versioned `localStorage`.  
> **Do NOT build or connect the Express.js / SQL Server backend until management gives the go-ahead**, and when starting backend work, follow [docs/BACKEND_READINESS.md](BACKEND_READINESS.md) and [AGENTS.md](../AGENTS.md) / [RULEBOOK.md](../RULEBOOK.md).

---

## 1. Key Documentation Map (Read First)

| Document | Purpose | Audience |
|---|---|---|
| [AGENTS.md](../AGENTS.md) & [RULEBOOK.md](../RULEBOOK.md) | Official project rulebook, UI/UX standards, navigation map, mandatory pickers, and pre-delivery checklist (keep both files identical). | Frontend & Full-Stack Devs |
| [docs/BACKEND_READINESS.md](BACKEND_READINESS.md) | Complete **Express.js + Microsoft SQL Server** specification: `/api/v1` REST endpoints, RBAC scoping matrix, SQL transactions, field mappers, and copy-ready SQL Server DDL (`dbo.*` tables, views, sequences). | Backend Devs & DBA |
| [src/context/FleetContext.jsx](../src/context/FleetContext.jsx) | Single source of truth for all state, mutations, cross-tab effects, notifications, and audit logging. **This is the only file that needs to swap `localStorage` for `src/services/api.js` when the backend goes live.** | Frontend & Backend Devs |

---

## 2. Role-Based Architecture (`DIRECTOR`, `MECHANIC` & `DRIVER`)

The system enforces a strict 3-role operational separation (currently switchable from the top-right profile menu for testing/demo; maps to JWT auth in `dbo.Users` on the backend):

### A. Operations Director / Operator (`DIRECTOR`)
- **Dashboard (`Dashboard.jsx`):**
  - Top quick-navigation bar (**Ongoing Health**, **Reports**, **Car Profiling**).
  - 4 interactive KPI cards: `Ongoing health alerts`, `Maintenance pipeline`, `Workforce & reports`, and a red **`Document & License Expiry`** card (stays red until all expired/expiring Vehicle Insurance, LTO Registration, and Driver's Licenses are renewed).
  - Segmented left panel (`Alerts & Health` | `In Maintenance` | `Doc & License Expiry`) and right-hand `Availability & health` donut.
- **Car Profiling (`VehicleProfiling.jsx` & `VehicleDetailModal.jsx`):**
  - Scannable fleet cards with Insurance & LTO Registration validity badges, authorized employee avatar chips, and red sidebar alert count badge.
  - 4-tab Vehicle Dossier: `Overview & Specs`, `Driver History` (access control + chronological driver log), `Maintenance` (checklist + past maintenance history), and `Paperwork & Registration` (inline renewal + multi-year history).
- **Employees (`DriverRoster.jsx` & `DriverDetailModal.jsx`):**
  - Opens with **clickable Department Boxes** (`Area`, `Technical / Engineering`, `OGM`, `Institutional Services`, `Audit Department`, `Finance`, `Core Plan`, `CPRST`, plus inline `+ Add department`).
  - Red expiry alert badges on departments and sidebar when any employee's LTO Driver's License is expired or expiring within 90 days.
  - Inline **Update / Renew License** workflow in the Employee Profile modal that archives previous license terms into `licenseHistory`.
- **Calendar (`BookingsCalendar.jsx`):**
  - Month, Week, and Day views with **full drag-and-drop rescheduling** (dragging a multi-day bar preserves its `Start → Due` duration).
  - **`Expiry Dates Only`** red filter toggle to view all Insurance, LTO Registration, and Driver's License expiration dates directly on the calendar grid.
  - Receives instant **`SCHEDULE` notifications** (with before/after change diffs) whenever a mechanic adds, drags, edits, or removes a schedule.
- **Ongoing Health (`OngoingHealth.jsx`):**
  - 2-box per-vehicle diagnostic tracker (`Change Oil` + secondary diagnostic) configurable by **Odometer (`KM`)**, **Calendar (`DATE`)**, or **Both (`BOTH`)**.
  - **Add Cars** flow connects directly to Car Profiling (`vehicles[]`) or lets the director register a new vehicle.
- **Maintenance (`MaintenanceHub.jsx`):**
  - 3-column Kanban board: **`For Maintenance` → `Under Maintenance` → `Done`**.
  - Supports **Scheduled** (assigned specialist + dates) vs. **Unscheduled** work orders.
  - Director cannot mark a work order `Done` directly (prompts to switch to the assigned mechanic).
- **Reports (`RepairArchive.jsx`) & Archive (`ArchiveHub.jsx`):**
  - **Reports:** Displays **current-month** service/repair reports and printable vouchers (`ReceiptVoucherModal.jsx`) with file/photo attachments.
  - **Archive (Director only):** Dedicated main sidebar tab with 4 top-level categories (`Reports Archive`, `Maintenance History`, `Driver History`, `Paperwork History`) organized into `Month of <Month Year>` folders.
- **Editables (`EditablesConfig.jsx`):**
  - Manages configurable dropdown lists (`departments`, `jobTitles`, `employeeClassifications`, `vehicleClassifications`, `serviceCategories`, `serviceTasksByCategory`, `mechanics`, `diagnosticTypes`) and `branches` (Stations), with automatic rename cascading across existing records.

### B. Assigned Mechanic (`MECHANIC`)
- **All-at-Once 4-Panel Dashboard (`Dashboard.jsx`):**
  - Generalized, zero-click overview showing **`Maintenance Queue`**, **`Upcoming Schedules`**, **`Ongoing Vehicle Health`** (read-only for assigned vehicles), and **`Done & Recent Reports`** on a single screen.
- **Scoped Operational Tabs:**
  - **Car Profiling:** Scoped to vehicles assigned to the mechanic.
  - **Calendar:** Scoped to the mechanic's schedules, with **`+ Add Schedule`** (vehicle schedule or calendar note) and drag-and-drop rescheduling that automatically notifies the Operations Director.
  - **Ongoing Health:** Read-only view of assigned vehicles (no `Edit Diagnostics` or `To Maintenance` buttons).
  - **Maintenance (`MaintenanceHub.jsx`):**
    - Scoped to the mechanic's assigned work orders.
    - **`NEXT SERVICE INTERVAL (UPDATES ONGOING HEALTH)`** appears in the detail drawer **only when the work order is in `Done`**.
    - **Additional Work / Parts Replaced (Not on Original List):** Mechanics can tap quick chips (e.g. *Tire Change / Replacement*, *Brake Pad / Shoe Service*, *Battery Replacement*, *Oil & Filter Change*) or add custom items in the drawer or the `Send to Reports` modal. Matching items automatically reset the vehicle's Ongoing Health diagnostic counters and append to the generated Report.
  - **Reports:** Scoped to the mechanic's own current-month reports and assigned vehicles.
  - **My Profile (`MechanicProfile.jsx`):**
    - Clean header with **`Edit Profile`** only (no cross-tab redirection clutter).
    - Includes the mechanic's **Driver's License** card + inline license editing, current-month `Recent Reports`, and a **`My Archive`** tab organizing the mechanic's historical reports and maintenance records by monthly folders.

---

### C. Authorized Driver (`DRIVER`) — new
Switch to it from the top-right profile menu (**Authorized Driver**, then pick the active driver). Five tabs only:
- **Dashboard (`DriverDashboard.jsx`):** greeting, **`Log a Trip`** and **`Repeat last trip`** buttons, KPI cards (trips this month, km this month, my vehicles available, license status — turns red when expired), `My vehicles` availability list, `Recent trips`, and `Upcoming on my vehicles`.
- **Car Profiling (`DriverVehicles.jsx`):** read-only cards for **only the vehicles the Director authorized** — availability (`Available` / `Booked today` / `In maintenance` / `Offline`), odometer, Insurance & LTO validity pills, next schedules, `Log trip`.
- **Calendar:** read-only availability of the driver's authorized vehicles plus the driver's **own** license expiry (no add/edit/delete/drag; booking details show only `Close`).
- **Reports (`DriverTrips.jsx`):** the driver's own trip logs (this month / all history, CSV export).
- **My Profile (`DriverProfile.jsx`):** own details, Driver's License card, vehicles I can drive. The driver can edit **only their own phone/email**; license renewals stay with the Director.

**Low-effort trip logging (`LogTripModal.jsx`):** when opened from a vehicle's **Log trip** button, that vehicle is locked in a compact header strip (no re-selection). Distance is entered via **Common route** (separate **From** and **To** dropdowns from `TRIP_PLACES` — Kidapawan, Matalam, Makilala, Antipas, Magpet, M'lang, Kabacan, Midsayap, Carmen, Cotabato City, Davao City — with a **Round trip ×2 / One way** toggle) or **Custom (Odometer)** (optional From/To + **Odometer start / end** range, with start pre-filled from the vehicle's current odometer). Recent routes appear as one-tap chips. Saving advances the vehicle odometer, so **Ongoing Health** countdowns stay accurate.

> Not built yet (open question in [BACKEND_READINESS.md §10](BACKEND_READINESS.md)): a Director-side page to review all drivers' trip logs.

---

## 3. Mandatory UI & Component Standards (For Frontend Contributors)

1. **Always Use the Modern Interactive Pickers (`src/components/common/`):**
   - **Personnel / Specialist Selection:** Always use `PersonnelPickerField` ([PersonnelPickerModal.jsx](../src/components/common/PersonnelPickerModal.jsx)) — opens the searchable **Department-Box Employee Directory Popup**. Never use long native `<select>` dropdowns for employees or mechanics.
   - **Schedule / Date Range Selection:** Always use `DateRangeCalendarField` ([DateRangeCalendarModal.jsx](../src/components/common/DateRangeCalendarModal.jsx)) — opens the interactive **Click-and-Drag Calendar Popup** with `TODAY`, `START`, and `DUE` range pills. Never use raw paired `<input type="date">` inputs for scheduling.
2. **Visual & Layout Stability:**
   - Neutral surfaces (`var(--bg-surface-subtle)`, `1px solid var(--border-light)`), no bright pastel backgrounds or thick 4px accent borders.
   - Reserve COTELCO lime (`#D4ED31`) strictly for primary action buttons.
   - Never mount/unmount form rows dynamically in ways that shift modal heights; disable/dim inactive inputs in fixed positions.
   - Use mobile-safe grids (`minmax(min(100%, 290px), 1fr)`) and test from `360px` mobile viewports up to desktop.

---

## 4. Next Phase: Express.js + Microsoft SQL Server Integration

When the backend team and DBA begin implementation, everything is specified in [docs/BACKEND_READINESS.md](BACKEND_READINESS.md):

1. **Confirm the 10 Open Questions ([BACKEND_READINESS.md §10](BACKEND_READINESS.md#10-open-questions-for-the-company-decide-before-implementation)):**
   - Local username/password (`dbo.Users` + JWT) vs. Active Directory / SSO.
   - Whether mechanics can submit manual standalone reports on the **Reports** tab or only reports generated from completed Work Orders.
   - File storage location for report attachments (local disk / SMB share / blob storage).
   - SQL Server hosting, authentication mode, and audit retention policy.
2. **Follow the 9-Step Integration Checklist ([BACKEND_READINESS.md §11](BACKEND_READINESS.md#11-integration-checklist-run-only-when-the-user-says-implement-the-backend)):**
   - Stand up `server/` (Express.js + `mssql`), run the reference DDL migrations in §9, seed from `src/data/fleetData.js`, and wire `src/services/api.js` into `FleetContext.jsx`.
