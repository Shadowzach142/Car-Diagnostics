# COTELCO Fleet Management System

An enterprise utility fleet operations platform designed for **Cotabato Electric Cooperative, Inc. (COTELCO)**. Built with **React 19 + Vite 8** on the frontend and architected for **Express.js (Node.js) + Microsoft SQL Server (`mssql`)** on the backend.

## Team Documentation & Architecture Guides

- **[docs/TEAM_HANDOFF_NOTES.md](docs/TEAM_HANDOFF_NOTES.md)** — **Start here:** Release summary, feature walkthrough for Operations Director & Assigned Mechanic roles, UI/component standards, and backend hand-off notes.
- **[AGENTS.md](AGENTS.md) / [RULEBOOK.md](RULEBOOK.md)** — Official workspace rulebook, navigation map, mandatory interactive pickers, MS SQL schema overview, and UI/UX guidelines (always keep both files identical).
- **[docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md)** — Authoritative **Express.js + MS SQL Server** backend specification (`/api/v1` REST contract, RBAC scoping matrix, transactional business rules, row-to-object mappers, and full SQL Server reference DDL).

---

## Core Modules & Capabilities

1. **Role-Scoped Command Dashboards (`Dashboard.jsx`)**
   - **Operations Director (`DIRECTOR`):** Action shortcuts, 4 interactive KPI cards (including red **Document & License Expiry** alerts across Vehicle Insurance, LTO Registration, and Driver's Licenses), segmented `Alerts & Health` / `In Maintenance` / `Doc & License Expiry` view, and fleet availability donut.
   - **Assigned Mechanic (`MECHANIC`):** Generalized 4-panel all-at-once overview (`Maintenance Queue`, `Upcoming Schedules`, `Ongoing Vehicle Health`, `Done & Recent Reports`).
2. **Car Profiling & 4-Tab Vehicle Dossier (`VehicleProfiling.jsx`, `VehicleDetailModal.jsx`)**
   - Fleet cards with Insurance & LTO Registration validity pills, authorized personnel avatar chips, and red sidebar expiry badges.
   - 4-tab profile modal: `Overview & Specs`, `Driver History` (bidirectional access clearance + driver log), `Maintenance`, and `Paperwork & Registration` (inline renewal + multi-year history).
3. **Employees & Department Directory (`DriverRoster.jsx`, `DriverDetailModal.jsx`)**
   - Clickable **Department Boxes** with employee counts, red license-expiry alert badges, and inline `+ Add department`.
   - Full LTO Driver's License tracking (`VALID`, `EXPIRING SOON`, `EXPIRED`) with inline license renewal and archived license history.
4. **Calendar with Drag-and-Drop & Expiry Filter (`BookingsCalendar.jsx`)**
   - Month, Week, and Day views supporting both Director and Mechanic scheduling (`+ Add Schedule` / `Add Calendar Note`).
   - Drag-and-drop rescheduling preserving multi-day `Start → Due` spans, automatic `SCHEDULE` diff notifications to the Director when mechanics modify schedules, and a red **`Expiry Dates Only`** filter toggle.
5. **Ongoing Health (`OngoingHealth.jsx`)**
   - 2-box per-vehicle diagnostic cards (`Change Oil` + secondary diagnostic) tracked by **Odometer (`KM`)**, **Calendar (`DATE`)**, or **Both (`BOTH`)** (read-only for Mechanics).
6. **3-Column Maintenance Kanban (`MaintenanceHub.jsx`)**
   - `For Maintenance` → `Under Maintenance` → `Done` pipeline with Scheduled vs. Unscheduled tracking.
   - Slide-over detail drawer with `Next Service Interval` (on `Done` orders for Mechanics) and **Additional Work / Parts Replaced** tracking that automatically resets matching Ongoing Health diagnostics and appends to Reports.
7. **Reports (`RepairArchive.jsx`), Archive (`ArchiveHub.jsx`), & Mechanic Profile (`MechanicProfile.jsx`)**
   - Current-month outside shop and in-house motorpool reports with printable official vouchers and photo attachments.
   - Dedicated **Archive** tab for the Director (`Reports Archive`, `Maintenance History`, `Driver History`, `Paperwork History` grouped into monthly folders) and a **`My Archive`** tab inside the Mechanic's **My Profile**.
8. **Configurable Editables (`EditablesConfig.jsx`)**
   - Centralized management for Departments, Job Titles, Employee/Vehicle Classifications, Service Categories & Tasks, Mechanics, Diagnostic Types, and Stations (`Branches`) with automatic rename cascading.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
