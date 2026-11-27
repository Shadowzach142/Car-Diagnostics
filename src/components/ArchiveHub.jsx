import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage, getVehicleOrCr } from '../data/fleetData';
import { truncateWords } from '../utils/formatters';
import {
  FolderArchive,
  ChevronRight,
  ArrowLeft,
  FileText,
  Wrench,
  Users,
  CalendarDays,
  RotateCcw,
  Eye,
  X,
  Camera
} from 'lucide-react';

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatArchiveMonthLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return 'Archived Records';
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return `Month of ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

export const ArchiveHub = () => {
  const {
    settings,
    vehicles = [],
    branches = [],
    drivers = [],
    repairArchive = [],
    workOrders = [],
    bookings = [],
    globalSearch
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechNameNorm = (settings?.currentMechanic || '').split(' (')[0].trim().toLowerCase();

  // Separate top-level archive view: 'REPORTS' | 'MAINTENANCE' | 'DRIVERS' | 'PAPERWORK' | 'ALL'
  const [activeSection, setActiveSection] = useState('REPORTS');
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [activeReportModal, setActiveReportModal] = useState(null);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  // 1. Separate Reports List (repairArchive)
  const reportEntries = useMemo(() => {
    const vehMap = new Map((vehicles || []).map((v) => [v.code, v]));
    const list = [];

    (repairArchive || []).forEach((r) => {
      const mechShort = (r.mechanic || '').split(' (')[0].trim();
      if (isMechanic && mechShort.toLowerCase() !== mechNameNorm) return;
      const veh = vehMap.get(r.vehicleCode);
      const branchObj = branches.find((b) => b.id === (r.branchId || veh?.branchId));
      const branchName = r.branch || branchObj?.municipality || 'Central HQ';
      list.push({
        id: `REP-${r.voucherNo || r.id}`,
        voucherNo: r.voucherNo || r.id,
        date: r.date || '2026-10-15',
        vehicleCode: r.vehicleCode || 'FLT-GEN',
        plateNo: r.plateNo || veh?.plateNo || '',
        makeModel: r.model || veh?.makeModel || '',
        branch: branchName,
        actor: mechShort || 'Motorpool Staff',
        facility: r.facility || 'Central Motorpool',
        title: r.serviceType || 'Service & Maintenance Report',
        summary: r.serviceSummary || `Voucher ${r.voucherNo || ''}`,
        fileName: r.fileName || '',
        fileDataUrl: r.fileDataUrl || '',
        receiptImage: r.receiptImage || '',
        rawReport: r
      });
    });

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [repairArchive, vehicles, branches, isMechanic, mechNameNorm]);

  // 2. Separate Maintenance History List (workOrders + historical vehicle PMS logs)
  const maintenanceEntries = useMemo(() => {
    const vehMap = new Map((vehicles || []).map((v) => [v.code, v]));
    const list = [];

    (workOrders || []).forEach((wo) => {
      const mechShort = (wo.assignedMechanic || 'Motorpool Specialist').split(' (')[0].trim();
      if (isMechanic && mechShort.toLowerCase() !== mechNameNorm) return;
      const veh = vehMap.get(wo.vehicleCode);
      const branchObj = branches.find((b) => b.id === (wo.branchId || veh?.branchId));
      const branchName = branchObj?.municipality || 'Central HQ';
      list.push({
        id: `WO-${wo.id}`,
        woNo: wo.id,
        date: wo.dateCompleted || wo.dateReported || '2026-10-01',
        vehicleCode: wo.vehicleCode,
        plateNo: veh?.plateNo || '',
        makeModel: veh?.makeModel || '',
        branch: branchName,
        specialist: mechShort,
        facility: wo.facility || 'Central Motorpool',
        category: wo.category || 'Preventive Maintenance',
        title: wo.type || 'Preventive Maintenance Service',
        summary: wo.description || wo.notes || `Work Order ${wo.id}`,
        status: wo.status === 'Completed / Released' ? 'Completed' : (wo.currentStage || 'In Shop'),
        isCompleted: wo.status === 'Completed / Released'
      });
    });

    if (!isMechanic) {
      (vehicles || []).forEach((veh) => {
        const baseYear = Number(veh.year) || 2022;
        const branchObj = branches.find((b) => b.id === veh.branchId);
        const branchName = branchObj?.municipality || 'Central HQ';

        list.push(
          {
            id: `HIST-PMS-${veh.code}-2`,
            woNo: `PMS-${baseYear + 1}-${veh.code}`,
            date: `${baseYear + 1}-09-14`,
            vehicleCode: veh.code,
            plateNo: veh.plateNo,
            makeModel: veh.makeModel,
            branch: branchName,
            specialist: 'Engr. Mateo R. Villanueva',
            facility: 'COTELCO Central Motorpool',
            category: 'Preventive Maintenance (PMS)',
            title: '20,000 km Comprehensive Preventive Maintenance & Brake Service',
            summary: 'Full fluid replacement, brake lining inspection, and safety check',
            status: 'Completed',
            isCompleted: true
          },
          {
            id: `HIST-PMS-${veh.code}-1`,
            woNo: `PMS-${baseYear}-${veh.code}`,
            date: `${baseYear}-11-05`,
            vehicleCode: veh.code,
            plateNo: veh.plateNo,
            makeModel: veh.makeModel,
            branch: branchName,
            specialist: 'Rogelio D. Bautista',
            facility: 'COTELCO Central Motorpool',
            category: 'Commissioning PMS',
            title: 'Initial 5,000 km Commissioning & Factory Break-In Service',
            summary: 'Engine oil & filter change, chassis torque check, and LTO safety clearance',
            status: 'Completed',
            isCompleted: true
          }
        );
      });
    }

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [workOrders, vehicles, branches, isMechanic, mechNameNorm]);

  // 3. Separate Driver & Dispatch History List
  const driverHistoryEntries = useMemo(() => {
    if (isMechanic) return [];
    const vehMap = new Map((vehicles || []).map((v) => [v.code, v]));
    const list = [];

    (vehicles || []).forEach((veh) => {
      const baseYear = Number(veh.year) || 2022;
      const branchObj = branches.find((b) => b.id === veh.branchId);
      const branchName = branchObj?.municipality || 'Central HQ';

      const customDriverHist = Array.isArray(veh.driverHistory) ? veh.driverHistory : [];
      customDriverHist.forEach((dh) => {
        list.push({
          id: `DH-${veh.code}-${dh.id}`,
          date: dh.date || `${baseYear + 1}-04-10`,
          vehicleCode: veh.code,
          plateNo: veh.plateNo,
          makeModel: veh.makeModel,
          branch: branchName,
          driverName: dh.driverName || 'Assigned Operator',
          employeeId: dh.employeeId || 'COTELCO-OP',
          department: dh.department || 'Technical / Engineering',
          title: dh.action === 'AUTHORIZED' ? 'Vehicle Access Granted' : 'Past Operator Assignment',
          summary: dh.note || 'Operator clearance record',
          actionLabel: dh.action === 'AUTHORIZED' ? 'Access Granted' : 'Past Operator'
        });
      });

      const poolOperators = (drivers || []).slice(0, 4);
      if (poolOperators.length > 0) {
        const histOp1 = poolOperators[(veh.code.charCodeAt(veh.code.length - 1) || 0) % poolOperators.length];
        if (histOp1) {
          list.push({
            id: `SEED-DH-1-${veh.id}`,
            date: `${baseYear + 1}-04-10`,
            vehicleCode: veh.code,
            plateNo: veh.plateNo,
            makeModel: veh.makeModel,
            branch: branchName,
            driverName: histOp1.name,
            employeeId: histOp1.employeeId,
            department: histOp1.department || 'Technical / Engineering',
            title: 'District Feeder & Line Deployment Assignment',
            summary: `Assigned operator during ${baseYear + 1}–${baseYear + 2} feeder & district deployment`,
            actionLabel: 'Past Operator'
          });
        }
      }
    });

    (bookings || []).forEach((b) => {
      if (!b.vehicleCode) return;
      const veh = vehMap.get(b.vehicleCode);
      const branchObj = branches.find((br) => br.id === veh?.branchId);
      const branchName = branchObj?.municipality || 'Central HQ';
      const matchedDriver = (drivers || []).find((d) => d.name === b.driver);
      list.push({
        id: `BK-ARCH-${b.id}`,
        date: b.date || '2026-10-18',
        vehicleCode: b.vehicleCode,
        plateNo: veh?.plateNo || '',
        makeModel: veh?.makeModel || '',
        branch: branchName,
        driverName: b.driver || 'Assigned Operator',
        employeeId: matchedDriver?.employeeId || 'COTELCO-OP',
        department: matchedDriver?.department || 'Technical / Engineering',
        title: b.title || 'Field Dispatch Schedule',
        summary: `${b.startTime || '08:00'}–${b.endTime || '17:00'} • ${b.destination || 'Field Grid Operation'}`,
        actionLabel: b.type === 'MAINTENANCE' ? 'Maintenance Schedule' : 'Trip Dispatch'
      });
    });

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [vehicles, branches, drivers, bookings, isMechanic]);

  // 4. Separate Paperwork & Registration History List
  const paperworkEntries = useMemo(() => {
    if (isMechanic) return [];
    const list = [];

    (vehicles || []).forEach((veh) => {
      const branchObj = branches.find((b) => b.id === veh.branchId);
      const branchName = branchObj?.municipality || 'Central HQ';
      const orCr = getVehicleOrCr(veh);
      const regAcq = veh.registrationAcquiredDate || '2023-10-23';
      const regExp = veh.registrationExpiryDate || '2026-10-23';
      const insAcq = veh.insuranceAcquiredDate || '2023-10-20';
      const insExp = veh.insuranceExpiryDate || '2026-10-20';
      const customRegHist = Array.isArray(veh.registrationHistory) ? veh.registrationHistory : [];

      customRegHist.forEach((rec) => {
        list.push({
          id: `REG-CUST-${veh.id}-${rec.id}`,
          date: rec.dateAcquired || rec.expiryDate || regAcq,
          expiryDate: rec.expiryDate || regExp,
          vehicleCode: veh.code,
          plateNo: veh.plateNo,
          makeModel: veh.makeModel,
          branch: branchName,
          agency: rec.agency || 'LTO / GSIS',
          referenceNo: rec.referenceNo || orCr,
          title: rec.type || 'Registration / Insurance Renewal',
          status: rec.status || 'RECORDED'
        });
      });

      list.push(
        {
          id: `CUR-LTO-${veh.id}`,
          date: regAcq,
          expiryDate: regExp,
          vehicleCode: veh.code,
          plateNo: veh.plateNo,
          makeModel: veh.makeModel,
          branch: branchName,
          agency: 'LTO Region XII District Office',
          referenceNo: orCr,
          title: 'LTO Registration (OR/CR) Filing',
          status: 'LTO OR/CR'
        },
        {
          id: `CUR-INS-${veh.id}`,
          date: insAcq,
          expiryDate: insExp,
          vehicleCode: veh.code,
          plateNo: veh.plateNo,
          makeModel: veh.makeModel,
          branch: branchName,
          agency: 'GSIS General Insurance',
          referenceNo: `POL-${veh.code}-${regAcq.slice(0, 4)}`,
          title: 'GSIS Commercial Fleet Insurance Policy',
          status: 'INSURANCE'
        }
      );
    });

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [vehicles, branches, isMechanic]);

  // Filter helper by vehicle, branch, and global search
  const filterItems = (items) => {
    let list = items;
    if (vehicleFilter !== 'ALL') {
      list = list.filter((e) => e.vehicleCode === vehicleFilter);
    }
    if (branchFilter !== 'ALL') {
      list = list.filter((e) => e.branch === branchFilter);
    }
    const q = (globalSearch || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter((e) =>
      Object.values(e)
        .filter((v) => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    );
  };

  const filteredReports = useMemo(() => filterItems(reportEntries), [reportEntries, vehicleFilter, branchFilter, globalSearch]);
  const filteredMaintenance = useMemo(() => filterItems(maintenanceEntries), [maintenanceEntries, vehicleFilter, branchFilter, globalSearch]);
  const filteredDrivers = useMemo(() => filterItems(driverHistoryEntries), [driverHistoryEntries, vehicleFilter, branchFilter, globalSearch]);
  const filteredPaperwork = useMemo(() => filterItems(paperworkEntries), [paperworkEntries, vehicleFilter, branchFilter, globalSearch]);

  // Build monthly archive groups for the active section
  const monthGroups = useMemo(() => {
    const map = new Map();
    const ensureMonth = (dateStr) => {
      const ym = String(dateStr || '').slice(0, 7);
      const key = /^\d{4}-\d{2}$/.test(ym) ? ym : 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          label: formatArchiveMonthLabel(key),
          reports: [],
          maintenance: [],
          drivers: [],
          paperwork: []
        });
      }
      return map.get(key);
    };

    if (activeSection === 'REPORTS' || activeSection === 'ALL') {
      filteredReports.forEach((item) => ensureMonth(item.date).reports.push(item));
    }
    if (activeSection === 'MAINTENANCE' || activeSection === 'ALL') {
      filteredMaintenance.forEach((item) => ensureMonth(item.date).maintenance.push(item));
    }
    if (!isMechanic && (activeSection === 'DRIVERS' || activeSection === 'ALL')) {
      filteredDrivers.forEach((item) => ensureMonth(item.date).drivers.push(item));
    }
    if (!isMechanic && (activeSection === 'PAPERWORK' || activeSection === 'ALL')) {
      filteredPaperwork.forEach((item) => ensureMonth(item.date).paperwork.push(item));
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        totalCount:
          g.reports.length + g.maintenance.length + g.drivers.length + g.paperwork.length
      }))
      .filter((g) => g.totalCount > 0)
      .sort((a, b) => String(b.monthKey).localeCompare(String(a.monthKey)));
  }, [activeSection, filteredReports, filteredMaintenance, filteredDrivers, filteredPaperwork, isMechanic]);

  const activeGroup = useMemo(
    () => monthGroups.find((g) => g.monthKey === selectedMonthKey) || null,
    [monthGroups, selectedMonthKey]
  );

  const renderVehicleCell = (vehicleCode, plateNo, branch) => {
    const v = vehicles.find((veh) => veh.code === vehicleCode);
    const img = getVehicleImage(v);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <img
          src={img}
          alt={vehicleCode}
          style={{
            width: '40px',
            height: '30px',
            objectFit: 'cover',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}
        />
        <div className="vehicle-cell">
          <span className="vehicle-cell-title">
            {vehicleCode} {plateNo ? `• ${plateNo}` : ''}
          </span>
          <span className="vehicle-cell-sub">{branch}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {/* Top Toolbar: Separate Tabs for Reports vs Maintenance History vs Driver History */}
      <div className="page-toolbar">
        <div className="segmented" role="tablist" aria-label="Archive category tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'REPORTS'}
            className={`segmented-btn ${activeSection === 'REPORTS' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('REPORTS');
              setSelectedMonthKey(null);
            }}
          >
            <FileText size={14} />
            <span>Reports Archive</span>
            <span className="segmented-count">{filteredReports.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'MAINTENANCE'}
            className={`segmented-btn ${activeSection === 'MAINTENANCE' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('MAINTENANCE');
              setSelectedMonthKey(null);
            }}
          >
            <Wrench size={14} />
            <span>Maintenance History</span>
            <span className="segmented-count">{filteredMaintenance.length}</span>
          </button>

          {!isMechanic && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'DRIVERS'}
              className={`segmented-btn ${activeSection === 'DRIVERS' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('DRIVERS');
                setSelectedMonthKey(null);
              }}
            >
              <Users size={14} />
              <span>Driver History</span>
              <span className="segmented-count">{filteredDrivers.length}</span>
            </button>
          )}

          {!isMechanic && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'PAPERWORK'}
              className={`segmented-btn ${activeSection === 'PAPERWORK' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('PAPERWORK');
                setSelectedMonthKey(null);
              }}
            >
              <CalendarDays size={14} />
              <span>Paperwork History</span>
              <span className="segmented-count">{filteredPaperwork.length}</span>
            </button>
          )}
        </div>

        <select
          className="form-select toolbar-select"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          aria-label="Filter archive by vehicle"
        >
          <option value="ALL">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.code}>
              {v.code} &bull; {v.plateNo}
            </option>
          ))}
        </select>

        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter archive by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.municipality}>
              {b.municipality}
            </option>
          ))}
        </select>

        {(vehicleFilter !== 'ALL' || branchFilter !== 'ALL') && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              setVehicleFilter('ALL');
              setBranchFilter('ALL');
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <span className="spacer" />

        <span className="stat-chip">
          Months <strong>{monthGroups.length}</strong>
        </span>
      </div>

      <div className="page-body">
        {!activeGroup ? (
          <div>
            {monthGroups.length === 0 ? (
              <div className="empty-state">No archived records found for this category.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: '0.9rem'
                }}
              >
                {monthGroups.map((group) => {
                  const sectionItems =
                    activeSection === 'REPORTS'
                      ? group.reports
                      : activeSection === 'MAINTENANCE'
                      ? group.maintenance
                      : activeSection === 'DRIVERS'
                      ? group.drivers
                      : group.paperwork;
                  const uniqueVehicles = Array.from(
                    new Set(sectionItems.map((i) => i.vehicleCode).filter(Boolean))
                  );
                  const isCurrent = group.monthKey === currentMonthKey;

                  const sectionNoun =
                    activeSection === 'REPORTS'
                      ? group.reports.length === 1
                        ? 'Report'
                        : 'Reports'
                      : activeSection === 'MAINTENANCE'
                      ? group.maintenance.length === 1
                        ? 'Maintenance Record'
                        : 'Maintenance Records'
                      : activeSection === 'DRIVERS'
                      ? group.drivers.length === 1
                        ? 'Driver Log'
                        : 'Driver Logs'
                      : group.paperwork.length === 1
                      ? 'Renewal Log'
                      : 'Renewal Logs';

                  return (
                    <button
                      key={group.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(group.monthKey)}
                      style={{
                        textAlign: 'left',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '12px',
                        padding: '1.05rem 1.1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.7rem',
                        boxShadow: 'var(--shadow-xs)',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'var(--bg-surface-subtle)',
                              border: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-main)',
                              flexShrink: 0
                            }}
                          >
                            <FolderArchive size={18} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: 'var(--text-main)'
                              }}
                            >
                              {group.label}
                            </div>
                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: 'var(--text-secondary)',
                                marginTop: '2px'
                              }}
                            >
                              {sectionItems.length} {sectionNoun} &bull; {uniqueVehicles.length}{' '}
                              {uniqueVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isCurrent && (
                            <span
                              className="badge badge-ok"
                              style={{ fontSize: '0.64rem', padding: '0.12rem 0.45rem' }}
                            >
                              This Month
                            </span>
                          )}
                          <ChevronRight size={16} color="var(--text-tertiary)" />
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          paddingTop: '0.55rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.28rem'
                        }}
                      >
                        {sectionItems.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            <strong style={{ color: 'var(--text-main)' }}>{item.vehicleCode}</strong>:{' '}
                            {item.title}
                          </div>
                        ))}
                        {sectionItems.length > 2 && (
                          <div
                            style={{
                              fontSize: '0.71rem',
                              color: 'var(--text-tertiary)',
                              fontWeight: 600
                            }}
                          >
                            +{sectionItems.length - 2} more in {group.label}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Inside a selected Month Folder */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                marginBottom: '0.85rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelectedMonthKey(null)}
                >
                  <ArrowLeft size={14} /> All Archive Months
                </button>
                <div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {activeGroup.label} &bull;{' '}
                    {activeSection === 'REPORTS'
                      ? 'Reports Archive'
                      : activeSection === 'MAINTENANCE'
                      ? 'Maintenance History'
                      : activeSection === 'DRIVERS'
                      ? 'Driver History'
                      : 'Paperwork & Registration History'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {activeGroup.totalCount} archived{' '}
                    {activeGroup.totalCount === 1 ? 'entry' : 'entries'}
                  </div>
                </div>
              </div>
            </div>

            {/* 1. SEPARATE REPORTS TABLE */}
            {activeSection === 'REPORTS' && (
              <div className="table-wrap">
                <table className="data-table" aria-label={`Archived reports for ${activeGroup.label}`}>
                  <thead>
                    <tr>
                      <th>Date &amp; Voucher ID</th>
                      <th>Vehicle</th>
                      <th>Submitted By</th>
                      <th>Report &amp; Notes</th>
                      <th>Attachment</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.reports.map((r) => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {r.date}
                          </div>
                          <span className="cell-sub mono">{r.voucherNo}</span>
                        </td>
                        <td>{renderVehicleCell(r.vehicleCode, r.plateNo, r.branch)}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.actor}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {r.facility}
                          </div>
                        </td>
                        <td style={{ maxWidth: 340 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                            {r.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '320px'
                            }}
                            title={r.summary}
                          >
                            {r.summary}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {r.fileDataUrl && r.fileName ? (
                            <a
                              href={r.fileDataUrl}
                              download={r.fileName}
                              className="badge badge-muted"
                              style={{ fontSize: '0.72rem', textDecoration: 'none', color: 'var(--text-main)' }}
                            >
                              <FileText size={12} /> {truncateWords(r.fileName, 3)}
                            </a>
                          ) : r.receiptImage ? (
                            <span className="badge badge-muted" style={{ fontSize: '0.72rem' }}>
                              <Camera size={12} /> Photo
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>&mdash;</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setActiveReportModal(r.rawReport)}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. SEPARATE MAINTENANCE HISTORY TABLE */}
            {activeSection === 'MAINTENANCE' && (
              <div className="table-wrap">
                <table className="data-table" aria-label={`Maintenance history for ${activeGroup.label}`}>
                  <thead>
                    <tr>
                      <th>Date &amp; Work Order</th>
                      <th>Vehicle</th>
                      <th>Assigned Specialist</th>
                      <th>Maintenance Task &amp; Notes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.maintenance.map((m) => (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {m.date}
                          </div>
                          <span className="cell-sub mono">{m.woNo}</span>
                        </td>
                        <td>{renderVehicleCell(m.vehicleCode, m.plateNo, m.branch)}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.specialist}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {m.facility}
                          </div>
                        </td>
                        <td style={{ maxWidth: 360 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                            {m.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {m.summary}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className={`badge ${m.isCompleted ? 'badge-ok' : 'badge-warn'}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. SEPARATE DRIVER HISTORY TABLE */}
            {activeSection === 'DRIVERS' && (
              <div className="table-wrap">
                <table className="data-table" aria-label={`Driver history for ${activeGroup.label}`}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vehicle</th>
                      <th>Driver / Operator</th>
                      <th>Assignment / Dispatch Details</th>
                      <th>Record Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.drivers.map((d) => (
                      <tr key={d.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {d.date}
                          </div>
                        </td>
                        <td>{renderVehicleCell(d.vehicleCode, d.plateNo, d.branch)}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {d.driverName} <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>&bull; {d.employeeId}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {d.department}
                          </div>
                        </td>
                        <td style={{ maxWidth: 360 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                            {d.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {d.summary}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge badge-muted">{d.actionLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. SEPARATE PAPERWORK & REGISTRATION HISTORY TABLE */}
            {activeSection === 'PAPERWORK' && (
              <div className="table-wrap">
                <table className="data-table" aria-label={`Paperwork history for ${activeGroup.label}`}>
                  <thead>
                    <tr>
                      <th>Acquired &rarr; Expiry</th>
                      <th>Vehicle</th>
                      <th>Issuing Agency</th>
                      <th>Document &amp; Reference No.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.paperwork.map((p) => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="mono" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            {p.date} &rarr; {p.expiryDate}
                          </div>
                        </td>
                        <td>{renderVehicleCell(p.vehicleCode, p.plateNo, p.branch)}</td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {p.agency}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {p.title}
                          </div>
                          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Ref: {p.referenceNo}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge badge-muted">{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {activeReportModal && (
        <div className="modal-overlay" onClick={() => setActiveReportModal(null)}>
          <div className="modal-box" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-box-header">
              <div className="modal-box-title">
                <span>Archived Report &bull; {activeReportModal.voucherNo}</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setActiveReportModal(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                  gap: '0.75rem',
                  background: 'var(--bg-surface-subtle)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div>
                  <span className="detail-label">Date Logged</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{activeReportModal.date}</div>
                </div>
                <div>
                  <span className="detail-label">Vehicle</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    {activeReportModal.vehicleCode} &bull; {activeReportModal.plateNo}
                  </div>
                </div>
                <div>
                  <span className="detail-label">Submitted By</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    {(activeReportModal.mechanic || 'Motorpool Staff').split(' (')[0]}
                  </div>
                </div>
              </div>

              <div>
                <span className="detail-label">Report Title</span>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', marginTop: '0.2rem' }}>
                  {activeReportModal.serviceType}
                </div>
              </div>

              <div>
                <span className="detail-label">Notes &amp; Summary</span>
                <div
                  style={{
                    marginTop: '0.3rem',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.86rem',
                    lineHeight: 1.5
                  }}
                >
                  {activeReportModal.serviceSummary}
                </div>
              </div>

              {activeReportModal.receiptImage && (
                <div>
                  <span className="detail-label">
                    <Camera size={13} style={{ display: 'inline', marginRight: 4 }} /> Attached Photo
                  </span>
                  <img
                    src={activeReportModal.receiptImage}
                    alt="Report attachment"
                    style={{
                      marginTop: '0.4rem',
                      width: '100%',
                      maxHeight: '280px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)'
                    }}
                  />
                </div>
              )}
            </div>
            <div className="modal-box-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveReportModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
