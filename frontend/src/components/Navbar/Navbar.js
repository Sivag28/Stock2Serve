import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/merchant/dashboard" className="text-lg font-bold text-slate-900">
          STOCK2<span className="text-amber-600">SERVE</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
