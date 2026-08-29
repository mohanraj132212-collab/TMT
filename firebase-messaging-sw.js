// firebase-messaging-sw.js
// Firebase Cloud Messaging Background Service Worker for Android / Web Push

importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBOmsA0zbKekxhKRrHciaEG8AFpcqESIgE",
  authDomain: "private-team-management.firebaseapp.com",
  projectId: "private-team-management",
  storageBucket: "private-team-management.firebasestorage.app",
  messagingSenderId: "756488795937",
  appId: "1:756488795937:web:b1548123ce450e5b59f060",
  measurementId: "G-BQZLXJ9Z8J",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background payload:", payload);

  const title = payload.notification?.title || payload.data?.title || "TMT Message";
  const body = payload.notification?.body || payload.data?.body || "New notification";
  const icon = payload.notification?.icon || payload.data?.icon || "./assets/images/logo.png";
  const targetUrl = payload.data?.url || payload.notification?.url || "./index.html#/home";

  const options = {
    body,
    icon,
    badge: "./assets/images/logo.png",
    data: { url: targetUrl },
    vibrate: [200, 100, 200],
    tag: "tmt-fcm-notification",
    renotify: true,
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html#/home";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
