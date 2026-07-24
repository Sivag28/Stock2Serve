# Stock2Serve

## Push notifications

Socket.IO remains the foreground real-time channel. FCM is used only when a
consumer does not have a live authenticated Socket.IO connection:

- a new active listing notifies consumers within the existing 10 km nearby-feed radius;
- pickup reminders are checked every 30 seconds and sent once when a claimed token has 30 minutes or less remaining.

To enable actual sends, configure Firebase Admin credentials on the backend.
Copy the credential shape in [backend/.env.example](backend/.env.example) into
`backend/.env` using either `GOOGLE_APPLICATION_CREDENTIALS` or
`FIREBASE_SERVICE_ACCOUNT_JSON`. The browser Firebase project configuration and
VAPID key are already wired into the frontend; users must grant browser
notification permission and the app must be served over HTTPS (localhost is
allowed for development).
A hyper-local platform connecting local food businesses with nearby consumers to sell surplus fresh food through real-time flash sales, reducing food waste and promoting sustainable consumption.
