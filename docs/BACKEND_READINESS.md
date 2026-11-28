# COTELCO Fleet Management — Backend Readiness Spec

**Stack decided:** Express.js (Node) API + Microsoft SQL Server.
**Status: PLANNING ONLY.** No server, driver, migration, or connection code exists in this repo, and none must be added until the user explicitly says so. This file is the single source of truth for what the backend must do when that day comes. Keep it in sync with `AGENTS.md` / `RULEBOOK.md` whenever a data contract changes.

> The SQL below is **reference text**, not a migration. It has never been run against a database. A DBA should review it before it becomes a real migration.

---

## 1. Target Architecture

```
React (Vite)                         Express.js                     SQL Server
┌──────────────────┐   HTTPS/JSON   ┌────────────────────────┐   TDS  ┌──────────────┐
│ Components       │                │ routes → controllers   │        │ dbo.* tables │
│   │ useFleet()   │                │   → services (txns)    │ mssql  │ views        │
│ FleetContext.jsx │ ─ api.js ────► │   → repositories ──────┼──────► │ sequences    │
│ (only seam)      │ ◄───────────── │ middleware: auth, role │        └──────────────┘
└──────────────────┘                │ scope, validate, audit │
                                    └────────────────────────┘
```

**Proposed (not yet created) server layout** — a sibling `server/` folder, never inside `src/`:

```
server/
  src/
    app.js                 # express(), helmet, cors, json, routes, error handler
    config/env.js          # validated env (DB_*, JWT_*, UPLOAD_DIR, PORT)
    db/pool.js             # single shared mssql ConnectionPool
    middleware/            # authenticate, requireRole, scopeToUser, validate, auditContext
    routes/                # one file per resource (see §5)
    controllers/           # HTTP in/out only
    services/              # business rules + transactions (see §6)
    repositories/          # parametrized SQL only
    mappers/               # SQL row <-> frontend object (see §8)
    jobs/                  # optional scheduled notifications
  migrations/              # real DDL goes here when approved
  seeds/                   # derived from src/data/fleetData.js defaults
```

**Frontend seam:** only `FleetContext.jsx` changes. Add `src/services/api.js`, replace the `useState(() => localStorage…)` initializers with API loads, and replace each mutation's `setX(...)` with an API call + state update. Components do not change.

---

## 2. Gaps In The Current Frontend That The Backend Must Resolve

These are things that work today only because everything runs in one browser. Verified against the code, not assumed.

| # | Gap | Where | What the backend does instead |
|---|---|---|---|
| 1 | **Role is a UI toggle** (`settings.currentRole`, `currentMechanic`). There is no login. | `FleetContext` `setRole` | Real authentication; role and mechanic identity come from the JWT, never the client. |
| 2 | **Client-side permission checks are the only protection.** `checkPermission` can be bypassed trivially. | `FleetContext` | Enforce every rule in Express middleware/services (§4). |
| 3 | **Dead roles in permission arrays:** `'DISPATCHER'` and `'MAINTENANCE'` appear in `checkPermission([...])` but only `DIRECTOR` and `MECHANIC` exist. | `FleetContext` | Map to the 2-role model. In practice these actions are Director-only today. |
| 4 | **Some mutations have no permission check at all:** `addBooking`, `updateBooking`, `deleteBooking`, `updateMechanicProfile`. | `FleetContext` | Backend must scope them (§4): mechanics may only touch their own bookings / profile. |
| 5 | **Possible discrepancy:** `addLedgerEntry` allows `['DIRECTOR','MAINTENANCE']`, so a `MECHANIC` cannot add a manual report, yet the Reports page shows **Add Report** for everyone. Mechanic reports currently come from completing a work order. | `FleetContext`, `RepairArchive.jsx` | **Decision needed** (§10, Q3). |
| 6 | **IDs are generated in the browser** with `Math.random()` / `Date.now()` / `array.length + n` (e.g. `REP-2026-${workOrders.length + 95}`). Collisions are possible. | `FleetContext` | Server issues IDs via SQL `SEQUENCE`s (§9). |
| 7 | **Files are stored as base64 in state/localStorage** (`fileDataUrl`, `receiptImage`, `photoUrl`, vehicle `imageUrl`). | `RepairArchive`, `AddLedgerModal`, `VehicleDetailModal` | Multipart upload → disk/blob; DB stores metadata + path in `dbo.Attachments`. |
| 8 | **Audit log is capped at 100 rows and uses a fake IP** (`192.168.10.x` random). | `logAuditEvent` | Append-only table; real `req.ip`; no cap. Audit is written server-side only. |
| 9 | **Notifications are partly computed live in the browser** (document expiry, driver-license expiry, health, open work orders) and partly stored. Read/dismiss state is per-browser. | `notifications` `useMemo` | Stored events in `dbo.Notifications`; expiry/health computed by API or a view; per-user read state in `dbo.NotificationUserState` (§7). |
| 10 | **Fabricated history rows.** `VehicleDetailModal` and `ArchiveHub` synthesize "baseline" records from the vehicle's model year (`SEED-DH-*`, `HIST-PMS-*`, `INIT-LTO-*`, `INIT-INS-*`). They are not real data. | `VehicleDetailModal.jsx`, `ArchiveHub.jsx` | **Remove the synthesis at integration.** The API returns only real rows. Until then, do not add more. |
| 11 | **Branch `code` does not exist in the seed** but the schema/UI expect one (`branch?.code`). | `fleetData.js` | Derive from `BranchId` (`BR-KID` → `KID`) or add a real column. |
| 12 | **Date math differs slightly.** Client uses `Math.ceil((expiry - now)/day)`; SQL `DATEDIFF(DAY,…)` counts calendar days. | expiry checks | Backend is authoritative: expired when `DaysRemaining < 0`, warning when `<= 90`. Expect an off-by-one vs. the old client at the boundary. |
| 13 | **Rename cascades are done by string match** (`updateEditableItem`, `updateMechanicProfile`). | `FleetContext` | Store `EmployeeId` foreign keys for people (no name cascade needed); keep text cascade only for editable lists (§6.8). |
| 14 | **COMPLIANCE calendar events and Archive month groups are derived in the client.** | `BookingsCalendar`, `ArchiveHub` | Not stored. Optional `GET /calendar/expiry` and `GET /archive/*` for scale (§5). |

---

## 3. Conventions (the contract that guarantees zero frontend rewrite)

- **JSON keys are camelCase and identical to today's frontend objects** (`vehicleCode`, `assignedMechanic`, `licenseExpiry`, `scheduledDate`, `deadline`, …). SQL columns are PascalCase. Only `server/src/mappers/` knows both.
- **Dates:** `DATE` columns serialize as `YYYY-MM-DD` strings (no time, no timezone shifting). Business timezone is `Asia/Manila`; never convert a `DATE` through `new Date()` on the server.
- **Timestamps:** `DATETIME2(0)`, stored UTC, serialized ISO-8601.
- **Calendar notes:** a booking with no vehicle is returned with `vehicleCode: 'NOTE'` (the frontend relies on that sentinel). In SQL it is `VehicleCode IS NULL`.
- **People in work orders / bookings / diagnostics** are stored by `EmployeeId`. The API composes the legacy display string `"Full Name (Job Title)"` into `assignedMechanic` / `assignedPerson`.
- **Envelope:** success `{ "data": …, "meta": { … } }`; error `{ "error": { "code": "FORBIDDEN", "message": "…", "details": [] } }`. Status codes: 200/201/204, 400 validation, 401, 403, 404, 409 (concurrency/uniqueness), 422 business-rule violation.
- **Base path:** `/api/v1`. In dev, Vite proxies `/api` to the Express port (no CORS needed in dev).
- **Concurrency:** `WorkOrders` and `Bookings` carry a `ROWVERSION`. Drag-and-drop rescheduling and two people editing the same job must send/receive an `ETag` / `If-Match` and get `409` on conflict.
- **SQL safety:** every statement parametrized (`request.input(...)`); no string-built SQL; no `SELECT *`.
- **Express security & middleware controls (`server/src/app.js` & `middleware/`):**
  - **Rate limiting (`express-rate-limit`):** enforce strict rate limits on authentication endpoints (`/api/v1/auth/login`, `/api/v1/auth/refresh`) and write/mutation routes (`POST`, `PUT`, `PATCH`, `DELETE`) to mitigate brute-force and abuse.
  - **JSON body size cap:** configure `express.json({ limit: '100kb' })` so oversized JSON payloads cannot exhaust server memory.
  - **File upload size cap:** configure `multer({ limits: { fileSize: 10 * 1024 * 1024 } })` (10 MB ceiling) alongside server-side MIME/magic-byte verification for attachment uploads.
  - **Refresh cookie hardening & CSRF protection:** issue refresh token cookies with `SameSite=Strict; HttpOnly; Secure` (`Path=/api/v1/auth/refresh`) and enforce CSRF protection (Origin/Referer validation or custom header / CSRF token check) on `/api/v1/auth/refresh`.

---

## 4. Roles & Permissions (server-enforced)

Three roles: `DIRECTOR`, `MECHANIC`, `DRIVER`. Derived from the current `checkPermission` calls and the role scoping in the rulebook.

| Capability | DIRECTOR | MECHANIC |
|---|---|---|
| Read vehicles | all | only vehicles they have `VehicleAccess` to (fallback: vehicles in their work orders) |
| Create/update/reassign vehicle, grant/revoke access | ✅ | ❌ |
| Edit Ongoing Health diagnostics | ✅ | ❌ (read-only) |
| Read employees | all | own record only |
| Create employee / edit any employee | ✅ | ❌ |
| Edit **own** profile + license (`updateMechanicProfile`) | — | ✅ (own `EmployeeId` only) |
| Create work order / schedule / assign | ✅ | ❌ |
| Update work order stage, checklist, notes, next interval | ✅ | ✅ **only if** `AssignedMechanicId` = self |
| Add extra work / parts replaced | ✅ | ✅ (own jobs) |
| Archive completed work order ("Send to Reports") | ✅ | ✅ (own jobs) |
| Delete work order | ✅ | ❌ |
| Read reports | all | only where `Mechanic` = self |
| Add manual report | ✅ | **TBD** (§10 Q3) |
| Calendar: read | all | items they created, or `MAINTENANCE` bookings assigned to them / on their work orders |
| Calendar: add schedule | ✅ | ✅ (stamped `CreatedByRole='MECHANIC'`, notifies Director) |
| Calendar: edit/delete | any | only items they created or are assigned to (notifies Director) |
| Archive tab | ✅ | ❌ (mechanic uses **My Archive** inside My Profile) |
| Editables / Stations | ✅ | ❌ (read for dropdowns only) |
| Incident reports | ✅ | create/read own |
| Audit logs | read ✅ | ❌ |
| Notifications | `recipientRole IN ('ALL','DIRECTOR')` | `ALL`/`MECHANIC` targeted to them, or about their vehicles |

Rule: **scope in SQL (`WHERE`), not by filtering in JS after the fact**, so a mechanic can never receive another mechanic's rows.

### 4.1 `DRIVER` role (Authorized Driver)

Identity: `Users.Role = 'DRIVER'` with a mandatory `EmployeeId` (same rule as `MECHANIC`). Everything is scoped through `dbo.VehicleAccess` for that employee.

| Capability | DRIVER |
|---|---|
| Read vehicles | **only** vehicles with a `VehicleAccess` row for self (read-only; no diagnostics editing, no access management) |
| Read employees | own record only (`GET /employees/me`); never the roster |
| Edit own profile | **phone and email only** (`PUT /employees/me/contact`); license, department, title stay Director-managed |
| Log a trip (`POST /trips`) | ✅ only for a vehicle they hold `VehicleAccess` to **and** whose `Status = 'ACTIVE'`; `EmployeeId` is taken from the JWT, never from the body |
| Read trips | own rows only (`WHERE EmployeeId = @self`); Director reads all |
| Delete trip | ❌ (Director only) |
| Calendar: read | `Bookings` where `VehicleCode` ∈ authorized vehicles, plus compliance (insurance/LTO) for those vehicles, plus **own** license expiry; no calendar notes, no other drivers' licenses |
| Calendar: add/edit/delete | ❌ read-only |
| Reports | own **trip logs** only (repair/service reports are not exposed) |
| Maintenance, Ongoing Health, Archive, Editables, Audit logs | ❌ |
| Notifications | `DOCUMENT_EXPIRY` for own license / authorized vehicles, plus `RecipientRole = 'DRIVER'` targeted to them |

---

## 5. REST API Contract

All paths under `/api/v1`. Auth required unless noted. `D` = Director, `M` = Mechanic, `Dr` = Driver (scoped per §4 / §4.1).

### Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | returns access token (+ refresh cookie) |
| POST | `/auth/refresh` | public | |
| POST | `/auth/logout` | D, M | |
| GET | `/auth/me` | D, M | `{ role, employeeId, name, mechanic: "Name (Title)" }` — replaces `settings.currentRole/currentMechanic` |

### Reference data
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/branches` | D, M | |
| POST / PUT / DELETE | `/branches[/:id]` | D | |
| GET | `/editables` | D, M | returns the same object shape as `editables` today; `mechanics` is composed from `Employees.IsMechanic` |
| POST | `/editables/:category` | D | `{ value }` |
| PUT | `/editables/:category` | D | `{ oldValue, newValue }` — **cascades** (§6.8) |
| DELETE | `/editables/:category` | D | `{ value }` |

### Vehicles
| Method | Path | Roles | Maps to |
|---|---|---|---|
| GET | `/vehicles` | D, M(scoped) | state `vehicles` (includes `diagnostics[]`, `authorizedDriverIds[]`, `specs{}`, histories) |
| GET | `/vehicles/:id` | D, M(scoped) | |
| POST | `/vehicles` | D | `addVehicle` |
| PUT | `/vehicles/:id` | D | `updateVehicle` (insurance/registration date changes append a history row — recommended) |
| POST | `/vehicles/:id/reassign` | D | `reassignVehicle` `{ branchId, custodianDepartment, reason }` |
| POST | `/vehicles/:id/access/:employeeId` | D | `grantVehicleAccess` |
| DELETE | `/vehicles/:id/access/:employeeId` | D | `revokeVehicleAccess` |
| PUT | `/vehicles/:id/diagnostics/:diagId` | D | `upsertVehicleDiagnostic` |
| DELETE | `/vehicles/:id/diagnostics/:diagId` | D | `removeVehicleDiagnostic` |
| POST | `/vehicles/:id/photo` | D | multipart → `ImageUrl` |

### Employees
| Method | Path | Roles | Maps to |
|---|---|---|---|
| GET | `/employees` | D | state `drivers` |
| GET | `/employees/me` | M, Dr | |
| POST | `/employees` | D | `addDriver` |
| PUT | `/employees/:id` | D | `updateDriver` (license change appends `EmployeeLicenseHistory`, notifies) |
| PUT | `/employees/me/contact` | Dr | `updateOwnDriverContact` `{ phone, email }` only |
| PUT | `/employees/me` | M | `updateMechanicProfile` (name, specialty, phone, email, department, branch, category, employeeId, license no/type/issued/expiry) |

### Work orders (Maintenance Kanban)
| Method | Path | Roles | Maps to |
|---|---|---|---|
| GET | `/work-orders` | D, M(own) | query: `stage`, `archived`, `mechanicId`, `vehicleCode` |
| POST | `/work-orders` | D | `createWorkOrder` (scheduled or unscheduled) |
| PATCH | `/work-orders/:id` | D | assign mechanic / set schedule dates |
| POST | `/work-orders/:id/stage` | D, M(own) | `updateWorkOrderStage` `{ stage, checklistItems, additionalWork, mechanicNote, nextIntervalKm, nextTargetDate, createReport }` |
| POST | `/work-orders/:id/archive` | D, M(own) | `archiveCompletedWorkOrder` |
| DELETE | `/work-orders/:id` | D | `deleteWorkOrder` |

### Reports (`RepairVouchers`)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/reports` | D, M(own) | query: `month=YYYY-MM`, `vehicleCode`, `branchId`, `mechanicId`, `q`. The **Reports** tab calls with the current month; **Archive** groups by month. |
| GET | `/reports/:voucherNo` | D, M(own) | |
| POST | `/reports` | D (M TBD) | `addLedgerEntry` |
| POST | `/reports/:voucherNo/attachments` | D, M(own) | multipart |
| GET | `/attachments/:id` | D, M(own) | streams the file |

### Calendar
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/bookings` | D, M(scoped) | query: `from`, `to`, `vehicleCode` |
| POST | `/bookings` | D, M | notifies Director when `M` |
| PATCH | `/bookings/:id` | D, M(own) | drag-drop sends `{ date, deadline, startTime, endTime }`; `If-Match` required |
| DELETE | `/bookings/:id` | D, M(own) | notifies Director when `M` |
| GET | `/calendar/expiry` | D | optional: insurance / LTO / license expiry events for `from..to` (otherwise computed client-side) |

### Trips (Driver usage & mileage)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/trip-routes` | D, M, Dr | reference list for the Log Trip dropdown (`{ id, from, to, km }`); Director may later manage it |
| GET | `/trips` | D, Dr(own) | query: `month=YYYY-MM`, `vehicleCode`, `employeeId` (D only), `q` |
| POST | `/trips` | Dr, D | `addTripLog` `{ vehicleId, date, routeId?, from?, to?, roundTrip, distanceKm, inputMode, odometerStart?, odometerEnd?, purpose, notes }` — one SQL transaction (§6.10); `422` if not authorized / vehicle not `ACTIVE` / distance ≤ 0 |
| DELETE | `/trips/:id` | D | `deleteTripLog`; does **not** roll the odometer back (adjust via vehicle edit) |

### Other
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/incidents` | D, M | `addIncidentReport` |
| PATCH | `/incidents/:id/status` | D | |
| DELETE | `/incidents/:id` | D | |
| GET | `/audit-logs` | D | read-only; query `from`, `to`, `category`; **no POST** |
| GET | `/notifications` | D, M | stored + computed alerts, role-scoped, with per-user `isRead/isDismissed` |
| PATCH | `/notifications/:id/read` | D, M | |
| PATCH | `/notifications/read-all` | D, M | |
| DELETE | `/notifications/:id` | D, M | dismiss (per user) |
| GET | `/archive/months` | D | optional: counts per month per category |
| GET | `/archive/:category` | D | optional: `REPORTS|MAINTENANCE|DRIVERS|PAPERWORK`, `month=YYYY-MM` |

---

## 6. Business Rules That Must Run Server-Side In One SQL Transaction

Today these live in `FleetContext`. Each is one `BEGIN TRAN … COMMIT` in a service so a failure never leaves half-applied state.

1. **Create work order.** Insert `WorkOrders` + `WorkOrderChecklistItems`; set vehicle `Status='IN-SHOP'` and `StatusReason`; update vehicle `NextServiceDueKm/Date` if supplied. If the order is **scheduled** (has mechanic *and* a date) insert a linked `Bookings` row (`SourceWorkOrderId`); if **unscheduled**, create no booking.
2. **Update stage / schedule.** Update the order. When mechanic or dates change and both exist, **upsert** the linked booking. On **COMPLETED**: reset every matching `VehicleDiagnostics` row (match by type; also match any checklist/extra item — oil, brake, tire, battery, dielectric), set `LastDoneKm/Date`, recompute `TargetKm/Date`, set vehicle `ACTIVE` + `LastServiceDate` + next-service fields, upsert the `RepairVouchers` row (summary = note + extra work + next interval), notify the Director.
3. **Archive completed order ("Send to Reports").** Set `ArchivedFromBoard = 1`; ensure a voucher exists.
4. **Delete work order (D).** Delete the order and its linked booking; if the vehicle has no other open order, set it `ACTIVE`.
5. **Grant / revoke vehicle access.** Insert/delete `VehicleAccess`; write audit.
6. **Employee license change.** Append `EmployeeLicenseHistory` when `LicenseExpiryDate` changes; write audit; notify Director.
7. **Mechanic schedule changes.** On booking create/update/delete by a mechanic, compute the human-readable diff server-side (date, end date, time, status, title, assignee) and create a `SCHEDULE` notification for the Director.
8. **Editable rename cascade.** `departments` → `Employees.Department`, `Vehicles.CustodianDepartment`; `jobTitles` → `Employees.JobTitle`; `employeeClassifications` → `Employees.Category`; `vehicleClassifications` → `Vehicles.Classification`; `serviceCategories` → `WorkOrders.Category`; `diagnosticTypes` → `VehicleDiagnostics.Type`. (`mechanics` needs no cascade — it is derived from `Employees`.)
9. **Every mutation above writes `AuditLogs`** with the authenticated user, role, and `req.ip`.
10. **Log trip (DRIVER).** In one transaction: verify `VehicleAccess(VehicleId, EmployeeId=self)` and `Vehicles.Status='ACTIVE'`; insert `TripLogs` (`TripId` from `seq_TripNo`); advance `Vehicles.OdometerKm` = `GREATEST(current, OdometerEnd)` when `InputMode='ODOMETER'`, else `current + DistanceKm` (use `UPDATE … SET OdometerKm = CASE …` — SQL Server has no `GREATEST`); `UPDATE Employees SET TotalTrips = TotalTrips + 1`; write `AuditLogs` (`Trip Logged`). Because the odometer moves, **Ongoing Health** countdowns/alerts update automatically (they are derived from `OdometerKm`).

---

## 7. Computed / Derived Data

- **Scheduled vs Unscheduled** (Maintenance cards): `IsScheduled = AssignedMechanicId IS NOT NULL AND (ScheduledDate IS NOT NULL OR TargetCompletion IS NOT NULL)`. Implemented as a persisted computed column below.
- **Expiry alerts** (vehicle insurance, LTO registration, employee license; "expired" when `DaysRemaining < 0`, "expiring soon" when `<= 90`): `dbo.vw_ExpiryAlerts`. The API turns rows into `DOCUMENT_EXPIRY` notifications (`CRITICAL` / `WARNING`) using the same deterministic id the client uses today (`NOTIF-DOC-<entity>-<key>-<expiryDate>`, `NOTIF-LIC-<employeeId>-<expiryDate>`) so a renewal naturally retires the alert and a re-expiry creates a new one.
- **Health status** (overdue / due soon / healthy): computed from `VehicleDiagnostics` + `Vehicles.OdometerKm` using the exact thresholds in `FleetContext.jsx` and `Dashboard.jsx`:
  - **Overdue (`OVERDUE`)**: `remainingKm <= 0` (when `TrackMode` is `KM` or `BOTH`) or `remainingDays < 0` (when `TrackMode` is `DATE` or `BOTH`).
  - **Due Soon (`DUE_SOON`)**: `0 < remainingKm <= 1200` (when `KM` or `BOTH`) or `0 <= remainingDays <= 21` (when `DATE` or `BOTH`).
  - **Healthy (`HEALTHY`)**: otherwise (`BOTH` takes the worst status between KM and Date).
- **Archive months**: group by `YYYY-MM` of the record date; compute in SQL (`FORMAT`/`CONVERT(char(7), date, 126)`) if the API route is added.

---

## 8. Row ↔ Object Mapping Notes

| Frontend field | SQL | Note |
|---|---|---|
| `vehicle.id` / `code` / `plateNo` | `VehicleId` / `Code` / `PlateNo` | |
| `vehicle.year` | `ModelYear` | |
| `vehicle.coordinates{lat,lng}` | `Latitude`, `Longitude` | |
| `vehicle.specs{…}` | `Transmission`, `ReachHeight`, `BucketCapacity`, `DielectricRating`, `PayloadCapacity`, `Outriggers` | rebuild the `specs` object |
| `vehicle.authorizedDriverIds[]` | `VehicleAccess` rows | |
| `vehicle.assignedDriver` | derived from `Employees.AssignedVehicleCode` | not stored |
| `vehicle.diagnostics[]` | `VehicleDiagnostics` | `intervalMonths: 'CUSTOM'` ⇔ `IntervalMonths IS NULL` |
| `vehicle.registrationHistory[]` / `driverHistory[]` | `VehicleRegistrationHistory` / `VehicleDriverHistory` | |
| `driver.certifications[]` | `EmployeeCertifications` | |
| `driver.licenseHistory[]` | `EmployeeLicenseHistory` | |
| `driver.safetyRating` (`"99.4%"`) | `SafetyRating DECIMAL(5,2)` | format on output |
| `workOrder.assignedMechanic` (`"Name (Title)"`) | `AssignedMechanicId` → `Employees` | composed by mapper |
| `workOrder.checklistItems[]` | `WorkOrderChecklistItems` | `addedByMechanic` ⇔ `IsExtra = 1` |
| `workOrder.additionalWork[]` | `WorkOrderChecklistItems WHERE IsExtra = 1` | report-modal extras are stored as extra, done items |
| `workOrder.scheduledDate` / `targetCompletion` | `ScheduledDate` / `TargetCompletion` | `''` ⇔ `NULL` |
| `booking.date` / `deadline` | `StartDate` / `EndDate` | |
| `booking.startTime` / `endTime` (`"08:00"`) | `StartTime` / `EndTime` (`TIME(0)`) | `startHour/endHour` derived |
| `booking.driver` | `AssignedEmployeeId` → name, else `DriverNameText` | notes: `"Operations Note"` |
| `booking.vehicleCode === 'NOTE'` | `VehicleCode IS NULL` | |
| `trip.date` / `from` / `to` / `roundTrip` / `distanceKm` | `TripDate` / `FromPlace` / `ToPlace` / `IsRoundTrip` / `DistanceKm` | `inputMode` ⇔ `InputMode` (`ROUTE`/`CUSTOM`/`ODOMETER`); `driverId` ⇔ `EmployeeId`; `driverName`, `vehicleCode`, `plateNo` joined by the mapper |
| `COMMON_TRIP_ROUTES[]` (`fleetData.js`) | `TripRoutes` | seeded from the constant; km are approximate one-way road distances |
| `report.fileName/fileType/fileSize/fileDataUrl/receiptImage` | `Attachments` | `fileDataUrl` becomes a download URL |

---

## 9. SQL Server Schema (reference DDL)

```sql
/* ===== REFERENCE ONLY — NOT EXECUTED BY THE APP ===== */

/* ---------- Sequences (server-issued IDs; replaces client Math.random / array.length) ---------- */
CREATE SEQUENCE dbo.seq_WorkOrderNo START WITH 100 INCREMENT BY 1;   -- REP-<year>-<n>
CREATE SEQUENCE dbo.seq_VoucherNo   START WITH 10000 INCREMENT BY 1; -- VCH-<year>-<n>
CREATE SEQUENCE dbo.seq_ReceiptNo   START WITH 100000 INCREMENT BY 1;-- RCPT-<n>
CREATE SEQUENCE dbo.seq_BookingNo   START WITH 1 INCREMENT BY 1;     -- BK-<year>-<n>
CREATE SEQUENCE dbo.seq_IncidentNo  START WITH 100 INCREMENT BY 1;   -- INC-<year>-<n>
CREATE SEQUENCE dbo.seq_TripNo      START WITH 1 INCREMENT BY 1;     -- TRIP-<year>-<n>
CREATE SEQUENCE dbo.seq_VehicleNo   START WITH 1 INCREMENT BY 1;     -- VEH-<nnn>
CREATE SEQUENCE dbo.seq_EmployeeNo  START WITH 1 INCREMENT BY 1;     -- DRV-<nnn>
GO

/* ---------- Stations ---------- */
CREATE TABLE dbo.Branches (
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT PK_Branches PRIMARY KEY,   -- BR-KID
  Code          VARCHAR(10)   NOT NULL CONSTRAINT UQ_Branches_Code UNIQUE,   -- derive from BranchId if no real code
  Name          NVARCHAR(100) NOT NULL,
  Municipality  NVARCHAR(100) NOT NULL,
  Address       NVARCHAR(200) NULL,
  Latitude      DECIMAL(9,6)  NOT NULL,
  Longitude     DECIMAL(9,6)  NOT NULL,
  ManagerName   NVARCHAR(100) NULL,
  ContactPhone  VARCHAR(40)   NULL,
  Capacity      INT           NULL,
  Coverage      NVARCHAR(200) NULL,
  IsHQ          BIT           NOT NULL CONSTRAINT DF_Branches_IsHQ DEFAULT 0
);

/* ---------- Editable dropdown lists (Editables tab) ---------- */
CREATE TABLE dbo.EditableOptions (
  OptionId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EditableOptions PRIMARY KEY,
  Category     VARCHAR(40)   NOT NULL,   -- departments | jobTitles | employeeClassifications | vehicleClassifications
                                         -- | serviceCategories | serviceTasks | diagnosticTypes
  ParentKey    NVARCHAR(100) NULL,       -- for serviceTasks: the serviceCategories value it belongs to
  OptionValue  NVARCHAR(200) NOT NULL,
  SortOrder    INT           NOT NULL CONSTRAINT DF_EditableOptions_Sort DEFAULT 0,
  CONSTRAINT UQ_EditableOptions UNIQUE (Category, ParentKey, OptionValue)  -- SQL Server treats NULL ParentKey as equal
);

/* ---------- Vehicles ---------- */
CREATE TABLE dbo.Vehicles (
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT PK_Vehicles PRIMARY KEY,
  Code          VARCHAR(20)   NOT NULL CONSTRAINT UQ_Vehicles_Code UNIQUE,
  PlateNo       VARCHAR(20)   NOT NULL CONSTRAINT UQ_Vehicles_PlateNo UNIQUE,
  MakeModel     NVARCHAR(100) NOT NULL,
  ModelYear     INT           NOT NULL,
  Classification VARCHAR(50)  NOT NULL,
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT FK_Vehicles_Branches REFERENCES dbo.Branches(BranchId),
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_Vehicles_Status DEFAULT 'ACTIVE'
                CONSTRAINT CK_Vehicles_Status CHECK (Status IN ('ACTIVE','IN-SHOP','OFFLINE')),
  StatusReason  NVARCHAR(255) NULL,
  UrgentAlert   NVARCHAR(255) NULL,
  OdometerKm    INT           NOT NULL CONSTRAINT DF_Vehicles_Odo DEFAULT 0,
  OperatingHours INT          NOT NULL CONSTRAINT DF_Vehicles_Hours DEFAULT 0,
  FuelLevelPct  TINYINT       NULL,
  AcquisitionCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_Vehicles_Cost DEFAULT 0,
  AcquisitionDate DATE        NOT NULL,
  Supplier      NVARCHAR(150) NULL,
  OwnershipType NVARCHAR(100) NULL,
  CustodianDepartment NVARCHAR(100) NULL,
  WarrantyPolicy NVARCHAR(150) NULL,
  InsuranceAcquiredDate    DATE NULL,
  InsuranceExpiryDate      DATE NULL,
  RegistrationAcquiredDate DATE NULL,
  RegistrationExpiryDate   DATE NULL,
  OrCrNo        VARCHAR(50)   NULL,
  AssetTag      VARCHAR(50)   NULL,
  Vin           VARCHAR(50)   NULL,
  EngineNo      VARCHAR(50)   NULL,
  FuelType      VARCHAR(30)   NULL,
  Transmission  NVARCHAR(50)  NULL,
  ReachHeight   NVARCHAR(50)  NULL,
  BucketCapacity NVARCHAR(50) NULL,
  DielectricRating NVARCHAR(50) NULL,
  PayloadCapacity  NVARCHAR(100) NULL,
  Outriggers    NVARCHAR(100) NULL,
  Latitude      DECIMAL(9,6)  NULL,
  Longitude     DECIMAL(9,6)  NULL,
  LastServiceDate     DATE NULL,
  NextServiceDueKm    INT  NULL,
  NextServiceDueDate  DATE NULL,
  ImageUrl      NVARCHAR(255) NULL
);
CREATE INDEX IX_Vehicles_Branch ON dbo.Vehicles(BranchId);
CREATE INDEX IX_Vehicles_Insurance ON dbo.Vehicles(InsuranceExpiryDate);
CREATE INDEX IX_Vehicles_Registration ON dbo.Vehicles(RegistrationExpiryDate);

/* ---------- Employees (UI label: Employees; frontend `drivers[]`) ---------- */
CREATE TABLE dbo.Employees (
  EmployeeId    VARCHAR(10)   NOT NULL CONSTRAINT PK_Employees PRIMARY KEY,   -- DRV-001
  CompanyIdNo   VARCHAR(20)   NOT NULL CONSTRAINT UQ_Employees_CompanyIdNo UNIQUE,
  FullName      NVARCHAR(100) NOT NULL,
  JobTitle      NVARCHAR(100) NOT NULL,
  Department    NVARCHAR(100) NOT NULL,
  Category      VARCHAR(50)   NOT NULL,
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT FK_Employees_Branches REFERENCES dbo.Branches(BranchId),
  AssignedVehicleCode VARCHAR(20) NULL CONSTRAINT FK_Employees_Vehicles REFERENCES dbo.Vehicles(Code),
  LicenseNo     VARCHAR(30)   NOT NULL,
  LicenseType   NVARCHAR(60)  NOT NULL,
  LicenseAcquiredDate DATE    NULL,
  LicenseExpiryDate   DATE    NOT NULL,
  ContactPhone  VARCHAR(20)   NOT NULL,
  Email         NVARCHAR(100) NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_Employees_Status DEFAULT 'ON-DUTY',
  TotalTrips    INT           NOT NULL CONSTRAINT DF_Employees_Trips DEFAULT 0,
  SafetyRating  DECIMAL(5,2)  NOT NULL CONSTRAINT DF_Employees_Safety DEFAULT 100,
  IsMechanic    BIT           NOT NULL CONSTRAINT DF_Employees_IsMech DEFAULT 0,  -- feeds editables.mechanics
  IsActive      BIT           NOT NULL CONSTRAINT DF_Employees_Active DEFAULT 1
);
CREATE INDEX IX_Employees_Branch ON dbo.Employees(BranchId);
CREATE INDEX IX_Employees_LicenseExpiry ON dbo.Employees(LicenseExpiryDate);

CREATE TABLE dbo.EmployeeCertifications (
  EmployeeId    VARCHAR(10)   NOT NULL CONSTRAINT FK_EmpCert_Employees REFERENCES dbo.Employees(EmployeeId) ON DELETE CASCADE,
  Certification NVARCHAR(150) NOT NULL,
  CONSTRAINT PK_EmployeeCertifications PRIMARY KEY (EmployeeId, Certification)
);

CREATE TABLE dbo.EmployeeLicenseHistory (
  HistoryId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmployeeLicenseHistory PRIMARY KEY,
  EmployeeId    VARCHAR(10)   NOT NULL CONSTRAINT FK_LicHist_Employees REFERENCES dbo.Employees(EmployeeId) ON DELETE CASCADE,
  LicenseNo     VARCHAR(30)   NOT NULL,
  LicenseType   NVARCHAR(60)  NOT NULL,
  DateAcquired  DATE          NULL,
  ExpiryDate    DATE          NOT NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_LicHist_Status DEFAULT 'RENEWED',
  RecordedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_LicHist_At DEFAULT SYSUTCDATETIME()
);

/* ---------- Authentication (NEW — the frontend has no login yet) ---------- */
CREATE TABLE dbo.Users (
  UserId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
  Username      NVARCHAR(100) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
  PasswordHash  VARCHAR(255)  NOT NULL,                       -- argon2id / bcrypt; never plaintext
  Role          VARCHAR(20)   NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN ('DIRECTOR','MECHANIC','DRIVER')),
  EmployeeId    VARCHAR(10)   NULL CONSTRAINT FK_Users_Employees REFERENCES dbo.Employees(EmployeeId),
  IsActive      BIT           NOT NULL CONSTRAINT DF_Users_Active DEFAULT 1,
  LastLoginAt   DATETIME2(0)  NULL,
  CONSTRAINT CK_Users_MechanicHasEmployee CHECK (Role = 'DIRECTOR' OR EmployeeId IS NOT NULL)  -- MECHANIC and DRIVER must map to an employee
);

/* ---------- Vehicle access & histories ---------- */
CREATE TABLE dbo.VehicleAccess (
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT FK_VAccess_Vehicles  REFERENCES dbo.Vehicles(VehicleId) ON DELETE CASCADE,
  EmployeeId    VARCHAR(10)   NOT NULL CONSTRAINT FK_VAccess_Employees REFERENCES dbo.Employees(EmployeeId) ON DELETE CASCADE,
  GrantedAt     DATETIME2(0)  NOT NULL CONSTRAINT DF_VAccess_At DEFAULT SYSUTCDATETIME(),
  GrantedByRole VARCHAR(20)   NOT NULL CONSTRAINT DF_VAccess_Role DEFAULT 'DIRECTOR',
  CONSTRAINT PK_VehicleAccess PRIMARY KEY (VehicleId, EmployeeId)
);

CREATE TABLE dbo.VehicleDriverHistory (
  HistoryId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VehicleDriverHistory PRIMARY KEY,
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT FK_VDH_Vehicles REFERENCES dbo.Vehicles(VehicleId) ON DELETE CASCADE,
  EmployeeId    VARCHAR(10)   NULL     CONSTRAINT FK_VDH_Employees REFERENCES dbo.Employees(EmployeeId),
  DriverName    NVARCHAR(100) NOT NULL,
  Action        VARCHAR(30)   NOT NULL,                       -- AUTHORIZED | PAST_ASSIGNED | REVOKED
  EventDate     DATE          NOT NULL,
  Note          NVARCHAR(300) NULL
);

CREATE TABLE dbo.VehicleRegistrationHistory (
  RecordId      BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VehicleRegHistory PRIMARY KEY,
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT FK_VRH_Vehicles REFERENCES dbo.Vehicles(VehicleId) ON DELETE CASCADE,
  DocType       NVARCHAR(100) NOT NULL,                       -- LTO Registration (OR/CR) | Insurance
  ReferenceNo   VARCHAR(60)   NULL,
  Agency        NVARCHAR(100) NULL,
  DateAcquired  DATE          NULL,
  ExpiryDate    DATE          NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_VRH_Status DEFAULT 'ARCHIVED'
);

/* ---------- Ongoing Health ---------- */
CREATE TABLE dbo.VehicleDiagnostics (
  DiagnosticId  VARCHAR(40)   NOT NULL CONSTRAINT PK_VehicleDiagnostics PRIMARY KEY,   -- DIAG-VEH-001-OIL
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT FK_Diag_Vehicles REFERENCES dbo.Vehicles(VehicleId) ON DELETE CASCADE,
  Type          NVARCHAR(100) NOT NULL,
  TrackMode     VARCHAR(5)    NOT NULL CONSTRAINT CK_Diag_Mode CHECK (TrackMode IN ('KM','DATE','BOTH')),
  LastDoneKm    INT           NULL,
  IntervalKm    INT           NULL,
  TargetKm      INT           NULL,
  LastDoneDate  DATE          NULL,
  IntervalMonths INT          NULL,                           -- NULL == 'CUSTOM'
  TargetDate    DATE          NULL,
  AssignedEmployeeId VARCHAR(10) NULL CONSTRAINT FK_Diag_Employees REFERENCES dbo.Employees(EmployeeId),
  Notes         NVARCHAR(300) NULL
);
CREATE INDEX IX_Diag_Vehicle ON dbo.VehicleDiagnostics(VehicleId);

/* ---------- Work orders (Maintenance Kanban: For Maintenance -> Under Maintenance -> Done) ---------- */
CREATE TABLE dbo.WorkOrders (
  WorkOrderId   VARCHAR(20)   NOT NULL CONSTRAINT PK_WorkOrders PRIMARY KEY,   -- REP-2026-091
  VehicleCode   VARCHAR(20)   NOT NULL CONSTRAINT FK_WO_Vehicles REFERENCES dbo.Vehicles(Code),
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT FK_WO_Branches REFERENCES dbo.Branches(BranchId),
  ServiceType   NVARCHAR(150) NOT NULL,
  Category      VARCHAR(60)   NOT NULL,
  Priority      VARCHAR(20)   NOT NULL CONSTRAINT DF_WO_Priority DEFAULT 'ROUTINE'
                CONSTRAINT CK_WO_Priority CHECK (Priority IN ('ROUTINE','LOW','NORMAL','HIGH','EMERGENCY')),
  Status        VARCHAR(30)   NOT NULL CONSTRAINT DF_WO_Status DEFAULT 'In Shop'
                CONSTRAINT CK_WO_Status CHECK (Status IN ('Pending','In Shop','Completed / Released')),
  CurrentStage  NVARCHAR(60)  NOT NULL CONSTRAINT DF_WO_Stage DEFAULT 'Queued / Inspection',
  DateReported  DATE          NOT NULL,
  ScheduledDate DATE          NULL,                           -- NULL until scheduled
  TargetCompletion DATE       NULL,
  DateCompleted DATE          NULL,
  Facility      NVARCHAR(150) NULL,
  AssignedMechanicId VARCHAR(10) NULL CONSTRAINT FK_WO_Mechanic REFERENCES dbo.Employees(EmployeeId), -- NULL == unassigned
  ReportedBy    NVARCHAR(100) NULL,
  EstimatedCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_WO_Est DEFAULT 0,
  IncurredCost  DECIMAL(18,2) NOT NULL CONSTRAINT DF_WO_Inc DEFAULT 0,
  TargetKm      INT           NULL,
  NextServiceDate DATE        NULL,
  Description   NVARCHAR(MAX) NULL,
  MechanicNote  NVARCHAR(MAX) NULL,
  NextIntervalKm INT          NULL,
  NextTargetDate DATE         NULL,
  DiagnosticSummary NVARCHAR(500) NULL,
  ArchivedFromBoard BIT       NOT NULL CONSTRAINT DF_WO_Archived DEFAULT 0,
  IsScheduled AS CAST(CASE WHEN AssignedMechanicId IS NOT NULL
                            AND (ScheduledDate IS NOT NULL OR TargetCompletion IS NOT NULL)
                           THEN 1 ELSE 0 END AS BIT) PERSISTED,   -- Scheduled vs Unscheduled badge
  RowVer        ROWVERSION
);
CREATE INDEX IX_WO_Mechanic_Stage ON dbo.WorkOrders(AssignedMechanicId, CurrentStage);
CREATE INDEX IX_WO_Vehicle ON dbo.WorkOrders(VehicleCode);

CREATE TABLE dbo.WorkOrderChecklistItems (
  ItemId        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WOChecklist PRIMARY KEY,
  WorkOrderId   VARCHAR(20)   NOT NULL CONSTRAINT FK_WOChk_WO REFERENCES dbo.WorkOrders(WorkOrderId) ON DELETE CASCADE,
  Label         NVARCHAR(200) NOT NULL,
  IsDone        BIT           NOT NULL CONSTRAINT DF_WOChk_Done DEFAULT 0,
  IsExtra       BIT           NOT NULL CONSTRAINT DF_WOChk_Extra DEFAULT 0,   -- mechanic's "Additional Work / Parts Replaced"
  SortOrder     INT           NOT NULL CONSTRAINT DF_WOChk_Sort DEFAULT 0
);

CREATE TABLE dbo.WorkOrderParts (
  PartId        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WOParts PRIMARY KEY,
  WorkOrderId   VARCHAR(20)   NOT NULL CONSTRAINT FK_WOParts_WO REFERENCES dbo.WorkOrders(WorkOrderId) ON DELETE CASCADE,
  Part          NVARCHAR(200) NOT NULL,
  Qty           INT           NOT NULL CONSTRAINT DF_WOParts_Qty DEFAULT 1,
  Cost          DECIMAL(18,2) NOT NULL CONSTRAINT DF_WOParts_Cost DEFAULT 0
);

/* ---------- Reports (service / repair vouchers) ---------- */
CREATE TABLE dbo.RepairVouchers (
  VoucherNo     VARCHAR(30)   NOT NULL CONSTRAINT PK_RepairVouchers PRIMARY KEY,   -- VCH-2026-48201
  ReceiptId     VARCHAR(30)   NOT NULL CONSTRAINT UQ_RepairVouchers_Receipt UNIQUE,
  WorkOrderNo   VARCHAR(20)   NULL,                           -- free text for manual reports (e.g. WO-EXT-123); NOT an FK
  VoucherDate   DATE          NOT NULL,
  VehicleCode   VARCHAR(20)   NOT NULL CONSTRAINT FK_RV_Vehicles REFERENCES dbo.Vehicles(Code),
  PlateNo       VARCHAR(20)   NOT NULL,
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT FK_RV_Branches REFERENCES dbo.Branches(BranchId),
  Facility      NVARCHAR(150) NOT NULL,
  RepairScope   VARCHAR(12)   NOT NULL CONSTRAINT CK_RV_Scope CHECK (RepairScope IN ('IN_HOUSE','OUTSIDE')),
  ServiceType   NVARCHAR(150) NOT NULL,
  ServiceSummary NVARCHAR(MAX) NULL,
  MechanicId    VARCHAR(10)   NULL CONSTRAINT FK_RV_Mechanic REFERENCES dbo.Employees(EmployeeId),
  PartsReplaced NVARCHAR(500) NULL,
  LaborCost     DECIMAL(18,2) NOT NULL CONSTRAINT DF_RV_Labor DEFAULT 0,
  PartsCost     DECIMAL(18,2) NOT NULL CONSTRAINT DF_RV_Parts DEFAULT 0,
  TotalCost     DECIMAL(18,2) NOT NULL CONSTRAINT DF_RV_Total DEFAULT 0,
  ApprovedBy    NVARCHAR(150) NOT NULL
);
CREATE INDEX IX_RV_Date ON dbo.RepairVouchers(VoucherDate DESC);
CREATE INDEX IX_RV_Mechanic ON dbo.RepairVouchers(MechanicId, VoucherDate DESC);

CREATE TABLE dbo.Attachments (
  AttachmentId  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Attachments PRIMARY KEY,
  EntityType    VARCHAR(30)   NOT NULL,                       -- REPAIR_VOUCHER | INCIDENT | VEHICLE_PHOTO
  EntityId      VARCHAR(40)   NOT NULL,
  FileName      NVARCHAR(255) NOT NULL,
  ContentType   VARCHAR(100)  NOT NULL,
  SizeBytes     BIGINT        NOT NULL,
  StoragePath   NVARCHAR(500) NOT NULL,                       -- path/blob key; never the file bytes
  UploadedBy    INT           NULL CONSTRAINT FK_Att_Users REFERENCES dbo.Users(UserId),
  UploadedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_At DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Att_Entity ON dbo.Attachments(EntityType, EntityId);

/* ---------- Driver trips (DRIVER role: "I used the car") ---------- */
CREATE TABLE dbo.TripRoutes (
  RouteId       VARCHAR(20)   NOT NULL CONSTRAINT PK_TripRoutes PRIMARY KEY,   -- RT-KID-MAT
  FromPlace     NVARCHAR(100) NOT NULL,
  ToPlace       NVARCHAR(100) NOT NULL,
  OneWayKm      DECIMAL(9,1)  NOT NULL CONSTRAINT CK_TripRoutes_Km CHECK (OneWayKm > 0),   -- approximate road distance
  IsActive      BIT           NOT NULL CONSTRAINT DF_TripRoutes_Active DEFAULT 1,
  SortOrder     INT           NOT NULL CONSTRAINT DF_TripRoutes_Sort DEFAULT 0
);

CREATE TABLE dbo.TripLogs (
  TripId        VARCHAR(30)   NOT NULL CONSTRAINT PK_TripLogs PRIMARY KEY,     -- TRIP-2026-483920
  VehicleId     VARCHAR(10)   NOT NULL CONSTRAINT FK_Trip_Vehicles  REFERENCES dbo.Vehicles(VehicleId),
  EmployeeId    VARCHAR(10)   NOT NULL CONSTRAINT FK_Trip_Employees REFERENCES dbo.Employees(EmployeeId),
  TripDate      DATE          NOT NULL,
  RouteId       VARCHAR(20)   NULL CONSTRAINT FK_Trip_Routes REFERENCES dbo.TripRoutes(RouteId),  -- NULL == custom
  FromPlace     NVARCHAR(100) NULL,
  ToPlace       NVARCHAR(100) NULL,
  IsRoundTrip   BIT           NOT NULL CONSTRAINT DF_Trip_Round DEFAULT 0,
  DistanceKm    DECIMAL(9,1)  NOT NULL CONSTRAINT CK_Trip_Km CHECK (DistanceKm > 0),
  InputMode     VARCHAR(10)   NOT NULL CONSTRAINT CK_Trip_Mode CHECK (InputMode IN ('ROUTE','CUSTOM','ODOMETER')),
  OdometerStart INT           NULL,
  OdometerEnd   INT           NULL,
  Purpose       NVARCHAR(100) NOT NULL,
  Notes         NVARCHAR(300) NULL,
  CreatedAt     DATETIME2(0)  NOT NULL CONSTRAINT DF_Trip_At DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Trip_Odo CHECK (OdometerEnd IS NULL OR OdometerStart IS NULL OR OdometerEnd > OdometerStart)
);
CREATE INDEX IX_Trip_Employee_Date ON dbo.TripLogs(EmployeeId, TripDate DESC);
CREATE INDEX IX_Trip_Vehicle_Date  ON dbo.TripLogs(VehicleId, TripDate DESC);
/* Rule enforced in the service (not in DDL): the employee must hold dbo.VehicleAccess for VehicleId. */

/* ---------- Calendar ---------- */
CREATE TABLE dbo.Bookings (
  BookingId     VARCHAR(30)   NOT NULL CONSTRAINT PK_Bookings PRIMARY KEY,   -- BK-2026-001 (or BK-<WorkOrderId>)
  VehicleCode   VARCHAR(20)   NULL CONSTRAINT FK_BK_Vehicles REFERENCES dbo.Vehicles(Code),  -- NULL == calendar note
  BookingType   VARCHAR(20)   NOT NULL CONSTRAINT CK_BK_Type CHECK (BookingType IN ('DISPATCH','MAINTENANCE')),
  Title         NVARCHAR(150) NOT NULL,
  Category      NVARCHAR(60)  NOT NULL,
  StartDate     DATE          NOT NULL,
  EndDate       DATE          NULL,                           -- frontend `deadline`
  StartTime     TIME(0)       NOT NULL CONSTRAINT DF_BK_Start DEFAULT '08:00',
  EndTime       TIME(0)       NOT NULL CONSTRAINT DF_BK_End   DEFAULT '11:00',
  AssignedEmployeeId VARCHAR(10) NULL CONSTRAINT FK_BK_Employees REFERENCES dbo.Employees(EmployeeId),
  DriverNameText NVARCHAR(150) NULL,                          -- when no employee: "Operations Note", "Pool Operator"
  BranchId      VARCHAR(10)   NULL CONSTRAINT FK_BK_Branches REFERENCES dbo.Branches(BranchId),
  Destination   NVARCHAR(150) NULL,
  Purpose       NVARCHAR(500) NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_BK_Status DEFAULT 'Scheduled'
                CONSTRAINT CK_BK_Status CHECK (Status IN ('Scheduled','In Progress','Completed','Cancelled')),
  SourceWorkOrderId VARCHAR(20) NULL CONSTRAINT FK_BK_WO REFERENCES dbo.WorkOrders(WorkOrderId) ON DELETE CASCADE,
  CreatedByRole VARCHAR(20)   NOT NULL CONSTRAINT DF_BK_CBRole DEFAULT 'DIRECTOR',
  CreatedByUserId INT         NULL CONSTRAINT FK_BK_CreatedBy REFERENCES dbo.Users(UserId),
  CONSTRAINT CK_BK_Dates CHECK (EndDate IS NULL OR EndDate >= StartDate),
  RowVer        ROWVERSION
);
CREATE INDEX IX_BK_Date ON dbo.Bookings(StartDate, EndDate);
CREATE INDEX IX_BK_Assigned ON dbo.Bookings(AssignedEmployeeId, StartDate);
/* NOTE: COMPLIANCE events (insurance/LTO/license expiry) are NOT stored; they are derived from Vehicles/Employees dates. */

/* ---------- Incident reports ---------- */
CREATE TABLE dbo.IncidentReports (
  IncidentId    VARCHAR(20)   NOT NULL CONSTRAINT PK_Incidents PRIMARY KEY,   -- INC-2026-123
  VehicleCode   VARCHAR(20)   NOT NULL CONSTRAINT FK_INC_Vehicles REFERENCES dbo.Vehicles(Code),
  BranchId      VARCHAR(10)   NOT NULL CONSTRAINT FK_INC_Branches REFERENCES dbo.Branches(BranchId),
  DriverName    NVARCHAR(100) NOT NULL,
  IncidentDate  DATE          NOT NULL,
  IncidentTime  TIME(0)       NULL,
  Location      NVARCHAR(200) NULL,
  Category      NVARCHAR(60)  NOT NULL,
  Severity      VARCHAR(10)   NOT NULL CONSTRAINT CK_INC_Sev CHECK (Severity IN ('Low','Medium','High','Critical')),
  OdometerKm    INT           NULL,
  Notes         NVARCHAR(MAX) NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_INC_Status DEFAULT 'Open',
  CreatedAt     DATETIME2(0)  NOT NULL CONSTRAINT DF_INC_At DEFAULT SYSUTCDATETIME()
);

/* ---------- Audit (append-only; written by the server only) ---------- */
CREATE TABLE dbo.AuditLogs (
  LogId         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,  -- API exposes 'LOG-' + LogId
  LoggedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Audit_At DEFAULT SYSUTCDATETIME(),
  UserId        INT           NULL CONSTRAINT FK_Audit_Users REFERENCES dbo.Users(UserId),
  UserName      NVARCHAR(100) NOT NULL,
  UserRole      VARCHAR(30)   NOT NULL,
  ActionType    NVARCHAR(100) NOT NULL,
  Category      VARCHAR(50)   NOT NULL,
  Details       NVARCHAR(MAX) NOT NULL,
  IpAddress     VARCHAR(45)   NOT NULL,
  Status        VARCHAR(20)   NOT NULL CONSTRAINT DF_Audit_Status DEFAULT 'AUTHORIZED'
);
CREATE INDEX IX_Audit_At ON dbo.AuditLogs(LoggedAt DESC);
/* Recommended: DENY UPDATE, DELETE ON dbo.AuditLogs TO <app login>; */

/* ---------- Notifications ---------- */
CREATE TABLE dbo.Notifications (            -- stored events only (MAINTENANCE, SCHEDULE, REPORT, SYSTEM)
  NotificationId VARCHAR(80)  NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
  Type          VARCHAR(30)   NOT NULL,     -- DOCUMENT_EXPIRY | HEALTH_ALERT | MAINTENANCE | SCHEDULE | REPORT | SYSTEM
  Severity      VARCHAR(20)   NOT NULL CONSTRAINT CK_Notif_Sev CHECK (Severity IN ('CRITICAL','WARNING','INFO')),
  Title         NVARCHAR(150) NOT NULL,
  Message       NVARCHAR(500) NOT NULL,
  TargetTab     VARCHAR(30)   NOT NULL,     -- profiling | health | maintenance | auditing | bookings | drivers
  TargetEntityType VARCHAR(30) NULL,        -- VEHICLE | WORK_ORDER | REPORT | BOOKING | DRIVER
  TargetEntityId VARCHAR(40)  NULL,
  RecipientRole VARCHAR(20)   NOT NULL CONSTRAINT DF_Notif_Role DEFAULT 'ALL',
  RecipientEmployeeId VARCHAR(10) NULL CONSTRAINT FK_Notif_Employees REFERENCES dbo.Employees(EmployeeId),
  CreatedAt     DATETIME2(0)  NOT NULL CONSTRAINT DF_Notif_At DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.NotificationUserState (    -- per-user read/dismiss; NotificationId has NO FK because computed alerts use deterministic ids
  UserId         INT          NOT NULL CONSTRAINT FK_NUS_Users REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
  NotificationId VARCHAR(80)  NOT NULL,
  IsRead         BIT          NOT NULL CONSTRAINT DF_NUS_Read DEFAULT 0,
  IsDismissed    BIT          NOT NULL CONSTRAINT DF_NUS_Dismiss DEFAULT 0,
  UpdatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_NUS_At DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_NotificationUserState PRIMARY KEY (UserId, NotificationId)
);
GO

/* ---------- Expiry alert source (vehicle insurance, LTO registration, employee license) ---------- */
CREATE VIEW dbo.vw_ExpiryAlerts AS
SELECT 'VEHICLE_INSURANCE' AS Source, v.VehicleId AS EntityId, v.Code AS Label,
       v.InsuranceExpiryDate AS ExpiryDate,
       DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), v.InsuranceExpiryDate) AS DaysRemaining
FROM dbo.Vehicles v WHERE v.InsuranceExpiryDate IS NOT NULL
UNION ALL
SELECT 'VEHICLE_REGISTRATION', v.VehicleId, v.Code, v.RegistrationExpiryDate,
       DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), v.RegistrationExpiryDate)
FROM dbo.Vehicles v WHERE v.RegistrationExpiryDate IS NOT NULL
UNION ALL
SELECT 'EMPLOYEE_LICENSE', e.EmployeeId, e.FullName, e.LicenseExpiryDate,
       DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), e.LicenseExpiryDate)
FROM dbo.Employees e WHERE e.IsActive = 1;
GO
```

Not modeled on purpose: per-user UI preferences (`seniorMode`, `highContrast`, `sidebarCollapsed`) stay in the browser.

---

## 10. Open Questions For The Company (decide before implementation)

1. **Authentication:** local username/password (as in the `Users` table above), or Active Directory / LDAP / SSO?
2. **Mechanic identity:** confirm each mechanic is one `Employees` row (`IsMechanic = 1`) with exactly one login.
3. **Manual reports:** may a mechanic add a manual report (the Reports page currently shows **Add Report** to everyone, but the code only permits the Director)?
4. **File storage:** local server disk, network share, or blob storage? Max size / allowed types? Retention?
5. **SQL Server:** version/edition, Windows vs SQL authentication, hosting (on-prem vs Azure SQL), backup policy.
6. **Audit retention:** the browser keeps 100 entries; how long must the server keep them?
7. **Notifications:** keep expiry/health alerts computed on request, or materialize them nightly with a scheduled job (and optionally email/SMS)?
8. **Fabricated baseline history** (§2 #10): confirm it is removed and only real records are shown.
9. **Existing data:** is there real data to migrate, or do we seed from `src/data/fleetData.js` defaults?
10. **Deployment:** Express behind IIS / reverse proxy / Docker? HTTPS termination? Single site or separate API domain?
11. **Driver trip logging:** keep `TripRoutes` as a fixed seed list or let the Director manage routes/km in **Editables**? Should a trip be allowed for a back-dated day (UI allows today and earlier), and should a **maximum correction window** apply? Should mechanics/directors see trip logs on a Director report page (not built yet)?
12. **Driver login:** one `Users` row per driver (`Role='DRIVER'`, `EmployeeId` required) — confirm every driver gets an individual account (no shared motorpool login) so trips are attributable.

---

## 11. Integration Checklist (run only when the user says "implement the backend")

1. Create `server/` (package, `.env.example`, ESLint) and the folder layout in §1.
2. Turn §9 into versioned migrations; add a seed script from `fleetData.js` defaults (map name strings → `EmployeeId`).
3. Auth + role middleware + SQL-level scoping (§4).
4. Repositories → services (transactions from §6) → controllers → routes (§5), with request validation and the response envelope (§3).
5. File upload + `Attachments`.
6. Server-side audit + notifications (stored + computed).
7. Frontend: add `src/services/api.js`; in `FleetContext` swap each `localStorage` initializer/mutation for API calls; keep the exported `useFleet()` shape identical; remove the fabricated history rows; keep only UI prefs in `localStorage`; add Vite dev proxy for `/api`.
8. Verify mechanic scoping with a second login (a mechanic must get `403`/empty for other mechanics' data).
9. `npm run build` passes; add API tests for the transactional rules in §6.
