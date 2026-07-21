import { useEffect, useRef, useState } from 'react';

const formatDuration = (target, now) => {
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
};

const colourFor = (target, now) => {
  const remaining = new Date(target).getTime() - now;
  if (remaining <= 60 * 1000) return 'border-red-200 bg-red-50 text-red-700';
  if (remaining <= 10 * 60 * 1000) return 'border-orange-200 bg-orange-50 text-orange-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const ExpiredBadge = ({ children }) => <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">{children}</span>;

const fallbackPickupTiming = (listing) => {
  if (!listing?.expiryTime || !listing?.pickupStart || !listing?.pickupEnd) return {};
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(listing.expiryTime)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const start = new Date(`${date}T${listing.pickupStart}:00+05:30`);
  const end = new Date(`${date}T${listing.pickupEnd}:00+05:30`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

const Timer = ({ title, label, target, now }) => (
  <section className={`rounded-xl border p-4 ${colourFor(target, now)}`}>
    <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
    <p className="mt-2 text-sm font-semibold">{label}</p>
    <p className="mt-1 font-mono text-xl font-bold tabular-nums sm:text-2xl">{formatDuration(target, now)}</p>
  </section>
);

const ClaimCountdowns = ({ claim, onExpired }) => {
  const [now, setNow] = useState(Date.now());
  const reported = useRef(false);
  const fallback = fallbackPickupTiming(claim.listingId);
  const pickupStart = claim.pickupWindowStart || fallback.start;
  const pickupEnd = claim.pickupWindowEnd || fallback.end;
  const tokenExpiresAt = claim.tokenExpiresAt || claim.listingId?.expiryTime;
  const pickupExpired = pickupEnd && new Date(pickupEnd).getTime() <= now;
  const tokenExpired = tokenExpiresAt && new Date(tokenExpiresAt).getTime() <= now;
  const active = claim.status === 'claimed';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active || (!pickupExpired && !tokenExpired) || reported.current) return;
    reported.current = true;
    onExpired(claim._id);
  }, [active, claim._id, onExpired, pickupExpired, tokenExpired]);

  if (claim.status === 'collected') return <p className="mt-4 text-sm font-semibold text-slate-500">Pickup collected</p>;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {!pickupEnd ? <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600"><p className="text-xs font-semibold uppercase tracking-wider">Pickup Window</p><p className="mt-2 text-sm font-semibold">Pickup timing unavailable</p></section>
        : pickupExpired ? <section className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">Pickup Window</p><ExpiredBadge>Pickup Window Expired</ExpiredBadge></section>
        : pickupStart && new Date(pickupStart).getTime() > now ? <Timer title="Pickup Window" label="Pickup starts in" target={pickupStart} now={now} />
          : <Timer title="Pickup Window" label="Time Remaining" target={pickupEnd} now={now} />}
      {!tokenExpiresAt ? <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600"><p className="text-xs font-semibold uppercase tracking-wider">Pickup Token</p><p className="mt-2 text-sm font-semibold">Token timing unavailable</p></section>
        : tokenExpired ? <section className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">Pickup Token</p><ExpiredBadge>Token Expired</ExpiredBadge></section>
        : <Timer title="Pickup Token" label="Token Expires In" target={tokenExpiresAt} now={now} />}
    </div>
  );
};

export default ClaimCountdowns;
