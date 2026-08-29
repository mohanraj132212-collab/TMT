// notifications.js
// FCM & Web Push Notification Handler

import { db, doc, updateDoc, getDoc, messaging, getToken, onMessage, isMessagingSupported, arrayUnion, arrayRemove } from "./firebase.js";

const LOCAL_PREF_KEY = "tmt_push_notification_enabled";

/** Check if browser/device supports Push Notifications. */
export function isPushSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

/** Check browser/device level notification permission ('granted', 'denied', or 'default'). */
export function getNotificationPermissionState() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/** Get in-app notification preference for current member (defaults to true if permission is granted). */
export async function getUserNotificationPreference(memberId) {
  if (localStorage.getItem(LOCAL_PREF_KEY) !== null) {
    return localStorage.getItem(LOCAL_PREF_KEY) === "true";
  }
  if (!memberId) return getNotificationPermissionState() === "granted";

  try {
    const snap = await getDoc(doc(db, "teamMembers", memberId));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.notificationEnabled === "boolean") {
        localStorage.setItem(LOCAL_PREF_KEY, String(data.notificationEnabled));
        return data.notificationEnabled;
      }
    }
  } catch (e) {
    console.warn("Could not read notification preference from Firestore:", e);
  }

  const defaultVal = getNotificationPermissionState() === "granted";
  localStorage.setItem(LOCAL_PREF_KEY, String(defaultVal));
  return defaultVal;
}

/** Set in-app notification preference for current member in Firestore & localStorage. */
export async function setUserNotificationPreference(memberId, enabled) {
  localStorage.setItem(LOCAL_PREF_KEY, String(enabled));
  if (!memberId) return;

  try {
    await updateDoc(doc(db, "teamMembers", memberId), {
      notificationEnabled: !!enabled,
      updatedAt: new Date(),
    });
  } catch (e) {
    console.warn("Could not update notification preference in Firestore:", e);
  }
}

/** Register FCM token for the current device and add to user's fcmTokens array in Firestore. */
export async function registerFCMToken(memberId) {
  if (!memberId || !isPushSupported()) return null;

  try {
    const swReg = await navigator.serviceWorker.ready;
    const supported = await isMessagingSupported();

    if (supported && messaging) {
      const token = await getToken(messaging, { serviceWorkerRegistration: swReg });
      if (token) {
        await updateDoc(doc(db, "teamMembers", memberId), {
          fcmTokens: arrayUnion(token),
          notificationEnabled: true,
          updatedAt: new Date(),
        });
        localStorage.setItem("tmt_fcm_token", token);
        return token;
      }
    }
  } catch (err) {
    console.warn("FCM registration token error:", err);
  }
  return null;
}

/** Unregister FCM token for the current device from user's fcmTokens array in Firestore. */
export async function unregisterFCMToken(memberId) {
  if (!memberId) return;
  const token = localStorage.getItem("tmt_fcm_token");
  if (!token) return;

  try {
    await updateDoc(doc(db, "teamMembers", memberId), {
      fcmTokens: arrayRemove(token),
      notificationEnabled: false,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.warn("FCM unregister token error:", err);
  }
}

/** Main notification setup on login/boot. Requests permission once if default. */
export async function setupNotifications(memberId) {
  if (!isPushSupported() || !memberId) return false;

  const currentPerm = getNotificationPermissionState();

  // If permission not yet requested, ask permission ONCE on initial setup
  if (currentPerm === "default") {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await setUserNotificationPreference(memberId, true);
        await registerFCMToken(memberId);
      } else {
        await setUserNotificationPreference(memberId, false);
      }
    } catch (e) {
      console.warn("Notification permission request error:", e);
    }
  } else if (currentPerm === "granted") {
    const isEnabled = await getUserNotificationPreference(memberId);
    if (isEnabled) {
      await registerFCMToken(memberId);
    }
  } else if (currentPerm === "denied") {
    await setUserNotificationPreference(memberId, false);
  }

  // Setup FCM foreground message handler
  try {
    const supported = await isMessagingSupported();
    if (supported && messaging) {
      onMessage(messaging, (payload) => {
        const { title, body, icon, url } = payload.notification || payload.data || {};
        if (title) {
          showNotificationPopup(title, body, icon || "assets/images/logo.png", url);
        }
      });
    }
  } catch (e) {
    /* no-op */
  }

  return true;
}

/** Display an OS-level system notification via Service Worker registration. */
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

    new Notification(title, {
      body,
      icon,
      data: { url: url || location.href },
    });
  } catch (err) {
    console.error("Failed to show system notification:", err);
  }
}

/** Broadcast message event to recipient clients (foreground/background SW). */
export async function notifyNewMessage({ senderName, text, isVoice = false, routeUrl = "" }) {
  const title = senderName || "TMT Message";
  const body = isVoice ? "🎤 Voice message" : text || "New message";

  if (document.visibilityState === "hidden" || document.hidden) {
    await showNotificationPopup(title, body, "assets/images/logo.png", routeUrl);
  } else {
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
