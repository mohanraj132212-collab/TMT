// utils.js
// Small shared helpers used across the app. No business/data logic here.

const SESSION_KEY = "tmt.session";

/** Persist the minimal session info needed to skip the phone-number screen. */
export function saveSession(memberId, phone) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ memberId, phone }));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Normalize a phone number to a comparable digits-only form, e.g. "+91 98765 43210" -> "919876543210". */
export function normalizePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  // Drop a leading 0 if present after country code stripping isn't reliable,
  // so we just compare full digit strings consistently everywhere.
  return digits;
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  if (h === undefined) return timeStr;
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

export function formatRelativeTime(date) {
  if (!date) return "";
  const now = Date.now();
  const time = date instanceof Date ? date.getTime() : date;
  const diff = Math.max(0, now - time);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/** Escape text before inserting into innerHTML templates. */
export function esc(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = null;
export function showToast(message, type = "default") {
  let el = document.getElementById("tmt-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "tmt-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

export function setLoading(container, message = "Loading…") {
  container.innerHTML = `
    <div class="state state--loading">
      <div class="spinner"></div>
      <p>${esc(message)}</p>
    </div>`;
}

export function setEmpty(container, message = "Nothing here yet.", subtitle = "") {
  container.innerHTML = `
    <div class="state state--empty">
      <svg class="state__icon" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M6 15V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      <p>${esc(message)}</p>
      ${subtitle ? `<p class="state__subtitle">${esc(subtitle)}</p>` : ""}
    </div>`;
}

export function setError(container, message = "Something went wrong.", onRetry) {
  container.innerHTML = `
    <div class="state state--error">
      <svg class="state__icon" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.86l-8.2 14.2A1.5 1.5 0 0 0 3.4 20.5h17.2a1.5 1.5 0 0 0 1.3-2.44l-8.2-14.2a1.5 1.5 0 0 0-2.6 0Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      <p>${esc(message)}</p>
      <p class="state__subtitle">Please try again.</p>
      ${onRetry ? `<button class="btn btn--secondary" id="tmt-retry-btn">Retry</button>` : ""}
    </div>`;
  if (onRetry) {
    container.querySelector("#tmt-retry-btn")?.addEventListener("click", onRetry);
  }
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export const isOnline = () => navigator.onLine;

/** Calculate approximate byte size of a Data URL string. */
export function getDataUrlSizeBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const base64Str = dataUrl.split(",")[1] || "";
  const padding = (base64Str.match(/=/g) || []).length;
  return Math.max(0, Math.round((base64Str.length * 3) / 4 - padding));
}

/** Crop to 1:1, resize to max 256x256, compress via Canvas to WebP or JPEG Data URL. */
export function compressImageToDataUrl(file, maxWidth = 256, maxHeight = 256, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Invalid image file provided."));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        // Calculate 1:1 center crop box
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Canvas context unavailable."));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw cropped and resized square image onto canvas
        ctx.drawImage(img, startX, startY, size, size, 0, 0, maxWidth, maxHeight);

        // Try WebP first; fallback to JPEG if browser canvas doesn't support webp export
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Convert a binary Blob (e.g. voice recording) to a Data URL string. */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) return reject(new Error("No audio blob provided."));
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read audio blob."));
    reader.readAsDataURL(blob);
  });
}

