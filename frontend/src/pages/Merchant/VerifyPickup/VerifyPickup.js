import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaQrcode, FaArrowLeft } from 'react-icons/fa';
import api from '../../../services/api';

const MerchantVerifyPickup = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const verifyPickup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await api.post('/claims/verify', { token });
      setResult({ type: 'success', message: response.data.message, claim: response.data.claim });
      setToken('');
    } catch (error) {
      setResult({ type: 'error', message: error.response?.data?.message || 'Unable to verify this pickup token.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="mx-auto max-w-2xl p-4 md:p-8">
        <Link to="/merchant/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-700"><FaArrowLeft /> Dashboard</Link>
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm md:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><FaQrcode /></div>
          <h1 className="mt-5 text-3xl font-bold text-slate-900">Verify a pickup</h1>
          <p className="mt-2 text-slate-500">Enter the customer’s claim token before handing over the order. Each token can be collected once.</p>
          <form onSubmit={verifyPickup} className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Pickup token</span>
              <input value={token} onChange={(event) => setToken(event.target.value.toUpperCase())} placeholder="e.g. S2S-4HD92" required className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono tracking-wider uppercase outline-none focus:border-amber-500" />
            </label>
            <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"><FaCheckCircle /> {loading ? 'Verifying…' : 'Mark as collected'}</button>
          </form>
          {result && <div className={`mt-6 rounded-2xl p-4 ${result.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">{result.message}</p>
            {result.claim && <p className="mt-1 text-sm">{result.claim.listingName} · {result.claim.customerName}</p>}
          </div>}
        </section>
      </main>
    </div>
  );
};

export default MerchantVerifyPickup;
