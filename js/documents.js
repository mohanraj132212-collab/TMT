// documents.js
// Team documents & file sharing collection access.
// Stores metadata and Cloudinary URLs ONLY — never binary/Base64/Blob data inside Firestore.

import {
  db,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "./firebase.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

export function getFileTypeCategory(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  return "document";
}

/** Fetch all team document metadata records from Firestore. */
export async function getAllDocuments() {
  try {
    const snap = await getDocs(collection(db, "documents"));
    return snap.docs
      .map((d) => ({ id: d.id, fileId: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (err) {
    console.error("getAllDocuments error:", err);
    return [];
  }
}

/** Subscribe to real-time updates for team documents. */
export function listenToDocuments(onChange, onError) {
  return onSnapshot(
    collection(db, "documents"),
    (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, fileId: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      onChange(docs);
    },
    (err) => {
      console.error("listenToDocuments error:", err);
      onError?.(err);
    }
  );
}

/** Upload actual file to Cloudinary, then save ONLY metadata + secure_url + publicId in Firestore. */
export async function uploadDocument(file, senderMember) {
  if (!file) throw new Error("No file selected.");

  // Upload file to Cloudinary
  const { secureUrl, publicId, bytes, mimeType } = await uploadToCloudinary(file, file.name);
  const fileCategory = getFileTypeCategory(mimeType || file.type);

  // Save metadata to Firestore
  const docRef = await addDoc(collection(db, "documents"), {
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

/** Replace an existing document with a new file and clean up the old Cloudinary asset. */
export async function updateDocument(docId, newFile, senderMember) {
  if (!newFile) throw new Error("No replacement file selected.");

  let oldPublicId = null;
  let oldCategory = "raw";
  try {
    const snap = await getDoc(doc(db, "documents", docId));
    if (snap.exists()) {
      const data = snap.data();
      oldPublicId = data.cloudinaryPublicId || data.publicId || null;
      oldCategory = data.fileType || "raw";
    }
  } catch (e) {
    console.warn("Could not read old document publicId:", e);
  }

  const { secureUrl, publicId, bytes, mimeType } = await uploadToCloudinary(newFile, newFile.name);
  const newCategory = getFileTypeCategory(mimeType || newFile.type);

  await updateDoc(doc(db, "documents", docId), {
    senderId: senderMember.id,
    senderName: senderMember.name,
    fileName: newFile.name,
    fileType: newCategory,
    mimeType: mimeType || newFile.type || "application/octet-stream",
    fileSize: bytes || newFile.size || 0,
    cloudinaryUrl: secureUrl,
    cloudinaryPublicId: publicId || null,
    publicId: publicId || null,
    updatedAt: serverTimestamp(),
  });

  if (oldPublicId && oldPublicId !== publicId) {
    const resourceType = oldCategory === "image" ? "image" : oldCategory === "video" || oldCategory === "audio" ? "video" : "raw";
    deleteFromCloudinary(oldPublicId, resourceType);
  }

  return { id: docId, cloudinaryUrl: secureUrl };
}

/** Delete a document record from Firestore and remove the file from Cloudinary. */
export async function deleteDocument(docId) {
  let oldPublicId = null;
  let fileCategory = "raw";
  try {
    const snap = await getDoc(doc(db, "documents", docId));
    if (snap.exists()) {
      const data = snap.data();
      oldPublicId = data.cloudinaryPublicId || data.publicId || null;
      fileCategory = data.fileType || "raw";
    }
  } catch (e) {
    console.warn("Could not read document publicId for deletion:", e);
  }

  if (oldPublicId) {
    const resourceType = fileCategory === "image" ? "image" : fileCategory === "video" || fileCategory === "audio" ? "video" : "raw";
    deleteFromCloudinary(oldPublicId, resourceType);
  }

  await deleteDoc(doc(db, "documents", docId));
}
