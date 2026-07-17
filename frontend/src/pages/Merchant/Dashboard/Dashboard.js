// frontend/src/pages/Merchant/Dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaPlus,
  FaSignOutAlt,
  FaBoxOpen,
  FaClipboardList,
  FaUser,
  FaHome,
  FaBars,
  FaTimes,
  FaStore,
  FaEdit
} from 'react-icons/fa';

const MerchantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeListings, setActiveListings] = useState(0);
  const [orders, setOrders] = useState(0);
  const [recentListings, setRecentListings] = useState([]);

  const navItems = [
    { path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> },
    { path: '/merchant/listings', label: 'My Listings', icon: <FaBoxOpen /> },
    { path: '/merchant/orders', label: 'Orders', icon: <FaClipboardList /> },
    { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddFood = () => {
    navigate('/merchant/add-item');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              className="text-2xl text-slate-600 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                STOCK2<span className="text-amber-600">SERVE</span>
              </h1>
              <p className="hidden text-xs text-slate-500 md:block">
                Welcome, {user?.fullName}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 md:hidden"
          >
            <FaSignOutAlt />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden ${
            mobileMenuOpen ? 'block' : 'hidden'
          } border-t bg-white px-4 py-2`}
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">
            Merchant Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Manage your food listings and orders
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <FaBoxOpen className="text-3xl text-amber-600" />
            <h3 className="mt-4 text-lg font-semibold">Active Listings</h3>
            <p className="mt-2 text-4xl font-bold">{activeListings}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <FaClipboardList className="text-3xl text-green-600" />
            <h3 className="mt-4 text-lg font-semibold">Orders</h3>
            <p className="mt-2 text-4xl font-bold">{orders}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <FaPlus className="text-3xl text-blue-600" />
            <h3 className="mt-4 text-lg font-semibold">New Listing</h3>
            <button
              onClick={handleAddFood}
              className="mt-5 w-full rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Add Food
            </button>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold">Recent Listings</h3>
          {recentListings.length === 0 ? (
            <p className="text-slate-500">No food listings available yet.</p>
          ) : (
            <div className="space-y-4">
              {recentListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <h4 className="font-semibold">{listing.title}</h4>
                    <p className="text-sm text-slate-500">
                      {listing.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MerchantDashboard;