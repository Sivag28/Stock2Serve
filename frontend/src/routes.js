import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';

import MerchantDashboard from './pages/Merchant/Dashboard/Dashboard';
import MerchantProfile from './pages/Merchant/Profile/Profile';
import MerchantAddItem from './pages/Merchant/AddItem/AddItem';
import MerchantEditItem from './pages/Merchant/EditItem/EditItem';
import MerchantVerifyPickup from './pages/Merchant/VerifyPickup/VerifyPickup';
import MerchantListings from './pages/Merchant/Listings/Listings';
import ConsumerFeed from './pages/Consumer/Feed/Feed';
import ConsumerMyClaims from './pages/Consumer/MyClaims/MyClaims';
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
        path="/merchant/add-item"
        element={
          <ProtectedRoute role="merchant">
            <MerchantAddItem />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/edit-item/:listingId"
        element={
          <ProtectedRoute role="merchant">
            <MerchantEditItem />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/inventory"
        element={
          <ProtectedRoute role="merchant">
            <MerchantListings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchant/verify-pickup"
        element={
          <ProtectedRoute role="merchant">
            <MerchantVerifyPickup />
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
      <Route
        path="/consumer/claims"
        element={<ProtectedRoute role="consumer"><ConsumerMyClaims /></ProtectedRoute>}
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
