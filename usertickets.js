// usertickets.js — shows a single conversation for the customer
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

  function q(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  const convoParam = q('conversation');
  const convoId = convoParam || localStorage.getItem('ms_conversation_id');
  const subjectEl = document.getElementById('subject');
  const statusEl = document.getElementById('status');
  const messagesEl = document.getElementById('messages');
  const empty = document.getElementById('empty');
  const form = document.getElementById('userReply');
  const nameInput = document.getElementById('yourName');
  const textInput = document.getElementById('yourMessage');

  function sanitize(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  if (!convoId) {
    subjectEl.textContent = 'No conversation found';
    empty.textContent = 'You have no conversation — please create one via the support bubble.';
    return;
  }

  async function loadConversation() {
    const { data: cdata, error: cerr } = await sb.from('conversations').select('*').eq('id', convoId).limit(1);
    if (cerr) return console.error('conversation load', cerr);
    if (!cdata || cdata.length === 0) {
      subjectEl.textContent = 'Conversation not found';
      return;
    }
    const c = cdata[0];
    subjectEl.textContent = `Conversation ${c.id}`;
    statusEl.textContent = c.status || 'open';
  }

  async function loadMessages() {
    const { data, error } = await sb.from('conversation_messages').select('*').eq('conversation_id', convoId).order('created_at', { ascending: true });
    if (error) return console.error('load messages', error);
    messagesEl.innerHTML = '';
    if (!data || data.length === 0) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    data.forEach(m => {
      const li = document.createElement('li'); li.className = 'msg';
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.sender)} • ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' — '+m.sender_role):''}`;
      const text = document.createElement('div'); text.textContent = m.body || '';
      li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (nameInput.value || '').trim();
    const text = (textInput.value || '').trim();
    if (!name || !text) return;
    localStorage.setItem('ms_customer_name', name);
    const { error } = await sb.from('conversation_messages').insert([
      { conversation_id: convoId, sender: name, body: text, sender_role: 'user' }
    ]);
    if (error) return console.error('send', error);
    textInput.value = '';
    await loadMessages();
  });

  const ch = sb.channel('public:conversation_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, payload => {
      const m = payload.new;
      if (m.conversation_id === convoId) {
        const li = document.createElement('li'); li.className = 'msg';
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${sanitize(m.sender)} • ${new Date(m.created_at).toLocaleString()}${m.sender_role?(' — '+m.sender_role):''}`;
        const text = document.createElement('div'); text.textContent = m.body || '';
        li.appendChild(meta); li.appendChild(text); messagesEl.appendChild(li);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    })
    .subscribe();

  const storedName = localStorage.getItem('ms_customer_name');
  if (storedName) {
    nameInput.value = storedName;
    nameInput.readOnly = true;
  }

  await loadConversation();
  await loadMessages();
})();
