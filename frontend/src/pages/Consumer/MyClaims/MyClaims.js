import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaClipboardList, FaClock, FaLeaf, FaMapMarkerAlt, FaSignOutAlt, FaTimes, FaUtensils } from 'react-icons/fa';
import { io } from 'socket.io-client';
import api, { API_URL } from '../../../services/api';
import { formatIndianTime } from '../../../utils/formatDate';
import ClaimCountdowns from '../../../components/ClaimCountdowns';
import { useAuth } from '../../../context/AuthContext';

const claimImageUrl = (listing) => listing?.image ? `${API_URL}/api/listings/${listing._id}/image` : null;
const formatClaimDate = (date) => date ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Date unavailable';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Socket events can arrive while the initial claims request is still in
  // flight. Keep those updates so the response cannot overwrite newer state.
  const pendingUpdates = useRef(new Map());
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = [{ path: '/consumer/feed', label: 'Find food' }, { path: '/consumer/map', label: 'Nearby map' }, { path: '/consumer/claims', label: 'My claims' }, { path: '/consumer/profile', label: 'Profile' }];

  const updateClaim = useCallback((claimId, status, collectedAt) => {
    const normalizedId = String(claimId);
    pendingUpdates.current.set(normalizedId, { status, collectedAt });
    setClaims((current) => current.map((claim) => (
      String(claim._id) === normalizedId
        ? { ...claim, status, ...(collectedAt ? { collectedAt } : {}) }
        : claim
    )));
  }, []);

  const expireClaim = useCallback(async (claimId) => {
    try {
      const response = await api.post(`/claims/${claimId}/expire`);
      updateClaim(claimId, response.data.status);
    } catch (error) {
      // The next claim refresh/socket event reconciles a temporary failure.
    }
  }, [updateClaim]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] });
    const handleClaimUpdated = ({ claimId, status, collectedAt }) => updateClaim(claimId, status, collectedAt);
    socket.on('claim-updated', handleClaimUpdated);

    api.get('/claims/my').then((response) => {
      const fetchedClaims = response.data.claims || [];
      setClaims(fetchedClaims.map((claim) => {
        const update = pendingUpdates.current.get(String(claim._id));
        return update
          ? { ...claim, status: update.status, ...(update.collectedAt ? { collectedAt: update.collectedAt } : {}) }
          : claim;
      }));
    }).catch(() => setClaims([])).finally(() => setLoading(false));

    return () => { socket.off('claim-updated', handleClaimUpdated); socket.disconnect(); };
  }, [updateClaim]);

  const leave = async () => {
    if (await logout()) navigate('/login');
  };

  return <div className="app-shell consumer-claims-shell min-h-screen bg-stone-50">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="text-xl text-slate-600 md:hidden" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <FaTimes /> : <FaBars />}</button><div className="flex items-center gap-2.5"><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold tracking-tight text-slate-900">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Good to see you, {user?.fullName?.split(' ')[0] || 'there'}</p></div></div></div><div className="hidden items-center gap-2 md:flex">{nav.map((item) => <Link key={item.path} to={item.path} className={`rounded-xl px-4 py-2 text-sm font-semibold ${location.pathname === item.path ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</Link>)}<button onClick={leave} className="ml-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"><FaSignOutAlt className="mr-2 inline" />Logout</button></div><button aria-label="Log out" onClick={leave} className="rounded-xl bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{menuOpen && <div className="border-t px-4 py-2 md:hidden">{nav.map((item) => <Link key={item.path} to={item.path} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12">
      <section className="mt-5 rounded-3xl border border-amber-900/45 bg-white p-6 shadow-xl shadow-slate-900/[0.05] md:p-8"><div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-100 p-3.5 text-amber-700 shadow-sm"><FaClipboardList /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Your food pickups</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">My claims</h1><p className="mt-1 text-slate-500">Keep your pickup token ready at the counter.</p></div></div>
        {loading ? <p className="py-14 text-center text-slate-500">Loading your claims...</p> : claims.length === 0 ? <div className="py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><FaClipboardList /></div><p className="mt-4 font-semibold text-slate-700">You have not claimed any food yet.</p><Link to="/consumer/feed" className="mt-3 inline-block text-sm font-bold text-amber-700 hover:text-amber-800">Find food near you</Link></div> : <div className="mt-7 grid gap-5 xl:grid-cols-2">{claims.map((claim) => <article key={claim._id} className="group rounded-3xl border border-amber-900/25 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-amber-800 bg-amber-50 shadow-md shadow-amber-900/15">{claimImageUrl(claim.listingId) ? <img src={claimImageUrl(claim.listingId)} alt={claim.listingId?.foodName || 'Claimed food'} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : <FaUtensils className="text-3xl text-amber-600" />}</div><div className="min-w-0"><h2 className="text-xl font-extrabold tracking-tight text-slate-900">{claim.listingId?.foodName || 'Listing unavailable'}</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><FaMapMarkerAlt className="shrink-0 text-amber-600" />{claim.listingId?.merchantId?.shopName || 'Local store'}, {claim.listingId?.merchantId?.city || ''}</p><p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"><FaClock /> Pickup date: {formatClaimDate(claim.pickupWindowStart || claim.createdAt)}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><FaClock className="shrink-0 text-amber-600" />Pickup {formatIndianTime(claim.listingId?.pickupStart)} - {formatIndianTime(claim.listingId?.pickupEnd)} IST</p></div></div><span className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${claim.status === 'collected' ? 'bg-slate-100 text-slate-600' : claim.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{claim.status}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><div><p className="text-slate-500">Quantity</p><p className="mt-1 text-lg font-extrabold text-slate-900">{claim.quantity}</p></div><div><p className="text-slate-500">Total amount</p><p className="mt-1 text-lg font-extrabold text-amber-700">&#8377;{(Number(claim.listingId?.discountedPrice || 0) * Number(claim.quantity || 0)).toFixed(2)}</p></div></div>
          {claim.status === 'claimed' && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold leading-6 text-slate-700">Your claim is confirmed! Your QR code has been sent to your registered email. Show the QR code/pickup token to the merchant when collecting your item.</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-700">Pickup token</p><p className="mt-1 font-mono text-2xl font-bold tracking-widest text-slate-900">{claim.pickupToken}</p></div>}
          <ClaimCountdowns claim={claim} onExpired={expireClaim} />
        </article>)}</div>}
      </section>
    </main>
  </div>;
};

export default MyClaims;
