/** Match `global-nav.js` so the React app and static pages share dismissal state. */
export const WHATS_NEW_DATE_KEY = 'ms_announcement_modal_seen_v1';
export const WHATS_NEW_VERSION_KEY = 'ms_announcement_modal_version';

export function getLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLastSeenWhatsNewVersion(): number {
  try {
    return parseInt(localStorage.getItem(WHATS_NEW_VERSION_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function markWhatsNewSeen(version: number) {
  try {
    localStorage.setItem(WHATS_NEW_DATE_KEY, getLocalDateString());
    localStorage.setItem(WHATS_NEW_VERSION_KEY, String(version));
  } catch {
    /* ignore */
  }
}

export function shouldShowWhatsNewModal(configVersion: number): boolean {
  try {
    const lastSeenDate = localStorage.getItem(WHATS_NEW_DATE_KEY);
    const lastSeenVersion = getLastSeenWhatsNewVersion();
    const today = getLocalDateString();
    return lastSeenDate !== today || configVersion > lastSeenVersion;
  } catch {
    return false;
  }
}
