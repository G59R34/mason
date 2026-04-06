/** Matches `announcement.js` so dismiss state syncs across static HTML and React. */
export const ANNOUNCEMENT_SEEN_KEY = 'ms_seen_announcements_v1';

export function getSeenAnnouncementIds(): string[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markAnnouncementSeen(id: string) {
  try {
    const seen = new Set(getSeenAnnouncementIds());
    seen.add(id);
    localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}
