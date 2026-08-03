import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaShieldAlt, FaStore, FaUser } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import MerchantSignup from './MerchantSignup';
import ConsumerSignup from './ConsumerSignup';

const Signup = () => {
  const [role, setRole] = useState('consumer');
  const { user } = useAuth();
  const navigate = useNavigate();

  const authPanelStyle = {
    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(landing_image.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  useEffect(() => {
    if (user) navigate(user.role === 'merchant' ? '/merchant/dashboard' : '/consumer/feed');
  }, [user, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-yellow-700 text-slate-800">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(180,83,9,0.12),_transparent_35%)]" />
      <div className="relative mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-10 lg:py-7 xl:px-14">
        <header className="mb-6 flex items-center justify-between sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg font-extrabold text-white shadow-lg shadow-amber-200">S2S</div>
            <div className="leading-none">
              <p className="text-lg font-extrabold tracking-tight text-slate-900">STOCK2<span className="text-amber-600">SERVE</span></p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">Food, thoughtfully shared</p>
            </div>
          </div>
        </header>

        <main className="overflow-hidden rounded-[2rem] border border-amber-600 bg-white shadow-2xl shadow-slate-300/40 lg:h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 lg:h-full lg:grid-cols-5">
            <aside style={authPanelStyle} className="relative isolate flex min-h-[330px] flex-col justify-between overflow-hidden bg-slate-900 p-8 text-white lg:col-span-2 lg:h-full lg:p-11">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
              <div>
                <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-amber-300" /> JOIN THE COMMUNITY
                </div>
                <h1 className="mt-3 text-4xl font-bold leading-tight">Good food deserves a second chance.</h1>
                <p className="relative mt-5 max-w-sm text-sm leading-6 text-amber-100 lg:text-base">
                  {role === 'merchant'
                    ? 'Grow your business while helping great food reach more people.'
                    : 'Discover fresh, local surplus food from neighbourhood bakeries.'}
                </p>
              </div>

              <div className="relative mt-10 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-center"><div className="text-xl font-bold">50+</div><div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-100">Partners</div></div>
                <div className="text-center"><div className="text-xl font-bold">1K+</div><div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-100">Members</div></div>
                <div className="text-center"><div className="text-xl font-bold">99%</div><div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-100">Love it</div></div>
              </div>
            </aside>

           <section className="lg:col-span-3 flex flex-col overflow-hidden">
  <div className="p-6 sm:p-9 lg:p-11">
    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
      Create your account
    </p>
    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
      Start with your role
    </h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">
      Choose how you want to use Stock2Serve. You can complete the details below.
    </p>

    <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
      <button
        onClick={() => setRole('consumer')}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          role === 'consumer'
            ? 'bg-white text-amber-700 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <FaUser /> Find food
      </button>

      <button
        onClick={() => setRole('merchant')}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          role === 'merchant'
            ? 'bg-white text-amber-700 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <FaStore /> Share food
      </button>
    </div>
  </div>

  {/* ONLY THIS DIV IS NEW */}
  <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-9 lg:px-11">
    {role === 'merchant' ? <MerchantSignup /> : <ConsumerSignup />}

    <div className="mt-7 border-t border-slate-100 pt-6 text-center">
      <p className="text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-amber-700 transition hover:text-amber-900 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
        <FaShieldAlt className="text-amber-500" />
        Your information is securely protected.
      </p>
    </div>
  </div>
</section>
          </div>
        </main>

        <footer className="mt-6 flex flex-col items-center justify-between gap-3 px-2 text-xs text-white sm:flex-row">
          <p>© 2026 Stock2Serve. Made for better food systems.</p>
          <p className="inline-flex items-center gap-1.5"><FaCheckCircle className="text-white" /> Simple, secure signup</p>
        </footer>
      </div>
    </div>
  );
};

export default Signup;
