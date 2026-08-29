// dashboard.js
// Renders the Home screen: team voice activity (grouped by sender, never
// duplicated per message) plus quick "current event" / "my work" summaries.

import { icon } from "./icons.js";
import { esc, initials, formatDuration, formatRelativeTime, setLoading, setEmpty, setError } from "./utils.js";
import { getAllTeamMembers } from "./team.js";
import { listenToTeamVoiceMessages, groupVoiceMessagesBySender } from "./voice.js";
import { getAllEvents } from "./events.js";
import { getAllWork } from "./work.js";
import { renderReactionPillsHtml, renderEmojiPickerHtml, wireReactionsUI } from "./reactions.js";


function memberChip(member) {
  if (!member) return "";
  const initialLetter = esc(initials(member.name || "?"));
  return member.profilePhoto
    ? `<img class="avatar" src="${esc(member.profilePhoto)}" alt="${esc(member.name)}" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar--initials',textContent:'${initialLetter}'}))">`
    : `<span class="avatar avatar--initials">${initialLetter}</span>`;
}

function renderVoiceGroup(group, memberMap, onPlay, currentMemberId) {
  const member = memberMap[group.senderId];
  const name = member?.name || "Unknown member";
  const notesHtml = group.messages
    .map((m, i) => {
      const isOwner = currentMemberId && currentMemberId === m.senderId;
      const isEditedTag = m.isEdited ? `<span class="edited-tag">Edited</span>` : "";

      const actionMenuHtml = isOwner
        ? `<div class="action-menu">
            <button class="icon-btn js-voice-menu-btn" data-id="${esc(m.id)}" aria-label="Voice note options">${icon("dots", "icon--sm")}</button>
            <div class="action-menu__dropdown hidden" id="vmenu-${esc(m.id)}">
              <button class="action-menu__item js-voice-edit-btn" data-id="${esc(m.id)}" data-url="${esc(m.audioUrl)}">${icon("edit", "icon--sm")} Edit</button>
              <button class="action-menu__item action-menu__item--danger js-voice-delete-btn" data-id="${esc(m.id)}">${icon("delete", "icon--sm")} Delete</button>
            </div>
          </div>`
        : "";

      const reactionsHtml = renderReactionPillsHtml(m.reactions, currentMemberId, m.id);
      const pickerHtml = renderEmojiPickerHtml(m.id);

      return `
      <div class="msg-wrapper" style="width:100%;">
        ${pickerHtml}
        <div style="display:flex;align-items:center;gap:6px;width:100%;">
          <button class="voice-note" data-audio="${esc(m.audioUrl)}" data-id="${esc(m.id)}" style="flex:1;">
            <span class="voice-note__play">${icon("play")}</span>
            <span class="voice-note__label">Voice Note ${i + 1}${isEditedTag}</span>
            <span class="voice-note__bar"><span class="voice-note__progress"></span></span>
            <span class="voice-note__duration">${formatDuration(m.duration)}</span>
          </button>
          ${actionMenuHtml}
        </div>
        ${reactionsHtml}
      </div>`;
    })
    .join("");
  return `
    <div class="voice-group">
      <div class="voice-group__header">
        ${memberChip(member)}
        <div class="voice-group__meta">
          <span class="voice-group__name">${esc(name)}</span>
          <span class="voice-group__time">${formatRelativeTime(group.latest * 1000)}</span>
        </div>
      </div>
      <div class="voice-group__notes">${notesHtml}</div>
    </div>`;
}

export async function renderVoiceActivity(container, { onPlay, currentMemberId, onEdit, onDelete } = {}) {
  setLoading(container, "Loading voice activity…");
  try {
    const members = await getAllTeamMembers();
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

    const renderMsgs = (messages) => {
      if (messages.length === 0) {
        setEmpty(container, "No voice messages yet.", "Press and hold the mic button to send one.");
        return;
      }
      const groups = groupVoiceMessagesBySender(messages);
      container.innerHTML = groups.map((g) => renderVoiceGroup(g, memberMap, onPlay, currentMemberId)).join("");

      container.querySelectorAll(".voice-note").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (e.target.closest(".action-menu")) return;
          onPlay?.(btn);
        });
      });

      // Dropdown toggle & actions
      container.querySelectorAll(".js-voice-menu-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const menuId = `vmenu-${btn.dataset.id}`;
          container.querySelectorAll(".action-menu__dropdown").forEach((d) => {
            if (d.id !== menuId) d.classList.add("hidden");
          });
          const targetMenu = container.querySelector(`#${menuId}`);
          targetMenu?.classList.toggle("hidden");
        });
      });

      container.querySelectorAll(".js-voice-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const url = btn.dataset.url;
          onEdit?.(id, url);
        });
      });

      container.querySelectorAll(".js-voice-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          onDelete?.(id);
        });
      });

      wireReactionsUI(container, currentMemberId, "voiceMessages");
    };


    // Real-time listener for voice activity
    return listenToTeamVoiceMessages(
      (messages) => {
        renderMsgs(messages);
      },
      (err) => {
        console.error("Home feed voice activity error:", err);
        setError(container, "Couldn't load voice activity.", () => renderVoiceActivity(container, { onPlay, currentMemberId, onEdit, onDelete }));
      }
    );
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load voice activity.", () => renderVoiceActivity(container, { onPlay, currentMemberId, onEdit, onDelete }));
  }
}


export async function renderHomeSummary(container) {
  setLoading(container, "Loading dashboard…");
  try {
    const [events, work] = await Promise.all([getAllEvents(), getAllWork()]);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = events.filter((e) => !e.date || e.date >= today).sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
    const myOpenWork = work.filter((w) => w.status !== "Done").slice(0, 4);

    container.innerHTML = `
      <div class="summary-grid">
        <div class="card summary-card">
          <h3 class="card__title">Current Event</h3>
          ${
            upcoming
              ? `<p class="summary-card__name">${esc(upcoming.name)}</p>
                 <p class="summary-card__meta">${icon("calendar", "icon--sm")} ${esc(upcoming.date || "No date")} · ${icon("location", "icon--sm")} ${esc(upcoming.location || "TBD")}</p>
                 <a class="link" href="#/event/${upcoming.id}">View event →</a>`
              : `<p class="summary-card__empty">No upcoming events.</p>`
          }
        </div>
        <div class="card summary-card">
          <h3 class="card__title">My Work</h3>
          ${
            myOpenWork.length
              ? `<ul class="mini-list">${myOpenWork
                  .map((w) => `<li><span class="dot dot--${(w.status || "pending").toLowerCase().replace(/\s/g, "-")}"></span>${esc(w.name)}</li>`)
                  .join("")}</ul>`
              : `<p class="summary-card__empty">No active work assigned.</p>`
          }
          <a class="link" href="#/work">View all work →</a>
        </div>
      </div>`;
  } catch (e) {
    console.error(e);
    setError(container, "Couldn't load dashboard.", () => renderHomeSummary(container));
  }
}
