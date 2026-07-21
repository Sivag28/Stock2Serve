import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaClipboardList } from 'react-icons/fa';
import { io } from 'socket.io-client';
import api, { API_URL } from '../../../services/api';
import { formatIndianDateTime } from '../../../utils/formatDate';

const statusClass = (status) => (status === 'collected' ? 'bg-emerald-100 text-emerald-700' : status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700');

const MerchantHistory = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/merchant/claim-history').then((response) => setClaims(response.data.claims || [])).finally(() => setLoading(false));
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] });
    const onClaimCreated = ({ claim }) => setClaims((current) => current.some((item) => item._id === claim._id) ? current : [claim, ...current]);
    const onClaimUpdated = ({ claimId, status, collectedAt }) => setClaims((current) => current.map((claim) => claim._id === claimId ? { ...claim, status, ...(collectedAt ? { collectedAt } : {}) } : claim));
    socket.on('merchant-claim-created', onClaimCreated);
    socket.on('merchant-claim-updated', onClaimUpdated);
    return () => { socket.off('merchant-claim-created', onClaimCreated); socket.off('merchant-claim-updated', onClaimUpdated); socket.disconnect(); };
  }, []);

  return <div className="min-h-screen bg-stone-50"><main className="mx-auto max-w-7xl p-4 md:p-8">
    <Link to="/merchant/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-700"><FaArrowLeft /> Dashboard</Link>
    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><FaClipboardList /></div><div><h1 className="text-3xl font-bold">Claim history</h1><p className="text-slate-500">New consumer claims appear here live.</p></div></div>
      {loading ? <p className="py-10 text-center text-slate-500">Loading claim history…</p> : claims.length === 0 ? <p className="py-10 text-center text-slate-500">No consumer claims yet.</p> : <div className="mt-6 overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-600"><tr><th className="p-3">Consumer</th><th className="p-3">Food</th><th className="p-3">Qty</th><th className="p-3">Amount</th><th className="p-3">Claimed</th><th className="p-3">Token expires</th><th className="p-3">Status</th></tr></thead><tbody>{claims.map((claim) => <tr key={claim._id} className="border-b border-slate-100"><td className="p-3 font-semibold">{claim.consumerId?.fullName || 'Consumer unavailable'}</td><td className="p-3">{claim.listingId?.foodName || 'Listing unavailable'}</td><td className="p-3">{claim.quantity}</td><td className="p-3 font-semibold text-amber-700">₹{(Number(claim.listingId?.discountedPrice || 0) * Number(claim.quantity || 0)).toFixed(2)}</td><td className="p-3">{formatIndianDateTime(claim.createdAt)} IST</td><td className="p-3">{formatIndianDateTime(claim.tokenExpiresAt || claim.listingId?.expiryTime)} IST</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusClass(claim.status)}`}>{claim.status}</span></td></tr>)}</tbody></table></div>}
    </section></main></div>;
};

export default MerchantHistory;
