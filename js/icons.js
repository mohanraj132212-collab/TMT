// icons.js
// Centralized SVG icon strings. All icons share a 24x24 viewBox and inherit
// color via currentColor so they follow the light/dark theme automatically.

export const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v8.5a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  work: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7" width="17" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 12.5h17" stroke="currentColor" stroke-width="1.8"/></svg>`,
  private: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  event: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-2-3.4-2.2.7a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.2-.7-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.2-.7a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.5-2.4a7.6 7.6 0 0 0 2.6-1.5l2.2.7 2-3.4-1.9-1.9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 17.5V21M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="5.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="13" y="5.5" width="4" height="13" rx="1" fill="currentColor"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none"><path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  add: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2m-8 0 .8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L18.5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  location: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-6.5-5.9-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.1-6.5 11-6.5 11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="1.6"/></svg>`,
  checklist: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m4 5.5 1.2 1.2L7.5 4.5M4 11.5l1.2 1.2 2.3-2.2M4 17.5l1.2 1.2 2.3-2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  notification: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m19 19-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7.5" width="18" height="12.5" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 7.5 9.7 5h4.6l1.2 2.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.7" r="3.4" stroke="currentColor" stroke-width="1.7"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 3.5h3l1.3 4-2 1.5a12 12 0 0 0 5.2 5.2l1.5-2 4 1.3v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1a1.5 1.5 0 0 1 1.5-1.6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2m-8 0 .8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L18.5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none"><path d="m4.5 12.5 5 5 10-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" fill="none"><path d="M10 8 4.5 12.5 10 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 12.5H14a5 5 0 0 1 5 5v1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  wifi_off: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M8.5 11a9 9 0 0 1 5-1.9M5 8a12.9 12.9 0 0 1 3.3-1.9M12 17.5v.01M9.9 14.3a5 5 0 0 1 4.6-.3M16.8 12a9 9 0 0 1 2 1.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>`,
};

export function icon(name, cls = "") {
  const svg = ICONS[name] || "";
  if (!svg) return "";
  return svg.replace("<svg ", `<svg class="icon ${cls}" `);
}
