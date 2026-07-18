import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaClipboardList, FaPlus, FaUser } from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/merchant/dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/merchant/add-item', label: 'Add Item', icon: <FaPlus /> },
    { path: '/merchant/listings', label: 'My Listings', icon: <FaBoxOpen /> },
    { path: '/merchant/orders', label: 'Orders', icon: <FaClipboardList /> },
    { path: '/merchant/profile', label: 'Profile', icon: <FaUser /> },
  ];

  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
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
    </aside>
  );
};

export default Sidebar;
