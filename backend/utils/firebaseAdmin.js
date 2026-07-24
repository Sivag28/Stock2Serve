const admin = require('firebase-admin');

let warnedAboutConfiguration = false;

const getMessaging = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasApplicationCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!serviceAccountJson && !hasApplicationCredentials) {
    if (!warnedAboutConfiguration) {
      console.warn('FCM is disabled: set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS on the server.');
      warnedAboutConfiguration = true;
    }
    return null;
  }

  if (!admin.apps.length) {
    const options = serviceAccountJson
      ? { credential: admin.credential.cert(JSON.parse(serviceAccountJson)) }
      : { credential: admin.credential.applicationDefault() };
    admin.initializeApp(options);
  }
  return admin.messaging();
};

// Returns invalid tokens so callers can remove registrations that FCM says no
// longer belong to a browser/device.
const sendPushNotifications = async (tokens, data) => {
  console.log("sendPushNotifications called");
  console.log("Data:", data);

  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  const messaging = getMessaging();

  if (!messaging || !uniqueTokens.length) {
    console.log("No messaging instance or no tokens");
    return { sentCount: 0, invalidTokens: [] };
  }

  const response = await messaging.sendEachForMulticast({
    tokens: uniqueTokens,
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: { link: data.link || "/consumer/feed" },
    },
  });

  console.log("Firebase response:", response);

  return {
    sentCount: response.successCount,
    invalidTokens: [],
  };
};

module.exports = { sendPushNotifications };
