// usertickets.js - single ticket view with local ticket history
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

  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }
  ));

  function q(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  const CURRENT_TICKET_KEY = 'ms_conversation_id';
  const TICKET_LIST_KEY = 'ms_ticket_ids';
  let currentTicketId = q('conversation') || localStorage.getItem(CURRENT_TICKET_KEY);
  let currentTicketStatus = 'open';

  const subjectEl = document.getElementById('subject');
  const statusEl = document.getElementById('status');
  const messagesEl = document.getElementById('messages');
  const empty = document.getElementById('empty');
  const form = document.getElementById('userReply');
  const nameInput = document.getElementById('yourName');
  const textInput = document.getElementById('yourMessage');
  const ticketSelect = document.getElementById('ticketSelect');
  const newTicketBtn = document.getElementById('newTicketBtn');

  function sanitize(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function getTicketIds() {
    try { return JSON.parse(localStorage.getItem(TICKET_LIST_KEY) || '[]').filter(Boolean); }
    catch { return []; }
  }

  function addTicketId(id) {
    const ids = getTicketIds();
    if (!ids.includes(id)) ids.unshift(id);
    localStorage.setItem(TICKET_LIST_KEY, JSON.stringify(ids.slice(0, 20)));
  }

  function setCurrentTicket(id) {
    currentTicketId = id;
    if (id) localStorage.setItem(CURRENT_TICKET_KEY, id);
    if (ticketSelect) ticketSelect.value = id || '';
  }

  if (currentTicketId) addTicketId(currentTicketId);

  async function loadConversation() {
    if (!currentTicketId) return null;
    const { data: cdata, error: cerr } = await sb.from('conversations').select('*').eq('id', currentTicketId).limit(1);
    if (cerr) return console.error('conversation load', cerr);
    if (!cdata || cdata.length === 0) {
      subjectEl.textContent = 'Ticket not found';
      return null;
    }
    const c = cdata[0];
    subjectEl.textContent = `Ticket ${c.id}`;
    currentTicketStatus = c.status || 'open';
    statusEl.textContent = currentTicketStatus;
    form.querySelector('button[type="submit"]').disabled = currentTicketStatus === 'closed';
    textInput.disabled = currentTicketStatus === 'closed';
    if (currentTicketStatus === 'closed') {
      empty.textContent = 'This ticket is closed. Start a new ticket to continue.';
    } else {
      empty.textContent = 'No messages yet.';
    }
    return c;
  }

  async function loadMessages() {
    if (!currentTicketId) return;
    const { data, error } = await sb.from('conversation_messages').select('*').eq('conversation_id', currentTicketId).order('created_at', { ascending: true });
    if (error) return console.error('load messages', error);
    messagesEl.innerHTML = '';
    if (!data || data.length === 0) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    data.forEach(m => {
      const li = document.createElement('li'); li.className = 'msg';
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.sender)} â€¢ ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' â€” '+m.sender_role):''}`;
      const text = document.createElement('div'); text.textContent = m.body || '';
      li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function loadTicketList() {
    if (!ticketSelect) return;
    const ids = getTicketIds();
    ticketSelect.innerHTML = '';
    if (ids.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No tickets yet';
      ticketSelect.appendChild(opt);
      return;
    }
    const { data } = await sb.from('conversations').select('id,status,customer_name').in('id', ids);
    const map = new Map((data || []).map(row => [row.id, row]));
    ids.forEach(id => {
      const info = map.get(id);
      const opt = document.createElement('option');
      opt.value = id;
      const label = info ? `${info.customer_name || 'Ticket'} • ${info.status || 'open'}` : `Ticket ${id.slice(0, 6)}`;
      opt.textContent = label;
      ticketSelect.appendChild(opt);
    });
    if (currentTicketId) ticketSelect.value = currentTicketId;
  }

  async function createNewTicket() {
    const name = (nameInput.value || localStorage.getItem('ms_customer_name') || '').trim();
    if (!name) {
      alert('Enter your name first.');
      return null;
    }
    const { data: cdata, error: cerr } = await sb
      .from('conversations')
      .insert([{ customer_name: name, status: 'open' }])
      .select('id')
      .limit(1);
    if (cerr || !cdata || cdata.length === 0) { console.error('ticket create error', cerr); return null; }
    const id = cdata[0].id;
    addTicketId(id);
    setCurrentTicket(id);
    await loadTicketList();
    await loadConversation();
    await loadMessages();
    return id;
  }

  const storedName = localStorage.getItem('ms_customer_name');
  if (storedName) {
    nameInput.value = storedName;
    nameInput.readOnly = true;
  }

  if (!currentTicketId) {
    subjectEl.textContent = 'No ticket found';
    empty.textContent = 'You have no ticket yet. Create one with the support bubble or here.';
  } else {
    await loadConversation();
    await loadMessages();
  }
  await loadTicketList();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (nameInput.value || '').trim();
    const text = (textInput.value || '').trim();
    if (!name || !text) return;
    if (currentTicketStatus === 'closed') {
      alert('This ticket is closed. Start a new ticket.');
      return;
    }
    localStorage.setItem('ms_customer_name', name);
    if (!currentTicketId) {
      await createNewTicket();
      if (!currentTicketId) return;
    }
    const { error } = await sb.from('conversation_messages').insert([
      { conversation_id: currentTicketId, sender: name, body: text, sender_role: 'user' }
    ]);
    if (error) return console.error('send', error);
    try {
      await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', currentTicketId);
    } catch (e) {
      console.warn('last_message_at update failed', e);
    }
    textInput.value = '';
    await loadMessages();
  });

  ticketSelect?.addEventListener('change', async (e) => {
    const nextId = e.target.value;
    if (!nextId) return;
    setCurrentTicket(nextId);
    await loadConversation();
    await loadMessages();
  });

  newTicketBtn?.addEventListener('click', async () => {
    await createNewTicket();
  });

  const messagesChannel = sb.channel('public:conversation_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, payload => {
      const m = payload.new;
      if (m.conversation_id === currentTicketId) {
        const li = document.createElement('li'); li.className = 'msg';
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.sender)} â€¢ ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' â€” '+m.sender_role):''}`;
        const text = document.createElement('div'); text.textContent = m.body || '';
        li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('messages realtime status', status);
      }
    });

  const convoChannel = sb.channel('public:conversations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async (payload) => {
      const updatedId = payload.new?.id || payload.old?.id;
      if (!updatedId) return;
      if (updatedId === currentTicketId) {
        await loadConversation();
      }
      const ids = getTicketIds();
      if (ids.includes(updatedId)) {
        await loadTicketList();
      }
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('conversations realtime status', status);
      }
    });

  const pollId = window.setInterval(async () => {
    if (!currentTicketId) return;
    await loadConversation();
    await loadMessages();
    await loadTicketList();
  }, 8000);
})();
