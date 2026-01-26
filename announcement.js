// announcement.js — listens for new announcements and shows a single, prominent site-wide banner
(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';

  // Ensure Supabase client is available
  if (typeof supabase === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    }).catch(() => console.warn('Could not load Supabase script'));
  }
  // Reuse a single client if already created to avoid GoTrue conflicts
  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

  // LocalStorage key to remember which announcements the user has already seen
  const SEEN_KEY = 'ms_seen_announcements_v1';

  function getSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
  }
  function markSeen(id) {
    try {
      const seen = new Set(getSeen());
      seen.add(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
    } catch (e) { /* ignore */ }
  }

  function formatTime(ts) {
    try { return new Date(ts).toLocaleString(); } catch { return '' }
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // create or replace the banner with richer UI; banner persists until dismissed
  function showBanner(item) {
    if (!item || !item.id) return;
    const seen = getSeen();
    if (seen.includes(item.id)) return; // already shown

    // remove any existing banner
    const existing = document.querySelector('.ms-announcement-banner');
    if (existing) existing.remove();

    // inject styles once
    if (!document.getElementById('ms-announcement-styles')) {
      const s = document.createElement('style');
      s.id = 'ms-announcement-styles';
      s.textContent = `
        .ms-announcement-banner{position:fixed;left:0;right:0;top:0;z-index:20000;display:flex;justify-content:center}
        .ms-ann-inner{max-width:1100px;width:100%;margin:10px;padding:14px 18px;background:linear-gradient(90deg,#0f172a,#06202b);color:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.14);display:flex;align-items:center;gap:16px}
        .ms-info{flex:1}
        .ms-info strong{display:block;font-size:1rem}
        .ms-meta{font-size:0.85rem;opacity:0.85;margin-top:6px}
        .ms-actions{display:flex;gap:8px;align-items:center}
        .ms-actions button{background:rgba(255,255,255,0.12);color:#fff;border:0;padding:8px 10px;border-radius:8px;cursor:pointer}
        .ms-actions button.primary{background:#06b6d4;color:#042028}
      `;
      document.head.appendChild(s);
    }

    const wrap = document.createElement('div');
    wrap.className = 'ms-announcement-banner';
    const inner = document.createElement('div');
    inner.className = 'ms-ann-inner';

    const info = document.createElement('div');
    info.className = 'ms-info';
    const title = document.createElement('strong');
    title.innerHTML = escapeHTML(item.message || 'Announcement');
    const meta = document.createElement('div');
    meta.className = 'ms-meta';
    meta.textContent = `Posted ${formatTime(item.created_at || item.createdAt || Date.now())}`;
    info.appendChild(title);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'ms-actions';
    const dismiss = document.createElement('button');
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => { wrap.remove(); markSeen(item.id); });
    const never = document.createElement('button');
    never.textContent = "Don't show again";
    never.addEventListener('click', () => { wrap.remove(); markSeen(item.id); });
    actions.appendChild(dismiss);
    actions.appendChild(never);

    inner.appendChild(info);
    inner.appendChild(actions);
    wrap.appendChild(inner);
    document.body.appendChild(wrap);

    // Mark shown so it doesn't reappear on refresh
    markSeen(item.id);
  }

  // Load most recent unseen announcement and show it
  async function loadAndShow() {
    try {
      const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(10);
      if (!data || !data.length) return;
      const seen = getSeen();
      // find latest that hasn't been seen
      const next = data.find(a => !seen.includes(a.id));
      if (next) showBanner(next);
    } catch (e) { console.warn('announcements load failed', e); }
  }

  // subscribe to new announcements and show if unseen
  try {
    sb.channel('public:announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        const m = payload.new;
        if (m && m.id) {
          const seen = getSeen();
          if (!seen.includes(m.id)) showBanner(m);
        }
      })
      .subscribe();
  } catch (err) { console.warn('announcement subscribe failed', err); }

  // initial run
  loadAndShow();

})();
