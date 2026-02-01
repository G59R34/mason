// sessionchat.js - realtime chat for a single session
(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';

  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }
  ));

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  const roleParam = (params.get('role') || '').toLowerCase();

  const metaEl = document.getElementById('sessionMeta');
  const noticeEl = document.getElementById('notice');
  const statusEl = document.getElementById('chatStatus');
  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const startChatBtn = document.getElementById('startChatBtn');

  let currentUser = null;
  let displayName = '';
  let sessionData = null;
  let conversationId = null;
  let isAdmin = false;

  function sanitize(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function setNotice(text) {
    noticeEl.textContent = text || '';
  }

  async function getCurrentUser() {
    const { data } = await sb.auth.getSession();
    currentUser = data?.session?.user || null;
    return currentUser;
  }

  async function loadDisplayName() {
    if (!currentUser) return '';
    const { data } = await sb
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    displayName = data?.display_name || '';
    return displayName;
  }

  function safeSenderName(fallback) {
    const name = (displayName || sessionData?.customer_name || fallback || 'Client').trim();
    return name || 'Client';
  }

  async function checkAdmin() {
    if (roleParam !== 'admin') return false;
    const { data, error } = await sb.rpc('is_admin');
    if (error) return false;
    return Boolean(data);
  }

  async function loadSession() {
    if (!sessionId) return null;
    const { data, error } = await sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) {
      setNotice('Unable to load session.');
      return null;
    }
    return data || null;
  }

  async function createConversation() {
    if (!sessionData) return null;
    if (!sessionData.user_id) {
      setNotice('Assign a client before starting chat.');
      return null;
    }
    const { data, error } = await sb
      .from('conversations')
      .insert([{
        customer_name: sessionData.customer_name || sessionData.contact || 'Client',
        user_id: sessionData.user_id,
        status: 'open'
      }])
      .select('id')
      .limit(1);
    if (error || !data || !data.length) {
      setNotice('Could not start chat.');
      return null;
    }
    conversationId = data[0].id;
    await sb.from('sessions').update({ session_chat_id: conversationId }).eq('id', sessionData.id);
    return conversationId;
  }

  function renderMessage(m) {
    const li = document.createElement('li');
    li.className = `msg ${m.sender_role === 'admin' ? 'admin' : ''}`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const roleLabel = m.sender_role === 'admin' ? 'ADMIN' : 'CLIENT';
    meta.textContent = `${roleLabel} • ${new Date(m.created_at || Date.now()).toLocaleString()}`;
    const text = document.createElement('div');
    text.textContent = m.body || '';
    li.appendChild(meta);
    li.appendChild(text);
    messagesEl.appendChild(li);
  }

  async function loadMessages() {
    if (!conversationId) return;
    const { data, error } = await sb
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) return;
    messagesEl.innerHTML = '';
    (data || []).forEach(renderMessage);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage(text) {
    if (!conversationId || !text) return;
    const sender = isAdmin ? 'ADMIN' : 'CLIENT';
    await sb.from('conversation_messages').insert([{
      conversation_id: conversationId,
      sender,
      body: text,
      sender_role: isAdmin ? 'admin' : 'user'
    }]);
    try {
      await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    } catch (err) {
      console.warn('last_message_at update failed', err);
    }
  }

  async function bootstrap() {
    if (!sessionId) {
      setNotice('Missing session id.');
      form.style.display = 'none';
      return;
    }
    await getCurrentUser();
    await loadDisplayName();
    isAdmin = await checkAdmin();
    sessionData = await loadSession();
    if (!sessionData) return;

    metaEl.textContent = `${sessionData.customer_name || 'Session'} • ${sessionData.status || 'requested'}`;
    if (!currentUser && !isAdmin) {
      setNotice('Please log in to join the chat.');
      form.style.display = 'none';
      return;
    }

    conversationId = sessionData.session_chat_id;
    if (!conversationId) {
      setNotice('Chat not started yet.');
      startChatBtn.style.display = '';
      startChatBtn.addEventListener('click', async () => {
        statusEl.textContent = 'Starting...';
        const id = await createConversation();
        if (!id) return;
        statusEl.textContent = '';
        startChatBtn.style.display = 'none';
        await loadMessages();
        subscribeRealtime();
      });
      return;
    }

    await loadMessages();
    subscribeRealtime();
  }

  function subscribeRealtime() {
    if (!conversationId) return;
    sb.channel(`sessionchat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const m = payload.new;
        if (m.conversation_id !== conversationId) return;
        renderMessage(m);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      })
      .subscribe();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    if (!conversationId) {
      setNotice('Start chat first.');
      return;
    }
    input.value = '';
    await sendMessage(text);
    setNotice('');
  });

  await bootstrap();
})();
