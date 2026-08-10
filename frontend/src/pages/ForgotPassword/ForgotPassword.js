import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import ProcessingIndicator from '../../components/ProcessingIndicator/ProcessingIndicator';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      await Swal.fire({ icon: 'success', title: 'Check your inbox', text: response.data.message, confirmButtonColor: '#d97706' });
      navigate('/reset-password', { state: { email: email.trim().toLowerCase() } });
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Unable to send OTP', text: error.response?.data?.message || 'Please try again.', confirmButtonColor: '#d97706' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6">
      {submitting && <ProcessingIndicator message="🍽️ Sending reset OTP..." />}
      <main className="mx-auto w-full max-w-md rounded-3xl border border-amber-100 bg-white p-8 shadow-xl shadow-amber-100/50 sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-extrabold text-white">S2S</div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Forgot password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the email registered to your Consumer or Merchant account. We’ll send a six-digit OTP.</p>
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">Email address
            <input required autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          </label>
          <button disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Sending OTP…' : 'Send reset OTP'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-amber-700 hover:underline">Back to sign in</Link></p>
      </main>
    </div>
  );
};

export default ForgotPassword;
