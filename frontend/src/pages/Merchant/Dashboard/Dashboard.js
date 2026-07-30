import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBoxOpen, FaClipboardList, FaDollarSign, FaHistory, FaHome, FaPlus, FaRecycle, FaSignOutAlt, FaStore, FaTimes, FaUser } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const navItems = [
  { path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> },
  { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> },
  { path: '/merchant/inventory', label: 'Inventory', icon: <FaBoxOpen /> },
  { path: '/merchant/verify-pickup', label: 'Verify pickup', icon: <FaClipboardList /> },
  { path: '/merchant/history', label: 'History', icon: <FaHistory /> },
  { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> },
];

const MerchantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ activeListings: 0, orders: 0, completedOrders: 0, revenueRecovered: 0, foodSaved: 0, expiredListings: 0 });
  const totalPickups = stats.orders + stats.completedOrders;
  const collectionRate = totalPickups ? Math.round((stats.completedOrders / totalPickups) * 100) : 0;
  const availabilityRate = stats.activeListings + stats.expiredListings ? Math.round((stats.activeListings / (stats.activeListings + stats.expiredListings)) * 100) : 0;

  useEffect(() => {
    api.get('/merchant/dashboard-stats')
      .then((response) => setStats((previous) => ({ ...previous, ...(response.data.stats || {}) })))
      .catch((error) => console.error('Unable to load merchant dashboard:', error));
  }, []);

  const logoutAndLeave = async () => {
    if (await logout()) navigate('/login');
  };

  return (
    <div className="app-shell min-h-screen bg-stone-50">
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <button className="text-2xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button>
            <div><h1 className="text-xl font-bold md:text-2xl">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Welcome, {user?.fullName}</p></div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}
            <button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt /> Logout</button>
          </div>
          <button onClick={logoutAndLeave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button>
        </div>
        {mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}
      </nav>

      <main className="mx-auto max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Merchant workspace</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Merchant Dashboard</h2><p className="mt-1 text-slate-500">Your end-of-day surplus and pickup activity at a glance.</p></div><Link to="/merchant/add-item" className="inline-flex w-fit items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700"><FaPlus /> Add food item</Link></div>
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard icon={<FaBoxOpen />} iconClass="text-amber-600" label="Active listings" value={stats.activeListings} />
          <StatCard icon={<FaClipboardList />} iconClass="text-emerald-600" label="Awaiting pickup" value={stats.orders} />
          <div className="rounded-2xl bg-white p-6 shadow"><FaPlus className="text-3xl text-blue-600" /><h3 className="mt-4 text-lg font-semibold">New listing</h3><Link to="/merchant/add-item" className="mt-5 block w-full rounded-xl bg-amber-600 px-5 py-3 text-center font-semibold text-white hover:bg-amber-700">Add food</Link></div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<FaClipboardList />} iconClass="text-emerald-600" label="Completed pickups" value={stats.completedOrders} compact />
          <StatCard icon={<FaDollarSign />} iconClass="text-sky-600" label="Revenue recovered" value={`₹${stats.revenueRecovered}`} compact />
          <StatCard icon={<FaRecycle />} iconClass="text-lime-600" label="Food saved" value={stats.foodSaved} compact />
          <StatCard icon={<FaStore />} iconClass="text-amber-700" label="Expired listings" value={stats.expiredListings} compact />
        </div>
        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div className="rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Operational snapshot</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Today&apos;s business health</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">{collectionRate}% collected</span></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><div className="flex justify-between text-sm font-semibold text-slate-700"><span>Pickup completion</span><span>{stats.completedOrders} of {totalPickups || 0}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${collectionRate}%` }} /></div><p className="mt-2 text-sm text-slate-500">Completed pickups from all recorded claims.</p></div><div><div className="flex justify-between text-sm font-semibold text-slate-700"><span>Listing availability</span><span>{availabilityRate}% active</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${availabilityRate}%` }} /></div><p className="mt-2 text-sm text-slate-500">Active listings compared with expired ones.</p></div></div></div><div className="rounded-3xl border border-amber-900/25 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-xl shadow-slate-900/[0.05]"><FaRecycle className="text-3xl text-amber-600" /><p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-amber-700">Impact so far</p><p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{stats.foodSaved}</p><p className="mt-1 text-sm text-slate-600">food portions saved from going to waste.</p><p className="mt-5 border-t border-amber-200 pt-4 text-sm font-semibold text-amber-800">&#8377;{stats.revenueRecovered} recovered through surplus sales</p></div></section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05]">
          <div><h3 className="text-xl font-bold">Food inventory</h3><p className="mt-1 text-sm text-slate-500">Search, update, activate, or remove food listings from the dedicated inventory page.</p></div>
          <Link to="/merchant/inventory" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"><FaBoxOpen /> View inventory</Link>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, iconClass, label, value, compact = false }) => <div className={`rounded-2xl bg-white shadow ${compact ? 'p-5' : 'p-6'}`}><div className={`text-2xl ${iconClass}`}>{icon}</div><h3 className={`mt-3 font-semibold text-slate-600 ${compact ? 'text-sm' : 'text-lg'}`}>{label}</h3><p className="mt-2 text-3xl font-bold">{value}</p></div>;

export default MerchantDashboard;
