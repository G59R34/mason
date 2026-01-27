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
    <div class="ms-chat-header">
      <div>
        <strong>Mason Support</strong>
        <div id="ms-ticket-status" class="ms-chat-meta" style="margin-top:4px"></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button id="ms-new-ticket" style="background:#0f766e;color:#fff;border:0;padding:6px 10px;border-radius:8px">New Ticket</button>
        <button id="ms-close">_</button>
      </div>
    </div>
    <div class="ms-chat-body" id="ms-body"></div>
    <form class="ms-chat-form" id="ms-form"><input name="name" placeholder="Name" type="text" required style="flex:0 0 90px" /><input name="text" placeholder="Type a message..." type="text" required /><button type="submit" style="background:#06b6d4;color:#fff;border:0;padding:8px 10px;border-radius:8px">Send</button></form>
  `;
  document.body.appendChild(panel);

  const countEl = bubble.querySelector('.count');
  const body = panel.querySelector('#ms-body');
  const form = panel.querySelector('#ms-form');
  const statusEl = panel.querySelector('#ms-ticket-status');
  const newTicketBtn = panel.querySelector('#ms-new-ticket');
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

  async function loadConversationMeta(conversation_id) {
    if (!conversation_id) return null;
    const { data, error } = await sb.from('conversations').select('id,status,customer_name').eq('id', conversation_id).maybeSingle();
    if (error) { console.warn('load conversation meta', error); return null; }
    return data || null;
  }

  function getTicketIds() {
    try { return JSON.parse(localStorage.getItem('ms_ticket_ids') || '[]').filter(Boolean); }
    catch { return []; }
  }

  function addTicketId(id) {
    const ids = getTicketIds();
    if (!ids.includes(id)) ids.unshift(id);
    localStorage.setItem('ms_ticket_ids', JSON.stringify(ids.slice(0, 20)));
  }

  async function createNewTicket(name) {
    const customer = (name || localStorage.getItem('ms_customer_name') || '').trim();
    if (!customer) return null;
    const { data: cdata, error: cerr } = await sb
      .from('conversations')
      .insert([{ customer_name: customer, status: 'open' }])
      .select('id')
      .limit(1);
    if (cerr || !cdata || cdata.length === 0) { console.error('conversation create error', cerr); return null; }
    const newId = cdata[0].id;
    localStorage.setItem('ms_conversation_id', newId);
    addTicketId(newId);
    return newId;
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
      conversation_id = await createNewTicket(name);
      if (!conversation_id) return;
      addTicketId(conversation_id);

      const { error: mErr } = await sb.from('conversation_messages')
        .insert([{ conversation_id, sender: name, body: text, sender_role: 'user' }]);
      if (mErr) console.error('send', mErr);
      try {
        await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id);
      } catch (e) {
        console.warn('last_message_at update failed', e);
      }

      try {
        window.location.href = `usertickets.html?conversation=${conversation_id}`;
        return;
      } catch (e) {
        console.warn('redirect failed', e);
      }
    }

    const meta = await loadConversationMeta(conversation_id);
    if (meta && meta.status === 'closed') {
      alert('This ticket is closed. Click "New Ticket" to start a new one.');
      return;
    }

    const { error } = await sb.from('conversation_messages')
      .insert([{ conversation_id, sender: name, body: text, sender_role: 'user' }]);
    if (error) return console.error('send', error);
    try {
      await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id);
    } catch (e) {
      console.warn('last_message_at update failed', e);
    }
    form.elements['text'].value = '';
    await loadMessages(conversation_id);
  });

  const conversationId = localStorage.getItem('ms_conversation_id');
  if (conversationId) addTicketId(conversationId);
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

  const convoChannel = sb.channel('public:conversations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async (payload) => {
      const updatedId = payload.new?.id || payload.old?.id;
      const currentId = localStorage.getItem('ms_conversation_id');
      if (updatedId && currentId && updatedId === currentId) {
        await refreshStatus();
      }
    })
    .subscribe();

  if (conversationId) {
    loadMessages(conversationId);
  }

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bubble.contains(e.target) && panel.style.display === 'flex') closePanel();
  });

  async function refreshStatus() {
    const id = localStorage.getItem('ms_conversation_id');
    const meta = await loadConversationMeta(id);
    if (!statusEl) return;
    if (!meta) {
      statusEl.textContent = 'No active ticket';
      return;
    }
    statusEl.textContent = `Ticket ${meta.id.slice(0, 6)} • ${meta.status || 'open'}`;
  }

  newTicketBtn?.addEventListener('click', async () => {
    const name = localStorage.getItem('ms_customer_name') || form.elements['name'].value || '';
    const newId = await createNewTicket(name);
    if (!newId) return;
    form.elements['text'].value = '';
    await refreshStatus();
    await loadMessages(newId);
  });

  refreshStatus();
})();
