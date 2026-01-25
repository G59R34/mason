// announcement.js — listens for new announcements and shows site-wide banners
(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';

  if (typeof supabase === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    }).catch(() => console.warn('Could not load Supabase script'));
  }
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function makeBanner(msg) {
    const b = document.createElement('div');
    b.className = 'ms-announcement';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:12px;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;box-shadow:0 8px 30px rgba(2,6,23,0.12);z-index:20000;max-width:90%;font-weight:600';
    b.textContent = msg;
    const close = document.createElement('button'); close.textContent = '×';
    close.style.cssText = 'margin-left:12px;background:transparent;border:0;color:rgba(255,255,255,0.9);font-size:16px;cursor:pointer';
    close.addEventListener('click', () => b.remove());
    b.appendChild(close);
    document.body.appendChild(b);
    setTimeout(() => { b.remove(); }, 10000);
  }

  // initial load: show recent announcements
  try {
    const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(5);
    if (data && data.length) {
      // show the most recent one
      makeBanner(data[0].message);
    }
  } catch (e) { console.warn('announcements load failed', e); }

  // subscribe to new announcements
  try {
    sb.channel('public:announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        const m = payload.new;
        if (m && m.message) makeBanner(m.message);
      })
      .subscribe();
  } catch (err) { console.warn('announcement subscribe failed', err); }

})();
