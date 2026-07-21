import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBoxOpen, FaClock, FaMapMarkerAlt, FaSearch, FaSignOutAlt, FaTimes, FaUser } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import api, { API_URL } from '../../../services/api';
import { formatIndianTime } from '../../../utils/formatDate';
import PickupWindowCountdown from '../../../components/PickupWindowCountdown';

const imageUrl = (listing) => listing.image ? `${API_URL}/api/listings/${listing._id}/image` : null;

const ConsumerFeed = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [expiredListingIds, setExpiredListingIds] = useState(() => new Set());
  const nav = [{ path: '/consumer/feed', label: 'Find food' }, { path: '/consumer/claims', label: 'My claims' }, { path: '/consumer/profile', label: 'Profile' }];

  const fetchListings = async () => {
    setLoading(true);
    try { const response = await api.get('/listings'); setListings(response.data.listings || []); }
    catch (error) { Swal.fire({ icon: 'error', title: 'Unable to load offers', text: error.response?.data?.message || 'Please refresh and try again.', confirmButtonColor: '#d97706' }); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    fetchListings();

    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    });
    const handleListingCreated = (listing) => {
      setListings((currentListings) => {
        // A reconnect or duplicate event must not add the same card twice.
        if (currentListings.some((item) => item._id === listing._id)) return currentListings;
        return [...currentListings, listing].sort(
          (first, second) => new Date(first.expiryTime) - new Date(second.expiryTime),
        );
      });
    };

    const handleListingQuantityUpdated = ({ listingId, quantity }) => {
      setListings((currentListings) => {
        // An offer with no portions remaining is no longer claimable.
        if (quantity <= 0) return currentListings.filter((item) => item._id !== listingId);
        return currentListings.map((item) => (
          item._id === listingId ? { ...item, quantity } : item
        ));
      });
    };

    socket.on('listing-created', handleListingCreated);
    socket.on('listing-quantity-updated', handleListingQuantityUpdated);
    return () => {
      socket.off('listing-created', handleListingCreated);
      socket.off('listing-quantity-updated', handleListingQuantityUpdated);
      socket.disconnect();
    };
  }, []);

  const claimFood = async (listing) => {
    const confirmation = await Swal.fire({ icon: 'question', title: `Claim ${listing.foodName}?`, text: `Pickup is available from ${formatIndianTime(listing.pickupStart)} to ${formatIndianTime(listing.pickupEnd)} IST.`, showCancelButton: true, confirmButtonText: 'Claim food', cancelButtonText: 'Not now', confirmButtonColor: '#d97706' });
    if (!confirmation.isConfirmed) return;
    setClaimingId(listing._id);
    try {
      const response = await api.post('/claims', { listingId: listing._id });
      const claim = response.data.claim;
      await Swal.fire({ icon: 'success', title: 'Food claimed!', html: `<p>Show this pickup token at the counter:</p><p style="font-size:1.5rem;font-weight:700;letter-spacing:.12em">${claim.pickupToken}</p><p>Pickup: ${formatIndianTime(claim.pickupStart)} – ${formatIndianTime(claim.pickupEnd)} IST</p>`, confirmButtonText: 'View my claims', confirmButtonColor: '#d97706' });
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
  const leave = () => { logout(); navigate('/login'); };

  return <div className="min-h-screen bg-stone-50">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button className="text-xl text-slate-600 md:hidden" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <FaTimes /> : <FaBars />}</button><div><h1 className="text-xl font-bold">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Hello, {user?.fullName}</p></div></div><div className="hidden items-center gap-2 md:flex">{nav.map((item) => <Link key={item.path} to={item.path} className={`rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</Link>)}<button onClick={leave} className="ml-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt className="mr-2 inline" />Logout</button></div><button onClick={leave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{menuOpen && <div className="border-t px-4 py-2 md:hidden">{nav.map((item) => <Link key={item.path} to={item.path} className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-7xl p-4 md:p-6"><div className="mb-6"><h2 className="text-3xl font-bold">Fresh food nearby</h2><p className="mt-1 text-slate-500">Claim end-of-day offers before they are gone.</p></div><label className="relative mb-7 block max-w-lg"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food, shop, or category" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-amber-500" /></label>
      {loading ? <div className="rounded-2xl bg-white p-12 text-center text-slate-500">Finding nearby offers…</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center"><FaBoxOpen className="mx-auto text-4xl text-amber-300" /><h3 className="mt-4 text-lg font-bold">No offers right now</h3><p className="mt-1 text-slate-500">Try again soon—new surplus food appears throughout the day.</p></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <article key={item._id} className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="h-48 bg-amber-50">{imageUrl(item) ? <img src={imageUrl(item)} alt={item.foodName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl text-amber-300"><FaBoxOpen /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{item.foodName}</h3><p className="text-sm text-slate-500">{item.category}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{item.quantity} left</span></div><p className="mt-3 min-h-10 text-sm text-slate-600">{item.description || 'Fresh surplus food available for pickup.'}</p><p className="mt-3 text-lg font-bold text-amber-700">₹{item.discountedPrice} <span className="text-sm font-normal text-slate-400 line-through">₹{item.originalPrice}</span></p><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><FaMapMarkerAlt className="text-amber-600" />{item.merchantId?.shopName || 'Local store'}, {item.merchantId?.city || 'Nearby'}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><FaClock className="text-amber-600" />Pickup {formatIndianTime(item.pickupStart)} – {formatIndianTime(item.pickupEnd)} IST</p><PickupWindowCountdown listing={item} onExpired={() => removeExpiredListing(item._id)} /><button disabled={claimingId === item._id} onClick={() => claimFood(item)} className="mt-5 w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{claimingId === item._id ? 'Claiming…' : 'Claim food'}</button></div></article>)}</div>}
    </main></div>;
};

export default ConsumerFeed;
