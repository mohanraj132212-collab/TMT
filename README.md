# TMT — Private Team Management & Event Coordination PWA

A private, invite-only (Firestore-managed, no signup) Progressive Web App for
a fixed small team: voice notes, work assignment, event coordination with
checklists, and personal private reminders. Built with plain HTML/CSS/JS
(ES modules) + Firebase (Firestore + Storage). No frontend frameworks.

## 1. Project structure

```
TMT/
├── index.html            Single-page app shell (login + app screens)
├── manifest.json         PWA manifest
├── service-worker.js     Offline app-shell caching
├── firestore.rules       Firestore security rules
├── storage.rules         Storage security rules
├── css/
│   ├── style.css         Tokens, layout, shell
│   ├── components.css    Buttons, cards, modal, voice notes, etc.
│   └── responsive.css    Mobile / tablet / desktop breakpoints
├── js/
│   ├── firebase.js       Firebase config + SDK exports (only file with config)
│   ├── app.js            Router, view rendering, modals, voice recording UI
│   ├── auth.js           Phone-number lookup + session
│   ├── team.js           `teamMembers` data access (never hardcoded)
│   ├── profile.js        Profile edit (name/phone/photo) + theme
│   ├── dashboard.js       Home screen: voice activity grouped by sender
│   ├── work.js           General work assignments
│   ├── private.js        Personal reminders (owner-scoped)
│   ├── events.js         Events → works → checklist items
│   ├── voice.js          MediaRecorder capture + voice message data
│   ├── storage.js        Firebase Storage upload/delete helpers
│   ├── icons.js          Shared SVG icon set
│   └── utils.js          Formatting, session, toast, loading/empty/error states
└── assets/
    ├── images/logo.png   Placeholder logo — replace with your real logo.png
    └── icons/            Generated PWA icon sizes
```

## 2. Firebase setup

The app already points at the Firebase project from your config snippet
(`private-team-management`). You still need to, in the Firebase console:

1. **Enable Firestore** (Native mode) and **Storage**.
2. **Deploy security rules**: copy `firestore.rules` and `storage.rules` into
   your project (Firebase console → Firestore/Storage → Rules) or deploy via
   the Firebase CLI (`firebase deploy --only firestore:rules,storage:rules`).
3. **Create team member documents manually** in a `teamMembers` collection.
   Nothing about your team is in the source code — you add it directly in
   Firestore:

   ```
   teamMembers/{autoId}
     name: "Full Name"
     phone: "+91 90000 00000"
     profilePhoto: ""            // fill in after first login, or paste a URL
     active: true
   ```

   The phone number a person types on the login screen is compared
   (digits-only) against these documents. No match → access is refused, with
   no way to self-register.

4. Composite index: the Home feed and event threads query
   `voiceMessages` with `where(eventId) + orderBy(createdAt)`. Firestore will
   show a "create index" link with the exact URL the first time this runs
   against real data — click it once, or predefine it in
   `firestore.indexes.json` if you use the CLI.

## 3. Important security note

TMT deliberately has **no signup and no Firebase Authentication** — access is
gated purely by matching a phone number against `teamMembers`. That means
there is no `request.auth.uid` yet for Firestore/Storage rules to check
against. The shipped rules keep writes reasonably scoped for a small trusted
team, but **true per-member enforcement of private reminders requires adding
Firebase Authentication** (e.g. Phone Auth, or anonymous auth plus a
Cloud Function that mints a custom token tied to a `teamMembers` doc id).
This is called out again inline in `firestore.rules` with the exact rule to
swap in once that's wired up.

## 4. Branding

Replace `assets/images/logo.png` with your real logo (used in the header,
sidebar, login screen, and as the source for the generated PWA icons in
`assets/icons/`). Keep the same filename or update the references in
`index.html` and `manifest.json`.

## 5. Running locally

This is a static app — serve the folder with any static file server (it must
be served over `http://localhost` or `https://` for microphone access and
service worker registration to work; opening `index.html` directly via
`file://` will not work).

```bash
npx serve TMT
# or
python3 -m http.server --directory TMT 8080
```

Then open the printed local URL, add a matching phone number to
`teamMembers` in Firestore, and log in.

## 6. What's implemented

- Phone-number-only login against Firestore, no signup, session persisted
  locally so returning users skip the number entry.
- Home dashboard: current-event + my-work summary, and team voice activity
  grouped one profile per sender (never duplicated per message).
- Press-and-hold microphone button with preview (play/delete/send) before
  upload; audio goes to Storage, metadata to Firestore.
- Work page: create/assign/status-update/delete general work.
- Private page: personal reminders, scoped to the logged-in member only.
- Event page: create events, add works per event, add checklist items per
  work, update checklist status, see live progress % and Ready/Pending/
  Problem counts, and send voice notes scoped to an event or a specific work.
- Settings: edit name/phone/photo (all written to Firestore/Storage), toggle
  light/dark mode.
- Loading / empty / error / offline states on every Firebase-backed view.
- Installable PWA with offline app-shell caching via a service worker.
- Fully responsive: bottom nav + FAB on mobile, sidebar + wider layouts on
  desktop, distinct layouts (not just a stretched mobile view).
# TMT  
