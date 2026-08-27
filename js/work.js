// work.js
// General work assignments, stored top-level in the `works` collection
// (independent of the per-event works under events/{eventId}/works).

import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "./firebase.js";

const STATUSES = ["Pending", "In Progress", "Done"];
export { STATUSES as WORK_STATUSES };

export async function getAllWork() {
  const q = query(collection(db, "works"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createWork({ name, description, assignedMemberIds, dueDate, eventId }) {
  return addDoc(collection(db, "works"), {
    name: name.trim(),
    description: description?.trim() || "",
    assignedMemberIds: assignedMemberIds || [],
    status: "Pending",
    dueDate: dueDate || null,
    eventId: eventId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateWorkStatus(workId, status) {
  await updateDoc(doc(db, "works", workId), { status, updatedAt: serverTimestamp() });
}

export async function updateWork(workId, fields) {
  await updateDoc(doc(db, "works", workId), { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteWork(workId) {
  await deleteDoc(doc(db, "works", workId));
}
