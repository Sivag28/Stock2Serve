import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FaSignOutAlt, FaMapMarkerAlt, FaClock } from 'react-icons/fa';

const Feed = () => {
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

      {/* Feed */}
      <main className="mx-auto max-w-7xl p-6">
        <h2 className="mb-6 text-3xl font-bold">
          Nearby Food Listings
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {[1,2,3].map((item)=>(
            <div
              key={item}
              className="rounded-2xl bg-white p-5 shadow-md"
            >
              <img
                src="https://placehold.co/500x250"
                alt="Food"
                className="rounded-xl"
              />

              <h3 className="mt-4 text-xl font-bold">
                Veg Sandwich Pack
              </h3>

              <p className="mt-2 text-slate-500">
                Fresh sandwiches available at discounted price.
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <FaMapMarkerAlt />
                BakeryShop, Chennai
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <FaClock />
                Pickup before 8:30 PM
              </div>

              <button className="mt-5 w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700">
                Claim Food
              </button>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
};

export default Feed;