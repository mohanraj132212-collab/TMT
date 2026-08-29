// firebase.js
// Firebase configuration only.
// No personal team member information here.
// All team member / event / work / reminder data lives in Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging.js";

// Your web app's Firebase configuration.
// This is safe to expose client-side; access is controlled by Firestore security rules.
const firebaseConfig = {
  apiKey: "AIzaSyBOmsA0zbKekxhKRrHciaEG8AFpcqESIgE",
  authDomain: "private-team-management.firebaseapp.com",
  projectId: "private-team-management",
  storageBucket: "private-team-management.firebasestorage.app",
  messagingSenderId: "756488795937",
  appId: "1:756488795937:web:b1548123ce450e5b59f060",
  measurementId: "G-BQZLXJ9Z8J",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let messaging = null;
isMessagingSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {});

// Enable offline persistence where possible (best-effort; ignore errors on
// unsupported browsers or multiple open tabs).
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {
  /* no-op */
}

export {
  messaging,
  getToken,
  onMessage,
  isMessagingSupported,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
};


