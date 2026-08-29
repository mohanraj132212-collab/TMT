// functions/index.js
// Firebase Cloud Functions backend service for FCM notifications

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/** Triggered automatically whenever a new text message or voice note is created in Firestore. */
exports.onNewMessageCreated = functions.firestore
  .document("voiceMessages/{messageId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const senderId = data.senderId;
    const senderName = data.senderName || "Team Member";
    const isVoice = data.type === "voice" || !!data.audioUrl;
    const text = data.text || "";

    const title = senderName;
    const body = isVoice ? "🎤 Voice message" : text || "New message";
    const routeUrl = data.eventId ? `#/event/${data.eventId}` : `#/home`;

    // Retrieve all active team members except sender whose notificationEnabled is not false
    const teamMembersSnap = await admin.firestore().collection("teamMembers").get();
    const tokens = [];

    teamMembersSnap.forEach((doc) => {
      if (doc.id === senderId) return;
      const memberData = doc.data();
      if (memberData.notificationEnabled === false) return;

      if (Array.isArray(memberData.fcmTokens)) {
        tokens.push(...memberData.fcmTokens);
      } else if (memberData.fcmToken) {
        tokens.push(memberData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log("No recipient FCM tokens found.");
      return;
    }

    // Deduplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    const payload = {
      notification: {
        title,
        body,
        icon: "assets/images/logo.png",
      },
      data: {
        title,
        body,
        icon: "assets/images/logo.png",
        url: routeUrl,
      },
      tokens: uniqueTokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(`FCM Multicast result: ${response.successCount} success, ${response.failureCount} failure.`);

      // Clean up invalid or expired tokens
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(uniqueTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log("Cleaning up invalid FCM tokens:", tokensToRemove);
        const batch = admin.firestore().batch();
        teamMembersSnap.forEach((doc) => {
          const memberData = doc.data();
          const existingTokens = memberData.fcmTokens || [];
          const updatedTokens = existingTokens.filter((t) => !tokensToRemove.includes(t));
          if (updatedTokens.length !== existingTokens.length) {
            batch.update(doc.ref, { fcmTokens: updatedTokens });
          }
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Error sending FCM multicast notification:", err);
    }
  });
