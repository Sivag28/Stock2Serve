import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';

// This persistent authenticated socket lets the server distinguish an open
// consumer app from a background/closed one. Existing page Socket.IO listeners
// remain responsible for their own real-time data refreshes.
const ForegroundNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'consumer') return undefined;
    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('token'), foreground: document.visibilityState === 'visible' },
      transports: ['websocket', 'polling'],
    });
    const showReminder = () => toast((notification) => (
      <div className="flex items-center gap-3">
        <span>Pickup Reminder: Your pickup token expires in 30 minutes.</span>
        <button
          type="button"
          onClick={() => toast.dismiss(notification.id)}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Dismiss
        </button>
      </div>
    ), { duration: Infinity, id: 'pickup-reminder' });
    const showNearbyListing = ({ title, body }) => toast((notification) => (
      <div className="flex items-center gap-3">
        <span><strong>{title || 'New Food Available'}</strong><br />{body}</span>
        <button
          type="button"
          onClick={() => toast.dismiss(notification.id)}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Dismiss
        </button>
      </div>
    ), { duration: 8000, id: 'nearby-listing' });
    const updateVisibility = () => socket.emit('app-visibility', { foreground: document.visibilityState === 'visible' });
    socket.on('pickup-reminder', showReminder);
    socket.on('nearby-listing', showNearbyListing);
    socket.on('connect', updateVisibility);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      socket.off('pickup-reminder', showReminder);
      socket.off('nearby-listing', showNearbyListing);
      socket.off('connect', updateVisibility);
      document.removeEventListener('visibilitychange', updateVisibility);
      socket.disconnect();
    };
  }, [user?.role, user?.id, user?._id]);

  return null;
};

export default ForegroundNotifications;
