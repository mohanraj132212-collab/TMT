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
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "./firebase.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

const MAX_RECORDING_SECONDS = 30;

export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.startTime = 0;
    this.timerId = null;
  }

  async start(onMaxDurationReached) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.startTime = Date.now();
    this.mediaRecorder.start();

    // Enforce maximum recording duration (30 seconds)
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        onMaxDurationReached?.();
      }
    }, MAX_RECORDING_SECONDS * 1000);
  }

  /** Stop recording and resolve with { blob, duration, mimeType }. */
  stop() {
    clearTimeout(this.timerId);
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(null);
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        const duration = Math.min(MAX_RECORDING_SECONDS, (Date.now() - this.startTime) / 1000);
        this._releaseStream();
        resolve({ blob, duration, mimeType });
      };
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    });
  }

  cancel() {
    clearTimeout(this.timerId);
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch (e) {
      /* no-op */
    }
    this._releaseStream();
  }

  _releaseStream() {
    this.stream?.getTracks()?.forEach((t) => t.stop());
    this.stream = null;
  }
}

/** Persist a recorded voice note: upload audio blob directly to Cloudinary and save metadata in Firestore. */
export async function sendVoiceNote({ blob, mimeType, duration, senderId, senderName = null, eventId = null, workId = null, replyTo = null }) {
  const ext = mimeType?.includes("mp4") ? "m4a" : "webm";
  const fileName = `voice_${senderId}_${Date.now()}.${ext}`;
  const { secureUrl, publicId, bytes } = await uploadToCloudinary(blob, fileName);

  const docRef = await addDoc(collection(db, "voiceMessages"), {
    senderId,
    senderName,
    eventId: eventId || null,
    workId: workId || null,
    audioUrl: secureUrl,
    cloudinaryUrl: secureUrl,
    cloudinaryPublicId: publicId || null,
    publicId: publicId || null,
    fileSize: bytes || blob.size || 0,
    mimeType: mimeType || "audio/webm",
    duration: Math.round(duration),
    status: "sent",
    replyTo: replyTo || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing voice note with a new replacement recording (sender only) and clean up old Cloudinary asset. */
export async function updateVoiceNote(messageId, { blob, mimeType, duration, senderId }) {
  let oldPublicId = null;
  try {
    const snap = await getDoc(doc(db, "voiceMessages", messageId));
    if (snap.exists()) {
      const data = snap.data();
      oldPublicId = data.cloudinaryPublicId || data.publicId || null;
    }
  } catch (e) {
    console.warn("Could not read old voice note publicId:", e);
  }

  const ext = mimeType?.includes("mp4") ? "m4a" : "webm";
  const fileName = `voice_${senderId || "member"}_${Date.now()}.${ext}`;
  const { secureUrl, publicId, bytes } = await uploadToCloudinary(blob, fileName);

  await updateDoc(doc(db, "voiceMessages", messageId), {
    audioUrl: secureUrl,
    cloudinaryUrl: secureUrl,
    cloudinaryPublicId: publicId || null,
    publicId: publicId || null,
    fileSize: bytes || blob.size || 0,
    mimeType: mimeType || "audio/webm",
    duration: Math.round(duration),
    isEdited: true,
    updatedAt: serverTimestamp(),
  });

  if (oldPublicId && oldPublicId !== publicId) {
    deleteFromCloudinary(oldPublicId, "video");
  }

  return secureUrl;
}

/** Delete a voice note document from Firestore and remove asset from Cloudinary (sender only). */
export async function deleteVoiceNote(messageId) {
  let oldPublicId = null;
  try {
    const snap = await getDoc(doc(db, "voiceMessages", messageId));
    if (snap.exists()) {
      const data = snap.data();
      oldPublicId = data.cloudinaryPublicId || data.publicId || null;
    }
  } catch (e) {
    console.warn("Could not read voice note publicId for deletion:", e);
  }

  if (oldPublicId) {
    deleteFromCloudinary(oldPublicId, "video");
  }
  await deleteDoc(doc(db, "voiceMessages", messageId));
}



/** Fetch general (non-event) team voice messages for the Home feed. */
export async function getTeamVoiceMessages() {
  try {
    const snap = await getDocs(collection(db, "voiceMessages"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => !m.eventId)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (err) {
    console.error("getTeamVoiceMessages error:", err);
    return [];
  }
}

/** Listen to real-time general team voice messages. */
export function listenToTeamVoiceMessages(onChange, onError) {
  return onSnapshot(
    collection(db, "voiceMessages"),
    (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => !m.eventId)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      onChange(msgs);
    },
    (err) => {
      console.error("listenToTeamVoiceMessages error:", err);
      onError?.(err);
    }
  );
}

/** Fetch voice messages scoped to a particular event/work. */
export async function getWorkVoiceMessages(eventId, workId) {
  try {
    const snap = await getDocs(collection(db, "voiceMessages"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.eventId === eventId && (workId ? m.workId === workId : true))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  } catch (err) {
    console.error("getWorkVoiceMessages error:", err);
    return [];
  }
}

/** Listen to real-time voice messages for specific event/work context. */
export function listenToWorkVoiceMessages(eventId, workId, onChange, onError) {
  return onSnapshot(
    collection(db, "voiceMessages"),
    (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.eventId === eventId && (workId ? m.workId === workId : true))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      onChange(msgs);
    },
    (err) => {
      console.error("listenToWorkVoiceMessages error:", err);
      onError?.(err);
    }
  );
}

/** Group a flat list of voice messages by sender, most-recently-active sender first. */
export function groupVoiceMessagesBySender(messages) {
  const groups = new Map();
  for (const msg of messages) {
    if (!groups.has(msg.senderId)) groups.set(msg.senderId, []);
    groups.get(msg.senderId).push(msg);
  }
  const result = [];
  for (const [senderId, msgs] of groups.entries()) {
    // Messages come in desc order (newest first); keep that within group
    // but present playback oldest->newest for a natural conversation feel.
    const ordered = [...msgs].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    const latest = Math.max(...msgs.map((m) => m.createdAt?.seconds || 0));
    result.push({ senderId, messages: ordered, latest });
  }
  result.sort((a, b) => b.latest - a.latest);
  return result;
}


