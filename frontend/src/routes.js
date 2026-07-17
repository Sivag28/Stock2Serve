import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';

import MerchantDashboard from './pages/Merchant/Dashboard/Dashboard';
import MerchantProfile from './pages/Merchant/Profile/Profile';
import ConsumerFeed from './pages/Consumer/Feed/Feed';
import ConsumerProfile from './pages/Consumer/Profile/Profile';

import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/merchant/dashboard"
        element={
          <ProtectedRoute role="merchant">
            <MerchantDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/profile"
        element={
          <ProtectedRoute role="merchant">
            <MerchantProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/consumer/feed"
        element={
          <ProtectedRoute role="consumer">
            <ConsumerFeed />
          </ProtectedRoute>
        }
      />

      <Route
        path="/consumer/profile"
        element={
          <ProtectedRoute role="consumer">
            <ConsumerProfile />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;