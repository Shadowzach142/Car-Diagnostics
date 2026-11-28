/**
 * COTELCO Fleet Management - Shared Diagnostic Health Evaluator
 * Pure functions used by OngoingHealth and the Vehicle Health Score model.
 */

export const parseLocalYmd = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Evaluates a single diagnostic tracker against the current odometer.
 * Returns remaining km/days, remaining-life percentages and a
 * HEALTHY | DUE_SOON | OVERDUE status (km DUE_SOON <= 1200 km, date DUE_SOON <= 21 days).
 */
export const evaluateDiagnostic = (diag, currentOdo = 0) => {
  const mode = diag.trackMode || 'BOTH';
  const intervalKm = Number(diag.intervalKm) || 5000;
  const targetKm = Number(diag.targetKm) || 0;
  const lastDoneKm = Number(diag.lastDoneKm) || Math.max(0, targetKm - intervalKm);
  const remainingKm = targetKm > 0 ? targetKm - currentOdo : null;
  const usedKm = Math.max(0, currentOdo - lastDoneKm);
  let remainingDays = null;
  let totalCycleDays = (Number(diag.intervalMonths) || 6) * 30;
  if (diag.targetDate) {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetLocal = parseLocalYmd(diag.targetDate) || new Date(diag.targetDate);
    if (!isNaN(targetLocal)) {
      remainingDays = Math.ceil((targetLocal - todayLocal) / (1000 * 60 * 60 * 24));
    }
    if (diag.lastDoneDate) {
      const lastLocal = parseLocalYmd(diag.lastDoneDate) || new Date(diag.lastDoneDate);
      if (!isNaN(lastLocal) && !isNaN(targetLocal) && targetLocal > lastLocal) {
        totalCycleDays = Math.max(30, Math.ceil((targetLocal - lastLocal) / (1000 * 60 * 60 * 24)));
      }
    }
  }

  const dateHealthPct = remainingDays === null
    ? 100
    : remainingDays <= 0
    ? 4
    : Math.min(100, Math.max(6, Math.round((remainingDays / totalCycleDays) * 100)));

  // Remaining life percentage: 100% = full interval left, shrinks toward 0% as due approaches, 4% stub when overdue
  const healthPct = remainingKm === null
    ? dateHealthPct
    : remainingKm <= 0
    ? 4
    : intervalKm > 0
    ? Math.min(100, Math.max(6, Math.round((remainingKm / intervalKm) * 100)))
    : 50;

  let kmStatus = 'HEALTHY';
  if (mode === 'KM' || mode === 'BOTH') {
    if (remainingKm !== null && remainingKm <= 0) kmStatus = 'OVERDUE';
    else if (remainingKm !== null && remainingKm <= 1200) kmStatus = 'DUE_SOON';
  }

  let dateStatus = 'HEALTHY';
  if (mode === 'DATE' || mode === 'BOTH') {
    if (remainingDays !== null && remainingDays < 0) dateStatus = 'OVERDUE';
    else if (remainingDays !== null && remainingDays <= 21) dateStatus = 'DUE_SOON';
  }

  let status = 'HEALTHY';
  if (kmStatus === 'OVERDUE' || dateStatus === 'OVERDUE') status = 'OVERDUE';
  else if (kmStatus === 'DUE_SOON' || dateStatus === 'DUE_SOON') status = 'DUE_SOON';

  return { remainingKm, remainingDays, usedKm, intervalKm, healthPct, dateHealthPct, kmStatus, dateStatus, status };
};
