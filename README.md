# Centralized Fleet Management System

A digital Fleet Management System engineered for operational tracking of utility vehicles, preventive maintenance scheduling, work order lifecycles, and geographical branch distribution.

## Key Capabilities

1. **Centralized Vehicle Master Registry & Fleet Directory**
   - Clean, searchable roster of all cooperative assets with branch and status filtering.
   - Lightened, uncluttered cards and tables with pure custody reassignments (reassign branch sub-office).
   - Removed duplicate action buttons; all new vehicle registrations belong exclusively to the dedicated **Car Profiling** workspace.
   - Self-contained view without unexpected cross-tab redirects or clutter.

2. **Dedicated Car & Vehicle Profiling Workspace**
   - Full master-detail profiling center: interactive vehicle selector roster on the left and comprehensive technical dossier on the right.
   - **Register New Vehicle**: Official master registration entry point with photo attachments (local file upload, preset options, direct URLs), VIN, plate number, make/model, classification, and branch custody.
   - **Deep Technical Specifications**: VIN, Engine serial number, fuel system, transmission, drivetrain, and specialized high-voltage dielectric ratings (kV), boom reach, and outriggers.
   - **Operational Telemetry & Milestones**: Odometer tracking with preventive maintenance target progress bars and overdue indicators.
   - **Chain of Custody & Motor Pool Placement**: Assigned branch office, facility station manager, custodian department/pool (e.g. Operations & Maintenance Pool, Trouble Team), and real GPS coordinates. Company cars are pooled utility assets dispatched dynamically per work order and scheduled trip.
   - **Financial Valuation & Commercial Acquisition**: Date bought / acquired, acquisition cost (PHP ₱), supplier/dealership, LTO Official Receipt / CR number, COTELCO fixed asset tag, warranty coverage, NEA straight-line depreciation, and past audited expense vouchers.
   - **Printable Dossier**: Print official vehicle dossiers (`window.print()`) for cooperative auditing and NEA regulatory compliance.

3. **Bookings & Schedule Calendar (Trip & Maintenance Timetable)**
   - Interactive timetable calendar featuring **Day**, **Week**, and **Month** views.
   - **Week View (Timetable)**: Direct implementation matching the schedule grid with hourly slots (`07.00 am` to `05.00 pm`), day columns, and rounded lime-accented cards showing the driver's avatar, vehicle code, and scheduled activity (e.g. *Devon Lane · Vehicle Maintenance*).
   - **Trip & Maintenance Scheduling**: Full modal workflow to schedule vehicle dispatches or book maintenance slots by date, time window, driver, and destination.
   - **Inspection & Actions**: 1-click modal to inspect booking details, mark tasks as completed, cancel bookings, or jump directly to the vehicle profile.

4. **Preventive Maintenance Hub & Work Orders**
   - Real-time service milestones tracking with visual odometer progress bars.
   - Dedicated workspace for issuing new work orders and advancing repair lifecycles across diagnostic, overhaul, and testing stages.
   - Clean, lightweight work order cards with in-place voucher generation upon completion.
   - Self-contained workspace without external redirect buttons to the repair ledger.

5. **Geospatial Branch & Asset Distribution Map (Real Map System)**
   - **Real Mapping Engine**: Interactive **Leaflet** map featuring real street networks, terrain, and satellite imagery for Cotabato Province (Kidapawan, Midsayap, M'lang, Kabacan, Makilala, Carmen).
   - **Multi-Layer Tile Switcher**:
     - **Clean Street (CartoDB Voyager)**: Modern enterprise styling for clear road and boundary readability.
     - **OpenStreetMap Standard**: Complete street-level names, national highways, and geographic landmarks.
     - **Satellite Aerial (Esri World Imagery)**: High-resolution satellite view for right-of-way and rural transmission corridor inspection.
   - **Interactive Markers**: Real GPS coordinates for all branch sub-offices (with live vehicle counts) and color-coded status pins (`Active`, `In-Shop`, `Offline`).
   - **Smooth Navigation**: Zoom controls, `"Fit All"` bounds auto-fit, and fly-to animation when selecting branch sub-offices from the toolbar.
   - **Side Inspector Drawer**: Displays vehicle photo thumbnail, GPS coordinates, driver custody, and quick branch reassignment.

6. **Audited Repair & Expense Ledger**
   - Printable, itemized repair vouchers and official receipts.
   - Filterable ledger with vehicle photo thumbnails and quick-action printable vouchers.

7. **Security, Governance & Audit Trail**
   - Tamper-evident append-only audit trail logging all actions with timestamps and actor roles.
   - Expandable log details to maintain clean, scannable table views.
   - Role-based access control matrix (Operations Director, Branch Dispatcher, Maintenance Officer).

8. **Accessibility & Senior-Friendly Design**
   - Single-screen responsive layout with toggleable/collapsible sidebar (`232px` to `72px`).
   - Dedicated **Large Text (Senior Mode)** and **High-Contrast Mode** toggles built into the header.

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Modern Vanilla CSS Design System with CSS variables and lime accent theme (`#D4ED31`)
- **Icons**: Lucide React
- **Persistence**: Browser `localStorage` state management

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
