// reactions.js
// Emoji reactions for messages and voice notes

import { db, doc, updateDoc, getDoc } from "./firebase.js";

export const EMOJI_LIST = ["❤️", "😂", "😍", "😢", "😮", "👍", "👎", "🔥", "🙏"];

/** Toggle, change, or remove a reaction on a message in Firestore. */
export async function toggleReaction(messageId, memberId, emoji, collectionName = "voiceMessages") {
  if (!messageId || !memberId || !emoji) return;

  try {
    const msgRef = doc(db, collectionName, messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const reactions = { ...(data.reactions || {}) };

    if (reactions[memberId] === emoji) {
      delete reactions[memberId];
    } else {
      reactions[memberId] = emoji;
    }

    await updateDoc(msgRef, { reactions });
  } catch (err) {
    console.error("Error updating reaction:", err);
  }
}

/** Compute aggregated emoji counts and active user reaction from a reactions object. */
export function getAggregatedReactions(reactionsMap = {}, currentMemberId = null) {
  const counts = {};
  let userReaction = null;

  for (const [userId, emoji] of Object.entries(reactionsMap || {})) {
    counts[emoji] = (counts[emoji] || 0) + 1;
    if (userId === currentMemberId) {
      userReaction = emoji;
    }
  }

  return { counts, userReaction };
}

/** Render HTML string for reaction pills below a message bubble. */
export function renderReactionPillsHtml(reactionsMap = {}, currentMemberId = null, messageId = "") {
  const { counts, userReaction } = getAggregatedReactions(reactionsMap, currentMemberId);
  const entries = Object.entries(counts);

  const pillsHtml = entries
    .map(([emoji, count]) => {
      const isMine = userReaction === emoji;
      return `<button class="reaction-pill ${isMine ? "is-mine" : ""}" data-msg-id="${messageId}" data-emoji="${emoji}">
        <span class="reaction-pill__emoji">${emoji}</span>
        <span class="reaction-pill__count">${count}</span>
      </button>`;
    })
    .join("");

  return `
    <div class="reaction-row">
      <div class="reaction-pills">${pillsHtml}</div>
      <button class="reaction-add-btn" data-msg-id="${messageId}" aria-label="Add reaction" title="Add reaction">
        <span class="reaction-add-icon">😊</span>
      </button>
    </div>
  `;
}

/** Render HTML string for the emoji picker popover. */
export function renderEmojiPickerHtml(messageId) {
  const emojisHtml = EMOJI_LIST.map(
    (emoji) => `<button class="emoji-option-btn" data-msg-id="${messageId}" data-emoji="${emoji}">${emoji}</button>`
  ).join("");

  return `
    <div class="emoji-picker-popover hidden" id="picker-${messageId}">
      <div class="emoji-picker-grid">${emojisHtml}</div>
    </div>
  `;
}

/** Attach event listeners for reaction buttons and emoji picker popovers. */
export function wireReactionsUI(container, currentMemberId, collectionName = "voiceMessages") {
  if (!container) return;

  // Handle reaction pill click (toggle same emoji or react)
  container.querySelectorAll(".reaction-pill").forEach((pill) => {
    pill.addEventListener("click", async (e) => {
      e.stopPropagation();
      const msgId = pill.dataset.msgId;
      const emoji = pill.dataset.emoji;
      if (msgId && emoji) {
        await toggleReaction(msgId, currentMemberId, emoji, collectionName);
      }
    });
  });

  // Handle click on 😊 add reaction button to open picker popover
  container.querySelectorAll(".reaction-add-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const msgId = btn.dataset.msgId;
      const picker = container.querySelector(`#picker-${msgId}`);
      if (picker) {
        container.querySelectorAll(".emoji-picker-popover").forEach((p) => {
          if (p !== picker) p.classList.add("hidden");
        });
        picker.classList.toggle("hidden");
      }
    });
  });

  // Handle emoji option selection inside picker popover
  container.querySelectorAll(".emoji-option-btn").forEach((opt) => {
    opt.addEventListener("click", async (e) => {
      e.stopPropagation();
      const msgId = opt.dataset.msgId;
      const emoji = opt.dataset.emoji;
      const picker = container.querySelector(`#picker-${msgId}`);
      if (picker) picker.classList.add("hidden");

      if (msgId && emoji) {
        await toggleReaction(msgId, currentMemberId, emoji, collectionName);
      }
    });
  });

  // Close popovers on outside click
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest(".emoji-picker-popover") && !e.target.closest(".reaction-add-btn")) {
        container.querySelectorAll(".emoji-picker-popover").forEach((p) => p.classList.add("hidden"));
      }
    },
    { once: true }
  );
}
