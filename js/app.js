// app.js
// Application shell: boot sequence, routing, navigation, modals, voice
// recording UI, and the render functions for each screen.

import { icon, ICONS } from "./icons.js";
import {
  esc,
  initials,
  formatDate,
  formatTime,
  formatDuration,
  formatRelativeTime,
  showToast,
  setLoading,
  setEmpty,
  setError,
  isOnline,
} from "./utils.js";
import { tryResumeSession, loginWithPhone, getCurrentMember, logout } from "./auth.js";
import { getAllTeamMembers, getTeamMemberById, subscribeTeamMembers } from "./team.js";
import { renderVoiceActivity, renderHomeSummary } from "./dashboard.js";
import { getAllWork, createWork, updateWorkStatus, deleteWork, WORK_STATUSES } from "./work.js";
import { getMyReminders, addReminder, updateReminder, toggleReminderComplete, deleteReminder } from "./private.js";
import {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventWorks,
  getEventWork,
  createEventWork,
  updateEventWork,
  getWorkChecks,
  addWorkCheck,
  updateWorkCheckStatus,
  computeProgress,
  CHECK_STATUSES,
  getEventFiles,
  listenToEventFiles,
  uploadEventFile,
  deleteEventFile,
} from "./events.js";
import { VoiceRecorder, sendVoiceNote, updateVoiceNote, deleteVoiceNote, getWorkVoiceMessages, listenToWorkVoiceMessages } from "./voice.js";
import { updateProfileName, updateProfilePhone, updateProfilePhoto, getStoredTheme, setStoredTheme } from "./profile.js";
import { getAllDocuments, listenToDocuments, uploadDocument, deleteDocument } from "./documents.js";
import { openImageCropperModal } from "./cropper.js";
import { setupNotifications, notifyNewMessage, getNotificationPermissionState } from "./notifications.js";
import { renderReactionPillsHtml, renderEmojiPickerHtml, wireReactionsUI } from "./reactions.js";
import { db, collection, addDoc, serverTimestamp } from "./firebase.js";


/* ============================================================
   Elements
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const el = {
  splash: $("#screen-splash"),
  login: $("#screen-login"),
  app: $("#screen-app"),
  loginForm: $("#login-form"),
  loginPhone: $("#login-phone"),
  loginError: $("#login-error"),
  loginSubmit: $("#login-submit"),
  sidebarNav: $("#sidebar-nav"),
  bottomNav: $("#bottom-nav"),
  view: $("#view-root"),
  topbarTitle: $("#topbar-title"),
  topbarProfileBtn: $("#topbar-profile-btn"),
  sidebarProfileBtn: $("#sidebar-profile-btn"),
  sidebarAvatar: $("#sidebar-avatar"),
  sidebarProfileName: $("#sidebar-profile-name"),
  recordFabWrap: $("#record-fab-wrap"),
  recordFab: $("#record-fab"),
  recordFabIcon: $("#record-fab-icon"),
  voicePreview: $("#voice-preview"),
  voicePreviewTimer: $("#voice-preview-timer"),
  voicePreviewPlay: $("#voice-preview-play"),
  voicePreviewDelete: $("#voice-preview-delete"),
  voicePreviewSend: $("#voice-preview-send"),
  modalBackdrop: $("#modal-backdrop"),
  modal: $("#modal"),
  modalTitle: $("#modal-title"),
  modalBody: $("#modal-body"),
  modalClose: $("#modal-close"),
  globalAudio: $("#global-audio"),
};

el.recordFabIcon.innerHTML = icon("mic");
el.topbarProfileBtn.innerHTML = icon("profile");
el.modalClose.innerHTML = icon("close");
el.voicePreviewDelete.innerHTML = icon("delete");
el.voicePreviewPlay.innerHTML = icon("play");
el.voicePreviewSend.innerHTML = icon("send");

const NAV_ITEMS = [
  { route: "home", label: "Home", icon: "home" },
  { route: "work", label: "Work", icon: "work" },
  { route: "documents", label: "Documents", icon: "file" },
  { route: "private", label: "Private", icon: "private" },
  { route: "event", label: "Event", icon: "event" },
];

/* ============================================================
   Boot sequence
   ============================================================ */
async function boot() {
  setStoredTheme(getStoredTheme());
  window.addEventListener("online", updateOfflineBanner);
  window.addEventListener("offline", updateOfflineBanner);

  const member = await tryResumeSession();
  el.splash.classList.add("hidden");

  if (member) {
    enterApp(member);
  } else {
    el.login.classList.remove("hidden");
  }
}

function enterApp(member) {
  el.login.classList.add("hidden");
  el.app.classList.remove("hidden");
  renderNav();
  updateProfileChrome(member);
  if (member?.id) {
    setupNotifications(member.id);
  }
  subscribeTeamMembers((members, cache) => {
    if (member?.id && cache[member.id]) {
      const updated = cache[member.id];
      member.profilePhoto = updated.profilePhoto;
      member.name = updated.name;
      member.phone = updated.phone;
      updateProfileChrome(member);
    }
  });
  window.addEventListener("hashchange", router);
  if (!location.hash) location.hash = "#/home";
  router();
}

el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.loginError.textContent = "";
  el.loginSubmit.disabled = true;
  el.loginSubmit.textContent = "Checking…";
  try {
    const result = await loginWithPhone(el.loginPhone.value);
    if (!result.ok) {
      el.loginError.textContent = result.reason;
    } else {
      enterApp(result.member);
    }
  } catch (err) {
    console.error(err);
    el.loginError.textContent = "Couldn't reach TMT. Check your connection and try again.";
  } finally {
    el.loginSubmit.disabled = false;
    el.loginSubmit.textContent = "Continue";
  }
});

/* ============================================================
   Navigation / chrome
   ============================================================ */
function renderNav() {
  el.sidebarNav.innerHTML = NAV_ITEMS.map(
    (item) => `<a class="nav-item" data-route="${item.route}" href="#/${item.route}">${icon(item.icon)}<span>${item.label}</span></a>`
  ).join("");
  el.bottomNav.innerHTML = NAV_ITEMS.map(
    (item) => `<a class="bottom-nav__item" data-route="${item.route}" href="#/${item.route}">${icon(item.icon)}<span>${item.label}</span></a>`
  ).join("");
}

function setActiveNav(route) {
  $$(".nav-item", el.sidebarNav).forEach((n) => n.classList.toggle("active", n.dataset.route === route));
  $$(".bottom-nav__item", el.bottomNav).forEach((n) => n.classList.toggle("active", n.dataset.route === route));
}

function updateProfileChrome(member) {
  if (!member) return;
  const initialLetter = esc(initials(member.name || "?"));

  // Sidebar profile avatar
  el.sidebarAvatar.innerHTML = member.profilePhoto
    ? `<img class="avatar avatar--sm" src="${esc(member.profilePhoto)}" alt="" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar--sm avatar--initials',textContent:'${initialLetter}'}))">`
    : `<span class="avatar avatar--sm avatar--initials">${initialLetter}</span>`;
  el.sidebarProfileName.textContent = member.name || "Profile";

  // Topbar profile avatar
  if (member.profilePhoto) {
    const defaultIconSvg = icon("profile");
    el.topbarProfileBtn.innerHTML = `<img class="topbar__avatar" src="${esc(member.profilePhoto)}" alt="${esc(member.name || "Profile")}">`;
    const img = el.topbarProfileBtn.querySelector("img");
    if (img) {
      img.onerror = () => {
        el.topbarProfileBtn.innerHTML = defaultIconSvg;
      };
    }
  } else {
    el.topbarProfileBtn.innerHTML = icon("profile");
  }
}

el.topbarProfileBtn.addEventListener("click", () => (location.hash = "#/settings"));
el.sidebarProfileBtn.addEventListener("click", () => (location.hash = "#/settings"));

function updateOfflineBanner() {
  const existing = $(".offline-banner", el.view);
  if (!isOnline()) {
    if (!existing) {
      const banner = document.createElement("div");
      banner.className = "offline-banner";
      banner.innerHTML = `${icon("wifi_off", "icon--sm")} You're offline. Some features may be unavailable.`;
      el.view.prepend(banner);
    }
  } else {
    existing?.remove();
  }
}

/* ============================================================
   Router
   ============================================================ */
const routes = {
  home: renderHomePage,
  work: renderWorkPage,
  documents: renderDocumentsPage,
  private: renderPrivatePage,
  event: renderEventListPage,
  settings: renderSettingsPage,
};

async function router() {
  const hash = location.hash.replace(/^#\//, "");
  const [base, param] = hash.split("/");
  const titles = { home: "Home", work: "Work", documents: "Documents", private: "Private", event: "Event", settings: "Settings" };

  if (base === "event" && param) {
    setActiveNav("event");
    el.topbarTitle.textContent = "Event";
    el.recordFabWrap.classList.remove("hidden");
    await renderEventDetailPage(param);
    updateOfflineBanner();
    return;
  }

  const renderFn = routes[base] || renderHomePage;
  setActiveNav(base in routes ? base : "home");
  el.topbarTitle.textContent = titles[base] || "TMT";
  el.recordFabWrap.classList.toggle("hidden", base === "settings");
  currentEventContext = null; // reset event-scoped voice context unless set by detail page
  await renderFn();
  updateOfflineBanner();
}

let editingVoiceNoteId = null;

function handleVoiceNoteEdit(id, audioUrl) {
  editingVoiceNoteId = id;
  showToast("Editing voice note. Press & hold mic to record replacement.", "info");
  el.voicePreviewSend.innerHTML = `${icon("send")} Update`;
}

async function handleVoiceNoteDelete(id) {
  if (!confirm("Delete this voice message?")) return;
  try {
    await deleteVoiceNote(id);
    showToast("Voice note deleted");
    if ($("#home-voice")) renderHomePage();
    if ($("#event-thread")) router();
  } catch (e) {
    console.error(e);
    showToast("Couldn't delete voice note.", "error");
  }
}

async function renderHomePage() {
  const me = getCurrentMember();
  el.view.innerHTML = `
    <h1 class="page-title">Home</h1>
    <div id="home-summary" class="mt-16"></div>
    <div class="section-row">
      <h2 class="section-title">Team Voice Activity</h2>
    </div>
    <div id="home-voice"></div>
  `;
  renderHomeSummary($("#home-summary"));
  renderVoiceActivity($("#home-voice"), {
    onPlay: handleVoiceNoteClick,
    currentMemberId: me?.id,
    onEdit: handleVoiceNoteEdit,
    onDelete: handleVoiceNoteDelete,
  });
}

/* ============================================================
   Audio playback (shared across Home + Event thread)
   ============================================================ */
let activeVoiceBtn = null;
let progressRAF = null;

function handleVoiceNoteClick(btn) {
  const url = btn.dataset.audio;
  if (activeVoiceBtn === btn && !el.globalAudio.paused) {
    el.globalAudio.pause();
    return;
  }
  if (activeVoiceBtn && activeVoiceBtn !== btn) {
    activeVoiceBtn.classList.remove("playing");
    activeVoiceBtn.querySelector(".voice-note__play").innerHTML = icon("play");
  }
  activeVoiceBtn = btn;
  el.globalAudio.src = url;
  el.globalAudio.play().catch(() => showToast("Couldn't play voice note.", "error"));
}

el.globalAudio.addEventListener("play", () => {
  if (!activeVoiceBtn) return;
  activeVoiceBtn.classList.add("playing");
  activeVoiceBtn.querySelector(".voice-note__play").innerHTML = icon("pause");
  cancelAnimationFrame(progressRAF);
  const tick = () => {
    if (!activeVoiceBtn) return;
    const pct = el.globalAudio.duration ? (el.globalAudio.currentTime / el.globalAudio.duration) * 100 : 0;
    const bar = activeVoiceBtn.querySelector(".voice-note__progress");
    if (bar) bar.style.width = pct + "%";
    progressRAF = requestAnimationFrame(tick);
  };
  progressRAF = requestAnimationFrame(tick);
});

function resetActiveVoiceButton() {
  if (activeVoiceBtn) {
    activeVoiceBtn.classList.remove("playing");
    activeVoiceBtn.querySelector(".voice-note__play").innerHTML = icon("play");
    const bar = activeVoiceBtn.querySelector(".voice-note__progress");
    if (bar) bar.style.width = "0%";
  }
  activeVoiceBtn = null;
  cancelAnimationFrame(progressRAF);
}
el.globalAudio.addEventListener("pause", () => {
  if (el.globalAudio.currentTime === 0 || el.globalAudio.ended) resetActiveVoiceButton();
  else {
    if (activeVoiceBtn) activeVoiceBtn.querySelector(".voice-note__play").innerHTML = icon("play");
    cancelAnimationFrame(progressRAF);
  }
});
el.globalAudio.addEventListener("ended", resetActiveVoiceButton);

/* ============================================================
   WORK PAGE
   ============================================================ */
async function renderWorkPage() {
  el.view.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Work</h1>
      <div class="page-header__actions">
        <button class="btn btn--primary btn--sm" id="add-work-btn">${icon("add", "icon--sm")} New Work</button>
      </div>
    </div>
    <div id="work-list" class="list"></div>
  `;
  $("#add-work-btn").addEventListener("click", openAddWorkModal);
  await loadWorkList();
}

async function loadWorkList() {
  const container = $("#work-list");
  setLoading(container, "Loading work…");
  try {
    const [work, members] = await Promise.all([getAllWork(), getAllTeamMembers()]);
    if (work.length === 0) {
      setEmpty(container, "No work created yet.", "Tap “New Work” to assign something to the team.");
      return;
    }
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
    container.innerHTML = work.map((w) => renderWorkItem(w, memberMap)).join("");
    $$(".status-select", container).forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        await updateWorkStatus(sel.dataset.id, e.target.value);
        showToast("Status updated");
        loadWorkList();
      });
    });
    $$(".js-delete-work", container).forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this work item?")) return;
        await deleteWork(btn.dataset.id);
        loadWorkList();
      });
    });
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load work.", loadWorkList);
  }
}

function renderWorkItem(w, memberMap) {
  const assignees = (w.assignedMemberIds || []).map((id) => memberMap[id]).filter(Boolean);
  const statusClass = (w.status || "pending").toLowerCase().replace(/\s/g, "-");
  return `
    <div class="item-card">
      <div class="item-card__top">
        <span class="item-card__name">${esc(w.name)}</span>
        <button class="icon-btn js-delete-work" data-id="${w.id}" aria-label="Delete">${icon("trash")}</button>
      </div>
      ${w.description ? `<p class="item-card__desc">${esc(w.description)}</p>` : ""}
      <div class="item-card__meta-row">
        ${
          assignees.length
            ? `<div class="avatar-stack">${assignees
                .slice(0, 4)
                .map((m) =>
                  m.profilePhoto
                    ? `<img class="avatar" src="${esc(m.profilePhoto)}" alt="${esc(m.name)}">`
                    : `<span class="avatar avatar--initials">${esc(initials(m.name))}</span>`
                )
                .join("")}</div>`
            : `<span class="item-card__meta">Unassigned</span>`
        }
        ${w.dueDate ? `<span class="item-card__meta">${icon("calendar", "icon--sm")}${esc(formatDate(w.dueDate))}</span>` : ""}
        <select class="status-select badge--${statusClass}" data-id="${w.id}">
          ${WORK_STATUSES.map((s) => `<option value="${s}" ${s === w.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>`;
}

async function openAddWorkModal() {
  const members = await getAllTeamMembers();
  openModal(
    "New Work",
    `
    <label class="field">
      <span class="field__label">Work Name</span>
      <input class="field__input" id="wf-name" placeholder="e.g. Audio Setup" required>
    </label>
    <label class="field">
      <span class="field__label">Description</span>
      <textarea class="field__textarea" id="wf-desc" placeholder="What needs to be done?"></textarea>
    </label>
    <label class="field">
      <span class="field__label">Due Date</span>
      <input class="field__input" type="date" id="wf-due">
    </label>
    <div class="field">
      <span class="field__label">Assign Members</span>
      <div class="member-picker" id="wf-members">${memberPickerHtml(members, [])}</div>
    </div>
    <div class="form-actions">
      <button class="btn btn--secondary" id="wf-cancel">Cancel</button>
      <button class="btn btn--primary" id="wf-save">Create Work</button>
    </div>
  `
  );
  wireMemberPicker($("#wf-members"));
  $("#wf-cancel").addEventListener("click", closeModal);
  $("#wf-save").addEventListener("click", async () => {
    const name = $("#wf-name").value.trim();
    if (!name) return showToast("Work name is required.", "error");
    const ids = getPickedMemberIds($("#wf-members"));
    try {
      await createWork({ name, description: $("#wf-desc").value, assignedMemberIds: ids, dueDate: $("#wf-due").value });
      showToast("Work created");
      closeModal();
      loadWorkList();
    } catch (e) {
      console.error(e);
      showToast("Couldn't create work.", "error");
    }
  });
}

/* ============================================================
   DOCUMENTS PAGE
   ============================================================ */
async function renderDocumentsPage() {
  const me = getCurrentMember();
  el.view.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Documents</h1>
      <label class="btn btn--primary btn--sm" style="cursor:pointer;" id="doc-upload-label">
        ${icon("add", "icon--sm")} Upload Document
        <input type="file" id="doc-upload-input" class="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
      </label>
    </div>
    <div id="doc-upload-status"></div>
    <div id="documents-list" class="list mt-16"></div>
  `;

  const statusContainer = $("#doc-upload-status");
  const listContainer = $("#documents-list");
  const fileInput = $("#doc-upload-input");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast("File is too large. Maximum file size is 50MB.", "error");
      return;
    }

    statusContainer.innerHTML = `
      <div class="state state--loading" style="padding:14px;">
        <div class="spinner spinner--pink spinner--sm"></div>
        <p style="font-size:13px;">Uploading <strong>${esc(file.name)}</strong> to Cloudinary…</p>
      </div>`;

    try {
      await uploadDocument(file, me);
      showToast("Document uploaded to Cloudinary");
      statusContainer.innerHTML = "";
      fileInput.value = "";
    } catch (err) {
      console.error(err);
      statusContainer.innerHTML = `
        <div class="offline-banner" style="background:#FFE6E6;color:#C00;justify-content:space-between;">
          <span>Couldn't upload document: ${esc(err.message || "Upload failed")}</span>
          <button class="btn btn--sm btn--primary" id="retry-doc-upload">Retry</button>
        </div>`;
      $("#retry-doc-upload")?.addEventListener("click", () => fileInput.click());
    }
  });

  setLoading(listContainer, "Loading documents…");

  listenToDocuments(
    (docs) => {
      if (docs.length === 0) {
        setEmpty(listContainer, "No documents uploaded yet.", "Upload images, videos, audio, PDFs, or documents to share with the team.");
        return;
      }
      listContainer.innerHTML = docs.map((d) => renderDocumentCard(d)).join("");
      $$(".js-delete-doc", listContainer).forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm(`Delete document "${btn.dataset.name}"?`)) return;
          try {
            await deleteDocument(btn.dataset.id);
            showToast("Document removed");
          } catch (err) {
            console.error(err);
            showToast("Couldn't delete document.", "error");
          }
        });
      });
    },
    (err) => {
      console.error("listenToDocuments error:", err);
      setError(listContainer, "Couldn't load documents.", () => renderDocumentsPage());
    }
  );
}

function renderDocumentCard(docItem) {
  const mime = docItem.mimeType || "";
  const category = docItem.fileType || (mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : mime.includes("pdf") ? "pdf" : "document");
  const sizeFormatted = formatFileSize(docItem.fileSize);
  const fileUrl = docItem.cloudinaryUrl || docItem.url || "#";

  let mediaHtml = "";
  if (category === "image") {
    mediaHtml = `
      <div class="event-file-card__media">
        <img class="event-file-card__img" src="${esc(fileUrl)}" alt="${esc(docItem.fileName)}" loading="lazy">
      </div>`;
  } else if (category === "video") {
    mediaHtml = `
      <div class="event-file-card__media">
        <video src="${esc(fileUrl)}" controls style="width:100%;max-height:240px;border-radius:8px;"></video>
      </div>`;
  } else if (category === "audio") {
    mediaHtml = `
      <div class="event-file-card__media" style="padding:10px 14px;width:100%;">
        <audio src="${esc(fileUrl)}" controls style="width:100%;"></audio>
      </div>`;
  } else if (category === "pdf") {
    mediaHtml = `
      <div style="padding:10px;background:var(--bg-soft);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:13px;font-weight:600;color:var(--text-muted);">${icon("file", "icon--sm")} PDF Document</span>
        <a class="btn btn--primary btn--sm" href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer">Open PDF</a>
      </div>`;
  }

  return `
    <div class="event-file-card">
      <div class="event-file-card__top">
        <div>
          <div class="event-file-card__name">${esc(docItem.fileName || "Document")}</div>
          <div class="event-file-card__meta">
            <span>${icon(category === "image" ? "camera" : category === "video" ? "play" : category === "audio" ? "mic" : "file", "icon--sm")} ${category.toUpperCase()}</span>
            <span>·</span>
            <span>${sizeFormatted}</span>
            <span>·</span>
            <span>Uploaded by ${esc(docItem.senderName || "Team Member")}</span>
            ${docItem.createdAt?.seconds ? `<span>· ${formatRelativeTime(docItem.createdAt.seconds * 1000)}</span>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <a class="btn btn--ghost btn--sm" href="${esc(fileUrl)}" target="_blank" download rel="noopener noreferrer">${icon("download", "icon--sm")} View / Download</a>
          <button class="btn btn--ghost btn--sm js-delete-doc" data-id="${docItem.id}" data-name="${esc(docItem.fileName)}" style="color:var(--danger);">${icon("delete", "icon--sm")}</button>
        </div>
      </div>
      ${mediaHtml}
    </div>`;
}

/* ============================================================
   PRIVATE PAGE
   ============================================================ */
async function renderPrivatePage() {
  el.view.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Private</h1>
      <div class="page-header__actions">
        <button class="btn btn--primary btn--sm" id="add-reminder-btn">${icon("add", "icon--sm")} Remember</button>
      </div>
    </div>
    <div id="reminder-list" class="list"></div>
  `;
  $("#add-reminder-btn").addEventListener("click", () => openReminderModal());
  await loadReminders();
}

async function loadReminders() {
  const container = $("#reminder-list");
  const member = getCurrentMember();
  setLoading(container, "Loading your reminders…");
  try {
    const reminders = await getMyReminders(member.id);
    if (reminders.length === 0) {
      setEmpty(container, "No private reminders yet.", "These are only visible to you.");
      return;
    }
    container.innerHTML = reminders.map(renderReminderItem).join("");
    $$(".reminder-check", container).forEach((btn) => {
      btn.addEventListener("click", async () => {
        await toggleReminderComplete(btn.dataset.id, btn.dataset.completed !== "true");
        loadReminders();
      });
    });
    $$(".js-edit-reminder", container).forEach((btn) => {
      btn.addEventListener("click", () => openReminderModal(reminders.find((r) => r.id === btn.dataset.id)));
    });
    $$(".js-delete-reminder", container).forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this reminder?")) return;
        await deleteReminder(btn.dataset.id);
        loadReminders();
      });
    });
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load reminders.", loadReminders);
  }
}

function renderReminderItem(r) {
  const when = [r.reminderDate ? formatDate(r.reminderDate) : "", r.reminderTime ? formatTime(r.reminderTime) : ""].filter(Boolean).join(" · ");
  return `
    <div class="item-card reminder-card ${r.completed ? "completed" : ""}">
      <button class="reminder-check ${r.completed ? "checked" : ""}" data-id="${r.id}" data-completed="${r.completed}">${icon("check")}</button>
      <div class="reminder-card__body">
        <div class="item-card__top">
          <span class="reminder-card__title">${esc(r.title)}</span>
          <div class="reminder-card__actions">
            <button class="icon-btn js-edit-reminder" data-id="${r.id}">${icon("edit")}</button>
            <button class="icon-btn js-delete-reminder" data-id="${r.id}">${icon("trash")}</button>
          </div>
        </div>
        ${r.description ? `<p class="reminder-card__desc">${esc(r.description)}</p>` : ""}
        ${when ? `<div class="reminder-card__when">${icon("clock", "icon--sm")}${esc(when)}</div>` : ""}
      </div>
    </div>`;
}

function openReminderModal(existing) {
  openModal(
    existing ? "Edit Reminder" : "Remember",
    `
    <label class="field">
      <span class="field__label">Title</span>
      <input class="field__input" id="rm-title" placeholder="Take laptop charger" value="${existing ? esc(existing.title) : ""}" required>
    </label>
    <label class="field">
      <span class="field__label">Notes</span>
      <textarea class="field__textarea" id="rm-desc" placeholder="Optional details">${existing ? esc(existing.description) : ""}</textarea>
    </label>
    <div class="field-row">
      <label class="field">
        <span class="field__label">Date</span>
        <input class="field__input" type="date" id="rm-date" value="${existing?.reminderDate || ""}">
      </label>
      <label class="field">
        <span class="field__label">Time</span>
        <input class="field__input" type="time" id="rm-time" value="${existing?.reminderTime || ""}">
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn--secondary" id="rm-cancel">Cancel</button>
      <button class="btn btn--primary" id="rm-save">${existing ? "Save Changes" : "Add Reminder"}</button>
    </div>
  `
  );
  $("#rm-cancel").addEventListener("click", closeModal);
  $("#rm-save").addEventListener("click", async () => {
    const title = $("#rm-title").value.trim();
    if (!title) return showToast("Title is required.", "error");
    const fields = {
      title,
      description: $("#rm-desc").value,
      reminderDate: $("#rm-date").value,
      reminderTime: $("#rm-time").value,
    };
    try {
      if (existing) await updateReminder(existing.id, fields);
      else await addReminder(getCurrentMember().id, fields);
      showToast(existing ? "Reminder updated" : "Reminder added");
      closeModal();
      loadReminders();
    } catch (e) {
      console.error(e);
      showToast("Couldn't save reminder.", "error");
    }
  });
}

/* ============================================================
   EVENT LIST PAGE
   ============================================================ */
async function renderEventListPage() {
  el.view.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Event</h1>
      <div class="page-header__actions">
        <button class="btn btn--primary btn--sm" id="add-event-btn">${icon("add", "icon--sm")} Add Event</button>
      </div>
    </div>
    <div id="event-list" class="list list--grid"></div>
  `;
  $("#add-event-btn").addEventListener("click", openAddEventModal);
  await loadEventList();
}

async function loadEventList() {
  const container = $("#event-list");
  setLoading(container, "Loading events…");
  try {
    const events = await getAllEvents();
    if (events.length === 0) {
      setEmpty(container, "No events yet.", "Tap “Add Event” to plan your first one.");
      return;
    }
    container.innerHTML = events.map(renderEventItem).join("");

    // Wire action dropdown toggle & edit/delete
    $$(".js-event-menu-btn", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const menuId = `evmenu-${btn.dataset.id}`;
        $$(".action-menu__dropdown", container).forEach((d) => {
          if (d.id !== menuId) d.classList.add("hidden");
        });
        $(`#${menuId}`)?.classList.toggle("hidden");
      });
    });

    $$(".js-event-edit-btn", container).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ev = events.find((item) => item.id === btn.dataset.id);
        if (ev) openEventModal(ev);
      });
    });

    $$(".js-event-delete-btn", container).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ev = events.find((item) => item.id === btn.dataset.id);
        if (!ev) return;
        if (!confirm(`Delete event "${ev.name}"? This will remove all associated works, checklists, and attachments.`)) return;
        try {
          await deleteEvent(ev.id);
          showToast("Event deleted");
          loadEventList();
        } catch (err) {
          console.error(err);
          showToast("Couldn't delete event.", "error");
        }
      });
    });
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load events.", loadEventList);
  }
}

function renderEventItem(ev) {
  const me = getCurrentMember();
  const isCreator = me && (ev.createdBy === me.id || !ev.createdBy);

  const actionMenuHtml = isCreator
    ? `<div class="action-menu" style="margin-left:auto;">
        <button class="icon-btn js-event-menu-btn" data-id="${esc(ev.id)}" aria-label="Event options">${icon("dots", "icon--sm")}</button>
        <div class="action-menu__dropdown hidden" id="evmenu-${esc(ev.id)}">
          <button class="action-menu__item js-event-edit-btn" data-id="${esc(ev.id)}">${icon("edit", "icon--sm")} Edit Event</button>
          <button class="action-menu__item action-menu__item--danger js-event-delete-btn" data-id="${esc(ev.id)}">${icon("delete", "icon--sm")} Delete Event</button>
        </div>
      </div>`
    : "";

  return `
    <div class="item-card">
      <div class="item-card__top">
        <a class="item-card__name" href="#/event/${ev.id}" style="text-decoration:none;color:inherit;flex:1;">${esc(ev.name)}</a>
        ${actionMenuHtml}
      </div>
      ${ev.description ? `<p class="item-card__desc">${esc(ev.description)}</p>` : ""}
      <div class="item-card__meta-row">
        ${ev.date ? `<span class="item-card__meta">${icon("calendar", "icon--sm")}${esc(formatDate(ev.date))}</span>` : ""}
        ${ev.location ? `<span class="item-card__meta">${icon("location", "icon--sm")}${esc(ev.location)}</span>` : ""}
      </div>
    </div>`;
}

function openAddEventModal() {
  openEventModal(null);
}

async function openEventModal(existingEvent = null) {
  const members = await getAllTeamMembers();
  const selectedMemberIds = existingEvent?.memberIds || [];

  openModal(
    existingEvent ? "Edit Event" : "Add Event",
    `
    <label class="field"><span class="field__label">Event Name</span><input class="field__input" id="ev-name" value="${existingEvent ? esc(existingEvent.name) : ""}" required></label>
    <label class="field"><span class="field__label">Description</span><textarea class="field__textarea" id="ev-desc">${existingEvent ? esc(existingEvent.description || "") : ""}</textarea></label>
    <div class="field-row">
      <label class="field"><span class="field__label">Date</span><input class="field__input" type="date" id="ev-date" value="${existingEvent?.date || ""}"></label>
    </div>
    <div class="field-row">
      <label class="field"><span class="field__label">Start Time</span><input class="field__input" type="time" id="ev-start" value="${existingEvent?.startTime || ""}"></label>
      <label class="field"><span class="field__label">End Time</span><input class="field__input" type="time" id="ev-end" value="${existingEvent?.endTime || ""}"></label>
    </div>
    <label class="field"><span class="field__label">Venue / Location</span><input class="field__input" id="ev-loc" value="${existingEvent ? esc(existingEvent.location || "") : ""}"></label>
    <div class="field">
      <span class="field__label">Event Members</span>
      <div class="member-picker" id="ev-members">${memberPickerHtml(members, selectedMemberIds)}</div>
    </div>
    <label class="field"><span class="field__label">Notes</span><textarea class="field__textarea" id="ev-notes">${existingEvent ? esc(existingEvent.notes || "") : ""}</textarea></label>
    <div class="form-actions">
      <button class="btn btn--secondary" id="ev-cancel">Cancel</button>
      <button class="btn btn--primary" id="ev-save">${existingEvent ? "Save Changes" : "Create Event"}</button>
    </div>
  `
  );
  wireMemberPicker($("#ev-members"));
  $("#ev-cancel").addEventListener("click", closeModal);
  $("#ev-save").addEventListener("click", async () => {
    const name = $("#ev-name").value.trim();
    if (!name) return showToast("Event name is required.", "error");
    const fields = {
      name,
      description: $("#ev-desc").value,
      date: $("#ev-date").value,
      startTime: $("#ev-start").value,
      endTime: $("#ev-end").value,
      location: $("#ev-loc").value,
      memberIds: getPickedMemberIds($("#ev-members")),
      notes: $("#ev-notes").value,
    };
    try {
      if (existingEvent) {
        await updateEvent(existingEvent.id, fields);
        showToast("Event updated");
        closeModal();
        if (location.hash.startsWith("#/event/")) {
          renderEventDetailPage(existingEvent.id);
        } else {
          loadEventList();
        }
      } else {
        const id = await createEvent(fields, getCurrentMember().id);
        showToast("Event created");
        closeModal();
        location.hash = `#/event/${id}`;
      }
    } catch (e) {
      console.error(e);
      showToast("Couldn't save event.", "error");
    }
  });
}

/* ============================================================
   EVENT DETAIL PAGE
   ============================================================ */
let currentEventContext = null; // { eventId, workId } for scoping voice notes

async function renderEventDetailPage(eventId) {
  el.view.innerHTML = `<div class="state state--loading"><div class="spinner"></div><p>Loading event…</p></div>`;
  try {
    const [ev, works, members] = await Promise.all([getEvent(eventId), getEventWorks(eventId), getAllTeamMembers()]);
    if (!ev) {
      setError(el.view, "Event not found.");
      return;
    }
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

    const worksWithProgress = await Promise.all(
      works.map(async (w) => {
        const checks = await getWorkChecks(eventId, w.id);
        return { ...w, progress: computeProgress(checks) };
      })
    );
    const totals = worksWithProgress.reduce(
      (acc, w) => ({
        ready: acc.ready + w.progress.ready,
        pending: acc.pending + w.progress.pending,
        problem: acc.problem + w.progress.problem,
        total: acc.total + w.progress.total,
      }),
      { ready: 0, pending: 0, problem: 0, total: 0 }
    );
    const overallPct = totals.total ? Math.round((totals.ready / totals.total) * 100) : 0;
    const me = getCurrentMember();
    const isCreator = me && (ev.createdBy === me.id || !ev.createdBy);

    const heroActionsHtml = isCreator
      ? `<div class="action-menu" style="margin-left:auto;">
          <button class="btn btn--secondary btn--sm js-hero-ev-menu-btn" aria-label="Event options">${icon("dots", "icon--sm")} Actions</button>
          <div class="action-menu__dropdown hidden" id="hero-evmenu">
            <button class="action-menu__item" id="hero-edit-ev-btn">${icon("edit", "icon--sm")} Edit Event</button>
            <button class="action-menu__item action-menu__item--danger" id="hero-delete-ev-btn">${icon("delete", "icon--sm")} Delete Event</button>
          </div>
        </div>`
      : "";

    currentEventContext = { eventId, workId: null };

    el.view.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <a class="link" href="#/event" style="display:flex;align-items:center;gap:4px;">${icon("back", "icon--sm")}All Events</a>
        ${heroActionsHtml}
      </div>
      <div class="event-hero">
        <div class="event-hero__name">${esc(ev.name)}</div>
        <div class="event-hero__meta">
          ${ev.date ? `<span>${icon("calendar", "icon--sm")}${esc(formatDate(ev.date))}</span>` : ""}
          ${ev.location ? `<span>${icon("location", "icon--sm")}${esc(ev.location)}</span>` : ""}
        </div>
        <div class="event-hero__percent">${overallPct}% Ready</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${overallPct}%"></div></div>
        <div class="event-hero__stats">
          <span>Completed: ${totals.ready}</span>
          <span>Pending: ${totals.pending}</span>
          <span>Problems: ${totals.problem}</span>
        </div>
      </div>`;

    if (isCreator) {
      $(".js-hero-ev-menu-btn", el.view)?.addEventListener("click", (e) => {
        e.stopPropagation();
        $("#hero-evmenu")?.classList.toggle("hidden");
      });
      $("#hero-edit-ev-btn")?.addEventListener("click", () => openEventModal(ev));
      $("#hero-delete-ev-btn")?.addEventListener("click", async () => {
        if (!confirm(`Delete event "${ev.name}"? This will remove all associated works, checklists, and attachments.`)) return;
        try {
          await deleteEvent(eventId);
          showToast("Event deleted");
          location.hash = "#/event";
        } catch (err) {
          console.error(err);
          showToast("Couldn't delete event.", "error");
        }
      });
    }

    el.view.insertAdjacentHTML('beforeend', `
      <div class="section-row">
        <h2 class="section-title">Works</h2>
        <button class="btn btn--secondary btn--sm" id="add-event-work-btn">${icon("add", "icon--sm")} Add Work</button>
      </div>
      <div class="list list--grid" id="event-works-list">
        ${
          worksWithProgress.length
            ? worksWithProgress.map((w) => renderEventWorkTile(eventId, w)).join("")
            : `<p class="meta-text">No works added yet. Add one like “Audio” or “Technical”.</p>`
        }
      </div>

      <div class="section-row mt-24">
        <h2 class="section-title">Event Files & Attachments</h2>
        <label class="btn btn--secondary btn--sm" style="cursor:pointer;" id="upload-file-label">
          ${icon("add", "icon--sm")} Upload File
          <input type="file" id="event-file-input" class="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
        </label>
      </div>
      <div id="event-files-status"></div>
      <div id="event-files-list" class="list mt-8"></div>

      <div class="section-row mt-24">
        <h2 class="section-title">Event Voice Notes</h2>
      </div>
      <div id="event-thread" class="thread"></div>
    `);

    $("#add-event-work-btn").addEventListener("click", () => openAddEventWorkModal(eventId, members));
    $$(".js-open-event-work", el.view).forEach((tile) => {
      tile.addEventListener("click", () => renderEventWorkDetail(eventId, tile.dataset.workId, ev));
    });
    
    // Wire Event Files upload handler & real-time listener
    wireEventFilesSection(eventId, getCurrentMember());
    renderEventThread(eventId, null, memberMap);
  } catch (e) {
    console.error(e);
    setError(el.view, "Couldn't load this event.", () => renderEventDetailPage(eventId));
  }
}

function renderEventWorkTile(eventId, w) {
  return `
    <div class="work-tile js-open-event-work" data-work-id="${w.id}" style="cursor:pointer;">
      <div class="work-tile__top">
        <span class="work-tile__name">${esc(w.name)}</span>
        <span class="work-tile__percent">${w.progress.percent}%</span>
      </div>
      <div class="progress-bar"><div class="progress-bar__fill" style="width:${w.progress.percent}%"></div></div>
    </div>`;
}

function wireEventFilesSection(eventId, me) {
  const input = $("#event-file-input");
  const listContainer = $("#event-files-list");
  const statusContainer = $("#event-files-status");
  if (!input || !listContainer) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast("File is too large. Maximum file size is 50MB.", "error");
      return;
    }

    statusContainer.innerHTML = `
      <div class="state state--loading" style="padding:14px;">
        <div class="spinner spinner--pink spinner--sm"></div>
        <p style="font-size:13px;">Uploading <strong>${esc(file.name)}</strong> to Cloudinary…</p>
      </div>`;

    try {
      await uploadEventFile(eventId, file, me);
      showToast("File uploaded to Cloudinary");
      statusContainer.innerHTML = "";
      input.value = "";
    } catch (err) {
      console.error(err);
      statusContainer.innerHTML = `
        <div class="offline-banner" style="background:#FFE6E6;color:#C00;justify-content:space-between;">
          <span>Couldn't upload file: ${esc(err.message || "Upload failed")}</span>
          <button class="btn btn--sm btn--primary" id="retry-event-file-upload">Retry</button>
        </div>`;
      $("#retry-event-file-upload")?.addEventListener("click", () => input.click());
    }
  });

  listenToEventFiles(eventId, (files) => {
    if (files.length === 0) {
      listContainer.innerHTML = `<p class="meta-text">No files uploaded yet for this event.</p>`;
      return;
    }
    listContainer.innerHTML = files.map((f) => renderEventFileCard(f)).join("");
    $$(".js-delete-event-file", listContainer).forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Delete file "${btn.dataset.name}"?`)) return;
        try {
          await deleteEventFile(eventId, btn.dataset.id);
          showToast("File removed");
        } catch (e) {
          console.error(e);
          showToast("Couldn't delete file.", "error");
        }
      });
    });
  });
}

function renderEventFileCard(f) {
  const mime = f.mimeType || "";
  const category = f.fileType || (mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "document");
  const sizeFormatted = formatFileSize(f.fileSize);
  const fileUrl = f.cloudinaryUrl || f.url || "#";

  let mediaHtml = "";
  if (category === "image") {
    mediaHtml = `
      <div class="event-file-card__media">
        <img class="event-file-card__img" src="${esc(fileUrl)}" alt="${esc(f.fileName)}" loading="lazy">
      </div>`;
  } else if (category === "video") {
    mediaHtml = `
      <div class="event-file-card__media">
        <video src="${esc(fileUrl)}" controls style="width:100%;max-height:220px;border-radius:8px;"></video>
      </div>`;
  } else if (category === "audio") {
    mediaHtml = `
      <div class="event-file-card__media" style="padding:8px 12px;width:100%;">
        <audio src="${esc(fileUrl)}" controls style="width:100%;"></audio>
      </div>`;
  }

  return `
    <div class="event-file-card">
      <div class="event-file-card__top">
        <div>
          <div class="event-file-card__name">${esc(f.fileName || "Attachment")}</div>
          <div class="event-file-card__meta">
            <span>${icon(category === "image" ? "camera" : category === "video" ? "play" : category === "audio" ? "mic" : "file", "icon--sm")} ${category.toUpperCase()}</span>
            <span>·</span>
            <span>${sizeFormatted}</span>
            <span>·</span>
            <span>By ${esc(f.senderName || "Team Member")}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <a class="btn btn--ghost btn--sm" href="${esc(fileUrl)}" target="_blank" download rel="noopener noreferrer">${icon("download", "icon--sm")} View</a>
          <button class="btn btn--ghost btn--sm js-delete-event-file" data-id="${f.id}" data-name="${esc(f.fileName)}" style="color:var(--danger);">${icon("delete", "icon--sm")}</button>
        </div>
      </div>
      ${mediaHtml}
    </div>`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}


async function openAddEventWorkModal(eventId, members) {
  openModal(
    "Add Work",
    `
    <label class="field"><span class="field__label">Work Name</span><input class="field__input" id="ewf-name" placeholder="e.g. Audio"></label>
    <label class="field"><span class="field__label">Description</span><textarea class="field__textarea" id="ewf-desc"></textarea></label>
    <div class="field">
      <span class="field__label">Assign Members</span>
      <div class="member-picker" id="ewf-members">${memberPickerHtml(members, [])}</div>
    </div>
    <div class="form-actions">
      <button class="btn btn--secondary" id="ewf-cancel">Cancel</button>
      <button class="btn btn--primary" id="ewf-save">Add Work</button>
    </div>
  `
  );
  wireMemberPicker($("#ewf-members"));
  $("#ewf-cancel").addEventListener("click", closeModal);
  $("#ewf-save").addEventListener("click", async () => {
    const name = $("#ewf-name").value.trim();
    if (!name) return showToast("Work name is required.", "error");
    try {
      await createEventWork(eventId, { name, description: $("#ewf-desc").value, assignedMemberIds: getPickedMemberIds($("#ewf-members")) });
      showToast("Work added");
      closeModal();
      renderEventDetailPage(eventId);
    } catch (e) {
      console.error(e);
      showToast("Couldn't add work.", "error");
    }
  });
}

async function renderEventWorkDetail(eventId, workId, ev) {
  el.view.innerHTML = `<div class="state state--loading"><div class="spinner"></div><p>Loading work…</p></div>`;
  try {
    const [work, checks, members] = await Promise.all([
      getEventWork(eventId, workId),
      getWorkChecks(eventId, workId),
      getAllTeamMembers(),
    ]);
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
    const progress = computeProgress(checks);
    currentEventContext = { eventId, workId };

    el.view.innerHTML = `
      <a class="link" href="#/event/${eventId}" style="display:flex;align-items:center;gap:4px;margin-bottom:14px;">${icon("back", "icon--sm")}${esc(ev.name)}</a>
      <h1 class="page-title">${esc(work.name)}</h1>
      ${work.description ? `<p class="body-text mt-8">${esc(work.description)}</p>` : ""}
      <div class="progress-ring-row mt-16">
        <div style="flex:1;">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${progress.percent}%"></div></div>
          <div class="progress-stats">
            <span class="progress-stat"><span class="dot dot--ready"></span>${progress.ready} Ready</span>
            <span class="progress-stat"><span class="dot dot--pending"></span>${progress.pending} Pending</span>
            <span class="progress-stat"><span class="dot dot--problem"></span>${progress.problem} Problem</span>
          </div>
        </div>
      </div>

      <div class="section-row">
        <h2 class="section-title">Checklist</h2>
        <button class="btn btn--secondary btn--sm" id="add-check-btn">${icon("add", "icon--sm")} Add Check</button>
      </div>
      <div class="card" id="check-list">
        ${checks.length ? checks.map((c) => renderCheckRow(c)).join("") : `<p class="meta-text">No checklist items yet.</p>`}
      </div>

      <div class="section-row">
        <h2 class="section-title">Voice Notes</h2>
      </div>
      <div id="event-thread" class="thread"></div>
    `;

    $$(".check-status-select", el.view).forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        await updateWorkCheckStatus(eventId, workId, sel.dataset.id, e.target.value);
        renderEventWorkDetail(eventId, workId, ev);
      });
    });
    $("#add-check-btn").addEventListener("click", () => openAddCheckModal(eventId, workId, members, ev));
    renderEventThread(eventId, workId, memberMap);
  } catch (e) {
    console.error(e);
    setError(el.view, "Couldn't load this work.", () => renderEventWorkDetail(eventId, workId, ev));
  }
}

function renderCheckRow(c) {
  const statusClass = c.status.toLowerCase();
  return `
    <div class="check-row">
      <div>
        <div class="check-row__title">${esc(c.title)}</div>
        ${c.description ? `<div class="check-row__desc">${esc(c.description)}</div>` : ""}
      </div>
      <select class="status-select check-status-select badge--${statusClass}" data-id="${c.id}">
        ${CHECK_STATUSES.map((s) => `<option value="${s}" ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>`;
}

function openAddCheckModal(eventId, workId, members, ev) {
  openModal(
    "Add Checklist Item",
    `
    <label class="field"><span class="field__label">Title</span><input class="field__input" id="ck-title" placeholder="e.g. Wireless microphone checked"></label>
    <label class="field"><span class="field__label">Description</span><textarea class="field__textarea" id="ck-desc"></textarea></label>
    <div class="field">
      <span class="field__label">Assign Members</span>
      <div class="member-picker" id="ck-members">${memberPickerHtml(members, [])}</div>
    </div>
    <div class="form-actions">
      <button class="btn btn--secondary" id="ck-cancel">Cancel</button>
      <button class="btn btn--primary" id="ck-save">Add Item</button>
    </div>
  `
  );
  wireMemberPicker($("#ck-members"));
  $("#ck-cancel").addEventListener("click", closeModal);
  $("#ck-save").addEventListener("click", async () => {
    const title = $("#ck-title").value.trim();
    if (!title) return showToast("Title is required.", "error");
    try {
      await addWorkCheck(eventId, workId, { title, description: $("#ck-desc").value, assignedMemberIds: getPickedMemberIds($("#ck-members")) });
      closeModal();
      renderEventWorkDetail(eventId, workId, ev);
    } catch (e) {
      console.error(e);
      showToast("Couldn't add checklist item.", "error");
    }
  });
}

async function renderEventThread(eventId, workId, memberMap) {
  const container = $("#event-thread");
  if (!container) return;
  setLoading(container, "Loading thread…");
  try {
    const me = getCurrentMember();
    const renderMsgs = (messages) => {
      const msgsHtml = messages.length === 0
        ? `<p class="meta-text mt-8 mb-8" style="text-align:center;">No messages yet for this ${workId ? "work" : "event"}.</p>`
        : messages
            .map((m) => {
              const sender = memberMap[m.senderId];
              const mine = m.senderId === me?.id;
              const initialLetter = esc(initials(sender?.name || "?"));
              const avatarHtml = sender && !mine
                ? sender.profilePhoto
                  ? `<img class="avatar avatar--sm" src="${esc(sender.profilePhoto)}" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar--sm avatar--initials',textContent:'${initialLetter}'}))">`
                  : `<span class="avatar avatar--sm avatar--initials">${initialLetter}</span>`
                : "";

              const reactionsHtml = renderReactionPillsHtml(m.reactions, me?.id, m.id);
              const pickerHtml = renderEmojiPickerHtml(m.id);

              const contentHtml = m.type === "text"
                ? `<div class="text-msg-bubble ${mine ? "mine" : ""}">${esc(m.text || "")}</div>`
                : `<button class="voice-note" data-audio="${esc(m.audioUrl)}" data-id="${m.id}">
                    <span class="voice-note__play">${icon("play")}</span>
                    <span class="voice-note__label">Voice Note</span>
                    <span class="voice-note__bar"><span class="voice-note__progress"></span></span>
                    <span class="voice-note__duration">${formatDuration(m.duration || 0)}</span>
                  </button>`;

              return `
              <div class="thread-msg ${mine ? "mine" : ""}">
                ${avatarHtml}
                <div class="thread-msg__bubble msg-wrapper ${mine ? "mine" : ""}">
                  ${!mine ? `<div class="thread-msg__name">${esc(sender?.name || m.senderName || "Unknown")}</div>` : ""}
                  ${pickerHtml}
                  ${contentHtml}
                  ${reactionsHtml}
                </div>
              </div>`;
            })
            .join("");

      const inputFormHtml = `
        <form id="text-msg-form" class="chat-input-bar">
          <input type="text" id="text-msg-input" class="chat-input-field" placeholder="Type a message…" autocomplete="off" required>
          <button type="submit" class="chat-send-btn" aria-label="Send message">${icon("send")}</button>
        </form>
      `;

      container.innerHTML = msgsHtml + inputFormHtml;

      $$(".voice-note", container).forEach((btn) => btn.addEventListener("click", () => handleVoiceNoteClick(btn)));
      wireReactionsUI(container, me?.id, "voiceMessages");

      const textForm = $("#text-msg-form", container);
      if (textForm) {
        textForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const input = $("#text-msg-input", textForm);
          const text = input.value.trim();
          if (!text) return;
          input.value = "";
          try {
            await addDoc(collection(db, "voiceMessages"), {
              type: "text",
              text,
              senderId: me.id,
              senderName: me.name,
              eventId: eventId || null,
              workId: workId || null,
              reactions: {},
              createdAt: serverTimestamp(),
            });
            notifyNewMessage({
              senderName: me.name,
              text,
              isVoice: false,
              routeUrl: location.hash,
            });
          } catch (err) {
            console.error("Failed to send text message:", err);
            showToast("Couldn't send message.", "error");
          }
        });
      }
    };

    return listenToWorkVoiceMessages(eventId, workId, (messages) => {
      renderMsgs(messages);
    });
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load thread.", () => renderEventThread(eventId, workId, memberMap));
  }
}

/* ============================================================
   SETTINGS PAGE
   ============================================================ */
async function renderSettingsPage() {
  const member = getCurrentMember();
  const theme = getStoredTheme();
  el.view.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <div class="settings-profile mt-16">
      <div class="settings-profile__photo-wrap">
        ${
          member.profilePhoto
            ? `<img class="avatar avatar--lg" src="${esc(member.profilePhoto)}" id="settings-avatar-img" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar--lg avatar--initials',id:'settings-avatar-img',textContent:'${esc(initials(member.name))}'}))">`
            : `<span class="avatar avatar--lg avatar--initials" id="settings-avatar-img">${esc(initials(member.name))}</span>`
        }
        <button class="settings-profile__camera" id="change-photo-btn">${icon("camera")}</button>
        <input type="file" accept="image/*" id="photo-input" class="hidden">
      </div>
      <div style="font-weight:800;font-size:17px;">${esc(member.name)}</div>
      <div class="meta-text">${esc(member.phone || "")}</div>
    </div>

    <div class="settings-section">
      <h2 class="section-title mt-8">Profile</h2>
      <div class="settings-row">
        <span class="settings-row__label">Name</span>
        <button class="btn btn--ghost btn--sm" id="edit-name-btn">${icon("edit", "icon--sm")}Edit</button>
      </div>
      <div class="settings-row">
        <span class="settings-row__label">Mobile Number</span>
        <button class="btn btn--ghost btn--sm" id="edit-phone-btn">${icon("edit", "icon--sm")}Edit</button>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title mt-8">Notifications</h2>
      <div class="settings-row">
        <span class="settings-row__label">Push Notifications</span>
        <button class="btn btn--ghost btn--sm" id="enable-notifications-btn">${icon("bell", "icon--sm")} ${getNotificationPermissionState() === "granted" ? "Enabled" : "Enable"}</button>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title mt-8">Appearance</h2>
      <div class="theme-toggle mt-8">
        <button class="theme-option ${theme === "light" ? "active" : ""}" data-theme="light">${icon("sun", "icon--sm")}Light Mode</button>
        <button class="theme-option ${theme === "dark" ? "active" : ""}" data-theme="dark">${icon("moon", "icon--sm")}Dark Mode</button>
      </div>
    </div>

    <button class="btn btn--danger btn--full" id="logout-btn">${icon("logout", "icon--sm")}Log Out</button>
  `;

  $("#enable-notifications-btn").addEventListener("click", async () => {
    const ok = await setupNotifications(member.id);
    if (ok) showToast("Notifications enabled!");
    else showToast("Notification permission not granted.", "error");
    renderSettingsPage();
  });


  $("#change-photo-btn").addEventListener("click", () => $("#photo-input").click());
  $("#photo-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    openImageCropperModal(file, async (croppedDataUrl) => {
      showToast("Uploading cropped photo to Cloudinary…");
      try {
        const res = await fetch(croppedDataUrl);
        const blob = await res.blob();
        const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        const url = await updateProfilePhoto(member.id, croppedFile);
        member.profilePhoto = url;
        updateProfileChrome(member);
        renderSettingsPage();
        showToast("Profile photo updated");
      } catch (err) {
        console.error(err);
        showToast("Couldn't update photo.", "error");
      }
    });
  });

  $("#edit-name-btn").addEventListener("click", () => {
    openModal(
      "Change Name",
      `
      <label class="field"><span class="field__label">Name</span><input class="field__input" id="name-input" value="${esc(member.name)}"></label>
      <div class="form-actions">
        <button class="btn btn--secondary" id="name-cancel">Cancel</button>
        <button class="btn btn--primary" id="name-save">Save</button>
      </div>`
    );
    $("#name-cancel").addEventListener("click", closeModal);
    $("#name-save").addEventListener("click", async () => {
      const name = $("#name-input").value.trim();
      if (!name) return showToast("Name is required.", "error");
      await updateProfileName(member.id, name);
      member.name = name;
      updateProfileChrome(member);
      closeModal();
      renderSettingsPage();
      showToast("Name updated");
    });
  });

  $("#edit-phone-btn").addEventListener("click", () => {
    openModal(
      "Change Mobile Number",
      `
      <label class="field"><span class="field__label">Mobile Number</span><input class="field__input" type="tel" id="phone-input" value="${esc(member.phone || "")}"></label>
      <div class="form-actions">
        <button class="btn btn--secondary" id="phone-cancel">Cancel</button>
        <button class="btn btn--primary" id="phone-save">Save</button>
      </div>`
    );
    $("#phone-cancel").addEventListener("click", closeModal);
    $("#phone-save").addEventListener("click", async () => {
      const phone = $("#phone-input").value.trim();
      if (!phone) return showToast("Phone number is required.", "error");
      await updateProfilePhone(member.id, phone);
      member.phone = phone;
      closeModal();
      renderSettingsPage();
      showToast("Mobile number updated");
    });
  });

  $$(".theme-option", el.view).forEach((btn) => {
    btn.addEventListener("click", () => {
      setStoredTheme(btn.dataset.theme);
      renderSettingsPage();
    });
  });

  $("#logout-btn").addEventListener("click", () => {
    if (!confirm("Log out of TMT?")) return;
    logout();
    location.hash = "";
    el.app.classList.add("hidden");
    el.login.classList.remove("hidden");
    el.loginPhone.value = "";
  });
}

/* ============================================================
   Shared: member picker component
   ============================================================ */
function memberPickerHtml(members, selectedIds) {
  if (members.length === 0) {
    return `<p class="meta-text">No team members found in Firebase yet.</p>`;
  }
  return members
    .map(
      (m) => `
      <label class="member-option ${selectedIds.includes(m.id) ? "selected" : ""}" data-member-id="${m.id}">
        <input type="checkbox" value="${m.id}" ${selectedIds.includes(m.id) ? "checked" : ""}>
        ${
          m.profilePhoto
            ? `<img class="avatar avatar--sm" src="${esc(m.profilePhoto)}" alt="" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar--sm avatar--initials',textContent:'${esc(initials(m.name))}'}))">`
            : `<span class="avatar avatar--sm avatar--initials">${esc(initials(m.name))}</span>`
        }
        <span class="member-option__name">${esc(m.name)}</span>
      </label>`
    )
    .join("");
}

function wireMemberPicker(container) {
  if (!container) return;
  $$(".member-option", container).forEach((label) => {
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => label.classList.toggle("selected", checkbox.checked));
  });
}

function getPickedMemberIds(container) {
  return $$("input:checked", container).map((i) => i.value);
}

/* ============================================================
   Generic modal
   ============================================================ */
function openModal(title, bodyHtml) {
  el.modalTitle.textContent = title;
  el.modalBody.innerHTML = bodyHtml;
  el.modalBackdrop.classList.remove("hidden");
}
function closeModal() {
  el.modalBackdrop.classList.add("hidden");
  el.modalBody.innerHTML = "";
}
el.modalClose.addEventListener("click", closeModal);
el.modalBackdrop.addEventListener("click", (e) => {
  if (e.target === el.modalBackdrop) closeModal();
});

/* ============================================================
   Voice recording (press & hold mic button)
   ============================================================ */
const recorder = new VoiceRecorder();
let recordedResult = null;
let isStartingRecorder = false;
let shouldStopRecording = false;

async function startRecording() {
  if (isStartingRecorder || el.recordFab.classList.contains("recording")) return;
  isStartingRecorder = true;
  shouldStopRecording = false;
  try {
    await recorder.start(() => stopRecording());
    el.recordFab.classList.add("recording");
    if (shouldStopRecording) {
      await stopRecording();
    }
  } catch (e) {
    console.error("Recording error:", e);
    el.recordFab.classList.remove("recording");
    showToast("Microphone access is required to record a voice note.", "error");
  } finally {
    isStartingRecorder = false;
  }
}

async function stopRecording() {
  shouldStopRecording = true;
  if (isStartingRecorder) return;
  if (!el.recordFab.classList.contains("recording")) return;
  el.recordFab.classList.remove("recording");
  try {
    const result = await recorder.stop();
    if (!result || result.duration < 0.6) {
      if (result) showToast("Recording too short.");
      return;
    }
    recordedResult = result;
    showVoicePreview(result);
  } catch (err) {
    console.error("Stop recording error:", err);
    showToast("Couldn't process voice recording.", "error");
  }
}

let pointerDownTimer = null;
el.recordFab.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  pointerDownTimer = setTimeout(startRecording, 120); // avoid accidental taps
});
["pointerup", "pointerleave", "pointercancel"].forEach((evt) =>
  el.recordFab.addEventListener(evt, () => {
    clearTimeout(pointerDownTimer);
    stopRecording();
  })
);

function showVoicePreview(result) {
  el.voicePreview.classList.remove("hidden");
  el.voicePreviewTimer.textContent = formatDuration(result.duration);
  let previewPlaying = false;
  const previewUrl = URL.createObjectURL(result.blob);
  const previewAudio = new Audio(previewUrl);

  el.voicePreviewPlay.onclick = () => {
    if (previewPlaying) previewAudio.pause();
    else previewAudio.play();
  };
  previewAudio.addEventListener("play", () => {
    previewPlaying = true;
    el.voicePreviewPlay.innerHTML = icon("pause");
  });
  previewAudio.addEventListener("pause", () => {
    previewPlaying = false;
    el.voicePreviewPlay.innerHTML = icon("play");
  });

  el.voicePreviewDelete.onclick = () => {
    previewAudio.pause();
    URL.revokeObjectURL(previewUrl);
    recordedResult = null;
    el.voicePreview.classList.add("hidden");
  };

  el.voicePreviewSend.onclick = async () => {
    el.voicePreviewSend.disabled = true;
    try {
      const member = getCurrentMember();
      const expirationType = $("#voice-preview-expiration")?.value || "never";

      if (editingVoiceNoteId) {
        await updateVoiceNote(editingVoiceNoteId, {
          blob: result.blob,
          mimeType: result.mimeType,
          duration: result.duration,
          senderId: member.id,
        });
        showToast("Voice note updated");
        editingVoiceNoteId = null;
      } else {
        await sendVoiceNote({
          blob: result.blob,
          mimeType: result.mimeType,
          duration: result.duration,
          senderId: member.id,
          senderName: member.name,
          eventId: currentEventContext?.eventId || null,
          workId: currentEventContext?.workId || null,
          expirationType,
        });
        notifyNewMessage({
          senderName: member.name,
          isVoice: true,
          routeUrl: location.hash,
        });
        showToast("Voice note sent");
      }
      URL.revokeObjectURL(previewUrl);
      el.voicePreview.classList.add("hidden");
      recordedResult = null;
      el.voicePreviewSend.innerHTML = `${icon("send")}`;
      if ($("#home-voice")) renderHomePage();
      if ($("#event-thread")) router();
    } catch (e) {
      console.error(e);
      showToast("Couldn't send voice note.", "error");
    } finally {
      el.voicePreviewSend.disabled = false;
    }
  };
}

/* ============================================================
   Kick off
   ============================================================ */
boot();
