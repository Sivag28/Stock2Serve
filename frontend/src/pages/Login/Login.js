import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaLock, FaStore, FaUser, FaChevronDown } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [role, setRole] = useState('consumer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const authPanelStyle = {
    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(landing_image.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  useEffect(() => {
    if (user && !submitting) navigate(user.role === 'merchant' ? '/merchant/dashboard' : '/consumer/feed', { replace: true });
  }, [user, navigate, submitting]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, role);
      await Swal.fire({
        icon: 'success',
        title: 'Welcome back!',
        text: `You are signed in as a ${role}.`,
        timer: 1200,
        showConfirmButton: false,
      });
      navigate(role === 'merchant' ? '/merchant/dashboard' : '/consumer/feed', { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Unable to sign in. Please try again.';
      setError(message);
      await Swal.fire({ icon: 'error', title: 'Sign in failed', text: message, confirmButtonColor: '#d97706' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-700 bg-stone-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-7 xl:px-14">
                <header className="mb-6 flex items-center justify-between sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg font-extrabold text-white shadow-lg shadow-amber-200">S2S</div>
              <div className="leading-none">
                <p className="text-lg font-extrabold tracking-tight text-black">STOCK2<span className="text-amber-600">SERVE</span></p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">Food, thoughtfully shared</p>
              </div>
            </div>
          </header>
      <div className="mx-auto grid w-full max-w-[1600px] overflow-hidden rounded-[2rem] border border-amber-600 bg-white shadow-2xl shadow-slate-300/40 lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2">
        <aside style={authPanelStyle} className="relative flex min-h-[330px] flex-col justify-between overflow-hidden bg-slate-900 p-8 text-white sm:p-11 lg:p-16">
          <div className="mt-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Welcome back</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">Your neighbourhood food community is waiting.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-amber-100">Sign in to discover local offers or manage the food your business shares.</p>
          </div>
        </aside>

        <main className="flex flex-col justify-center p-8 sm:p-11 lg:mx-auto lg:w-full lg:max-w-xl lg:p-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use the role associated with your account.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
<label className="block text-sm font-semibold text-slate-700">
  I am signing in as

  <div className="relative mt-2">
    <select
      value={role}
      onChange={(event) => setRole(event.target.value)}
      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
    >
      <option value="consumer">Consumer — Find food</option>
      <option value="merchant">Merchant — Share food</option>
    </select>

    <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
  </div>
</label>
            <label className="block text-sm font-semibold text-slate-700">Email address
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Password
              <div className="relative mt-2"><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" /><FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div>
            </label>
            {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:from-amber-700 hover:to-amber-800 disabled:cursor-not-allowed disabled:opacity-60">
              {role === 'merchant' ? <FaStore /> : <FaUser />}{submitting ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-slate-500">New to Stock2Serve? <Link to="/signup" className="font-bold text-amber-700 hover:underline">Create an account</Link></p>
        </main>
      </div>
    </div>
  );
};

export default Login;
