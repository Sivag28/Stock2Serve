import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBoxOpen, FaClipboardList, FaHistory, FaHome, FaPlus, FaSearch, FaSignOutAlt, FaTimes, FaUser, FaLeaf } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import api, { API_URL } from '../../../services/api';
import { formatIndianDateTime } from '../../../utils/formatDate';

const statusClass = (status) => (status === 'collected' ? 'bg-emerald-100 text-emerald-700' : status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700');
const navItems = [{ path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> }, { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> }, { path: '/merchant/inventory', label: 'Inventory', icon: <FaBoxOpen /> }, { path: '/merchant/verify-pickup', label: 'Verify pickup', icon: <FaClipboardList /> }, { path: '/merchant/history', label: 'History', icon: <FaHistory /> }, { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> }];

const MerchantHistory = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredClaims = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return claims;
    return claims.filter((claim) => [claim.consumerId?.fullName, claim.listingId?.foodName, formatIndianDateTime(claim.createdAt), claim.createdAt].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [claims, search]);

  useEffect(() => {
    api.get('/merchant/claim-history').then((response) => setClaims(response.data.claims || [])).finally(() => setLoading(false));
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] });
    const onClaimCreated = ({ claim }) => setClaims((current) => current.some((item) => item._id === claim._id) ? current : [claim, ...current]);
    const onClaimUpdated = ({ claimId, status, collectedAt }) => setClaims((current) => current.map((claim) => claim._id === claimId ? { ...claim, status, ...(collectedAt ? { collectedAt } : {}) } : claim));
    socket.on('merchant-claim-created', onClaimCreated);
    socket.on('merchant-claim-updated', onClaimUpdated);
    return () => { socket.off('merchant-claim-created', onClaimCreated); socket.off('merchant-claim-updated', onClaimUpdated); socket.disconnect(); };
  }, []);

  useEffect(() => {
    // let mounted = true;
    const insertPhones = async () => {
      try {
        const resp = await api.get('/merchant/claim-history');
        const claimsForMap = resp.data.claims || [];
        const map = {};
        claimsForMap.forEach((c) => {
          const key = `${c.consumerId?.fullName || ''}||${formatIndianDateTime(c.createdAt)}`;
          map[key] = c.consumerId?.mobileNumber || '—';
        });
        const tables = document.querySelectorAll('table');
        let table = null;
        for (const t of tables) {
          const th = t.querySelector('thead tr th');
          if (th && th.textContent.trim() === 'Consumer') { table = t; break; }
        }
        if (!table) return;
        const theadRow = table.querySelector('thead tr');
        if (theadRow && !theadRow.querySelector('.phone-header')) {
          const th = document.createElement('th');
          th.className = 'p-4 font-bold phone-header';
          th.textContent = 'Phone';
          theadRow.insertBefore(th, theadRow.children[1]);
        }
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((tr) => {
          if (tr.querySelector('.phone-cell')) return;
          const consumerCell = tr.querySelector('td');
          const claimedCell = Array.from(tr.querySelectorAll('td')).find(td => td.textContent.includes('IST'));
          const key = `${consumerCell?.textContent.trim() || ''}||${claimedCell?.textContent.replace(' IST','').trim() || ''}`;
          const phone = map[key] || '—';
          const td = document.createElement('td');
          td.className = 'p-4 text-slate-600 phone-cell';
          td.textContent = phone;
          tr.insertBefore(td, tr.children[1]);
        });
      } catch (e) {
        // ignore
      }
    };
    insertPhones();
  }, [filteredClaims]);

  const logoutAndLeave = async () => {
    if (await logout()) navigate('/login');
  };

  return <div className="app-shell min-h-screen bg-stone-50">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-4"><button className="text-2xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold md:text-1xl">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Welcome, {user?.fullName}</p></div></div><div className="hidden items-center gap-2 md:flex">{navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}<button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt /> Logout</button></div><button onClick={logoutAndLeave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12">
      <section className="rounded-3xl border border-amber-900/25 bg-white p-5 shadow-xl shadow-slate-900/[0.05] md:p-8"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="flex items-center gap-4"><div className="rounded-2xl bg-amber-100 p-3.5 text-amber-700 shadow-sm"><FaClipboardList /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Business activity</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Claim history</h1><p className="mt-1 text-slate-500">Track every consumer claim and pickup status in one place.</p></div></div>{!loading && claims.length > 0 && <label className="relative block w-full md:max-w-md"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search consumer, food, date, or time" className="w-full rounded-2xl border border-amber-900/25 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-amber-500" /></label>}</div>
        {loading ? <p className="py-14 text-center text-slate-500">Loading claim history...</p> : claims.length === 0 ? <div className="py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><FaClipboardList /></div><p className="mt-4 font-semibold text-slate-700">No consumer claims yet.</p></div> : filteredClaims.length === 0 ? <p className="py-14 text-center text-slate-500">No claims match your search.</p> : <div className="mt-7 overflow-x-auto rounded-2xl border border-amber-900/45"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="border-b border-amber-900/15 bg-amber-50/70 text-slate-700"><tr><th className="p-4 font-bold">Consumer</th><th className="p-4 font-bold">Food</th><th className="p-4 font-bold">Price / item</th><th className="p-4 font-bold">Qty</th><th className="p-4 font-bold">Amount</th><th className="p-4 font-bold">Claimed</th><th className="p-4 font-bold">Token expires</th><th className="p-4 font-bold">Status</th></tr></thead><tbody>{filteredClaims.map((claim) => <tr key={claim._id} className="border-b border-amber-900/15 transition-colors last:border-0 hover:bg-amber-50/40"><td className="p-4 font-bold text-slate-800">{claim.consumerId?.fullName || 'Consumer unavailable'}</td><td className="p-4 font-medium text-slate-700">{claim.listingId?.foodName || 'Listing unavailable'}</td><td className="p-4 font-semibold text-slate-700">&#8377;{Number(claim.listingId?.discountedPrice || 0).toFixed(2)}</td><td className="p-4 text-slate-600">{claim.quantity}</td><td className="p-4 font-extrabold text-amber-700">&#8377;{(Number(claim.listingId?.discountedPrice || 0) * Number(claim.quantity || 0)).toFixed(2)}</td><td className="p-4 text-slate-600">{formatIndianDateTime(claim.createdAt)} IST</td><td className="p-4 text-slate-600">{formatIndianDateTime(claim.tokenExpiresAt || claim.listingId?.expiryTime)} IST</td><td className="p-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(claim.status)}`}>{claim.status}</span></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  </div>;
};

export default MerchantHistory;
