// auth.js
// TMT has no signup/registration. A person can only enter the app if their
// phone number already exists as a document in the `teamMembers` collection
// (created manually by the administrator directly in Firebase).

import { normalizePhone, saveSession, getSession, clearSession } from "./utils.js";
import { findMemberByPhone, getTeamMemberById } from "./team.js";

let currentMember = null;

export function getCurrentMember() {
  return currentMember;
}

export function setCurrentMember(member) {
  currentMember = member;
}

/** Try to resume a session saved in localStorage. Returns the member or null. */
export async function tryResumeSession() {
  const session = getSession();
  if (!session?.memberId) return null;
  try {
    const member = await getTeamMemberById(session.memberId);
    if (member && member.active !== false) {
      currentMember = member;
      return member;
    }
  } catch (e) {
    console.error("Failed to resume session", e);
  }
  clearSession();
  return null;
}

/**
 * Look up a phone number against Firestore.
 * Returns { ok: true, member } or { ok: false, reason }.
 */
export async function loginWithPhone(rawPhone) {
  const normalized = normalizePhone(rawPhone);
  if (normalized.length < 6) {
    return { ok: false, reason: "Enter a valid mobile number." };
  }
  const member = await findMemberByPhone(normalized);
  if (!member) {
    return { ok: false, reason: "This mobile number is not registered with TMT." };
  }
  if (member.active === false) {
    return { ok: false, reason: "This account is inactive. Contact your team admin." };
  }
  currentMember = member;
  saveSession(member.id, normalized);
  return { ok: true, member };
}

export function logout() {
  currentMember = null;
  clearSession();
}
