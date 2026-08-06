import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaBars, FaBoxOpen, FaClipboardList, FaHistory, FaHome, FaPlus, FaSignOutAlt, FaTimes, FaUpload, FaUser, FaLeaf } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { getIndianTimeParts, toIndianDateTimeInput, toIndianExpiryDateTime, toIndianStoredTime } from '../../../utils/formatDate';

const initialForm = {
  foodName: '',
  category: '',
  description: '',
  originalPrice: '',
  discountedPrice: '',
  quantity: '',
  calendar: toIndianDateTimeInput(new Date()).split('T')[0],
  pickupStart: '20:00',
  pickupEnd: '22:00',
  tokenexpiryTime: '22:00',
  foodType: 'veg',
  availableStatus: 'true',
};

const businessCategories = [
  { value: 'bakery', label: 'Bakery' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'fastfood', label: 'Fast Food' },
  { value: 'foodstall', label: 'Food Stall' },
  { value: 'homekitchen', label: 'Home Kitchen / Home Chef' },
  { value: 'salad', label: 'Salad & Healthy Food' },
  { value: 'dessert', label: 'Dessert Shop' },
  { value: 'sweetshop', label: 'Sweet Shop' },
  { value: 'juice', label: 'Juice & Beverage Shop' },
  { value: 'tiffin', label: 'Tiffin Center' },
  { value: 'mess', label: 'Mess / Canteen' },
  { value: 'fruits', label: 'Fruits & Vegetables' },
  { value: 'sandwich', label: 'Sandwich & Wrap Shop' },
  { value: 'tea', label: 'Tea & Snacks Shop' },
  { value: 'cloudkitchen', label: 'Cloud Kitchen' },
  { value: 'supermarket', label: 'Supermarket / Grocery' },
  { value: 'snacks', label: 'Snack Shop' },
  { value: 'catering', label: 'Catering Service' },
  { value: 'other', label: 'Other' },
];

const navItems = [{ path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> }, { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> }, { path: '/merchant/inventory', label: 'Inventory', icon: <FaBoxOpen /> }, { path: '/merchant/verify-pickup', label: 'Verify pickup', icon: <FaClipboardList /> }, { path: '/merchant/history', label: 'History', icon: <FaHistory /> }, { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> }];

const IndianTimePicker = ({ name, value, onChange }) => {
  const parts = getIndianTimeParts(value);
  const update = (key, nextValue) => onChange({ target: { name, value: toIndianStoredTime(key === 'hour' ? nextValue : parts.hour, key === 'minute' ? nextValue : parts.minute, key === 'meridiem' ? nextValue : parts.meridiem) } });

  const incHour = () => update('hour', Math.min(12, Number(parts.hour) + 1));
  const decHour = () => update('hour', Math.max(1, Number(parts.hour) - 1));

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={decHour} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">−</button>
        <input
          type="number"
          min="1"
          max="12"
          value={parts.hour}
          onChange={(event) => update('hour', Math.min(12, Math.max(1, Number(event.target.value || 1))))}
          className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-500"
          aria-label="Hour"
        />
        <button type="button" onClick={incHour} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">+</button>
      </div>

      <select value={parts.minute} onChange={(event) => update('minute', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-amber-500" aria-label="Minutes">{Array.from({ length: 60 }, (_, index) => <option key={index} value={String(index).padStart(2, '0')}>{String(index).padStart(2, '0')}</option>)}</select>

      <select value={parts.meridiem} onChange={(event) => update('meridiem', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-amber-500"><option>AM</option><option>PM</option></select>
    </div>
  );
};

const MerchantAddItem = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams();
  const [editingListing, setEditingListing] = useState(location.state?.listing || null);
  const [loadingListing, setLoadingListing] = useState(Boolean(listingId && !location.state?.listing));
  const [form, setForm] = useState(() => ({ ...initialForm, category: user?.businessCategory || '' }));
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId || editingListing) return;
      try {
        const response = await api.get('/merchant/listings');
        const listing = response.data.listings?.find((item) => item._id === listingId);
        if (!listing) {
          alert('This listing is no longer available.');
          navigate('/merchant/dashboard', { replace: true });
          return;
        }
        setEditingListing(listing);
      } catch (error) {
        alert('Unable to load this listing.');
        navigate('/merchant/dashboard', { replace: true });
      } finally {
        setLoadingListing(false);
      }
    };

    loadListing();
  }, [editingListing, listingId, navigate]);

  useEffect(() => {
    if (editingListing) {
      setForm({
        foodName: editingListing.foodName || '',
        category: editingListing.category || '',
        description: editingListing.description || '',
        originalPrice: editingListing.originalPrice || '',
        discountedPrice: editingListing.discountedPrice || '',
        quantity: editingListing.quantity || '',
        calendar: toIndianDateTimeInput(editingListing.expiryTime).split('T')[0] || '',
        pickupStart: editingListing.pickupStart || '',
        pickupEnd: editingListing.pickupEnd || '',
        tokenexpiryTime: toIndianDateTimeInput(editingListing.expiryTime).split('T')[1] || '',
        foodType: editingListing.foodType || 'veg',
        availableStatus: String(editingListing.availableStatus ?? true),
      });
    }
  }, [editingListing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Keep expiry aligned with pickup end by default. Merchants can still
      // change Token Expiry Time afterwards if they need a different time.
      ...(name === 'pickupEnd' ? { tokenexpiryTime: value } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('expiryTime', toIndianExpiryDateTime(form.tokenexpiryTime, form.calendar));
      if (image) formData.append('image', image);

      if (editingListing) {
        await api.put(`/merchant/listing/${editingListing._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/merchant/listing', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await Swal.fire({
        icon: 'success',
        title: editingListing ? 'Listing updated' : 'Food item added',
        text: editingListing ? 'Your food listing has been updated successfully.' : 'Your food listing is now ready for customers to claim.',
        confirmButtonColor: '#d97706',
      });
      navigate('/merchant/dashboard');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Unable to save listing',
        text: error?.response?.data?.message || 'Please try again in a moment.',
        confirmButtonColor: '#d97706',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const logoutAndLeave = async () => {
    if (await logout()) navigate('/login');
  };

  return (
    <div className="app-shell min-h-screen bg-stone-50">
      <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-4"><button className="text-2xl text-slate-600 md:hidden" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <FaTimes /> : <FaBars />}</button><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold md:text-1xl">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Welcome, {user?.fullName}</p></div></div><div className="hidden items-center gap-2 md:flex">{navItems.map((item) => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${location.pathname === item.path ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}>{item.icon}{item.label}</Link>)}<button onClick={logoutAndLeave} className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"><FaSignOutAlt /> Logout</button></div><button onClick={logoutAndLeave} className="rounded-lg bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{mobileMenuOpen && <div className="border-t bg-white px-4 py-2 md:hidden">{navItems.map((item) => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.icon}{item.label}</Link>)}</div>}</nav>

      <main className="mx-auto max-w-[1400px] p-4 pb-10 md:p-6 md:pb-12">
        <div className="mb-6 rounded-3xl border border-amber-900/25 bg-white p-6 shadow-xl shadow-slate-900/[0.05]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <FaPlus />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{editingListing ? 'Edit Listing' : 'Add Food Listing'}</h2>
              <p className="text-sm text-slate-500">Create or update flash-sale inventory without changing the existing merchant workflow.</p>
            </div>
          </div>
        </div>

        {loadingListing ? (
          <div className="rounded-2xl border border-amber-900/25 bg-white p-10 text-center text-slate-500 shadow-sm">Loading listing...</div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-amber-900/45 bg-white p-6 shadow-xl shadow-slate-900/[0.05] md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Food Name</span>
              <input name="foodName" value={form.foodName} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Business Category</span>
              <select name="category" value={form.category} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-500">
                <option value="">Select category</option>
                {businessCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
              <textarea name="description" value={form.description} onChange={handleChange} rows="4" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Original Price (₹)</span>
              <input type="number" name="originalPrice" value={form.originalPrice} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Discount Price (₹)</span>
              <input type="number" name="discountedPrice" value={form.discountedPrice} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Quantity</span>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Food Type</span>
              <select name="foodType" value={form.foodType} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500">
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Calendar</span>
              <input type="date" name="calendar" value={form.calendar} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Pickup Start (IST)</span>
              <IndianTimePicker name="pickupStart" value={form.pickupStart} onChange={handleChange} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Pickup End (IST)</span>
              <IndianTimePicker name="pickupEnd" value={form.pickupEnd} onChange={handleChange} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Token Expiry Time (IST)</span>
              <IndianTimePicker name="tokenexpiryTime" value={form.tokenexpiryTime} onChange={handleChange} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Available Status</span>
              <select name="availableStatus" value={form.availableStatus} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500">
                <option value="true">Available</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          <label className="block rounded-2xl border border-dashed border-amber-900/35 bg-amber-50/30 p-4">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Food Image</span>
            <div className="flex items-center gap-3 text-slate-600">
              <FaUpload />
              <span>{image ? image.name : 'Upload an image for the food item'}</span>
            </div>
            <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0])} className="mt-3 block w-full text-sm text-slate-500" />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting} className="rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
              {submitting ? 'Saving...' : editingListing ? 'Update Listing' : 'Add Listing'}
            </button>
            <Link to="/merchant/dashboard" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </Link>
          </div>
        </form>
        )}
      </main>
    </div>
  );
};

export default MerchantAddItem;
