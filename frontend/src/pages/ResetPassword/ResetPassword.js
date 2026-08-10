import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import ProcessingIndicator from '../../components/ProcessingIndicator/ProcessingIndicator';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      await Swal.fire({ icon: 'error', title: 'Passwords do not match', text: 'Enter the same new password in both fields.', confirmButtonColor: '#d97706' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', { email, otp, password });
      await Swal.fire({ icon: 'success', title: 'Password reset', text: response.data.message, confirmButtonColor: '#d97706' });
      navigate('/login', { replace: true });
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Password reset failed', text: error.response?.data?.message || 'Please try again.', confirmButtonColor: '#d97706' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6">
      {submitting && <ProcessingIndicator message="🍽️ Resetting password..." />}
      <main className="mx-auto w-full max-w-md rounded-3xl border border-amber-100 bg-white p-8 shadow-xl shadow-amber-100/50 sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-extrabold text-white">S2S</div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the OTP from your email and choose a new password.</p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">Email address
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Six-digit OTP
            <input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="483921" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-[0.35em] outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">New password
            <input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Confirm new password
            <input required minLength="6" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
          </label>
          <button disabled={submitting} className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Resetting password…' : 'Reset password'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500"><Link to="/forgot-password" className="font-bold text-amber-700 hover:underline">Need a new OTP?</Link></p>
      </main>
    </div>
  );
};

export default ResetPassword;
