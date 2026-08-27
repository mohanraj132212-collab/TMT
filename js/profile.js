// profile.js
// Reading/updating the current member's own profile document in Firestore.
// This is the only place profile fields are written from the client.

import { db, doc, getDoc, updateDoc, serverTimestamp } from "./firebase.js";
import { normalizePhone, compressImageToDataUrl } from "./utils.js";
import { invalidateTeamCache } from "./team.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

export async function updateProfileName(memberId, name) {
  await updateDoc(doc(db, "teamMembers", memberId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
  invalidateTeamCache();
}

export async function updateProfilePhone(memberId, phone) {
  await updateDoc(doc(db, "teamMembers", memberId), {
    phone: normalizePhone(phone),
    updatedAt: serverTimestamp(),
  });
  invalidateTeamCache();
}

/** Crop, resize, compress profile photo, upload to Cloudinary, update Firestore, and delete old Cloudinary asset. */
export async function updateProfilePhoto(memberId, file) {
  // Read existing profile to capture old Cloudinary public_id for safe deletion after update
  let oldPublicId = null;
  try {
    const snap = await getDoc(doc(db, "teamMembers", memberId));
    if (snap.exists()) {
      oldPublicId = snap.data()?.profilePhotoPublicId || null;
    }
  } catch (e) {
    console.warn("Could not read old profilePhotoPublicId:", e);
  }

  // Compress image to 256x256 1:1 canvas data URL for fast uploading & optimal avatar display
  const compressedDataUrl = await compressImageToDataUrl(file, 256, 256, 0.85);

  // Upload compressed avatar to Cloudinary
  const { secureUrl, publicId } = await uploadToCloudinary(compressedDataUrl, `profile_${memberId}.jpg`);

  // Update Firestore document with new URL & publicId
  await updateDoc(doc(db, "teamMembers", memberId), {
    profilePhoto: secureUrl,
    profilePhotoPublicId: publicId || null,
    updatedAt: serverTimestamp(),
  });
  invalidateTeamCache();

  // Safely delete old Cloudinary photo after Firestore update succeeds
  if (oldPublicId && oldPublicId !== publicId) {
    deleteFromCloudinary(oldPublicId, "image");
  }

  return secureUrl;
}



const THEME_KEY = "tmt.theme";

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

export function setStoredTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}
