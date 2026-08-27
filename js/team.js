// team.js
// All access to the `teamMembers` Firestore collection.
// No team member data is ever hardcoded here — everything is read live
// from Firestore, which the administrator populates manually.

import { db, collection, getDocs, getDoc, doc, query, where, onSnapshot } from "./firebase.js";

let cache = null; // { id: {...} }
let cacheTime = 0;
const CACHE_TTL = 60_000;

/** Fetch all team members (optionally including inactive ones). */
export async function getAllTeamMembers({ force = false, includeInactive = false } = {}) {
  const now = Date.now();
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return Object.values(cache).filter((m) => includeInactive || m.active !== false);
  }
  const snap = await getDocs(collection(db, "teamMembers"));
  cache = {};
  snap.forEach((d) => {
    cache[d.id] = { id: d.id, ...d.data() };
  });
  cacheTime = now;
  return Object.values(cache).filter((m) => includeInactive || m.active !== false);
}

export async function getTeamMemberById(memberId) {
  if (cache && cache[memberId]) return cache[memberId];
  const snap = await getDoc(doc(db, "teamMembers", memberId));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  cache = cache || {};
  cache[memberId] = data;
  return data;
}

/** Look up a member document by phone number (digits-only comparison). */
export async function findMemberByPhone(normalizedPhone) {
  const members = await getAllTeamMembers({ includeInactive: true });
  return (
    members.find((m) => (m.phone || "").replace(/[^\d]/g, "").endsWith(normalizedPhone) ||
      normalizedPhone.endsWith((m.phone || "").replace(/[^\d]/g, ""))) || null
  );
}

export function invalidateTeamCache() {
  cache = null;
}

export function getCachedMember(memberId) {
  return cache ? cache[memberId] : null;
}

/** Subscribe to live updates for all team members (for real-time profile picture sync). */
export function subscribeTeamMembers(onChange) {
  return onSnapshot(collection(db, "teamMembers"), (snap) => {
    cache = cache || {};
    snap.forEach((d) => {
      cache[d.id] = { id: d.id, ...d.data() };
    });
    cacheTime = Date.now();
    const members = Object.values(cache).filter((m) => m.active !== false);
    onChange?.(members, cache);
  });
}

