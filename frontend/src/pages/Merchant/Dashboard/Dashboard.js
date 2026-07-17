import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  FaPlus,
  FaSignOutAlt,
  FaBoxOpen,
  FaClipboardList
} from 'react-icons/fa';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-2xl font-bold">
              STOCK2<span className="text-amber-600">SERVE</span>
            </h1>

            <p className="text-sm text-slate-500">
              Welcome, {user?.fullName}
            </p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            <FaSignOutAlt />
            Logout
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">

        <h2 className="mb-8 text-3xl font-bold">
          Merchant Dashboard
        </h2>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow">
            <FaBoxOpen className="text-3xl text-amber-600" />
            <h3 className="mt-4 text-lg font-semibold">
              Active Listings
            </h3>
            <p className="mt-2 text-4xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <FaClipboardList className="text-3xl text-green-600" />
            <h3 className="mt-4 text-lg font-semibold">
              Orders
            </h3>
            <p className="mt-2 text-4xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <FaPlus className="text-3xl text-blue-600" />
            <h3 className="mt-4 text-lg font-semibold">
              New Listing
            </h3>

            <button className="mt-5 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700">
              Add Food
            </button>
          </div>

        </div>

        {/* Recent Listings */}
        <div className="mt-10 rounded-2xl bg-white p-6 shadow">

          <h3 className="mb-4 text-xl font-bold">
            Recent Listings
          </h3>

          <p className="text-slate-500">
            No food listings available yet.
          </p>

        </div>

      </main>
    </div>
  );
};

export default Dashboard;