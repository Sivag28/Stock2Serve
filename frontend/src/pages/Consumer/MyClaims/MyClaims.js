import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaClipboardList, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { io } from 'socket.io-client';
import api from '../../../services/api';
import { API_URL } from '../../../services/api';
import { formatIndianTime } from '../../../utils/formatDate';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/claims/my').then((response) => setClaims(response.data.claims || [])).catch(() => setClaims([])).finally(() => setLoading(false));

    const token = localStorage.getItem('token');
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const handleClaimUpdated = ({ claimId, status, collectedAt }) => {
      setClaims((currentClaims) => currentClaims.map((claim) => (
        claim._id === claimId ? { ...claim, status, ...(collectedAt ? { collectedAt } : {}) } : claim
      )));
    };
    socket.on('claim-updated', handleClaimUpdated);
    return () => {
      socket.off('claim-updated', handleClaimUpdated);
      socket.disconnect();
    };
  }, []);
  return <div className="min-h-screen bg-stone-50"><main className="mx-auto max-w-4xl p-4 md:p-8"><Link to="/consumer/feed" className="text-sm font-semibold text-slate-600 hover:text-amber-700">← Back to food offers</Link><div className="mt-5 rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><FaClipboardList /></div><div><h1 className="text-3xl font-bold">My claims</h1><p className="text-slate-500">Keep your pickup token ready at the counter.</p></div></div>{loading ? <p className="py-10 text-center text-slate-500">Loading your claims…</p> : claims.length === 0 ? <p className="py-10 text-center text-slate-500">You have not claimed any food yet.</p> : <div className="mt-6 space-y-4">{claims.map((claim) => <article key={claim._id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{claim.listingId?.foodName || 'Listing unavailable'}</h2><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><FaMapMarkerAlt />{claim.listingId?.merchantId?.shopName || 'Local store'}, {claim.listingId?.merchantId?.city || ''}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><FaClock />Pickup {formatIndianTime(claim.listingId?.pickupStart)} – {formatIndianTime(claim.listingId?.pickupEnd)} IST</p></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${claim.status === 'collected' ? 'bg-slate-100 text-slate-600' : claim.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{claim.status}</span></div><div className="mt-4 rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pickup token</p><p className="mt-1 font-mono text-2xl font-bold tracking-widest text-slate-900">{claim.pickupToken}</p></div></article>)}</div>}</div></main></div>;
};
export default MyClaims;
