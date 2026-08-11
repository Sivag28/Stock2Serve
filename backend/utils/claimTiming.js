const indianDateFor = (date) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(date)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const indianDateTime = (datePart, time) => new Date(`${datePart}T${time}:00+05:30`);

const timingForListing = (listing) => {
  if (!listing?.expiryTime) return {};
  const datePart = indianDateFor(listing.expiryTime);
  const pickupWindowStart = indianDateTime(datePart, listing.pickupStart);
  const pickupWindowEnd = indianDateTime(datePart, listing.pickupEnd);
  // Support a window that crosses midnight without changing existing forms.
  if (pickupWindowEnd <= pickupWindowStart) pickupWindowEnd.setDate(pickupWindowEnd.getDate() + 1);
  return { pickupWindowStart, pickupWindowEnd, tokenExpiresAt: new Date(listing.expiryTime) };
};

const timingForClaim = (claim, listing) => {
  const fallback = timingForListing(listing);
  return {
    pickupWindowStart: claim.pickupWindowStart || fallback.pickupWindowStart,
    pickupWindowEnd: claim.pickupWindowEnd || fallback.pickupWindowEnd,
    tokenExpiresAt: claim.tokenExpiresAt || fallback.tokenExpiresAt,
  };
};

const isExpired = (timing, now = Date.now()) => (
  Boolean(timing.pickupWindowEnd && timing.pickupWindowEnd.getTime() <= now)
  || Boolean(timing.tokenExpiresAt && timing.tokenExpiresAt.getTime() <= now)
);

const isPickupWindowActive = (listing, now = Date.now()) => {
  if (!listing?.pickupStart || !listing?.pickupEnd || !listing?.expiryTime) return false;

  const currentTime = new Date(now);
  const timing = timingForListing(listing);
  const tokenExpiresAt = timing.tokenExpiresAt?.getTime();
  if (!timing.pickupWindowStart || !timing.pickupWindowEnd
    || Number.isNaN(tokenExpiresAt) || tokenExpiresAt <= currentTime.getTime()) return false;

  // The date belongs to the listing, not to the request.  Using today's date
  // here made a future listing look active whenever its clock time matched
  // today's pickup window.
  return timing.pickupWindowStart.getTime() <= currentTime.getTime()
    && timing.pickupWindowEnd.getTime() > currentTime.getTime();
};

module.exports = { timingForListing, timingForClaim, isExpired, isPickupWindowActive };
