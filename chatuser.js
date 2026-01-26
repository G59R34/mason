// chatuser.js — Mason Support popout widget (new conversation system)
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

  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

  if (!document.getElementById('ms-chat-styles')) {
    const style = document.createElement('style');
    style.id = 'ms-chat-styles';
    style.textContent = `
      .ms-chat-bubble{position:fixed;right:18px;bottom:18px;width:60px;height:60px;border-radius:999px;background:#06b6d4;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(2,6,23,0.18);cursor:pointer;z-index:10000}
      .ms-chat-bubble .count{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 6px;font-size:0.75rem}
      .ms-chat-panel{position:fixed;right:18px;bottom:88px;width:340px;height:480px;border-radius:12px;background:#fff;box-shadow:0 20px 50px rgba(2,6,23,0.2);display:flex;flex-direction:column;overflow:hidden;z-index:10000}
      .ms-chat-header{padding:12px;border-bottom:1px solid #eef2ff;display:flex;align-items:center;justify-content:space-between}
      .ms-chat-body{padding:12px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,#fff,#fbfdff)}
      .ms-chat-form{padding:10px;border-top:1px solid #eef2ff;display:flex;gap:8px}
      .ms-chat-form input[type="text"]{flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
      .ms-chat-msg{padding:8px;border-radius:10px;background:#f8fafc;border:1px solid #eef2ff}
      .ms-chat-meta{font-size:0.8rem;color:#6b7280}
      @media(max-width:420px){.ms-chat-panel{right:12px;left:12px;width:auto;height:60vh}}
    `;
    document.head.appendChild(style);
  }

  const bubble = document.createElement('button');
  bubble.className = 'ms-chat-bubble';
  bubble.setAttribute('aria-expanded','false');
  bubble.setAttribute('aria-label','Open Mason Support');
  bubble.innerHTML = '<span aria-hidden>💬</span><span class="count" style="display:none">0</span>';
  document.body.appendChild(bubble);

  const panel = document.createElement('aside');
  panel.className = 'ms-chat-panel';
  panel.style.display = 'none';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Mason Support');
  panel.innerHTML = `
    <div class="ms-chat-header"><strong>Mason Support</strong><button id="ms-close">_</button></div>
    <div class="ms-chat-body" id="ms-body"></div>
    <form class="ms-chat-form" id="ms-form"><input name="name" placeholder="Name" type="text" required style="flex:0 0 90px" /><input name="text" placeholder="Type a message..." type="text" required /><button type="submit" style="background:#06b6d4;color:#fff;border:0;padding:8px 10px;border-radius:8px">Send</button></form>
  `;
  document.body.appendChild(panel);

  const countEl = bubble.querySelector('.count');
  const body = panel.querySelector('#ms-body');
  const form = panel.querySelector('#ms-form');
  const nameInput = form.elements['name'];
  const storedName = localStorage.getItem('ms_customer_name');
  if (storedName && nameInput) {
    nameInput.value = storedName;
    nameInput.readOnly = true;
  }

  function sanitize(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  let unread = 0;
  function setUnread(n){ unread = n; if (unread>0){ countEl.style.display='inline-block'; countEl.textContent = String(unread);} else { countEl.style.display='none'; }}

  function openPanel(){ panel.style.display='flex'; bubble.setAttribute('aria-expanded','true'); setUnread(0); body.scrollTop = body.scrollHeight; }
  function closePanel(){ panel.style.display='none'; bubble.setAttribute('aria-expanded','false'); }

  bubble.addEventListener('click', () => { if (panel.style.display === 'none') openPanel(); else closePanel(); });
  panel.querySelector('#ms-close').addEventListener('click', closePanel);

  async function renderMessage(m){
    const el = document.createElement('div'); el.className = 'ms-chat-msg';
    const meta = document.createElement('div'); meta.className='ms-chat-meta';
    meta.textContent = `${sanitize(m.sender)} • ${new Date(m.created_at || Date.now()).toLocaleString()}`;
    const txt = document.createElement('div'); txt.style.marginTop='6px';
    txt.innerHTML = sanitize(m.body || '');
    el.appendChild(meta); el.appendChild(txt); body.appendChild(el);
  }

  async function loadMessages(conversation_id){
    if (!conversation_id) return;
    const { data, error } = await sb.from('conversation_messages').select('*').eq('conversation_id', conversation_id).order('created_at', { ascending: true }).limit(500);
    if (error) return console.error('load messages', error);
    body.innerHTML = '';
    (data || []).forEach(m => renderMessage(m));
    body.scrollTop = body.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const stored = localStorage.getItem('ms_customer_name');
    const name = (stored || form.elements['name'].value || '').trim();
    const text = (form.elements['text'].value || '').trim();
    if (!name || !text) return;
    localStorage.setItem('ms_customer_name', name);
    if (nameInput) {
      nameInput.value = name;
      nameInput.readOnly = true;
    }

    let conversation_id = localStorage.getItem('ms_conversation_id');
    if (!conversation_id) {
      const { data: cdata, error: cerr } = await sb
        .from('conversations')
        .insert([{ customer_name: name }])
        .select('id')
        .limit(1);
      if (cerr || !cdata || cdata.length === 0) { console.error('conversation create error', cerr); return; }
      conversation_id = cdata[0].id;
      localStorage.setItem('ms_conversation_id', conversation_id);

      const { error: mErr } = await sb.from('conversation_messages')
        .insert([{ conversation_id, sender: name, body: text, sender_role: 'user' }]);
      if (mErr) console.error('send', mErr);

      try {
        window.location.href = `usertickets.html?conversation=${conversation_id}`;
        return;
      } catch (e) {
        console.warn('redirect failed', e);
      }
    }

    const { error } = await sb.from('conversation_messages')
      .insert([{ conversation_id, sender: name, body: text, sender_role: 'user' }]);
    if (error) return console.error('send', error);
    form.elements['text'].value = '';
    await loadMessages(conversation_id);
  });

  const conversationId = localStorage.getItem('ms_conversation_id');
  const msChannel = sb.channel('public:conversation_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
      const m = payload.new;
      if (conversationId && m.conversation_id === conversationId) {
        if (panel.style.display === 'none') setUnread(unread + 1);
        renderMessage(m);
        body.scrollTop = body.scrollHeight;
      }
    })
    .subscribe();

  if (conversationId) {
    loadMessages(conversationId);
  }

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bubble.contains(e.target) && panel.style.display === 'flex') closePanel();
  });
})();
