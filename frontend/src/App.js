// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import { Toaster } from 'react-hot-toast';
import ForegroundNotifications from './components/ForegroundNotifications';
import Stock2ServeAssistant from './components/Stock2ServeAssistant/Stock2ServeAssistant';
import './App.css'; // or your global styles

function App() {
  return (
    <Router>
      <AuthProvider>
        <ForegroundNotifications />
        <AppRoutes />
        <Stock2ServeAssistant />
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;
