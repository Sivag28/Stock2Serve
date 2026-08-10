import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBoxOpen, FaClipboardList, FaClock, FaDrumstickBite, FaEdit, FaHistory, FaHome, FaLeaf, FaPlus, FaPowerOff, FaSearch, FaSignOutAlt, FaTimes, FaTrash, FaUser } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import api, { API_URL } from '../../../services/api';
import ProcessingIndicator from '../../../components/ProcessingIndicator/ProcessingIndicator';
import { formatIndianTime } from '../../../utils/formatDate';
import { getDiscountPercentage } from '../../../utils/discount';

const imageUrl = (image) => image || null;

const navItems = [{ path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> }, { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> }, { path: '/merchant/inventory', label: 'Inventory', icon: <FaBoxOpen /> }, { path: '/merchant/verify-pickup', label: 'Verify pickup', icon: <FaClipboardList /> }, { path: '/merchant/history', label: 'History', icon: <FaHistory /> }, { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> }];

const MerchantListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [failedImages, setFailedImages] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchListings = async () => {
    try {
      const response = await api.get('/merchant/listings');
      setListings((response.data.listings || []).map((listing) => ({
        ...listing,
        image: listing.image ? `${API_URL}/api/listings/${listing._id}/image` : null,
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({ icon: 'warning', title: 'Delete this listing?', text: 'This food item will no longer be visible to customers.', showCancelButton: true, confirmButtonText: 'Delete listing', cancelButtonText: 'Keep listing', confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b' });
    if (!confirmation.isConfirmed) return;
    try {
      await api.delete(`/merchant/listing/${id}`);
      await Swal.fire({ icon: 'success', title: 'Listing deleted', text: 'The food item was removed from your inventory.', confirmButtonColor: '#d97706' });
      fetchListings();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Delete failed', text: error.response?.data?.message || 'Unable to delete this listing.', confirmButtonColor: '#d97706' });
    }
  };

  const handleToggleStatus = async (listing) => {
    const nextStatus = listing.availableStatus ? 'deactivated' : 'active';
    try {
      await api.put(`/merchant/listing/${listing._id}`, { availableStatus: !listing.availableStatus, status: nextStatus });
      await Swal.fire({ icon: 'success', title: nextStatus === 'active' ? 'Listing activated' : 'Listing deactivated', text: nextStatus === 'active' ? 'Customers can now claim this item.' : 'Customers can no longer claim this item.', confirmButtonColor: '#d97706' });
      fetchListings();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Status update failed', text: error.response?.data?.message || 'Unable to update this listing.', confirmButtonColor: '#d97706' });
    }
  };

  const renderDiscountBadge = (listing) => {
    const offerPercentage = getDiscountPercentage(listing.originalPrice, listing.discountedPrice);
    return offerPercentage ? <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{offerPercentage} off</span> : null;
  };

  const filteredListings = listings.filter((listing) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [listing.foodName, listing.category, listing.status].filter(Boolean).some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (foodTypeFilter === 'all' || listing.foodType === foodTypeFilter);
  });

  const logoutAndLeave = async () => {
    if (await logout()) navigate('/login');
  };

  return <div className="app-shell min-h-screen bg-stone-50">
    {loading && <ProcessingIndicator message="🍽️ Loading inventory..." />}
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-4"><button className="text-2xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold md:text-1xl">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Welcome, {user?.fullName}</p></div></div><div className="hidden items-center gap-2 md:flex">{navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}<button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt /> Logout</button></div><button onClick={logoutAndLeave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}</nav>
    <main className="mx-auto max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12"><section className="rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05] md:p-8"><div className="flex items-center gap-4"><div className="rounded-2xl bg-amber-100 p-3.5 text-amber-700 shadow-sm"><FaBoxOpen /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Merchant inventory</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Food inventory</h1><p className="mt-1 text-slate-500">Manage your food listings, availability, and pickup windows.</p></div></div>
        <section className="mt-8"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Filter inventory</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Which food type do you want to manage?</h2></div>{foodTypeFilter !== 'all' && <button onClick={() => setFoodTypeFilter('all')} className="text-sm font-semibold text-amber-700 hover:text-amber-800">Show all food</button>}</div><div className="grid gap-4 sm:grid-cols-2"><button onClick={() => setFoodTypeFilter('veg')} className={`group flex min-h-32 items-center gap-5 rounded-3xl border p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${foodTypeFilter === 'veg' ? 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-200' : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 text-emerald-950'}`}><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${foodTypeFilter === 'veg' ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}><FaLeaf /></span><span><span className="block text-xl font-extrabold">Veg</span><span className={`mt-1 block text-sm ${foodTypeFilter === 'veg' ? 'text-emerald-50' : 'text-emerald-800'}`}>Manage vegetarian food listings</span></span></button><button onClick={() => setFoodTypeFilter('non-veg')} className={`group flex min-h-32 items-center gap-5 rounded-3xl border p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${foodTypeFilter === 'non-veg' ? 'border-rose-600 bg-rose-600 text-white shadow-rose-200' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 text-rose-950'}`}><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${foodTypeFilter === 'non-veg' ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'}`}><FaDrumstickBite /></span><span><span className="block text-xl font-extrabold">Non-veg</span><span className={`mt-1 block text-sm ${foodTypeFilter === 'non-veg' ? 'text-rose-50' : 'text-rose-800'}`}>Manage non-vegetarian food listings</span></span></button></div></section></section>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block w-full sm:max-w-md"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food, category, or status" className="w-full rounded-2xl border border-amber-900 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-amber-500" /></label><Link to="/merchant/add-item" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700"><FaPlus /> Add food item</Link></div>
      {loading ? <div className="mt-6 rounded-3xl border border-amber-900/25 bg-white p-12 text-center text-slate-500">Loading listings...</div> : listings.length === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-amber-900/30 bg-white p-12 text-center text-slate-500">No food listings available yet.</div> : filteredListings.length === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-amber-900/30 bg-white p-12 text-center text-slate-500">No food listings match your current filters.</div> : <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{filteredListings.map((listing) => <article key={listing._id} className="group overflow-hidden rounded-3xl border border-amber-900 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"><div className="relative h-52 overflow-hidden bg-amber-50">{listing.image && !failedImages[listing._id] ? <img src={imageUrl(listing.image)} alt={listing.foodName} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={() => setFailedImages((current) => ({ ...current, [listing._id]: true }))} /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-50 text-5xl text-amber-400"><FaBoxOpen /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold tracking-tight text-slate-900">{listing.foodName}</h3><p className="mt-1 text-sm font-medium capitalize text-slate-500">{listing.category || 'General'}</p>{renderDiscountBadge(listing)}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${listing.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{listing.status}</span></div><div className="mt-4 space-y-2 border-t border-amber-900/10 pt-4 text-sm text-slate-600"><p className="font-extrabold text-amber-700">&#8377;{listing.discountedPrice} <span className="font-medium text-slate-400 line-through">&#8377;{listing.originalPrice}</span></p><p>{listing.quantity} left</p><p className="flex items-center gap-2 text-amber-700"><FaClock />Pickup {formatIndianTime(listing.pickupStart)} - {formatIndianTime(listing.pickupEnd)} IST</p></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => navigate(`/merchant/edit-item/${listing._id}`, { state: { listing } })} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"><FaEdit /> Edit</button><button onClick={() => handleDelete(listing._id)} className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"><FaTrash /> Delete</button><button onClick={() => handleToggleStatus(listing)} className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200"><FaPowerOff /> {listing.availableStatus ? 'Deactivate' : 'Activate'}</button></div></div></article>)}</div>}
    </main>
  </div>;
};

export default MerchantListings;
