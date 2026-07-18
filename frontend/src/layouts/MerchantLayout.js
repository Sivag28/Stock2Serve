import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaClipboardList, FaPlus, FaUser } from 'react-icons/fa';

const navItems = [
  { path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> },
  { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> },
  { path: '/merchant/listings', label: 'My Listings', icon: <FaBoxOpen /> },
  { path: '/merchant/orders', label: 'Orders', icon: <FaClipboardList /> },
  { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> },
];

const MerchantLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">
              STOCK2<span className="text-amber-600">SERVE</span>
            </h1>
          </div>
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
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
};

export default MerchantLayout;
