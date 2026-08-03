import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowDown, FaArrowUp, FaBars, FaBolt, FaBoxOpen, FaChartLine,
  FaCheckCircle, FaClipboardList, FaClock, FaCloud, FaDownload, FaFileExport,
  FaHistory, FaHome, FaLeaf, FaPlus, FaRecycle, FaSearch, FaSignOutAlt,
  FaStore, FaTimes, FaUser,
} from 'react-icons/fa';
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

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);
const formatCurrency = (value) => `₹${formatNumber(value)}`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

const TrendAreaChart = ({ values }) => {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const maximum = Math.max(...safeValues, 1);
  const points = safeValues.map((value, index) => ({ x: (index / Math.max(safeValues.length - 1, 1)) * 700, y: 202 - ((value / maximum) * 166) }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L700 230 L0 230 Z`;
  return <svg viewBox="0 0 700 230" className="h-56 w-full" preserveAspectRatio="none" aria-label="Revenue trend chart"><defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f59e0b" stopOpacity=".34" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></linearGradient></defs>{[40, 80, 120, 160, 200].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />)}<path d={area} fill="url(#revenueFill)" /><path d={line} fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" /></svg>;
};

const Sparkline = ({ color = '#f59e0b', points = [9, 13, 10, 18, 15, 23, 26] }) => {
  const max = Math.max(...points, 1);
  const coordinates = points.map((point, index) => `${(index / (points.length - 1)) * 100},${38 - ((point / max) * 30)}`).join(' ');
  return <svg viewBox="0 0 100 42" className="h-10 w-24 overflow-visible" aria-hidden="true"><polyline points={coordinates} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d={`M0,42 L${coordinates.replaceAll(' ', ' L')} L100,42 Z`} fill={color} opacity="0.08" /></svg>;
};

const MiniBars = ({ values, color = 'bg-amber-500' }) => <div className="flex h-36 items-end gap-2 pt-5">{values.map((value, index) => <div key={index} className="group flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-md ${color} ${index === values.length - 1 ? 'opacity-100' : 'opacity-60'} transition-all duration-300 group-hover:opacity-100`} style={{ height: `${value}%` }} /><span className="text-[10px] font-medium text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index] || index + 1}</span></div>)}</div>;

const Ring = ({ value, label, color = '#f59e0b' }) => <div className="relative grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value}%, #f1f5f9 ${value}% 100%)` }}><div className="grid h-[5.35rem] w-[5.35rem] place-items-center rounded-full bg-white text-center"><strong className="text-xl text-slate-900">{value}</strong><span className="-mt-1 text-[10px] font-bold text-slate-400">{label}</span></div></div>;

const PickupStatusChart = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const gradient = total ? `conic-gradient(${items.map((item) => { const next = offset + ((item.value / total) * 100); const segment = `${item.hex} ${offset}% ${next}%`; offset = next; return segment; }).join(', ')})` : 'conic-gradient(#e2e8f0 0 100%)';
  return <div className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full" style={{ background: gradient }}><div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><strong className="text-2xl font-extrabold text-slate-900">{formatNumber(total)}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">pickups</span></div></div>;
};

const KpiCard = ({ title, value, icon, tone, trend = 0, subtext, points }) => {
  const up = trend >= 0;
  return <article className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_42px_-24px_rgba(15,23,42,0.28)]"><div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-amber-100/60 to-transparent blur-2xl" /><div className="relative flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone} text-lg shadow-sm`}>{icon}</div><Sparkline color={tone.includes('emerald') ? '#10b981' : tone.includes('sky') ? '#0ea5e9' : tone.includes('rose') ? '#f43f5e' : '#f59e0b'} points={points} /></div><p className="relative mt-5 text-sm font-semibold text-slate-500">{title}</p><div className="relative mt-1 flex items-end justify-between gap-2"><p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p><span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{up ? <FaArrowUp /> : <FaArrowDown />}{Math.abs(trend)}%</span></div><p className="relative mt-2 text-xs text-slate-400">{subtext || 'compared with prior period'}</p></article>;
};

const MerchantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState('Monthly');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [allStats, setAllStats] = useState({ activeListings: 0, orders: 0, completedOrders: 0, revenueRecovered: 0, foodSaved: 0, expiredListings: 0 });
  const [records, setRecords] = useState({ listings: [], claims: [] });

  useEffect(() => {
    Promise.all([api.get('/merchant/dashboard-stats'), api.get('/merchant/listings'), api.get('/merchant/claim-history')])
      .then(([statsResponse, listingsResponse, claimsResponse]) => {
        setAllStats((previous) => ({ ...previous, ...(statsResponse.data.stats || {}) }));
        setRecords({ listings: listingsResponse.data.listings || [], claims: claimsResponse.data.claims || [] });
      })
      .catch((error) => console.error('Unable to load merchant dashboard:', error))
      .finally(() => setLoading(false));
  }, []);

  const { stats, analytics } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === 'Weekly') start.setDate(start.getDate() - 6);
    if (period === 'Monthly') start.setDate(start.getDate() - 29);
    if (period === 'Yearly') start.setMonth(start.getMonth() - 11);
    const withinPeriod = (date) => date && new Date(date) >= start && new Date(date) <= now;
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const periodListings = records.listings.filter((listing) => {
      const matchesPeriod = withinPeriod(listing.createdAt);
      if (!matchesPeriod) return false;
      if (!normalizedSearch) return true;
      const searchableText = [listing.foodName, listing.category, listing.merchantId?.shopName, listing.merchantId?.city, listing.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
    const periodClaims = records.claims.filter((claim) => {
      const matchesPeriod = withinPeriod(claim.collectedAt || claim.createdAt);
      if (!matchesPeriod) return false;
      if (!normalizedSearch) return true;
      const searchableText = [claim.listingId?.foodName, claim.listingId?.merchantId?.shopName, claim.consumerId?.fullName, claim.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
    const hasHistory = records.listings.length || records.claims.length;
    const derived = hasHistory ? {
      activeListings: periodListings.filter((listing) => listing.status === 'active' && listing.availableStatus).length,
      orders: periodClaims.filter((claim) => claim.status === 'claimed').length,
      completedOrders: periodClaims.filter((claim) => claim.status === 'collected').length,
      revenueRecovered: periodClaims.filter((claim) => claim.status === 'collected').reduce((sum, claim) => sum + ((Number(claim.listingId?.discountedPrice) || 0) * (Number(claim.quantity) || 1)), 0),
      foodSaved: periodClaims.filter((claim) => claim.status === 'collected').reduce((sum, claim) => sum + (Number(claim.quantity) || 1), 0),
      // Listings are hidden from consumers once expiryTime passes, but older
      // records are not always persisted with status: "expired". Calculate
      // expiry from the authoritative timestamp so dashboard history remains
      // accurate without changing listing or claim behavior.
      expiredListings: periodListings.filter((listing) => listing.status === 'expired' || (listing.expiryTime && new Date(listing.expiryTime) <= now)).length,
    } : allStats;
    const bucketCount = 7;
    const bucketSize = period === 'Yearly' ? 52 : period === 'Monthly' ? 5 : 1;
    const revenueSeries = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start); bucketStart.setDate(bucketStart.getDate() + (index * bucketSize));
      const bucketEnd = new Date(bucketStart); bucketEnd.setDate(bucketEnd.getDate() + bucketSize);
      return periodClaims.filter((claim) => { const date = new Date(claim.collectedAt || claim.createdAt); return date >= bucketStart && date < bucketEnd && claim.status === 'collected'; }).reduce((sum, claim) => sum + ((Number(claim.listingId?.discountedPrice) || 0) * (Number(claim.quantity) || 1)), 0);
    });
    const foodSeries = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start); bucketStart.setDate(bucketStart.getDate() + (index * bucketSize));
      const bucketEnd = new Date(bucketStart); bucketEnd.setDate(bucketEnd.getDate() + bucketSize);
      return periodClaims.filter((claim) => { const date = new Date(claim.collectedAt || claim.createdAt); return date >= bucketStart && date < bucketEnd && claim.status === 'collected'; }).reduce((sum, claim) => sum + (Number(claim.quantity) || 1), 0);
    });
    const completedClaims = periodClaims.filter((claim) => claim.status === 'collected');
    const revenueByDay = completedClaims.reduce((totals, claim) => {
      const day = new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date(claim.collectedAt || claim.createdAt));
      totals[day] = (totals[day] || 0) + ((Number(claim.listingId?.discountedPrice) || 0) * (Number(claim.quantity) || 1));
      return totals;
    }, {});
    const bestRevenueDay = Object.entries(revenueByDay).sort(([, first], [, second]) => second - first)[0]?.[0] || 'No completed pickups';
    const claimsByHour = periodClaims.reduce((totals, claim) => {
      const hour = new Date(claim.createdAt).getHours(); totals[hour] = (totals[hour] || 0) + 1; return totals;
    }, {});
    const peakHour = Object.entries(claimsByHour).sort(([, first], [, second]) => second - first)[0]?.[0];
    const peakPickupHour = peakHour === undefined ? 'No pickup data' : new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(2000, 0, 1, Number(peakHour)));
    const categoryTotals = periodListings.reduce((totals, listing) => { const category = listing.category || 'other'; totals[category] = (totals[category] || 0) + (Number(listing.quantity) || 0); return totals; }, {});
    const categoryColors = ['bg-amber-500', 'bg-emerald-500', 'bg-sky-400', 'bg-violet-400'];
    const categoryHex = ['#f59e0b', '#10b981', '#38bdf8', '#a78bfa'];
    const categoryEntries = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first).slice(0, 4);
    const categoryTotal = categoryEntries.reduce((sum, [, amount]) => sum + amount, 0);
    const categories = categoryEntries.length ? categoryEntries.map(([category, amount], index) => ({ label: category.replace(/\b\w/g, (letter) => letter.toUpperCase()), value: categoryTotal ? Math.round((amount / categoryTotal) * 100) : 0, color: categoryColors[index], hex: categoryHex[index] })) : [{ label: 'No listings in period', value: 100, color: 'bg-slate-300', hex: '#cbd5e1' }];
    let categoryOffset = 0;
    const categoryGradient = `conic-gradient(${categories.map((category) => { const next = categoryOffset + category.value; const segment = `${category.hex} ${categoryOffset}% ${next}%`; categoryOffset = next; return segment; }).join(', ')})`;
    const relativeTime = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
    const timeline = [
      ...periodListings.map((listing) => ({ event: `Listing added: ${listing.foodName || 'Food item'}`, timestamp: listing.createdAt, color: 'bg-amber-500' })),
      ...periodClaims.map((claim) => ({ event: claim.status === 'collected' ? 'Pickup completed successfully' : claim.status === 'claimed' ? 'New customer claim received' : `Claim ${claim.status}`, timestamp: claim.collectedAt || claim.createdAt, color: claim.status === 'collected' ? 'bg-emerald-500' : claim.status === 'claimed' ? 'bg-sky-500' : 'bg-slate-400' })),
    ].filter((event) => event.timestamp).sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp)).slice(0, 4).map((event) => ({ ...event, timestamp: relativeTime(event.timestamp) }));
    const totalPickups = derived.orders + derived.completedOrders;
    const collectionRate = totalPickups ? Math.round((derived.completedOrders / totalPickups) * 100) : 0;
    const availabilityRate = derived.activeListings + derived.expiredListings ? Math.round((derived.activeListings / (derived.activeListings + derived.expiredListings)) * 100) : 0;
    const health = Math.round((collectionRate * 0.55) + (availabilityRate * 0.25) + (Math.min(derived.foodSaved, 100) * 0.2));
    const seriesTrend = (series) => series[0] ? Math.round(((series[series.length - 1] - series[0]) / Math.abs(series[0])) * 100) : 0;
    const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const periodLabel = `${dateFormat.format(start)} – ${dateFormat.format(now)}`;
    const expiredClaims = periodClaims.filter((claim) => claim.status === 'expired' || (claim.status === 'claimed' && claim.tokenExpiresAt && new Date(claim.tokenExpiresAt) <= now));
    const pickupStatuses = [
      { label: 'Completed', value: completedClaims.length, color: 'bg-emerald-500', hex: '#10b981' },
      { label: 'Awaiting', value: periodClaims.filter((claim) => claim.status === 'claimed' && !expiredClaims.includes(claim)).length, color: 'bg-amber-400', hex: '#fbbf24' },
      { label: 'Expired', value: expiredClaims.length, color: 'bg-rose-400', hex: '#fb7185' },
    ];
    const topItems = Object.values(periodClaims.reduce((items, claim) => {
      const name = claim.listingId?.foodName || 'Unavailable item';
      const entry = items[name] || { name, category: claim.listingId?.category || 'Other', quantity: 0, pickups: 0 };
      entry.quantity += Number(claim.quantity) || 1;
      entry.pickups += 1;
      items[name] = entry;
      return items;
    }, {})).sort((first, second) => second.pickups - first.pickups || second.quantity - first.quantity || first.name.localeCompare(second.name)).slice(0, 5);
    const comparisonEnd = new Date(now); const comparisonStart = new Date(now); comparisonStart.setDate(comparisonStart.getDate() - 6); comparisonStart.setHours(0, 0, 0, 0);
    const previousComparisonStart = new Date(comparisonStart); previousComparisonStart.setDate(previousComparisonStart.getDate() - 7);
    const inRange = (date, rangeStart, rangeEnd) => date && new Date(date) >= rangeStart && new Date(date) <= rangeEnd;
    const comparisonStats = (rangeStart, rangeEnd) => {
      const listings = records.listings.filter((listing) => inRange(listing.createdAt, rangeStart, rangeEnd));
      const claims = records.claims.filter((claim) => inRange(claim.collectedAt || claim.createdAt, rangeStart, rangeEnd));
      const completed = claims.filter((claim) => claim.status === 'collected');
      return { listings: listings.length, pickups: completed.length, revenue: completed.reduce((sum, claim) => sum + ((Number(claim.listingId?.discountedPrice) || 0) * (Number(claim.quantity) || 1)), 0), portions: completed.reduce((sum, claim) => sum + (Number(claim.quantity) || 1), 0) };
    };
    const currentWeek = comparisonStats(comparisonStart, comparisonEnd); const lastWeek = comparisonStats(previousComparisonStart, new Date(comparisonStart.getTime() - 1));
    const weeklyComparison = [
      ['Total listings', currentWeek.listings, lastWeek.listings, false],
      ['Completed pickups', currentWeek.pickups, lastWeek.pickups, false],
      ['Revenue recovered', currentWeek.revenue, lastWeek.revenue, true],
      ['Food saved (portions)', currentWeek.portions, lastWeek.portions, false],
    ].map(([label, current, previous, currency]) => ({ label, current, previous, currency, change: previous ? ((current - previous) / previous) * 100 : null }));
    return { stats: derived, analytics: { totalPickups, collectionRate, availabilityRate, health: Math.min(100, health || 0), revenueSeries, foodSeries, bestRevenueDay, peakPickupHour, categories, categoryGradient, timeline, periodLabel, revenueTrend: seriesTrend(revenueSeries), foodTrend: seriesTrend(foodSeries), pickupStatuses, topItems, weeklyComparison } };
  }, [allStats, period, records, search]);

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const logoutAndLeave = async () => { if (await logout()) navigate('/login'); };
  const aiRecommendation = (() => {
    if (stats.activeListings === 0) return { title: 'Add fresh inventory', message: `There are no active listings in this ${period.toLowerCase()} view. Add a food item to help nearby customers discover your surplus.`, action: 'Add food now', to: '/merchant/add-item' };
    if (stats.expiredListings > 0 && stats.expiredListings >= stats.completedOrders) return { title: 'Reduce expiry risk', message: `${formatNumber(stats.expiredListings)} listing(s) expired in this period. Publish food closer to your pickup window and review inventory timing.`, action: 'Review inventory', to: '/merchant/inventory' };
    if (analytics.totalPickups > 0 && analytics.collectionRate < 80) return { title: 'Improve pickup conversion', message: `Your pickup completion is ${analytics.collectionRate}%. Verify pending orders early and encourage customers to collect before the window closes.`, action: 'Verify pickups', to: '/merchant/verify-pickup' };
    return { title: 'Build on your momentum', message: `Your ${period.toLowerCase()} performance is healthy. Upload fresh surplus food between 5:30–6:30 PM to reach shoppers before peak pickup time.`, action: 'Add food now', to: '/merchant/add-item' };
  })();
  const exportReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    // Keep the printable report isolated while retaining a writable window
    // reference for browsers that do not support writing to noopener windows.
    reportWindow.opener = null;
    const generatedAt = new Date().toLocaleString('en-IN');
    const pickupInsight = analytics.collectionRate >= 80 ? 'Pickup fulfilment is excellent. Keep your current pickup-window strategy.' : 'Pickup completion has room to grow. Send customers a reminder before the pickup window closes.';
    const inventoryInsight = stats.expiredListings > 0 ? `${formatNumber(stats.expiredListings)} listing(s) expired in this period. Consider publishing those items closer to the evening pickup peak.` : 'No expired listings were recorded in this period — excellent inventory timing.';
    reportWindow.document.write(`<!doctype html>
<html><head><title>Stock2Serve ${period} Report</title><style>
*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#172033;margin:0;background:#f4f7fb;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover{min-height:330px;padding:54px 62px;color:white;background:radial-gradient(circle at 88% 20%,#fde68a55 0 12%,transparent 13%),radial-gradient(circle at 78% 78%,#fff3 0 10%,transparent 11%),linear-gradient(135deg,#78350f,#d97706 54%,#f59e0b)}.brand{font-size:18px;font-weight:900;letter-spacing:-.6px}.brand span{color:#fef3c7}.tag{display:inline-block;margin-top:42px;border:1px solid #fff5;border-radius:99px;padding:7px 12px;background:#fff2;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase}.cover h1{max-width:520px;margin:17px 0 10px;font-size:42px;line-height:1.06;letter-spacing:-1.8px}.cover p{margin:0;color:#fff7d6;font-size:14px}.content{max-width:1000px;margin:-38px auto 0;padding:0 34px 44px}.summary{padding:26px;border:1px solid #fff;border-radius:22px;background:#fff;box-shadow:0 18px 50px #1720331c}.eyebrow{margin:0;color:#b45309;font-size:11px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase}.section-title{margin:7px 0 0;font-size:24px;letter-spacing:-.7px}.lede{margin:9px 0 0;color:#64748b;font-size:14px;line-height:1.55}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:22px}.card{min-height:122px;padding:17px;border:1px solid #eef2f7;border-radius:16px;background:linear-gradient(145deg,#fff,#f8fafc)}.card:nth-child(1){background:linear-gradient(145deg,#fff7ed,#fff)}.card:nth-child(2){background:linear-gradient(145deg,#ecfdf5,#fff)}.card:nth-child(3){background:linear-gradient(145deg,#eff6ff,#fff)}.label{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:.7px}.value{margin-top:11px;font-size:27px;font-weight:900;letter-spacing:-1px;color:#0f172a}.caption{margin-top:6px;color:#94a3b8;font-size:11px}.two{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;margin-top:20px}.section{padding:23px;border-radius:20px;background:#fff;box-shadow:0 12px 35px #17203310}.section h2{margin:0;font-size:19px;letter-spacing:-.4px}.metric{display:flex;justify-content:space-between;margin-top:18px;color:#475569;font-size:13px;font-weight:700}.metric b{color:#0f172a}.bar{height:11px;margin:8px 0 15px;overflow:hidden;border-radius:99px;background:#eaf0f6}.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#f59e0b,#fb923c)}.bar.green i{background:linear-gradient(90deg,#10b981,#34d399)}.score{display:grid;min-height:214px;place-items:center;text-align:center;color:#fff;border-radius:20px;background:linear-gradient(145deg,#0f172a,#334155)}.score-ring{display:grid;width:104px;height:104px;place-items:center;border:9px solid #fbbf24;border-radius:50%;box-shadow:inset 0 0 0 9px #ffffff18}.score strong{font-size:31px}.score span{display:block;margin-top:3px;color:#cbd5e1;font-size:10px;font-weight:800;text-transform:uppercase}.insights{margin-top:20px;padding:25px;border-radius:20px;background:linear-gradient(120deg,#fff7ed,#fff 54%,#ecfdf5)}.insight-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px}.insight{padding:15px;border:1px solid #fed7aa;background:#fff;border-radius:14px}.insight:nth-child(2){border-color:#bbf7d0}.insight h3{margin:0 0 7px;color:#92400e;font-size:12px}.insight:nth-child(2) h3{color:#047857}.insight p{margin:0;color:#475569;font-size:12px;line-height:1.5}.footer{margin-top:24px;text-align:center;color:#94a3b8;font-size:10px}@media(max-width:650px){.cover{padding:38px 28px}.cover h1{font-size:32px}.content{margin:-20px auto 0;padding:0 16px 28px}.grid,.two,.insight-grid{grid-template-columns:1fr}.card{min-height:auto}}@media print{body{background:#fff}.cover{min-height:280px}.content{padding:0 22px 22px}.summary,.section,.insights{break-inside:avoid}.footer{position:fixed;bottom:8px;left:0;right:0}}
</style></head><body>
<section class="cover"><div class="brand">STOCK2<span>SERVE</span></div><div class="tag">Merchant intelligence report</div><h1>Your ${period.toLowerCase()} business impact, made visible.</h1><p>${escapeHtml(user?.shopName || user?.fullName || 'Merchant')} &nbsp;·&nbsp; Generated ${escapeHtml(generatedAt)}</p></section>
<main class="content"><section class="summary"><p class="eyebrow">Executive summary</p><h2 class="section-title">A clear view of your food-rescue performance</h2><p class="lede">During this ${period.toLowerCase()} reporting period, Stock2Serve helped recover <b>${formatCurrency(stats.revenueRecovered)}</b> in value while redirecting <b>${formatNumber(stats.foodSaved)} food portions</b> from waste.</p><div class="grid"><div class="card"><div class="label">Revenue recovered</div><div class="value">${formatCurrency(stats.revenueRecovered)}</div><div class="caption">From completed pickups</div></div><div class="card"><div class="label">Food saved</div><div class="value">${formatNumber(stats.foodSaved)}</div><div class="caption">Portions rescued</div></div><div class="card"><div class="label">Completed pickups</div><div class="value">${formatNumber(stats.completedOrders)}</div><div class="caption">Customer handovers</div></div><div class="card"><div class="label">Active listings</div><div class="value">${formatNumber(stats.activeListings)}</div><div class="caption">Created in this period</div></div><div class="card"><div class="label">Expired listings</div><div class="value">${formatNumber(stats.expiredListings)}</div><div class="caption">Opportunity to improve</div></div><div class="card"><div class="label">CO₂ impact</div><div class="value">${(stats.foodSaved * 0.7).toFixed(1)} kg</div><div class="caption">Estimated emissions avoided</div></div></div></section><div class="two"><section class="section"><p class="eyebrow">Pickup analytics</p><h2>Operational health</h2><div class="metric"><span>Pickup completion</span><b>${analytics.collectionRate}%</b></div><div class="bar green"><i style="width:${analytics.collectionRate}%"></i></div><div class="metric"><span>Listing availability</span><b>${analytics.availabilityRate}%</b></div><div class="bar"><i style="width:${analytics.availabilityRate}%"></i></div><p class="lede">${pickupInsight}</p></section><section class="score"><div class="score-ring"><div><strong>${analytics.health}</strong><span>out of 100</span></div></div><div><b>Merchant Performance Score</b><span>Based on pickups, availability & impact</span></div></section></div><section class="insights"><p class="eyebrow">Stock2Serve business insights</p><h2 class="section-title">Recommended next actions</h2><div class="insight-grid"><article class="insight"><h3>Inventory timing</h3><p>${inventoryInsight}</p></article><article class="insight"><h3>Growth opportunity</h3><p>Publishing fresh listings before your evening pickup window can improve visibility and help convert more surplus stock.</p></article></div></section><p class="footer">STOCK2SERVE · ${period} Merchant Executive Report · Confidential business analytics</p></main></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
    setTimeout(() => reportWindow.print(), 300);
  };
  const kpis = [
    { title: 'Active listings', value: formatNumber(stats.activeListings), icon: <FaBoxOpen />, tone: 'bg-amber-100 text-amber-700', trend: analytics.foodTrend, points: analytics.foodSeries },
    { title: 'Awaiting pickup', value: formatNumber(stats.orders), icon: <FaClock />, tone: 'bg-violet-100 text-violet-700', trend: -analytics.collectionRate, points: analytics.foodSeries },
    { title: 'Completed pickups', value: formatNumber(stats.completedOrders), icon: <FaCheckCircle />, tone: 'bg-emerald-100 text-emerald-700', trend: analytics.collectionRate, points: analytics.foodSeries },
    { title: 'Revenue recovered', value: formatCurrency(stats.revenueRecovered), icon: <FaChartLine />, tone: 'bg-sky-100 text-sky-700', trend: analytics.revenueTrend, points: analytics.revenueSeries },
    { title: 'Food saved', value: formatNumber(stats.foodSaved), icon: <FaRecycle />, tone: 'bg-lime-100 text-lime-700', trend: analytics.foodTrend, points: analytics.foodSeries },
    { title: 'Expired listings', value: formatNumber(stats.expiredListings), icon: <FaStore />, tone: 'bg-rose-100 text-rose-700', trend: -analytics.availabilityRate, points: analytics.foodSeries },
  ];

  return <div className="app-shell min-h-screen bg-[#f8fafc]">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="text-xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button><div className="flex items-center gap-2.5"><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold tracking-tight text-slate-900">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Merchant analytics</p></div></div></div><div className="hidden items-center gap-1 md:flex">{navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${location.pathname === item.path ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}<button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"><FaSignOutAlt />Logout</button></div><button aria-label="Log out" onClick={logoutAndLeave} className="rounded-xl bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}</nav>

    <main className="mx-auto max-w-[1600px] space-y-6 p-4 pb-12 md:p-6">
      <section className="rounded-[28px] border border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/70 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)] md:p-7"><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live business overview</div><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.fullName?.split(' ')[0] || 'Merchant'}.</h2><p className="mt-2 text-sm text-slate-500">{today} <span className="mx-2 text-slate-300">•</span> Last synced just now</p></div><div className="flex flex-wrap items-center gap-3"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none"><option>Weekly</option><option>Monthly</option><option>Yearly</option></select><button type="button" onClick={exportReport} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-amber-200 hover:bg-amber-50"><FaFileExport className="text-amber-600" />Export report</button></div></div></section>

      <section className="grid gap-5 xl:grid-cols-[1fr_300px]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{loading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-3xl bg-white" />) : kpis.map((card) => <KpiCard key={card.title} {...card} />)}</div><aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/15"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Business health</p><h3 className="mt-1 text-lg font-bold">Performance score</h3></div><FaBolt className="text-amber-300" /></div><div className="mt-6 flex items-center justify-center"><Ring value={analytics.health} label="/ 100" color="#fbbf24" /></div><div className="mt-6 space-y-4">{[['Pickup efficiency', analytics.collectionRate], ['Listing availability', analytics.availabilityRate], ['Waste reduction', Math.min(100, stats.foodSaved)]].map(([label, value]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-300"><span>{label}</span><span>{value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-amber-400" style={{ width: `${value}%` }} /></div></div>)}</div></aside></section>

      <DashboardExtras analytics={analytics} period={period} />

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Revenue analytics</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Revenue recovery trend</h3><p className="mt-1 text-sm text-slate-500">{period} performance from collected surplus food</p></div><span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Live period data</span></div><div className="mt-7 rounded-2xl bg-gradient-to-b from-amber-50/70 to-white px-3 pt-2"><TrendAreaChart values={analytics.revenueSeries} /><div className="mt-1 flex justify-between px-2 text-xs font-semibold text-slate-400"><span>Start</span><span>Mid period</span><span>Now</span></div></div></article><article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Food impact</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Saved portions trend</h3><MiniBars values={analytics.foodSeries} color="bg-emerald-500" /><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5"><div><p className="text-xs font-semibold text-slate-400">CO₂ saved</p><p className="mt-1 text-xl font-extrabold text-slate-900">{(stats.foodSaved * 0.7).toFixed(1)} kg</p></div><div><p className="text-xs font-semibold text-slate-400">Success rate</p><p className="mt-1 text-xl font-extrabold text-emerald-600">{analytics.collectionRate}%</p></div></div></article></section>

      <section className="grid gap-5 lg:grid-cols-3"><article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] lg:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Operational insights</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">What&apos;s driving your business</h3><p className="mt-1 text-xs font-semibold text-slate-400">{period} · {analytics.periodLabel}</p></div><FaCloud className="text-2xl text-amber-500" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Insight icon={<FaChartLine />} label="Highest revenue day" value={analytics.bestRevenueDay} detail="Based on completed-pickup revenue" /><Insight icon={<FaClock />} label="Peak pickup hour" value={analytics.peakPickupHour} detail="Based on customer claim activity" /><Insight icon={<FaLeaf />} label="Waste prevented" value={`${formatNumber(stats.foodSaved)} portions`} detail={`In the selected ${period.toLowerCase()} period`} /><Insight icon={<FaCheckCircle />} label="Pickup completion" value={`${analytics.collectionRate}%`} detail={`${formatNumber(stats.completedOrders)} completed of ${formatNumber(analytics.totalPickups)} pickups`} /></div></article><article className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-xl shadow-amber-200"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">Stock2Serve insights</p><h3 className="mt-1 text-xl font-extrabold">{aiRecommendation.title}</h3></div><FaBolt className="text-2xl text-amber-100" /></div><p className="mt-5 text-sm leading-6 text-amber-50">{aiRecommendation.message}</p><Link to={aiRecommendation.to} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-orange-700/20 hover:bg-amber-50"><FaPlus />{aiRecommendation.action}</Link></article></section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Category mix</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Food distribution</h3></div><div className="h-16 w-16 rounded-full" style={{ background: analytics.categoryGradient }} /></div><div className="mt-6 space-y-4">{analytics.categories.map((category) => <div key={category.label} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-medium text-slate-600"><i className={`h-2.5 w-2.5 rounded-full ${category.color}`} />{category.label}</span><strong className="text-slate-900">{category.value}%</strong></div>)}</div></article><article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Activity timeline</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Latest business events</h3><div className="mt-6 space-y-5 border-l-2 border-slate-100 pl-5">{analytics.timeline.length ? analytics.timeline.map((item) => <div key={`${item.event}-${item.timestamp}`} className="relative"><span className={`absolute -left-[1.62rem] top-1 h-3 w-3 rounded-full ${item.color} ring-4 ring-white`} /><p className="text-sm font-bold text-slate-700">{item.event}</p><p className="mt-0.5 text-xs text-slate-400">{item.timestamp}</p></div>) : <p className="text-sm text-slate-400">No business activity in this selected period.</p>}</div></article></section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-amber-100 bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Quick actions</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Keep your operation moving</h3></div><div className="flex flex-wrap gap-2"><QuickAction to="/merchant/add-item" icon={<FaPlus />} label="Add food" /><QuickAction to="/merchant/inventory" icon={<FaBoxOpen />} label="Inventory" /><QuickAction to="/merchant/verify-pickup" icon={<FaClipboardList />} label="Verify pickup" /><QuickAction to="/merchant/history" icon={<FaDownload />} label="View history" /></div></section>
    </main>
  </div>;
};

const DashboardExtras = ({ analytics, period }) => <>
  <section className="grid gap-5 xl:grid-cols-2">
    <article className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Pickup status</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Pickup performance</h3><p className="mt-1 text-sm text-slate-500">Status breakdown for the selected {period.toLowerCase()} period.</p><div className="mt-6 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start"><PickupStatusChart items={analytics.pickupStatuses} /><div className="w-full space-y-4">{analytics.pickupStatuses.map((item) => { const percentage = analytics.totalPickups ? Math.round((item.value / analytics.totalPickups) * 100) : 0; return <div key={item.label}><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-slate-600"><i className={`h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}</span><strong className="text-slate-900">{formatNumber(item.value)} <span className="text-xs font-semibold text-slate-400">({percentage}%)</span></strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} /></div></div>; })}</div></div></article>
    <article className="overflow-hidden rounded-3xl border border-white bg-white/85 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><div className="p-6 pb-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Top items</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">Most picked-up food</h3><p className="mt-1 text-sm text-slate-500">Ranked by customer pickups in the selected period.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3">#</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Qty.</th><th className="px-6 py-3 text-right">Pickups</th></tr></thead><tbody>{analytics.topItems.length ? analytics.topItems.map((item, index) => <tr key={item.name} className="border-b border-slate-50 last:border-0"><td className="px-6 py-3.5 font-bold text-slate-400">{index + 1}</td><td className="px-4 py-3.5 font-bold text-slate-700">{item.name}</td><td className="px-4 py-3.5 capitalize text-slate-500">{item.category}</td><td className="px-4 py-3.5 text-right text-slate-600">{formatNumber(item.quantity)}</td><td className="px-6 py-3.5 text-right font-bold text-emerald-600">{formatNumber(item.pickups)}</td></tr>) : <tr><td colSpan="5" className="px-6 py-9 text-center text-sm text-slate-400">No pickup activity in this selected period.</td></tr>}</tbody></table></div></article>
  </section>
  <section className="rounded-3xl border border-white bg-white/85 p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Weekly comparison</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">This week vs last week</h3></div><p className="text-xs font-medium text-slate-400">Rolling 7-day comparison</p></div><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Metric</th><th className="px-4 py-3 text-right">This week</th><th className="px-4 py-3 text-right">Last week</th><th className="px-4 py-3 text-right">Change</th></tr></thead><tbody>{analytics.weeklyComparison.map((item) => <tr key={item.label} className="border-b border-slate-50 last:border-0"><td className="px-4 py-3.5 font-semibold text-slate-700">{item.label}</td><td className="px-4 py-3.5 text-right font-bold text-slate-900">{item.currency ? formatCurrency(item.current) : formatNumber(item.current)}</td><td className="px-4 py-3.5 text-right text-slate-500">{item.currency ? formatCurrency(item.previous) : formatNumber(item.previous)}</td><td className={`px-4 py-3.5 text-right font-bold ${item.change === null ? 'text-slate-400' : item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.change === null ? '—' : <span className="inline-flex items-center gap-1">{item.change >= 0 ? <FaArrowUp /> : <FaArrowDown />}{Math.abs(item.change).toFixed(1)}%</span>}</td></tr>)}</tbody></table></div></section>
</>;

const Insight = ({ icon, label, value, detail }) => <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-amber-600">{icon}<span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span></div><p className="mt-3 text-xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
const QuickAction = ({ to, icon, label }) => <Link to={to} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">{icon}{label}</Link>;

export default MerchantDashboard;
