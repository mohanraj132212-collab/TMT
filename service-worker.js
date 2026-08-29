// service-worker.js
// Caches static app shell for offline boot and handles FCM background push notifications.

importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp({
    apiKey: "AIzaSyBOmsA0zbKekxhKRrHciaEG8AFpcqESIgE",
    authDomain: "private-team-management.firebaseapp.com",
    projectId: "private-team-management",
    storageBucket: "private-team-management.firebasestorage.app",
    messagingSenderId: "756488795937",
    appId: "1:756488795937:web:b1548123ce450e5b59f060",
    measurementId: "G-BQZLXJ9Z8J",
  });

  const fcmMessaging = firebase.messaging();
  fcmMessaging.onBackgroundMessage((payload) => {
    console.log("[service-worker.js] FCM background payload:", payload);
    const title = payload.notification?.title || payload.data?.title || "TMT Message";
    const body = payload.notification?.body || payload.data?.body || "New notification";
    const icon = payload.notification?.icon || payload.data?.icon || "./assets/images/logo.png";
    const targetUrl = payload.data?.url || payload.notification?.url || "./index.html#/home";

    self.registration.showNotification(title, {
      body,
      icon,
      badge: "./assets/images/logo.png",
      data: { url: targetUrl },
      vibrate: [200, 100, 200],
      tag: "tmt-fcm-notification",
      renotify: true,
    });
  });
}

const CACHE_NAME = "tmt-shell-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/components.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/firebase.js",
  "./js/utils.js",
  "./js/icons.js",
  "./js/team.js",
  "./js/auth.js",
  "./js/storage.js",
  "./js/voice.js",
  "./js/profile.js",
  "./js/work.js",
  "./js/private.js",
  "./js/events.js",
  "./js/dashboard.js",
  "./js/notifications.js",
  "./js/reactions.js",
  "./assets/images/logo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ============================================================
   PUSH & NOTIFICATION HANDLING
   ============================================================ */

// FCM / Web Push Event Listener
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || "TMT Message";
  const options = {
    body: data.body || data.notification?.body || "You have a new message.",
    icon: data.icon || data.notification?.icon || "./assets/images/logo.png",
    badge: "./assets/images/logo.png",
    data: {
      url: data.url || data.data?.url || "./index.html",
    },
    vibrate: [200, 100, 200],
    tag: "tmt-push-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// PostMessage notification trigger from application client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PUSH_NOTIFICATION") {
    const { title, body, url } = event.data;
    self.registration.showNotification(title, {
      body: body || "New notification",
      icon: "./assets/images/logo.png",
      badge: "./assets/images/logo.png",
      data: { url: url || "./index.html" },
      vibrate: [200, 100, 200],
      tag: "tmt-client-notification",
      renotify: true,
    });
  }
});

// Notification click handler: opens or focuses the PWA tab and navigates to route
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (targetUrl && client.navigate) {
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

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase/Google API calls — always go live to the network.
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebasestorage") ||
    url.hostname.includes("gstatic.com")
  ) {
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || networkFetch;
    })
  );
});
