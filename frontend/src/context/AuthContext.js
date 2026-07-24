// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { getPushNotificationToken } from '../services/firebase';
import Swal from 'sweetalert2';

const AuthContext = createContext();

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
