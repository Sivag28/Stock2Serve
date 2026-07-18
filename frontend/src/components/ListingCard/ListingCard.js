import React from 'react';
import { formatIndianTime } from '../../utils/formatDate';
import { FaClock, FaStore } from 'react-icons/fa';

const ListingCard = ({ listing, onEdit, onDelete, onToggleStatus }) => {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
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
        <button onClick={() => onEdit(listing)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Edit</button>
        <button onClick={() => onDelete(listing._id)} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200">Delete</button>
        <button onClick={() => onToggleStatus(listing)} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200">{listing.availableStatus ? 'Deactivate' : 'Activate'}</button>
      </div>
    </div>
  );
};

export default ListingCard;
