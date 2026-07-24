/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDTzVAQZdjQdIi4uOTknXK7KlQfUdNpC_U',
  authDomain: 'stock2serve-223259.firebaseapp.com',
  projectId: 'stock2serve-223259',
  storageBucket: 'stock2serve-223259.firebasestorage.app',
  messagingSenderId: '210359215316',
  appId: '1:210359215316:web:9a8af150a0c14a5987c741',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'Stock2Serve', {
    body: data.body || '',
    icon: '/stock2serve.png',
    requireInteraction: true,
    data: { link: data.link || '/consumer/feed' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || '/consumer/feed', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    return existing ? existing.focus().then(() => existing.navigate(target)) : clients.openWindow(target);
  }));
});
