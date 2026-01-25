// usertickets.js — shows a single ticket (messages) for the customer
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

  function q(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  const ticketParam = q('ticket');
  const ticketId = ticketParam || localStorage.getItem('ms_ticket_id');
  const subjectEl = document.getElementById('subject');
  const statusEl = document.getElementById('status');
  const messagesEl = document.getElementById('messages');
  const empty = document.getElementById('empty');
  const form = document.getElementById('userReply');
  const nameInput = document.getElementById('yourName');
  const textInput = document.getElementById('yourMessage');

  function sanitize(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML }

  if (!ticketId) {
    subjectEl.textContent = 'No ticket found';
    empty.textContent = 'You have no ticket — please create one via the support bubble.';
    return;
  }

  async function loadTicket() {
    const { data: tdata, error: terr } = await sb.from('tickets').select('*').eq('id', ticketId).limit(1);
    if (terr) return console.error('ticket load', terr);
    if (!tdata || tdata.length === 0) {
      subjectEl.textContent = 'Ticket not found';
      return;
    }
    const t = tdata[0];
    subjectEl.textContent = t.subject || `Ticket ${t.id}`;
    statusEl.textContent = t.status + (t.assigned_admin ? (' — ' + t.assigned_admin) : '');
  }

  async function loadMessages() {
    const { data, error } = await sb.from('messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (error) return console.error('load messages', error);
    messagesEl.innerHTML = '';
    if (!data || data.length === 0) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    data.forEach(m => {
      const li = document.createElement('li'); li.className = 'msg';
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.name)} • ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' — '+m.sender_role):''}`;
      const text = document.createElement('div'); text.textContent = m.message;
      li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (nameInput.value || '').trim();
    const text = (textInput.value || '').trim();
    if (!name || !text) return;
    // store name locally so user doesn't retype
    localStorage.setItem('ms_customer_name', name);
    const { error } = await sb.from('messages').insert([{ ticket_id: ticketId, name, message: text, sender_role: 'user' }]);
    if (error) return console.error('send', error);
    textInput.value = '';
    await loadMessages();
  });

  // Realtime updates for this ticket
  const ch = sb.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new;
      if (m.ticket_id === ticketId) {
        const li = document.createElement('li'); li.className = 'msg';
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.name)} • ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' — '+m.sender_role):''}`;
        const text = document.createElement('div'); text.textContent = m.message;
        li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    })
    .subscribe();

  // Prefill name if stored
  const storedName = localStorage.getItem('ms_customer_name');
  if (storedName) nameInput.value = storedName;

  await loadTicket();
  await loadMessages();

})();
