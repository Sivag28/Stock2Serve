import React, { useEffect, useMemo, useState } from 'react';
import { useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaBars, FaBoxOpen, FaClock, FaFire, FaLeaf, FaMapMarkerAlt, FaSearch, FaSignOutAlt, FaStore, FaTimes, FaUtensils } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import api, { API_URL } from '../../../services/api';
import { formatIndianTime } from '../../../utils/formatDate';
import PickupWindowCountdown from '../../../components/PickupWindowCountdown';

const imageUrl = (listing) => listing.image ? `${API_URL}/api/listings/${listing._id}/image` : null;

const isWithinNearbyRadius = (consumer, merchant) => {
  const latitude = Number(merchant?.latitude);
  const longitude = Number(merchant?.longitude);
  if (!consumer || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const toRadians = (value) => value * (Math.PI / 180);
  const latitudeDelta = toRadians(latitude - consumer.latitude);
  const longitudeDelta = toRadians(longitude - consumer.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(consumer.latitude)) * Math.cos(toRadians(latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 10000;
};

const ConsumerFeed = () => {
  const { user, loading: authLoading, logout, consumerLocation: sharedConsumerLocation, refreshConsumerLocation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [expiredListingIds, setExpiredListingIds] = useState(() => new Set());
  const [locationStatus, setLocationStatus] = useState('requesting');
  const consumerLocation = useRef(null);
  const nav = [{ path: '/consumer/feed', label: 'Find food' }, { path: '/consumer/map', label: 'Nearby map' }, { path: '/consumer/claims', label: 'My claims' }, { path: '/consumer/profile', label: 'Profile' }];

  const fetchTrending = useCallback(async (coordinates = consumerLocation.current) => {
    if (!coordinates) return;
    try {
      const response = await api.get('/listings/trending', { params: coordinates });
      setTrending(response.data.trending || []);
    } catch (error) {
      // Trending food is supplementary; keep nearby offers usable if it cannot load.
      setTrending([]);
    }
  }, []);

  const fetchListings = useCallback(async (coordinates = consumerLocation.current, { announceNewSinceLastVisit = true } = {}) => {
    if (!coordinates) return;
    setLoading(true);
    try {
      const response = await api.get('/listings', { params: coordinates });
      const nearbyListings = response.data.listings || [];
      const consumerId = user?._id || user?.id;
      const seenKey = consumerId ? `stock2serve:last-feed-seen:${consumerId}` : null;
      const lastSeenAt = seenKey ? Number(localStorage.getItem(seenKey) || 0) : 0;
      const newlyAvailable = lastSeenAt
        ? nearbyListings.filter((listing) => new Date(listing.createdAt).getTime() > lastSeenAt)
        : [];
      setListings(nearbyListings);
      fetchTrending(coordinates);
      if (announceNewSinceLastVisit && newlyAvailable.length) {
        toast.success(newlyAvailable.length === 1 ? 'New food available near you!' : `${newlyAvailable.length} new food offers are available near you!`);
      }
      if (seenKey) localStorage.setItem(seenKey, String(Date.now()));
    }
    catch (error) { Swal.fire({ icon: 'error', title: 'Unable to load offers', text: error.response?.data?.message || 'Please refresh and try again.', confirmButtonColor: '#d97706' }); }
    finally { setLoading(false); }
  }, [fetchTrending, user?._id, user?.id]);

  // The provider updates this value when the device location changes, so the
  // feed follows the same GPS/fallback location as the Nearby Map.
  useEffect(() => {
    if (!sharedConsumerLocation) return;
    consumerLocation.current = sharedConsumerLocation;
    setLocationStatus('ready');
    fetchListings(sharedConsumerLocation, { announceNewSinceLastVisit: false });
  }, [fetchListings, sharedConsumerLocation]);

  useEffect(() => {
    if (authLoading) return undefined;
    refreshConsumerLocation().then((coordinates) => {
      // A valid result is handled by the sharedConsumerLocation effect above.
      // Avoid sending the same nearby-listings request twice on page load.
      if (!coordinates) {
        setLocationStatus('denied');
        setLoading(false);
      }
    });

    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    });
    // Broadcasts go to every consumer. Re-querying keeps the 10 km rule as
    // the source of truth rather than appending a potentially distant offer.
    const handleListingCreated = (listing) => {
      fetchListings(undefined, { announceNewSinceLastVisit: false });
      if (isWithinNearbyRadius(consumerLocation.current, listing?.merchantId)) {
        toast.success('New food available near you!');
      }
    };

    const handleListingUpdated = (listing) => {
      fetchListings(undefined, { announceNewSinceLastVisit: false });
      if (isWithinNearbyRadius(consumerLocation.current, listing?.merchantId)) {
        toast.success('A nearby food offer was updated!');
      }
    };

    const handleListingQuantityUpdated = ({ listingId, quantity }) => {
      setListings((currentListings) => {
        // An offer with no portions remaining is no longer claimable.
        if (quantity <= 0) return currentListings.filter((item) => item._id !== listingId);
        return currentListings.map((item) => (
          item._id === listingId ? { ...item, quantity } : item
        ));
      });
      fetchTrending();
    };

    socket.on('listing-created', handleListingCreated);
    socket.on('listing-updated', handleListingUpdated);
    socket.on('listing-quantity-updated', handleListingQuantityUpdated);
    return () => {
      socket.off('listing-created', handleListingCreated);
      socket.off('listing-updated', handleListingUpdated);
      socket.off('listing-quantity-updated', handleListingQuantityUpdated);
      socket.disconnect();
    };
  }, [authLoading, fetchListings, fetchTrending, refreshConsumerLocation, user]);

  const claimFood = async (listing) => {
    const confirmation = await Swal.fire({
      icon: 'question', title: `Claim ${listing.foodName}?`,
      text: `Pickup is available from ${formatIndianTime(listing.pickupStart)} to ${formatIndianTime(listing.pickupEnd)} IST.`,
      input: 'number', inputLabel: 'Quantity', inputValue: 1,
      inputAttributes: { min: 1, max: listing.quantity, step: 1 },
      inputValidator: (value) => (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > listing.quantity ? `Choose a quantity from 1 to ${listing.quantity}.` : undefined),
      showCancelButton: true, confirmButtonText: 'Claim food', cancelButtonText: 'Not now', confirmButtonColor: '#d97706',
    });
    if (!confirmation.isConfirmed) return;
    const quantity = Number(confirmation.value);
    setClaimingId(listing._id);
    try {
      const response = await api.post('/claims', { listingId: listing._id, quantity });
      const claim = response.data.claim;
      await Swal.fire({ icon: 'success', title: 'Food claimed!', html: `<p><strong>Quantity:</strong> ${claim.quantity}</p><p>Show this pickup token at the counter:</p><p style="font-size:1.5rem;font-weight:700;letter-spacing:.12em">${claim.pickupToken}</p><p>Pickup: ${formatIndianTime(claim.pickupStart)} – ${formatIndianTime(claim.pickupEnd)} IST</p>`, confirmButtonText: 'View my claims', confirmButtonColor: '#d97706' });
      navigate('/consumer/claims');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Unable to claim food', text: error.response?.data?.message || 'Please try another item.', confirmButtonColor: '#d97706' });
      fetchListings();
    } finally { setClaimingId(null); }
  };

  const removeExpiredListing = (listingId) => {
    setExpiredListingIds((current) => new Set([...current, listingId]));
  };
  const filtered = useMemo(() => listings.filter((item) => !expiredListingIds.has(item._id) && [item.foodName, item.description, item.category, item.merchantId?.shopName, item.merchantId?.city].filter(Boolean).some((value) => value.toLowerCase().includes(search.toLowerCase()))), [expiredListingIds, listings, search]);
  const leave = async () => {
    if (await logout()) navigate('/login');
  };

  return <div className="app-shell min-h-screen bg-stone-50">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="text-xl text-slate-600 md:hidden" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <FaTimes /> : <FaBars />}</button><div className="flex items-center gap-2.5"><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold tracking-tight text-slate-900">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Good to see you, {user?.fullName?.split(' ')[0] || 'there'}</p></div></div></div><div className="hidden items-center gap-2 md:flex">{nav.map((item) => <Link key={item.path} to={item.path} className={`rounded-xl px-4 py-2 text-sm font-semibold ${location.pathname === item.path ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</Link>)}<button onClick={leave} className="ml-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"><FaSignOutAlt className="mr-2 inline" />Logout</button></div><button aria-label="Log out" onClick={leave} className="rounded-xl bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{menuOpen && <div className="border-t px-4 py-2 md:hidden">{nav.map((item) => <Link key={item.path} to={item.path} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-7xl p-4 pb-10 md:p-6 md:pb-12">
      <section className="relative mb-7 overflow-hidden rounded-3xl border border-amber-950/70 bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 px-6 py-8 text-white shadow-xl shadow-amber-950/20 md:px-10 md:py-10"><div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-amber-400/25 blur-2xl" /><div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-orange-400/25 blur-xl" /><div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block"><span className="absolute right-[28%] top-[18%] animate-[bounce_6s_ease-in-out_infinite] text-5xl opacity-90 drop-shadow-xl">🍛</span><span className="absolute right-[8%] top-[18%] animate-[bounce_7s_ease-in-out_infinite_0.8s] text-4xl opacity-85 drop-shadow-xl">🍕</span><span className="absolute right-[43%] top-[48%] animate-[bounce_5s_ease-in-out_infinite_0.4s] text-4xl opacity-85 drop-shadow-xl">🥐</span><span className="absolute right-[24%] top-[57%] animate-[bounce_7s_ease-in-out_infinite_1.2s] text-5xl opacity-90 drop-shadow-xl">🥗</span><span className="absolute right-[2%] bottom-[9%] animate-[bounce_6s_ease-in-out_infinite_0.6s] text-4xl opacity-85 drop-shadow-xl">🍱</span><span className="absolute right-[48%] bottom-[12%] animate-[bounce_5.5s_ease-in-out_infinite_1s] text-3xl opacity-80">✨</span></div><div className="relative max-w-2xl"><div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-200"><FaLeaf /> Less waste, more good</div><h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">A great meal is<br className="hidden sm:block" /> waiting nearby.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-amber-50/80 md:text-base">Discover fresh surplus food from local shops and give every good meal a second chance.</p><div className="mt-6 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-amber-50/10 px-3 py-2 font-semibold text-amber-50"><FaMapMarkerAlt className="mr-2 inline text-amber-300" />Within 10 km</span><span className="rounded-full bg-amber-50/10 px-3 py-2 font-semibold text-amber-50"><FaUtensils className="mr-2 inline text-amber-300" />{listings.length} offers today</span></div></div></section>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Discover offers</p><h3 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Fresh food near you</h3><p className="mt-1 text-slate-500">Claim end-of-day offers before they are gone.</p></div><label className="relative block w-full md:max-w-md"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food, shop, or category" className="w-full rounded-2xl border border-amber-900/25 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-amber-500" /></label></div>
      {locationStatus === 'ready' && trending.length > 0 && <section className="mb-8 rounded-2xl border border-amber-900/25 bg-gradient-to-r from-orange-50 to-amber-50 p-5"><div className="flex items-center gap-2"><FaFire className="text-xl text-orange-500" /><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Trending items</p><h3 className="text-xl font-bold text-slate-900">Trending now</h3></div></div><div className="mt-4 grid gap-3 md:grid-cols-3">{trending.map((item) => <article key={item._id} className="rounded-xl border border-amber-900/20 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">{item.foodName}</h4><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><FaStore className="text-amber-600" />{item.shopName || 'Local store'}</p><p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><FaMapMarkerAlt className="mt-1 shrink-0 text-amber-600" />{item.shopAddress || item.city || 'Nearby'}</p></div><span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">{item.claimCount} {item.claimCount === 1 ? 'claim' : 'claims'}</span></div></article>)}</div><p className="mt-4 text-xs text-slate-500">Based on claims made in the last 10 minutes.</p></section>}
      {loading ? <div className="rounded-3xl border border-amber-900/25 bg-white p-12 text-center text-slate-500">Finding nearby offers…</div> : locationStatus !== 'ready' ? <div className="rounded-3xl border border-dashed border-amber-900/30 bg-white p-12 text-center"><FaMapMarkerAlt className="mx-auto text-4xl text-amber-400" /><h3 className="mt-4 text-lg font-bold">Location is needed</h3><p className="mt-1 text-slate-500">Set a valid location in your profile, or allow browser location access, to see nearby food offers.</p></div> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-amber-900/30 bg-white p-12 text-center"><FaBoxOpen className="mx-auto text-4xl text-amber-300" /><h3 className="mt-4 text-lg font-bold">No nearby offers right now</h3><p className="mt-1 text-slate-500">There are no active offers within 10 km. Try again soon.</p></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <article key={item._id} className="group overflow-hidden rounded-3xl border border-amber-900/25 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"><div className="relative h-52 overflow-hidden bg-amber-50"><div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4"><span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold capitalize text-slate-700 shadow-sm backdrop-blur">{item.category || 'Food offer'}</span><span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">{item.quantity} left</span></div>{imageUrl(item) ? <img src={imageUrl(item)} alt={item.foodName} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-50 text-5xl text-amber-400"><FaUtensils /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold tracking-tight text-slate-900">{item.foodName}</h3><p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500"><FaStore className="text-amber-600" />{item.merchantId?.shopName || 'Local store'}</p></div><div className="text-right"><p className="text-lg font-extrabold text-amber-700">₹{item.discountedPrice}</p><p className="text-xs text-slate-400 line-through">₹{item.originalPrice}</p></div></div><p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{item.description || 'Fresh surplus food available for pickup.'}</p><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><p className="flex items-start gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FaMapMarkerAlt /></span><span>{item.merchantId?.shopAddress || item.merchantId?.city || 'Nearby'}</span></p><p className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FaClock /></span>Pickup {formatIndianTime(item.pickupStart)} – {formatIndianTime(item.pickupEnd)} IST</p></div><PickupWindowCountdown listing={item} onExpired={() => removeExpiredListing(item._id)} /><button disabled={claimingId === item._id} onClick={() => claimFood(item)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-700 disabled:opacity-60">{claimingId === item._id ? 'Claiming…' : <>Claim food <FaArrowRight /></>}</button></div></article>)}</div>}
    </main></div>;
};

export default ConsumerFeed;
