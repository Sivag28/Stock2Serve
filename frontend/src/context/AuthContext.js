// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../services/api';
import { getPushNotificationToken } from '../services/firebase';
import Swal from 'sweetalert2';

const AuthContext = createContext();

// Browser location providers often emit tiny Wi-Fi/GPS corrections every few
// seconds. They should not reload the Feed unless the consumer actually moved.
const locationChangedMeaningfully = (previous, next) => {
  if (!previous) return true;
  const toRadians = (value) => value * (Math.PI / 180);
  const dLat = toRadians(next.latitude - previous.latitude);
  const dLon = toRadians(next.longitude - previous.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(previous.latitude)) * Math.cos(toRadians(next.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) >= 100;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // A full app start is intentionally a fresh session. This prevents browser
  // tab/session restoration from reopening yesterday's protected route.
  const [token, setToken] = useState(() => {
    localStorage.removeItem('token');
    return null;
  });
  const userRole = user?.role;
  const userId = user?._id || user?.id;
  const [consumerLocation, setConsumerLocation] = useState(null);
  const [consumerLocationStatus, setConsumerLocationStatus] = useState('idle');
  const locationRequestRef = useRef(null);
  const lastSyncedConsumerLocationRef = useRef(null);

  const savedConsumerLocation = useCallback(() => {
    const latitude = Number(user?.latitude);
    const longitude = Number(user?.longitude);
    return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
      ? { latitude, longitude } : null;
  }, [user]);

  const syncConsumerLocation = useCallback((coordinates) => {
    if (!coordinates || !locationChangedMeaningfully(lastSyncedConsumerLocationRef.current, coordinates)) return;
    lastSyncedConsumerLocationRef.current = coordinates;
    api.put('/auth/location', coordinates).catch((error) => {
      // A future meaningful GPS update will retry; location failure must not
      // prevent nearby listings or normal app use.
      lastSyncedConsumerLocationRef.current = null;
      console.warn('Consumer location sync failed:', error.message);
    });
  }, []);

  // Single shared source of truth for every consumer surface. A saved profile
  // location is intentional (and may have been entered manually for a
  // delivery-area test), so never silently replace it with browser GPS.
  // Consumers without saved coordinates still use GPS as a fallback.
  const refreshConsumerLocation = useCallback(() => {
    if (userRole !== 'consumer') return Promise.resolve(null);
    if (locationRequestRef.current) return locationRequestRef.current;
    const fallback = savedConsumerLocation();
    if (fallback) {
      setConsumerLocation((previous) => locationChangedMeaningfully(previous, fallback) ? fallback : previous);
      setConsumerLocationStatus('profile');
      return Promise.resolve(fallback);
    }
    setConsumerLocationStatus('requesting');
    locationRequestRef.current = new Promise((resolve) => {
      const finish = (coordinates, status) => {
        setConsumerLocation((previous) => locationChangedMeaningfully(previous, coordinates) ? coordinates : previous);
        setConsumerLocationStatus(status);
        if (status === 'gps') syncConsumerLocation(coordinates);
        locationRequestRef.current = null;
        resolve(coordinates);
      };
      if (!navigator.geolocation) return finish(fallback, fallback ? 'fallback' : 'unsupported');
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => finish({ latitude: coords.latitude, longitude: coords.longitude }, 'gps'),
        () => finish(fallback, fallback ? 'fallback' : 'denied'),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 5 * 60 * 1000 },
      );
    });
    return locationRequestRef.current;
  }, [savedConsumerLocation, syncConsumerLocation, userRole]);

  useEffect(() => {
    if (userRole !== 'consumer') { setConsumerLocation(null); setConsumerLocationStatus('idle'); return undefined; }
    refreshConsumerLocation();
    // Once a profile location exists it remains the coordinate used by Find
    // Food. The Profile page's "Use Current Location" action explicitly
    // updates it when the consumer wants to move the search area.
    if (savedConsumerLocation() || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setConsumerLocation((previous) => locationChangedMeaningfully(previous, next) ? next : previous);
        setConsumerLocationStatus('gps');
        syncConsumerLocation(next);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5 * 60 * 1000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [refreshConsumerLocation, savedConsumerLocation, syncConsumerLocation, userRole]);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (userRole !== 'consumer') return;

    // FCM is registered once a consumer signs in. It is intentionally only a
    // background channel; foreground UI continues to use Socket.IO.
    getPushNotificationToken()
      .then((fcmToken) => fcmToken && api.put('/auth/fcm-token', { token: fcmToken }))
      .catch((error) => console.warn('Push notifications are unavailable:', error.message));
  }, [userId, userRole]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      // The response is the user object directly
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, expectedRole) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Check role if expectedRole is provided
      if (expectedRole && user.role !== expectedRole) {
        throw new Error(`This account is registered as a ${user.role}. Please select that role and try again.`);
      }
      
      localStorage.setItem('token', token);
      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const logout = async () => {
    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Log out?',
      text: 'You will need to sign in again to access your account.',
      showCancelButton: true,
      confirmButtonText: 'Log out',
      cancelButtonText: 'Stay signed in',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) return false;

    const fcmToken = localStorage.getItem('fcmToken');
    if (fcmToken) api.delete('/auth/fcm-token', { data: { token: fcmToken } }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('fcmToken');
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    await Swal.fire({
      icon: 'success',
      title: 'Logged out',
      timer: 1000,
      showConfirmButton: false,
    });
    return true;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    consumerLocation,
    consumerLocationStatus,
    refreshConsumerLocation,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
