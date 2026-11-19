/**
 * COTELCO Fleet Management - Vehicle Health Score Model
 * Pure derived scoring (0-100). Never stored; computed at render time.
 *
 * Pillar weights: diagnostics 40% | PMS compliance 25% | repair burden 20% | paperwork validity 15%
 * A status penalty (IN-SHOP / OFFLINE / urgent alert) is applied to the weighted total.
 */
import { getPmsDetails } from './formatters';
import { evaluateDiagnostic, parseLocalYmd } from './vehicleHealth';

const DAY_MS = 1000 * 60 * 60 * 24;

const daysUntil = (dateStr) => {
  const target = parseLocalYmd(dateStr);
  if (!target) return null;
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayLocal.getTime()) / DAY_MS);
};

const PMS_SCORE = {
  COMPLIANT: 100,
  DUE_SOON: 65,
  OVERDUE: 20,
  IN_SHOP: 50,
  OFFLINE: 50
};

const todayLocalDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Per-diagnostic band score: HEALTHY rows stay in the 70-100 band, DUE_SOON in
// 35-65, OVERDUE collapses to ~0. Keeps relative ordering within each band while
// avoiding the harsh raw remaining-life % for items simply late in their cycle.
const bandScore = (rawPct, status) => {
  if (status === 'OVERDUE') return Math.max(0, rawPct - 15);
  if (status === 'DUE_SOON') return Math.round(35 + 0.3 * rawPct);
  return Math.round(70 + 0.3 * rawPct);
};

const diagnosticsPillar = (vehicle) => {
  const diags = Array.isArray(vehicle?.diagnostics) ? vehicle.diagnostics : [];
  if (diags.length === 0) return { pct: 70, factors: [] };
  const odo = Number(vehicle?.odometerKm) || 0;
  let total = 0;
  const factors = [];
  diags.forEach(d => {
    const ev = evaluateDiagnostic(d, odo);
    const mode = d.trackMode || 'BOTH';
    const rawPct = mode === 'KM'
      ? ev.healthPct
      : mode === 'DATE'
      ? ev.dateHealthPct
      : Math.round((ev.healthPct + ev.dateHealthPct) / 2);
    if (ev.status === 'OVERDUE') {
      const kmOverdue = ev.remainingKm !== null && ev.remainingKm <= 0;
      factors.push(
        kmOverdue
          ? `${d.type} overdue by ${Math.abs(ev.remainingKm).toLocaleString()} km`
          : `${d.type} overdue by ${Math.abs(ev.remainingDays || 0)} days`
      );
    } else if (ev.status === 'DUE_SOON') {
      if (mode !== 'DATE' && ev.remainingKm !== null && ev.remainingKm > 0 && ev.remainingKm <= 1200) {
        factors.push(`${d.type} due in ${ev.remainingKm.toLocaleString()} km`);
      } else if (mode !== 'KM' && ev.remainingDays !== null && ev.remainingDays > 0) {
        factors.push(`${d.type} due in ${ev.remainingDays} days`);
      }
    }
    total += bandScore(rawPct, ev.status);
  });
  return { pct: Math.round(total / diags.length), factors };
};

const pmsPillar = (vehicle) => {
  const pms = getPmsDetails(vehicle);
  const pct = PMS_SCORE[pms.compliance] ?? 70;
  const factors = [];
  if (pms.compliance === 'OVERDUE') factors.push(`PMS overdue - ${pms.milestone}`);
  else if (pms.compliance === 'DUE_SOON') factors.push(`PMS due soon - ${pms.milestone}`);
  return { pct, factors };
};

const expiryPartScore = (dateStr) => {
  const days = daysUntil(dateStr);
  if (days === null) return 50;
  if (days < 0) return days >= -90 ? 12 : 0;
  if (days <= 90) return 25;
  return 50;
};

const compliancePillar = (vehicle) => {
  const insDays = daysUntil(vehicle?.insuranceExpiryDate);
  const regDays = daysUntil(vehicle?.registrationExpiryDate);
  const pct = Math.round((expiryPartScore(vehicle?.insuranceExpiryDate) + expiryPartScore(vehicle?.registrationExpiryDate)) / 2);
  const factors = [];
  if (insDays !== null && insDays < 0) factors.push('Insurance policy expired');
  else if (insDays !== null && insDays <= 90) factors.push('Insurance expiring soon');
  if (regDays !== null && regDays < 0) factors.push('LTO registration expired');
  else if (regDays !== null && regDays <= 90) factors.push('LTO registration expiring soon');
  return { pct, factors };
};

const repairPillar = (vehicle, workOrders) => {
  const c = String(vehicle?.classification || '').toLowerCase();
  const heavy = c.includes('bucket') || c.includes('truck');
  const light = c.includes('motorcycle') || c.includes('car') || c.includes('van');
  const perOrder = heavy ? 9 : light ? 16 : 12;
  const today = todayLocalDate();
  const factors = [];
  let pct = 100;
  (workOrders || []).forEach(wo => {
    if (!wo || wo.vehicleCode !== vehicle?.code) return;
    const d = parseLocalYmd(wo.dateCompleted || wo.dateReported);
    if (!d) return;
    if ((today.getTime() - d.getTime()) / DAY_MS > 365) return;
    pct -= perOrder;
    if (wo.priority === 'HIGH') {
      pct -= 10;
      if (wo.status !== 'Completed / Released') {
        factors.push(`High-priority repair open: ${wo.type}`);
      }
    }
  });
  return { pct: Math.max(10, Math.round(pct)), factors };
};

const statusPenaltyAndFactors = (vehicle) => {
  const factors = [];
  let penalty = 0;
  if (vehicle?.status === 'IN-SHOP') {
    penalty += 10;
    factors.push('Vehicle currently in-shop');
  }
  if (vehicle?.status === 'OFFLINE') {
    penalty += 20;
    factors.push('Vehicle offline / grounded');
  }
  if (vehicle?.urgentAlert) {
    penalty += 10;
    factors.push('Urgent service alert active');
  }
  return { penalty, factors };
};

const GRADES = [
  { min: 85, grade: 'EXCELLENT', label: 'Excellent', badgeClass: 'badge-success' },
  { min: 70, grade: 'GOOD', label: 'Good', badgeClass: 'badge-success' },
  { min: 55, grade: 'FAIR', label: 'Fair', badgeClass: 'badge-warning' },
  { min: 40, grade: 'POOR', label: 'Poor', badgeClass: 'badge-danger' },
  { min: 0, grade: 'CRITICAL', label: 'Critical', badgeClass: 'badge-danger' }
];

/**
 * Computes the derived Health Score for one vehicle.
 * @returns {{ score:number, grade:string, gradeLabel:string, badgeClass:string,
 *   breakdown:Object, factors:string[] }}
 */
export const computeVehicleHealthScore = (vehicle, workOrders = []) => {
  const diagnostics = diagnosticsPillar(vehicle);
  const pms = pmsPillar(vehicle);
  const repairs = repairPillar(vehicle, workOrders);
  const compliance = compliancePillar(vehicle);
  const { penalty, factors: statusFactors } = statusPenaltyAndFactors(vehicle);

  const raw =
    0.4 * diagnostics.pct +
    0.25 * pms.pct +
    0.2 * repairs.pct +
    0.15 * compliance.pct -
    penalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const meta = GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1];

  return {
    score,
    grade: meta.grade,
    gradeLabel: meta.label,
    badgeClass: meta.badgeClass,
    breakdown: {
      diagnostics: { pct: diagnostics.pct, weight: 0.4 },
      pms: { pct: pms.pct, weight: 0.25 },
      repairs: { pct: repairs.pct, weight: 0.2 },
      compliance: { pct: compliance.pct, weight: 0.15 },
      statusPenalty: penalty
    },
    factors: [
      ...diagnostics.factors,
      ...pms.factors,
      ...repairs.factors,
      ...compliance.factors,
      ...statusFactors
    ]
  };
};
