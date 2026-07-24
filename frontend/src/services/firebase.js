import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// These values identify the Firebase web app and are safe to ship to the
// browser. Deployment-specific values can override them through CRA env vars.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDTzVAQZdjQdIi4uOTknXK7KlQfUdNpC_U',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'stock2serve-223259.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'stock2serve-223259',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'stock2serve-223259.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '210359215316',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:210359215316:web:9a8af150a0c14a5987c741',
};

const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BItpARTbm5haKaz2qB_LCDuQIwSZewcAKiOq_hqWilKF3YzoYWGldoRagocmSN3iEK3GCNBmaPgZ8mmlNmc8Vi0';
const firebaseApp = initializeApp(firebaseConfig);

// This deliberately does not register an onMessage handler: foreground
// updates are owned by Socket.IO, while this service only enables background
// and closed-tab browser notifications.
export const getPushNotificationToken = async () => {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log("Service Worker or Notification API not supported");
    return null;
  }

  if (!(await isSupported())) {
    console.log("Firebase Messaging not supported");
    return null;
  }

  const permission = await Notification.requestPermission();
  console.log("Permission:", permission);

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  console.log("Service Worker registered:", registration);

  // Wait until the service worker is active
  const readyRegistration = await navigator.serviceWorker.ready;
  console.log("Service Worker ready:", readyRegistration);

  try {
    const token = await getToken(getMessaging(firebaseApp), {
      vapidKey,
      serviceWorkerRegistration: readyRegistration,
    });

    console.log("FCM Token:", token);

    if (token) {
      localStorage.setItem("fcmToken", token);
    }

    return token;
  } catch (err) {
    console.error("Error getting FCM token:", err);
    return null;
  }
};