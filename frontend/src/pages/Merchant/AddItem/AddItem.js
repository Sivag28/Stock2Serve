import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaPlus, FaArrowLeft, FaUpload } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { getIndianTimeParts, toIndianDateTimeInput, toIndianStoredTime } from '../../../utils/formatDate';

const initialForm = {
  foodName: '',
  category: '',
  description: '',
  originalPrice: '',
  discountedPrice: '',
  quantity: '',
  pickupStart: '20:00',
  pickupEnd: '22:00',
  expiryTime: '',
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

const IndianTimePicker = ({ name, value, onChange }) => {
  const parts = getIndianTimeParts(value);
  const update = (key, nextValue) => onChange({ target: { name, value: toIndianStoredTime(key === 'hour' ? nextValue : parts.hour, key === 'minute' ? nextValue : parts.minute, key === 'meridiem' ? nextValue : parts.meridiem) } });
  return <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
    <input type="number" min="1" max="12" value={parts.hour} onChange={(event) => update('hour', Math.min(12, Math.max(1, Number(event.target.value || 1))))} className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-500" aria-label="Hour" />
    <select value={parts.minute} onChange={(event) => update('minute', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-amber-500" aria-label="Minutes">{Array.from({ length: 60 }, (_, index) => <option key={index} value={String(index).padStart(2, '0')}>{String(index).padStart(2, '0')}</option>)}</select>
    <select value={parts.meridiem} onChange={(event) => update('meridiem', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-amber-500"><option>AM</option><option>PM</option></select>
  </div>;
};

const MerchantAddItem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams();
  const [editingListing, setEditingListing] = useState(location.state?.listing || null);
  const [loadingListing, setLoadingListing] = useState(Boolean(listingId && !location.state?.listing));
  const [form, setForm] = useState(() => ({ ...initialForm, category: user?.businessCategory || '' }));
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        pickupStart: editingListing.pickupStart || '',
        pickupEnd: editingListing.pickupEnd || '',
        expiryTime: toIndianDateTimeInput(editingListing.expiryTime),
        foodType: editingListing.foodType || 'veg',
        availableStatus: String(editingListing.availableStatus ?? true),
      });
    }
  }, [editingListing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
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

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">
              STOCK2<span className="text-amber-600">SERVE</span>
            </h1>
            <p className="hidden text-xs text-slate-500 md:block">Merchant • {user?.fullName}</p>
          </div>
          <Link to="/merchant/dashboard" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FaArrowLeft />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
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
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">Loading listing...</div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
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
              <span className="mb-2 block text-sm font-semibold text-slate-700">Pickup Start (IST)</span>
              <IndianTimePicker name="pickupStart" value={form.pickupStart} onChange={handleChange} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Pickup End (IST)</span>
              <IndianTimePicker name="pickupEnd" value={form.pickupEnd} onChange={handleChange} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Expiry Time (IST)</span>
              <input type="datetime-local" name="expiryTime" value={form.expiryTime} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Available Status</span>
              <select name="availableStatus" value={form.availableStatus} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500">
                <option value="true">Available</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
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
