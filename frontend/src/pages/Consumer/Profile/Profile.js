// frontend/src/pages/Consumer/Profile/Profile.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import { FaEdit, FaSave, FaTimes, FaCamera, FaMapMarkerAlt, FaHome, FaSignOutAlt } from 'react-icons/fa';
import api from '../../../services/api';

const ConsumerProfile = () => {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    address: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: '',
    profilePhoto: null,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        mobileNumber: user.mobileNumber || '',
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || '',
        latitude: user.latitude || '',
        longitude: user.longitude || '',
        profilePhoto: user.profilePhoto || null,
      });
      if (user.profilePhoto) {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        setPreviewUrl(`${baseURL}${user.profilePhoto}`);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setProfileData(prev => ({
            ...prev,
            latitude,
            longitude,
          }));

          // Reverse geocoding to get address, city, pincode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.address;
            setProfileData(prev => ({
              ...prev,
              address: address.road || address.neighbourhood || address.suburb || '',
              city: address.city || address.town || address.village || address.county || '',
              pincode: address.postcode || '',
            }));
          } catch (error) {
            console.error('Error getting address:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          Swal.fire({
            icon: 'warning',
            title: 'Location Error',
            text: 'Unable to get location. Please enter manually.',
            confirmButtonColor: '#d97706',
          });
        }
      );
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Not Supported',
        text: 'Geolocation is not supported by your browser.',
        confirmButtonColor: '#d97706',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['fullName', 'email', 'mobileNumber'];
    
    requiredFields.forEach(field => {
      if (!profileData[field] || profileData[field].toString().trim() === '') {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
      }
    });

    if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (profileData.mobileNumber && !/^\d{10}$/.test(profileData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(profileData).forEach(key => {
        if (key !== 'profilePhoto' && profileData[key] !== null && profileData[key] !== undefined) {
          formData.append(key, profileData[key]);
        }
      });
      
      if (selectedFile) {
        formData.append('profilePhoto', selectedFile);
      }

      const response = await api.put('/auth/consumer/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update user in context
        updateUser(response.data.user);
        setIsEditing(false);
        setSelectedFile(null);
        Swal.fire({
          icon: 'success',
          title: 'Profile updated',
          text: 'Your consumer profile was saved successfully.',
          confirmButtonColor: '#d97706',
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: error.response?.data?.message || 'Failed to update profile',
        confirmButtonColor: '#d97706',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setSelectedFile(null);
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        mobileNumber: user.mobileNumber || '',
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || '',
        latitude: user.latitude || '',
        longitude: user.longitude || '',
        profilePhoto: user.profilePhoto || null,
      });
      if (user.profilePhoto) {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        setPreviewUrl(`${baseURL}${user.profilePhoto}`);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(148,163,184,0.06),_transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-10">
        <header className="mb-8 rounded-[2rem] bg-white/90 p-6 shadow-2xl shadow-slate-300/20 backdrop-blur-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-amber-600">Consumer Profile</p>
              <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Hello, {user?.fullName || 'Friend'}</h1>
              <p className="mt-2 text-sm text-slate-500">Keep your account details updated to receive offers faster.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/consumer/feed" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FaHome /> Feed
              </Link>
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700">
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </header>
        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <aside className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-300/20">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-amber-200 bg-amber-50 shadow-lg shadow-amber-200/40">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-amber-500">
                    {profileData.fullName?.charAt(0) || 'C'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Profile</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{profileData.fullName || 'Your name'}</h2>
                <p className="mt-1 text-sm text-slate-500">{profileData.email}</p>
              </div>
            </div>
            <div className="mt-10 space-y-4 rounded-3xl bg-amber-50 p-5 shadow-inner shadow-amber-200/40">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Location</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{profileData.city || 'Set your city'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Phone</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{profileData.mobileNumber || 'Not set'}</p>
              </div>
            </div>
          </aside>
          <main className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-300/20">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-amber-600">Profile details</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Edit your profile</h2>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <FaEdit /> Edit mode
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-md">
                {/* Profile Photo */}
                <div className="mb-6 flex flex-col items-center">
                  <div className="relative">
                    <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-amber-200 bg-amber-50">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl text-amber-400">
                          {profileData.fullName?.charAt(0) || '👤'}
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 rounded-full bg-amber-600 p-2 text-white hover:bg-amber-700"
                      >
                        <FaCamera />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  {isEditing && (
                    <p className="mt-2 text-xs text-slate-500">
                      Click camera icon to change photo (JPG, PNG, WEBP)
                    </p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="border-b pb-2 text-lg font-semibold text-slate-700">
                      Personal Information
                    </h3>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={profileData.fullName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'} ${errors.fullName ? 'border-red-500' : ''}`}
                        placeholder="Enter your full name"
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'} ${errors.email ? 'border-red-500' : ''}`}
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={profileData.mobileNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'} ${errors.mobileNumber ? 'border-red-500' : ''}`}
                        placeholder="Enter 10-digit mobile number"
                      />
                      {errors.mobileNumber && (
                        <p className="mt-1 text-sm text-red-500">{errors.mobileNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="border-b pb-2 text-lg font-semibold text-slate-700">
                      Location Information
                    </h3>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={profileData.address}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'}`}
                        placeholder="Enter your address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={profileData.city}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'}`}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Pincode
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={profileData.pincode}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full rounded-lg border px-4 py-2.5 ${isEditing ? 'border-amber-300 bg-white' : 'border-slate-200 bg-slate-50'}`}
                          placeholder="Pincode"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Latitude
                        </label>
                        <input
                          type="text"
                          name="latitude"
                          value={profileData.latitude}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
                          placeholder="Auto"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Longitude
                        </label>
                        <input
                          type="text"
                          name="longitude"
                          value={profileData.longitude}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
                          placeholder="Auto"
                          readOnly
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-2 text-amber-700 hover:bg-amber-100"
                      >
                        <FaMapMarkerAlt /> 📍 Use Current Location
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-2.5 text-slate-700 hover:bg-slate-50"
                  >
                    <FaTimes /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ConsumerProfile;