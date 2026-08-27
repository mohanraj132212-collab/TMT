// events.js
// Events, their nested works, and each work's checklist/procedure items.
// Structure:
//   events/{eventId}
//   events/{eventId}/works/{workId}
//   events/{eventId}/works/{workId}/checks/{checkId}

import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "./firebase.js";
import { uploadToCloudinary } from "./cloudinary.js";


export const CHECK_STATUSES = ["Pending", "Checking", "Ready", "Problem"];

/* ---------------- Events ---------------- */

export async function getAllEvents() {
  const q = query(collection(db, "events"), orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, "events", eventId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createEvent(data, createdBy) {
  const ref = await addDoc(collection(db, "events"), {
    name: data.name.trim(),
    description: data.description?.trim() || "",
    date: data.date || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    location: data.location?.trim() || "",
    memberIds: data.memberIds || [],
    notes: data.notes?.trim() || "",
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(eventId, fields) {
  await updateDoc(doc(db, "events", eventId), { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteEvent(eventId) {
  try {
    const worksSnap = await getDocs(collection(db, "events", eventId, "works"));
    for (const w of worksSnap.docs) {
      const checksSnap = await getDocs(collection(db, "events", eventId, "works", w.id, "checks"));
      for (const c of checksSnap.docs) {
        await deleteDoc(doc(db, "events", eventId, "works", w.id, "checks", c.id)).catch(() => {});
      }
      await deleteDoc(doc(db, "events", eventId, "works", w.id)).catch(() => {});
    }
    const filesSnap = await getDocs(collection(db, "events", eventId, "files"));
    for (const f of filesSnap.docs) {
      await deleteDoc(doc(db, "events", eventId, "files", f.id)).catch(() => {});
    }
  } catch (e) {
    console.warn("Error cleaning up subcollections for event", eventId, e);
  }
  await deleteDoc(doc(db, "events", eventId));
}


/* ---------------- Event works ---------------- */

export async function getEventWorks(eventId) {
  const q = query(collection(db, "events", eventId, "works"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEventWork(eventId, workId) {
  const snap = await getDoc(doc(db, "events", eventId, "works", workId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createEventWork(eventId, { name, description, assignedMemberIds }) {
  const ref = await addDoc(collection(db, "events", eventId, "works"), {
    name: name.trim(),
    description: description?.trim() || "",
    assignedMemberIds: assignedMemberIds || [],
    status: "Pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEventWork(eventId, workId, fields) {
  await updateDoc(doc(db, "events", eventId, "works", workId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEventWork(eventId, workId) {
  await deleteDoc(doc(db, "events", eventId, "works", workId));
}

/* ---------------- Checklist items ---------------- */

export async function getWorkChecks(eventId, workId) {
  const q = query(
    collection(db, "events", eventId, "works", workId, "checks"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addWorkCheck(eventId, workId, { title, description, assignedMemberIds }) {
  const ref = await addDoc(collection(db, "events", eventId, "works", workId, "checks"), {
    title: title.trim(),
    description: description?.trim() || "",
    status: "Pending",
    assignedMemberIds: assignedMemberIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWorkCheckStatus(eventId, workId, checkId, status) {
  await updateDoc(doc(db, "events", eventId, "works", workId, "checks", checkId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWorkCheck(eventId, workId, checkId) {
  await deleteDoc(doc(db, "events", eventId, "works", workId, "checks", checkId));
}

/* ---------------- Progress helpers ---------------- */

/** Compute Ready/Pending/Problem counts + overall % from a flat list of checks. */
export function computeProgress(checks) {
  const total = checks.length;
  const ready = checks.filter((c) => c.status === "Ready").length;
  const problem = checks.filter((c) => c.status === "Problem").length;
  const pending = total - ready - problem;
  const percent = total === 0 ? 0 : Math.round((ready / total) * 100);
  return { total, ready, pending, problem, percent };
}

/* ---------------- Event Files (Cloudinary storage) ---------------- */

export function getFileTypeCategory(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("sheet")) return "document";
  return "document";
}

export async function getEventFiles(eventId) {
  const q = query(collection(db, "events", eventId, "files"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, fileId: d.id, ...d.data() }));
}

export function listenToEventFiles(eventId, onChange) {
  const q = query(collection(db, "events", eventId, "files"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const files = snap.docs.map((d) => ({ id: d.id, fileId: d.id, ...d.data() }));
    onChange(files);
  });
}

/** Upload a file attachment for an event to Cloudinary and record metadata in Firestore. */
export async function uploadEventFile(eventId, file, senderMember) {
  if (!file) throw new Error("No file selected.");

  // Upload actual file to Cloudinary
  const { secureUrl, publicId, bytes, mimeType } = await uploadToCloudinary(file, file.name);
  const fileCategory = getFileTypeCategory(mimeType || file.type);

  // Save metadata only in Firestore
  const docRef = await addDoc(collection(db, "events", eventId, "files"), {
    eventId,
    senderId: senderMember.id,
    senderName: senderMember.name,
    fileName: file.name,
    fileType: fileCategory,
    mimeType: mimeType || file.type || "application/octet-stream",
    fileSize: bytes || file.size || 0,
    cloudinaryUrl: secureUrl,
    cloudinaryPublicId: publicId || null,
    publicId: publicId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, fileId: docRef.id, cloudinaryUrl: secureUrl };
}

export async function deleteEventFile(eventId, fileId) {
  let oldPublicId = null;
  let fileCategory = "raw";
  try {
    const snap = await getDoc(doc(db, "events", eventId, "files", fileId));
    if (snap.exists()) {
      const data = snap.data();
      oldPublicId = data.cloudinaryPublicId || data.publicId || null;
      fileCategory = data.fileType || "raw";
    }
  } catch (e) {
    console.warn("Could not read event file publicId for deletion:", e);
  }

  if (oldPublicId) {
    const resourceType = fileCategory === "image" ? "image" : fileCategory === "video" || fileCategory === "audio" ? "video" : "raw";
    deleteFromCloudinary(oldPublicId, resourceType);
  }

  await deleteDoc(doc(db, "events", eventId, "files", fileId));
}
