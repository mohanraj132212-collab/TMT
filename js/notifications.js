// notifications.js
// FCM & Web Push Notification Handler

import { db, doc, updateDoc, messaging, getToken, onMessage, isMessagingSupported } from "./firebase.js";

/** Check if push notifications are supported and permitted. */
export function getNotificationPermissionState() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Request notification permission and save FCM token to team member document in Firestore. */
export async function setupNotifications(memberId) {
  if (!("Notification" in window)) {
    console.log("Notifications not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied or dismissed.");
      return false;
    }

    const swReg = await navigator.serviceWorker.ready;
    const supported = await isMessagingSupported();

    if (supported && messaging) {
      try {
        const token = await getToken(messaging, { serviceWorkerRegistration: swReg });
        if (token && memberId) {
          await updateDoc(doc(db, "teamMembers", memberId), {
            fcmToken: token,
            lastNotificationPermission: "granted",
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.warn("FCM getToken failed, falling back to local service worker push:", err);
      }
    }

    // Foreground listener for FCM messages
    if (supported && messaging) {
      onMessage(messaging, (payload) => {
        const { title, body, icon, url } = payload.notification || payload.data || {};
        if (title) {
          showNotificationPopup(title, body, icon || "assets/images/logo.png", url);
        }
      });
    }

    return true;
  } catch (err) {
    console.error("Error setting up notifications:", err);
    return false;
  }
}

/** Display a system notification via Service Worker or Notification API. */
export async function showNotificationPopup(title, body, icon = "assets/images/logo.png", url = "") {
  if (getNotificationPermissionState() !== "granted") return;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: "assets/images/logo.png",
          data: { url: url || location.href },
          vibrate: [200, 100, 200],
          tag: "tmt-notification",
          renotify: true,
        });
        return;
      }
    }

    // Fallback to standard Notification constructor
    new Notification(title, {
      body,
      icon,
      data: { url: url || location.href },
    });
  } catch (err) {
    console.error("Failed to show notification:", err);
  }
}

/** Broadcast notification to recipient clients via Service Worker / local dispatch. */
export async function notifyNewMessage({ senderName, text, isVoice = false, routeUrl = "" }) {
  const title = senderName || "TMT Message";
  const body = isVoice ? "🎤 Voice message" : text || "New message";

  // If page is hidden (minimized, in background, screen locked), trigger SW notification directly
  if (document.visibilityState === "hidden" || document.hidden) {
    await showNotificationPopup(title, body, "assets/images/logo.png", routeUrl);
  } else {
    // If foreground, also send to SW so connected clients receive system alert if needed
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "PUSH_NOTIFICATION",
        title,
        body,
        url: routeUrl,
      });
    }
  }
}
