// frontend/src/pages/Consumer/Feed/Feed.js
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaSearch,
  FaSignOutAlt,
  FaHome,
  FaUser,
  FaClipboardList,
  FaBars,
  FaTimes,
  FaMapMarkerAlt,
  FaClock,
  FaChevronRight,
  FaStore
} from 'react-icons/fa';
import api from '../../../services/api';

const ConsumerFeed = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  const navItems = [
    { path: '/consumer/feed', label: 'Feed', icon: <FaHome /> },
    { path: '/consumer/claims', label: 'My Claims', icon: <FaClipboardList /> },
    { path: '/consumer/profile', label: 'Profile', icon: <FaUser /> },
  ];

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      // Replace with actual API call
      // const response = await api.get('/listings');
      // setListings(response.data);
      
      // Mock data for now
      setTimeout(() => {
        setListings([
          {
            id: 1,
            title: 'Fresh surplus meals available nearby',
            description: 'A local kitchen has prepared extra meals and is sharing them for free pickup.',
            location: 'Downtown Community Kitchen',
            shopName: 'Community Kitchen',
            city: 'Chennai',
            pickupTime: '8:30 PM',
            time: '15 minutes ago',
            image: 'https://placehold.co/500x250/amber-100/amber-600?text=Food+Offer'
          },
          {
            id: 2,
            title: 'Bread & pastries ready for collection',
            description: 'Baked goods from a neighbourhood bakery are available while supplies last.',
            location: 'Riverside Bakery',
            shopName: 'Riverside Bakery',
            city: 'Chennai',
            pickupTime: '7:00 PM',
            time: '40 minutes ago',
            image: 'https://placehold.co/500x250/amber-100/amber-600?text=Food+Offer'
          },
          {
            id: 3,
            title: 'Fresh vegetables donation',
            description: 'A nearby market has extra vegetables to share with neighbours.',
            location: 'Eastside Market',
            shopName: 'Eastside Market',
            city: 'Chennai',
            pickupTime: '9:00 PM',
            time: '1 hour ago',
            image: 'https://placehold.co/500x250/amber-100/amber-600?text=Food+Offer'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = useMemo(
    () => listings.filter((item) =>
      item.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.location.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.shopName.toLowerCase().includes(searchValue.toLowerCase())
    ),
    [searchValue, listings]
  );

  // Function to check if nav item is active - FIXED
  const isNavActive = (path) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto"></div>
          <div className="mt-4 text-5xl">🍽️</div>
          <p className="mt-4 text-lg font-semibold text-slate-700">Loading delicious offers...</p>
          <p className="mt-2 text-sm text-slate-500">We're finding the best food near you! 🌟</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              className="text-2xl text-slate-600 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                STOCK2<span className="text-amber-600">SERVE</span>
              </h1>
              <p className="hidden text-xs text-slate-500 md:block">
                Welcome, {user?.fullName}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
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
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 md:hidden"
          >
            <FaSignOutAlt />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden ${
            mobileMenuOpen ? 'block' : 'hidden'
          } border-t bg-white px-4 py-2`}
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">
            Nearby Food Listings
          </h2>
          <p className="text-sm text-slate-500">
            Discover surplus food near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <label htmlFor="feed-search" className="sr-only">Search feed</label>
            <input
              id="feed-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search food, location, or category..."
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 pl-11 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Listings Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            <FaStore className="mx-auto text-4xl text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-700">No offers available</p>
            <p className="text-sm">No food offers match your search. Try a different keyword.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="relative h-48 w-full overflow-hidden rounded-xl bg-amber-50">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-100 text-amber-600">
                      <FaStore className="text-5xl" />
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
                    Available
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 line-clamp-1">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                  {item.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <FaMapMarkerAlt className="text-amber-600" />
                  {item.shopName}, {item.city}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <FaClock className="text-amber-600" />
                  Pickup before {item.pickupTime}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <span>{item.time}</span>
                </div>
                <button className="mt-5 w-full rounded-xl bg-amber-600 py-3 font-semibold text-white transition-colors hover:bg-amber-700">
                  Claim Food
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsumerFeed;