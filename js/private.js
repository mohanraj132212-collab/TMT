// private.js
// Personal reminders. Every read is filtered by memberId so a member never
// sees another member's reminders — the Firestore security rules enforce
// this server-side as well (see firestore.rules).

import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "./firebase.js";

export async function getMyReminders(memberId) {
  const q = query(
    collection(db, "privateReminders"),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addReminder(memberId, { title, description, reminderDate, reminderTime }) {
  return addDoc(collection(db, "privateReminders"), {
    memberId,
    title: title.trim(),
    description: description?.trim() || "",
    reminderDate: reminderDate || null,
    reminderTime: reminderTime || null,
    completed: false,
    createdAt: serverTimestamp(),
  });
}

export async function updateReminder(reminderId, fields) {
  await updateDoc(doc(db, "privateReminders", reminderId), fields);
}

export async function toggleReminderComplete(reminderId, completed) {
  await updateDoc(doc(db, "privateReminders", reminderId), { completed });
}

export async function deleteReminder(reminderId) {
  await deleteDoc(doc(db, "privateReminders", reminderId));
}
