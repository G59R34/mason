(async () => {
  const PIN = '6767';
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';
  // Reuse a single client if already created to avoid GoTrue conflicts
  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

  const pinGate = document.getElementById('pinGate');
  const portal = document.getElementById('portal');
  const pinInput = document.getElementById('pinInput');
  const pinBtn = document.getElementById('pinBtn');
  const pinStatus = document.getElementById('pinStatus');

  function unlock() {
    pinGate.classList.add('hidden');
    portal.classList.remove('hidden');
    sessionStorage.setItem('mason_portal_unlock', '1');
  }

  function checkPin() {
    const val = (pinInput.value || '').trim();
    if (val === PIN) {
      pinStatus.textContent = 'Unlocked';
      unlock();
      init();
    } else {
      pinStatus.textContent = 'Incorrect PIN.';
    }
  }

  pinBtn.addEventListener('click', checkPin);
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPin();
  });

  const announceForm = document.getElementById('announceForm');
  const announceText = document.getElementById('announceText');
  const announceStatus = document.getElementById('announceStatus');
  const announcements = document.getElementById('announcements');

  const sessionForm = document.getElementById('sessionForm');
  const sessionStatus = document.getElementById('sessionStatus');

  const conversations = document.getElementById('conversations');
  const conversationView = document.getElementById('conversationView');
  const replyForm = document.getElementById('replyForm');
  const replyText = document.getElementById('replyText');
  const replyStatus = document.getElementById('replyStatus');

  const reviews = document.getElementById('reviews');
  const stats = document.getElementById('stats');
  const ganttEl = document.getElementById('gantt');

  let currentConversation = null;

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  async function loadAnnouncements() {
    const { data, error } = await sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) return;
    announcements.innerHTML = '';
    (data || []).forEach(a => {
      const item = el('div', 'item');
      const meta = el('div', 'muted');
      meta.textContent = new Date(a.created_at).toLocaleString();
      const msg = el('div');
      msg.textContent = a.message;
      const del = el('button');
      del.textContent = 'Delete';
      del.className = 'danger';
      del.addEventListener('click', async () => {
        await sb.from('announcements').delete().eq('id', a.id);
        loadAnnouncements();
      });
      item.appendChild(meta);
      item.appendChild(msg);
      item.appendChild(del);
      announcements.appendChild(item);
    });
  }

  async function loadConversations() {
    const { data, error } = await sb.from('conversations').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return;
    conversations.innerHTML = '';
    (data || []).forEach(c => {
      const item = el('div', 'item');
      item.style.cursor = 'pointer';
      item.innerHTML = `<div><strong>${c.customer_name || 'Anonymous'}</strong> <span class="pill">${c.status}</span></div><div class="muted">${c.id}</div>`;
      item.addEventListener('click', () => openConversation(c.id));
      conversations.appendChild(item);
    });
  }

  async function openConversation(id) {
    currentConversation = id;
    conversationView.classList.remove('hidden');
    replyForm.classList.remove('hidden');
    conversationView.innerHTML = '';
    const { data, error } = await sb.from('conversation_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    if (error) return;
    (data || []).forEach(m => {
      const item = el('div', 'item');
      item.innerHTML = `<div class="muted">${m.sender || 'Unknown'} • ${m.sender_role}</div><div>${m.body || ''}</div>`;
      conversationView.appendChild(item);
    });
  }

  async function loadReviews() {
    const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return;
    reviews.innerHTML = '';
    (data || []).forEach(r => {
      const item = el('div', 'item');
      const name = el('div');
      name.innerHTML = `<strong>${r.name || 'Anonymous'}</strong> <span class="pill">${r.rating}★</span>`;
      const comment = el('div');
      comment.textContent = r.comment || '';
      const reply = el('div', 'muted');
      if (r.mason_reply) reply.innerHTML = `<strong>Mason</strong> <span class="admin-badge">CEO</span> — ${r.mason_reply}`;
      const actions = el('div', 'row');
      const replyBtn = el('button');
      replyBtn.textContent = r.mason_reply ? 'Edit Reply' : 'Reply';
      const editBtn = el('button');
      editBtn.textContent = 'Edit';
      const delBtn = el('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'danger';
      replyBtn.addEventListener('click', async () => {
        const newReply = prompt('Reply as Mason:', r.mason_reply || '');
        if (newReply === null) return;
        await sb.from('reviews').update({ mason_reply: newReply }).eq('id', r.id);
        loadReviews();
      });
      editBtn.addEventListener('click', async () => {
        const newComment = prompt('Edit review comment:', r.comment || '');
        if (newComment === null) return;
        const newRating = prompt('Edit rating (0-5):', String(r.rating || 0));
        if (newRating === null) return;
        await sb.from('reviews').update({ comment: newComment, rating: Number(newRating) }).eq('id', r.id);
        loadReviews();
      });
      delBtn.addEventListener('click', async () => {
        if (!confirm('Delete this review?')) return;
        await sb.from('reviews').delete().eq('id', r.id);
        loadReviews();
      });
      actions.appendChild(replyBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      item.appendChild(name);
      item.appendChild(comment);
      item.appendChild(reply);
      item.appendChild(actions);
      reviews.appendChild(item);
    });
  }


  async function loadStats() {
    if (!stats) return;
    const counts = {};
    const tables = [
      ['reviews', 'Reviews'],
      ['conversations', 'Conversations'],
      ['conversation_messages', 'Messages'],
      ['sessions', 'Sessions'],
      ['announcements', 'Announcements']
    ];
    for (const [table, label] of tables) {
      const { count } = await sb.from(table).select('*', { count: 'exact', head: true });
      counts[label] = count || 0;
    }
    stats.innerHTML = '';
    for (const [label, value] of Object.entries(counts)) {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `<strong>${label}</strong>: ${value}`;
      stats.appendChild(item);
    }
  }

  function toISODate(d) {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  async function loadSessionsForGantt() {
    if (!ganttEl || typeof Gantt === 'undefined') return;
    const { data, error } = await sb.from('sessions').select('*').order('scheduled_for', { ascending: true }).limit(200);
    if (error) return;
    const tasks = (data || []).map((s, idx) => {
      const start = s.scheduled_for ? new Date(s.scheduled_for) : null;
      const duration = s.duration_minutes || 60;
      const end = start ? new Date(start.getTime() + duration * 60000) : null;
      return {
        id: s.id || String(idx),
        name: s.customer_name || 'Session',
        start: start ? start.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        end: end ? end.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        progress: 0
      };
    });
    ganttEl.innerHTML = '';
    new Gantt(ganttEl, tasks, { view_mode: 'Day' });
  }

  function init() {
    loadAnnouncements();
    loadConversations();
    loadReviews();
    loadStats();
    loadSessionsForGantt();
  }

  announceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = (announceText.value || '').trim();
    if (!msg) return;
    announceStatus.textContent = 'Sending...';
    const { error } = await sb.from('announcements').insert([{ message: msg }]);
    announceStatus.textContent = error ? 'Failed.' : 'Sent.';
    if (!error) announceText.value = '';
    loadAnnouncements();
  });

  sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('sessionName').value || '').trim();
    const contact = (document.getElementById('sessionContact').value || '').trim();
    const details = (document.getElementById('sessionDetails').value || '').trim();
    const when = (document.getElementById('sessionWhen').value || '').trim();
    if (!name || !contact) return;
    sessionStatus.textContent = 'Saving...';
    const { error } = await sb.from('sessions').insert([{ customer_name: name, contact, details, scheduled_for: when || null }]);
    sessionStatus.textContent = error ? 'Failed.' : 'Saved.';
    if (!error) sessionForm.reset();
  });

  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentConversation) return;
    const text = (replyText.value || '').trim();
    if (!text) return;
    replyStatus.textContent = 'Sending...';
    const { error } = await sb.from('conversation_messages').insert([
      { conversation_id: currentConversation, sender: 'Mason', body: text, sender_role: 'mason' }
    ]);
    replyStatus.textContent = error ? 'Failed.' : 'Sent.';
    if (!error) {
      replyText.value = '';
      openConversation(currentConversation);
    }
  });

  // auto-unlock if already verified (run after DOM refs are ready)
  if (sessionStorage.getItem('mason_portal_unlock') === '1') {
    unlock();
    init();
  }
})();
