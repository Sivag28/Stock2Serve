// frontend/src/pages/Signup/ConsumerSignup.js
import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { FaCamera, FaLocationArrow, FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import { validateEmail, validatePassword, validatePhone, validatePincode } from '../../utils/validators';

const ConsumerSignup = () => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'fullName':
        if (!value.trim()) error = 'Full name is required';
        else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
        break;
      case 'email':
        if (!value) error = 'Email is required';
        else if (!validateEmail(value)) error = 'Please enter a valid email';
        break;
      case 'mobileNumber':
        if (!value) error = 'Mobile number is required';
        else if (!validatePhone(value)) error = 'Please enter a valid phone number';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (!validatePassword(value)) error = 'Password must be at least 8 characters with a number';
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      case 'pincode':
        if (value && !validatePincode(value)) error = 'Please enter a valid pincode';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              const address = data.display_name;
              const addressParts = address.split(',');
              const city = addressParts.find(part => 
                part.includes('City') || part.includes('District') || 
                part.includes('Mumbai') || part.includes('Delhi') || 
                part.includes('Bangalore') || part.includes('Chennai') ||
                part.includes('Hyderabad') || part.includes('Kolkata')
              ) || addressParts[addressParts.length - 3] || '';
              const pincode = addressParts.find(part => /\d{6}/.test(part)) || '';
              
              setFormData(prev => ({
                ...prev,
                address: address,
                city: city.trim(),
                pincode: pincode.trim(),
              }));
            }
          })
          .catch(() => {
            // If reverse geocoding fails, still set lat/lng
          });
        setLoading(false);
      },
      (error) => {
        alert('Unable to fetch location. Please enter manually.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      if (profileImage) {
        formDataToSend.append('profilePhoto', profileImage);
      }
      formDataToSend.append('role', 'consumer');

      await register(formDataToSend);
      await Swal.fire({
        icon: 'success',
        title: 'Account created!',
        text: 'Welcome to Stock2Serve. Your consumer account is ready.',
        confirmButtonColor: '#d97706',
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Registration failed',
        text: error.response?.data?.message || 'Please try again.',
        confirmButtonColor: '#d97706',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {/* Profile Photo */}
      <div className="flex flex-col items-center">
        <div 
          className="relative w-24 h-24 rounded-full bg-amber-100 border-2 border-dashed border-amber-300 overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group"
          onClick={() => fileInputRef.current?.click()}
        >
          {profilePreview ? (
            <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-400 text-4xl">
              <FaCamera />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Change</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <p className="text-xs text-gray-500 mt-1">Profile Photo (Optional)</p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="John Doe"
          className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 ${
            errors.fullName && touched.fullName
              ? 'border-red-400 focus:ring-red-200'
              : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200'
          }`}
        />
        {errors.fullName && touched.fullName && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-xs" /> {errors.fullName}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="your@email.com"
          className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 ${
            errors.email && touched.email
              ? 'border-red-400 focus:ring-red-200'
              : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200'
          }`}
        />
        {errors.email && touched.email && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-xs" /> {errors.email}
          </p>
        )}
      </div>

      {/* Mobile Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
        <input
          type="tel"
          name="mobileNumber"
          value={formData.mobileNumber}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="9876543210"
          className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 ${
            errors.mobileNumber && touched.mobileNumber
              ? 'border-red-400 focus:ring-red-200'
              : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200'
          }`}
        />
        {errors.mobileNumber && touched.mobileNumber && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-xs" /> {errors.mobileNumber}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 pr-12 ${
              errors.password && touched.password
                ? 'border-red-400 focus:ring-red-200'
                : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.password && touched.password && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-xs" /> {errors.password}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 pr-12 ${
              errors.confirmPassword && touched.confirmPassword
                ? 'border-red-400 focus:ring-red-200'
                : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.confirmPassword && touched.confirmPassword && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FaExclamationCircle className="text-xs" /> {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Address (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 text-xs">(Optional)</span></label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Your address"
          rows="2"
          className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-amber-400 focus:ring-amber-200 resize-none"
        />
      </div>

      {/* City & Pincode */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="City"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
          <input
            type="text"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            onBlur={handleBlur}
            inputMode="numeric"
            placeholder="Pincode"
            className={`w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none ${errors.pincode && touched.pincode ? 'border-red-400' : 'border-gray-200 focus:border-amber-400'}`}
          />
          {errors.pincode && touched.pincode && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><FaExclamationCircle className="text-xs" /> {errors.pincode}</p>}
        </div>
      </div>

      {/* Latitude & Longitude */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="text"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            inputMode="decimal"
            placeholder="e.g. 9.192022"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="text"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            inputMode="decimal"
            placeholder="e.g. 77.841698"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Use Current Location */}
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded-xl border-2 border-amber-200 transition-all duration-200 disabled:opacity-50"
      >
        <FaLocationArrow className={loading ? 'animate-pulse' : ''} />
        {loading ? 'Getting location...' : '📍 Use Current Location'}
      </button>

      {/* Register Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-200 hover:shadow-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Registering...
          </span>
        ) : (
          'Register'
        )}
      </button>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d97706;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #b45309;
        }
      `}</style>
    </form>
  );
};

export default ConsumerSignup;
