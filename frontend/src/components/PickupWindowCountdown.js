import { useEffect, useMemo, useState } from 'react';

const pickupTiming = (listing) => {
  if (!listing?.expiryTime || !listing?.pickupStart || !listing?.pickupEnd) return {};
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(listing.expiryTime)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const start = new Date(`${date}T${listing.pickupStart}:00+05:30`);
  const end = new Date(`${date}T${listing.pickupEnd}:00+05:30`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

const formatted = (target, now) => {
  const total = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}h ${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}m ${String(total % 60).padStart(2, '0')}s`;
};

const colour = (target, now) => {
  const remaining = new Date(target).getTime() - now;
  if (remaining <= 60 * 1000) return 'border-red-200 bg-red-50 text-red-700';
  if (remaining <= 10 * 60 * 1000) return 'border-orange-200 bg-orange-50 text-orange-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const PickupWindowCountdown = ({ listing, onExpired }) => {
  const [now, setNow] = useState(Date.now());
  const { start, end } = useMemo(() => pickupTiming(listing), [listing]);
  const expired = end && end.getTime() <= now;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expired) onExpired?.();
  }, [expired, onExpired]);

  if (!end) return null;
  if (expired) return <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Pickup Window Expired</div>;

  const beforePickup = start.getTime() > now;
  const target = beforePickup ? start : end;
  return <div className={`mt-4 rounded-xl border p-3 ${colour(target, now)}`}>
    <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Pickup Window</p>
    <p className="mt-1 text-sm font-semibold">{beforePickup ? 'Pickup starts in' : 'Time Remaining'}</p>
    <p className="mt-1 font-mono text-lg font-bold tabular-nums">{formatted(target, now)}</p>
  </div>;
};

export default PickupWindowCountdown;
