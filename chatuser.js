// chatuser.js — Mason Support popout widget
(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';

  // Ensure Supabase UMD is available; load if missing
  if (typeof supabase === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    }).catch(() => console.warn('Could not load Supabase script'));
  }

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Styles
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

  // Build UI: bubble + panel (hidden)
  const bubble = document.createElement('button'); bubble.className = 'ms-chat-bubble'; bubble.setAttribute('aria-expanded','false'); bubble.setAttribute('aria-label','Open Mason Support');
  bubble.innerHTML = '<span aria-hidden>💬</span><span class="count" style="display:none">0</span>';
  document.body.appendChild(bubble);

  const panel = document.createElement('aside'); panel.className = 'ms-chat-panel'; panel.style.display = 'none'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Mason Support');
  panel.innerHTML = `
    <div class="ms-chat-header"><strong>Mason Support</strong><button id="ms-close">_</button></div>
    <div class="ms-chat-body" id="ms-body"></div>
    <form class="ms-chat-form" id="ms-form"><input name="name" placeholder="Name" type="text" required style="flex:0 0 90px" /><input name="text" placeholder="Type a message..." type="text" required /><button type="submit" style="background:#06b6d4;color:#fff;border:0;padding:8px 10px;border-radius:8px">Send</button></form>
  `;
  document.body.appendChild(panel);

  const countEl = bubble.querySelector('.count');
  const body = panel.querySelector('#ms-body');
  const form = panel.querySelector('#ms-form');

  function sanitize(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML }

  let unread = 0;

  function setUnread(n){ unread = n; if (unread>0){ countEl.style.display='inline-block'; countEl.textContent = String(unread);} else { countEl.style.display='none'; }}

  function openPanel(){ panel.style.display='flex'; bubble.setAttribute('aria-expanded','true'); setUnread(0); body.scrollTop = body.scrollHeight; }
  function closePanel(){ panel.style.display='none'; bubble.setAttribute('aria-expanded','false'); }

  bubble.addEventListener('click', () => { if (panel.style.display === 'none') openPanel(); else closePanel(); });
  panel.querySelector('#ms-close').addEventListener('click', closePanel);

  async function renderMessage(m){
    const el = document.createElement('div'); el.className = 'ms-chat-msg';
    const meta = document.createElement('div'); meta.className='ms-chat-meta'; meta.textContent = `${sanitize(m.name)} • ${new Date(m.created_at || Date.now()).toLocaleString()}`;
    const txt = document.createElement('div'); txt.style.marginTop='6px'; txt.innerHTML = sanitize(m.message || m.text || m.body || '');
    el.appendChild(meta); el.appendChild(txt); body.appendChild(el);
  }

  async function loadMessages(ticket_id){
    if (!ticket_id) return;
    const { data, error } = await sb.from('messages').select('*').eq('ticket_id', ticket_id).order('created_at', { ascending: true }).limit(500);
    if (error) return console.error('load messages', error);
    body.innerHTML = '';
    (data || []).forEach(m => renderMessage(m));
    body.scrollTop = body.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements['name'].value.trim();
    const text = form.elements['text'].value.trim();
    if (!name || !text) return;

    // If user doesn't have a ticket yet, create one first and persist in localStorage
    let ticket_id = localStorage.getItem('ms_ticket_id');
    if (!ticket_id) {
      const subject = text.length > 80 ? (text.slice(0,77) + '...') : text;
      const { data: tdata, error: terr } = await sb.from('tickets').insert([{ subject, customer_name: name }]).select('id').limit(1);
      if (terr || !tdata || tdata.length === 0) { console.error('ticket create error', terr); return; }
      ticket_id = tdata[0].id;
      localStorage.setItem('ms_ticket_id', ticket_id);
      // Insert the initial message so the ticket has context for admins.
      const { error: mErr } = await sb.from('messages').insert([{ ticket_id, name, message: text, sender_role: 'user' }]);
      if (mErr) console.error('send', mErr);
      // Redirect user to the dedicated ticket page
      try {
        window.location.href = `usertickets.html?ticket=${ticket_id}`;
        return; // stop further execution; the new page will load
      } catch (e) {
        // fallback: continue without redirect
        console.warn('redirect failed', e);
      }
    }

    const { error } = await sb.from('messages').insert([{ ticket_id, name, message: text, sender_role: 'user' }]);
    if (error) return console.error('send', error);
    form.elements['text'].value = '';
    await loadMessages(ticket_id);
  });

  // Realtime subscription (Supabase JS v2): use a channel and postgres_changes
  // Subscribe to all message inserts but only render those that match this user's ticket
  const ticketId = localStorage.getItem('ms_ticket_id');
  const msChannel = sb.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new;
      if (ticketId && m.ticket_id === ticketId) {
        if (panel.style.display === 'none') setUnread(unread + 1);
        renderMessage(m);
        body.scrollTop = body.scrollHeight;
      }
    })
    .subscribe();

  // If we already have a ticket, load its messages
  if (ticketId) {
    loadMessages(ticketId);
    // also show ticket status/assignment (optional)
    const { data: tinfo } = await sb.from('tickets').select('*').eq('id', ticketId).limit(1);
    if (tinfo && tinfo[0]) {
      const ti = tinfo[0];
      // display a small header note with status
      const headerNote = document.createElement('div'); headerNote.className = 'ms-chat-meta'; headerNote.style.padding='6px 12px'; headerNote.textContent = `Ticket ${ti.id} — ${ti.status}${ti.assigned_admin?(' — assigned to '+ti.assigned_admin):''}`;
      panel.insertBefore(headerNote, panel.querySelector('.ms-chat-body'));
    }
  }

  // click outside to close (mobile-friendly)
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bubble.contains(e.target) && panel.style.display === 'flex') closePanel();
  });

  // initial load
  if (ticketId) loadMessages(ticketId);

})();
