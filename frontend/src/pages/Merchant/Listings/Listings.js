import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaEdit, FaTrash, FaPowerOff, FaClock, FaPlus, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { formatIndianTime } from '../../../utils/formatDate';

const imageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return `${apiBaseUrl}${image}`;
};

const MerchantListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [failedImages, setFailedImages] = useState({});

  const fetchListings = async () => {
    try {
      const response = await api.get('/merchant/listings');
      setListings(response.data.listings || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Delete this listing?',
      text: 'This food item will no longer be visible to customers.',
      showCancelButton: true,
      confirmButtonText: 'Delete listing',
      cancelButtonText: 'Keep listing',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });
    if (!confirmation.isConfirmed) return;
    try {
      await api.delete(`/merchant/listing/${id}`);
      await Swal.fire({ icon: 'success', title: 'Listing deleted', text: 'The food item was removed from your inventory.', confirmButtonColor: '#d97706' });
      fetchListings();
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Delete failed', text: error.response?.data?.message || 'Unable to delete this listing.', confirmButtonColor: '#d97706' });
    }
  };

  const handleEdit = (listing) => {
    navigate(`/merchant/edit-item/${listing._id}`, { state: { listing } });
  };

  const filteredListings = listings.filter((listing) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [listing.foodName, listing.category, listing.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const handleToggleStatus = async (listing) => {
    const nextStatus = listing.availableStatus ? 'deactivated' : 'active';
    try {
      await api.put(`/merchant/listing/${listing._id}`, {
        availableStatus: !listing.availableStatus,
        status: nextStatus,
      });
      await Swal.fire({
        icon: 'success',
        title: nextStatus === 'active' ? 'Listing activated' : 'Listing deactivated',
        text: nextStatus === 'active' ? 'Customers can now claim this item.' : 'Customers can no longer claim this item.',
        confirmButtonColor: '#d97706',
      });
      fetchListings();
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Status update failed', text: error.response?.data?.message || 'Unable to update this listing.', confirmButtonColor: '#d97706' });
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
            <p className="hidden text-xs text-slate-500 md:block">Inventory</p>
          </div>
          <Link to="/merchant/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <FaBoxOpen />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Food Inventory</h2>
              <p className="text-sm text-slate-500">Search and manage your food listings and active pickup windows.</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food, category, or status" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-amber-500" />
          </label>
          <Link to="/merchant/add-item" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700"><FaPlus /> Add food item</Link>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500">No food listings available yet.</div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500">No food listings match “{search}”.</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => (
              <div key={listing._id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex h-44 items-center justify-center overflow-hidden rounded-xl bg-amber-50">
                  {listing.image && !failedImages[listing._id] ? (
                    <img
                      src={imageUrl(listing.image)}
                      alt={listing.foodName}
                      className="h-full w-full object-cover"
                      onError={() => setFailedImages((current) => ({ ...current, [listing._id]: true }))}
                    />
                  ) : (
                    <FaBoxOpen className="text-4xl text-amber-300" aria-label="No food image" />
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{listing.foodName}</h3>
                    <p className="text-sm text-slate-500">{listing.category || 'General'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {listing.status}
                  </span>
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">₹{listing.discountedPrice} <span className="text-slate-400 line-through">₹{listing.originalPrice}</span></p>
                  <p className="mt-2">{listing.quantity} Left</p>
                  <p className="mt-2 flex items-center gap-2 text-amber-700">
                    <FaClock />
                    Pickup {formatIndianTime(listing.pickupStart)} - {formatIndianTime(listing.pickupEnd)} IST
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => handleEdit(listing)} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                    <FaEdit /> Edit
                  </button>
                  <button onClick={() => handleDelete(listing._id)} className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200">
                    <FaTrash /> Delete
                  </button>
                  <button onClick={() => handleToggleStatus(listing)} className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200">
                    <FaPowerOff /> {listing.availableStatus ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MerchantListings;
