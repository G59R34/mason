/**
 * Parse admin-generated body HTML (`buildModalBodyHtml` in masonadmin) into structured data for animated UI.
 */
export type WhatsNewItem = { title: string; description: string };

export function parseWhatsNewHtml(html: string): { intro: string | null; items: WhatsNewItem[] } {
  const wrapped = `<div id="whats-new-root">${html}</div>`;
  const doc = new DOMParser().parseFromString(wrapped, 'text/html');
  const root = doc.getElementById('whats-new-root');
  if (!root) return { intro: null, items: [] };

  const p = root.querySelector(':scope > p');
  const intro = p?.textContent?.trim() || null;

  const items: WhatsNewItem[] = [];
  root.querySelectorAll('.ms-announcement-updates li').forEach((li) => {
    const spans = li.querySelectorAll(':scope > span');
    const textSpan = spans[spans.length - 1];
    if (!textSpan) return;
    const strong = textSpan.querySelector('strong');
    const title = strong?.textContent?.trim() ?? '';
    const clone = textSpan.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('strong').forEach((s) => s.remove());
    let description = (clone.textContent || '')
      .replace(/^[—\s\-–·]+/, '')
      .trim();
    if (title || description) items.push({ title, description });
  });

  return { intro, items };
}
