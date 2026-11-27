// Pure helpers for the DRIVER role views (no React). Safe to port to SQL views / API mappers.

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const exp = new Date(`${dateStr}T00:00:00`);
  if (isNaN(exp)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exp - today) / 86400000);
};

// Same 90-day window used by the Director dashboard / sidebar badges
export const expiryState = (dateStr) => {
  const days = daysUntil(dateStr);
  if (days === null) return { days: null, tone: 'neutral', label: 'No date' };
  if (days < 0) return { days, tone: 'danger', label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 90) return { days, tone: 'warning', label: `Expires in ${days}d` };
  return { days, tone: 'success', label: 'Valid' };
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (isNaN(d)) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatMonthLabel = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const isLiveBooking = (b) => b && b.status !== 'Completed' && b.status !== 'Cancelled' && b.vehicleCode && b.vehicleCode !== 'NOTE';

// Bookings that block / describe a vehicle's availability
export const getVehicleBookings = (vehicle, bookings = []) =>
  bookings
    .filter(b => isLiveBooking(b) && b.vehicleCode === vehicle.code)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

// AVAILABLE | BOOKED | IN_SHOP | OFFLINE (+ what/when) for the Driver's "availability of the car"
export const getVehicleAvailability = (vehicle, bookings = []) => {
  if (!vehicle) return { state: 'OFFLINE', tone: 'neutral', label: 'Unknown', detail: '' };
  if (vehicle.status === 'IN-SHOP') {
    return { state: 'IN_SHOP', tone: 'warning', label: 'In maintenance', detail: vehicle.statusReason || 'Not available until released from the shop.' };
  }
  if (vehicle.status === 'OFFLINE') {
    return { state: 'OFFLINE', tone: 'danger', label: 'Offline', detail: vehicle.statusReason || 'Vehicle is out of service.' };
  }
  const today = dateKey();
  const list = getVehicleBookings(vehicle, bookings);
  const now = list.find(b => b.date <= today && (b.deadline || b.date) >= today);
  if (now) {
    return {
      state: 'BOOKED',
      tone: 'warning',
      label: 'Booked today',
      detail: `${now.title || 'Scheduled'} · ${now.startTime || ''}${now.endTime ? `–${now.endTime}` : ''} · ${(now.driver || '').split(' (')[0]}`.trim()
    };
  }
  return { state: 'AVAILABLE', tone: 'success', label: 'Available', detail: 'No schedule today.' };
};

export const getUpcomingBookings = (vehicle, bookings = [], limit = 3) => {
  const today = dateKey();
  return getVehicleBookings(vehicle, bookings)
    .filter(b => (b.deadline || b.date) >= today)
    .slice(0, limit);
};

export const sumKm = (trips = []) => trips.reduce((acc, t) => acc + (Number(t.distanceKm) || 0), 0);

export const tripRouteLabel = (t) => {
  if (t.from || t.to) return `${t.from || '—'} → ${t.to || '—'}`;
  if (t.inputMode === 'ODOMETER' && t.odometerStart !== null && t.odometerEnd !== null) {
    return `Odometer ${Number(t.odometerStart).toLocaleString()} → ${Number(t.odometerEnd).toLocaleString()}`;
  }
  return 'Custom distance';
};
