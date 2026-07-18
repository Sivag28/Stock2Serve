import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaClipboardList } from 'react-icons/fa';

const MerchantOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders([
      {
        customer: 'Uma',
        food: 'Chocolate Cake',
        pickupTime: '8:45 PM',
        token: 'ABX123',
        status: 'Pending',
      },
      {
        customer: 'Ravi',
        food: 'Pizza',
        pickupTime: '9:15 PM',
        token: 'S2S-4HD92',
        status: 'Completed',
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">
              STOCK2<span className="text-amber-600">SERVE</span>
            </h1>
            <p className="hidden text-xs text-slate-500 md:block">Orders</p>
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
              <FaClipboardList />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
              <p className="text-sm text-slate-500">Monitor customer pickup activity and token verification.</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="grid grid-cols-5 gap-4 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <span>Customer</span>
            <span>Food</span>
            <span>Pickup Time</span>
            <span>Token</span>
            <span>Status</span>
          </div>
          {orders.map((order, index) => (
            <div key={`${order.token}-${index}`} className="grid grid-cols-5 gap-4 border-t px-4 py-4 text-sm text-slate-700">
              <span>{order.customer}</span>
              <span>{order.food}</span>
              <span>{order.pickupTime}</span>
              <span className="font-semibold text-amber-700">{order.token}</span>
              <span className={order.status === 'Completed' ? 'text-green-700' : 'text-amber-700'}>{order.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MerchantOrders;
