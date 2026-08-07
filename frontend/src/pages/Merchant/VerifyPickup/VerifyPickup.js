import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { FaBars, FaBoxOpen, FaCheckCircle, FaClipboardList, FaHistory, FaHome, FaInfoCircle, FaPlus, FaQrcode, FaSignOutAlt, FaStore, FaTimes, FaUser, FaLeaf } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { formatIndianDateTime, formatIndianTime } from '../../../utils/formatDate';

const navItems = [{ path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> }, { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> }, { path: '/merchant/inventory', label: 'Inventory', icon: <FaBoxOpen /> }, { path: '/merchant/verify-pickup', label: 'Verify pickup', icon: <FaClipboardList /> }, { path: '/merchant/history', label: 'History', icon: <FaHistory /> }, { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> }];

const ReservationDetails = ({ claim }) => <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white/80 text-slate-700"><h2 className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-base font-extrabold text-emerald-800">🍽️ Reservation Details</h2><table className="w-full border-collapse text-sm"><tbody><tr className="border-b border-slate-100"><td className="px-4 py-2.5 font-bold">Food Item:</td><td className="px-4 py-2.5">{claim.listingName}</td></tr><tr className="border-b border-slate-100"><td className="px-4 py-2.5 font-bold">Quantity:</td><td className="px-4 py-2.5">{claim.quantity}</td></tr><tr className="border-b border-slate-100"><td className="px-4 py-2.5 font-bold">Price per Item:</td><td className="px-4 py-2.5">₹{Number(claim.pricePerItem || 0).toFixed(2)}</td></tr><tr className="border-b border-slate-100"><td className="px-4 py-2.5 font-bold">Total Amount:</td><td className="px-4 py-2.5">₹{Number(claim.totalAmount || 0).toFixed(2)}</td></tr><tr className="border-b border-slate-100"><td className="px-4 py-2.5 font-bold">Pickup Time:</td><td className="px-4 py-2.5">{formatIndianTime(claim.pickupStart)} - {formatIndianTime(claim.pickupEnd)}</td></tr><tr><td className="px-4 py-2.5 font-bold">Pickup Token Expires At:</td><td className="px-4 py-2.5">{formatIndianDateTime(claim.tokenExpiresAt)} IST</td></tr></tbody></table></div>;

const MerchantVerifyPickup = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stats, setStats] = useState({ orders: 0, completedOrders: 0, activeListings: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const scannerRef = useRef(null);
  const scanProcessingRef = useRef(false);

  const refreshStats = () => api.get('/merchant/dashboard-stats').then((response) => setStats((current) => ({ ...current, ...(response.data.stats || {}) }))).catch(() => {});

  useEffect(() => {
    refreshStats();
    return () => {
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  const verifyToken = async (pickupToken, { showSuccessAlert = false } = {}) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await api.post('/claims/verify', { token: pickupToken });
      setResult({ type: 'success', message: response.data.message, claim: response.data.claim });
      setToken('');
      refreshStats();
      if (showSuccessAlert) {
        await Swal.fire({
          icon: 'success',
          title: 'Pickup Collected',
          text: 'The pickup has been successfully collected.',
          confirmButtonColor: '#059669',
        });
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.code === 'TOKEN_EXPIRED') {
        await Swal.fire({ icon: 'error', title: 'Token expired', html: `<p>This pickup token expired at <strong>${formatIndianDateTime(responseData.expiryTime)} IST</strong>.</p><p>It can no longer be used.</p>`, confirmButtonColor: '#d97706' });
      } else if (responseData?.message === 'This pickup has already been collected.') {
        await Swal.fire({
          icon: 'info',
          title: 'Already collected',
          text: responseData.message,
          confirmButtonColor: '#d97706',
        });
      }
      setResult({ type: 'error', message: responseData?.message || 'Unable to verify this pickup token.' });
    } finally {
      setLoading(false);
    }
  };

  const verifyPickup = async (event) => {
    event.preventDefault();
    verifyToken(token, { showSuccessAlert: true });
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop();
    setScanning(false);
  };

  const startScanner = async () => {
    setCameraError('');
    setResult(null);
    setScanning(true);
    // Let React mount the scanner container before html5-qrcode accesses it.
    window.setTimeout(async () => {
      try {
        const scanner = scannerRef.current || new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (scanProcessingRef.current) return;
            scanProcessingRef.current = true;
            try {
              const payload = JSON.parse(decodedText);
              if (!payload?.claimId || typeof payload.pickupCode !== 'string' || !payload.pickupCode.trim()) {
                throw new Error('This QR code is not a valid Stock2Serve pickup code.');
              }
              await stopScanner();
              await verifyToken(payload.pickupCode, { showSuccessAlert: true });
            } catch (error) {
              setResult({ type: 'error', message: error.message || 'Unable to read this QR code.' });
            } finally {
              scanProcessingRef.current = false;
            }
          },
          () => {},
        );
      } catch (error) {
        setCameraError(error?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access and try again, or use the pickup code below.'
          : 'Unable to start the camera. Check that a camera is available, then try again or use the pickup code.');
        setScanning(false);
      }
    }, 0);
  };

  const logoutAndLeave = async () => {
    if (await logout()) navigate('/login');
  };

  return <div className="app-shell min-h-screen bg-stone-50">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-4"><button className="text-2xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold md:text-1xl">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Welcome, {user?.fullName}</p></div></div><div className="hidden items-center gap-2 md:flex">{navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}<button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt /> Logout</button></div><button onClick={logoutAndLeave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12"><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Pickup desk</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Verify a pickup</h1><p className="mt-1 text-amber-900 font-extrabold">Confirm a customer token before handing over their order.</p></div><Link to="/merchant/history" className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-amber-50"><FaHistory className="text-amber-600" /> View claim history</Link></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"><section className="rounded-3xl border border-amber-900/35 bg-white p-6 shadow-xl shadow-slate-900/[0.05] md:p-8"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700"><FaQrcode /></div><h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">Scan a pickup QR code</h2><p className="mt-2 max-w-xl text-slate-500">Scan the customer’s QR code to verify it using the existing pickup verification flow.</p><div className="mt-6 max-w-2xl"><div id="qr-reader" className={scanning ? 'overflow-hidden rounded-2xl border border-amber-200' : 'hidden'} />{cameraError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{cameraError}</p>}<div className="mt-4 flex gap-3"><button type="button" onClick={scanning ? stopScanner : startScanner} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><FaQrcode /> {scanning ? 'Stop scanner' : 'Scan QR'}</button></div></div><div className="my-8 max-w-2xl border-t border-slate-200" /><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Or enter the pickup code</h2><p className="mt-2 max-w-xl text-slate-500">Manual verification remains available if the QR cannot be scanned.</p><form onSubmit={verifyPickup} className="mt-5 max-w-2xl space-y-4"><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Pickup code</span><input value={token} onChange={(event) => setToken(event.target.value.toUpperCase())} placeholder="e.g. S2S-4HD92" required className="w-full rounded-2xl border border-amber-900/25 bg-white px-4 py-4 font-mono tracking-[0.16em] uppercase outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" /></label><button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700 disabled:opacity-60"><FaCheckCircle /> {loading ? 'Verifying...' : 'Mark as collected'}</button></form>{result && <div className={`mt-6 rounded-2xl border p-4 ${result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="font-bold">{result.message}</p>{result.claim && <><p className="mt-1 text-sm">{result.claim.listingName} - {result.claim.customerName}</p><ReservationDetails claim={result.claim} /></>}</div>}</section>
        <aside className="space-y-6"><section className="rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">At a glance</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-semibold text-slate-600">Awaiting pickup</p><p className="mt-2 text-3xl font-extrabold text-amber-700">{stats.orders}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-slate-600">Collected</p><p className="mt-2 text-3xl font-extrabold text-emerald-700">{stats.completedOrders}</p></div></div><div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><FaStore className="text-amber-600" /><span><b className="text-slate-800">{stats.activeListings}</b> active food listings are available now.</span></div></section><section className="rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05]"><div className="flex items-center gap-2 text-slate-900"><FaInfoCircle className="text-amber-600" /><h2 className="font-extrabold">Quick handover checklist</h2></div><ol className="mt-4 space-y-3 text-sm leading-5 text-slate-600"><li><span className="mr-2 font-bold text-amber-700">1.</span>Ask the customer for their pickup token.</li><li><span className="mr-2 font-bold text-amber-700">2.</span>Match the token to the food order before handing it over.</li><li><span className="mr-2 font-bold text-amber-700">3.</span>Mark it collected only after the handover is complete.</li></ol></section></aside></div>
    </main>
  </div>;
};

export default MerchantVerifyPickup;
