// chatadmin.js
(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';
  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

  const listEl = document.getElementById('messages');
  const ticketsEl = document.getElementById('tickets');
  const empty = document.getElementById('empty');
  const refreshBtn = document.getElementById('refresh');
  const clearBtn = document.getElementById('clearAll');
  const noTickets = document.getElementById('noTickets');
  const ticketTitle = document.getElementById('ticketTitle');
  const claimBtn = document.getElementById('claim');
  const closeBtn = document.getElementById('closeTicket');
  const adminForm = document.getElementById('adminReply');
  const adminNameInput = document.getElementById('adminName');
  const replyText = document.getElementById('replyText');

  function el(tag, props = {}) { const e = document.createElement(tag); Object.assign(e, props); return e; }

  function renderRow(m) {
    const li = el('li'); li.className = 'msg'; li.dataset.id = m.id;
    const info = el('div'); info.className = 'meta'; info.textContent = `${m.name} • ${new Date(m.created_at || m.t || Date.now()).toLocaleString()}`;
    const text = el('div'); text.className = 'text'; text.textContent = m.message || m.text || '';
    const del = el('button'); del.className = 'small'; del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return;
      const { error } = await sb.from('messages').delete().match({ id: m.id });
      if (error) return alert('Delete failed');
      li.remove();
    });
    li.appendChild(info); li.appendChild(text); li.appendChild(del);
    return li;
  }

  async function load() {
    listEl.innerHTML = '';
    const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return console.error('load', error);
    if (!data || data.length === 0) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    data.forEach(m => listEl.appendChild(renderRow(m)));
  }

  refreshBtn.addEventListener('click', load);

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Delete ALL messages?')) return;
    // many DBs don't allow bulk truncate via anon key; delete by selecting ids first
    const { data, error } = await sb.from('messages').select('id');
    if (error) return alert('Could not fetch ids');
    const ids = (data || []).map(r => r.id);
    for (const id of ids) {
      await sb.from('messages').delete().match({ id });
    }
    await load();
  });

  // Subscribe to inserts and deletes to keep UI in sync
  // Tickets subscription and management
  async function loadTickets() {
    ticketsEl.innerHTML = '';
    const { data, error } = await sb.from('tickets').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return console.error('load tickets', error);
    if (!data || data.length === 0) { noTickets.style.display = ''; return; }
    noTickets.style.display = 'none';
    data.forEach(t => {
      const li = el('li'); li.style.padding='8px'; li.style.border='1px solid #eef2ff'; li.style.borderRadius='8px';
      li.textContent = `${t.subject || '(no subject)'} — ${t.customer_name || ''} — ${t.status}`;
      li.dataset.id = t.id;
      // mark active if currently selected
      if (currentTicket && String(currentTicket) === String(t.id)) {
        li.style.background = '#f1f5f9';
      }
      li.addEventListener('click', () => {
        console.log('ticket clicked', t.id);
        // visually update selection
        Array.from(ticketsEl.querySelectorAll('li')).forEach(x => x.style.background = '');
        li.style.background = '#f1f5f9';
        openTicket(t.id);
      });
      ticketsEl.appendChild(li);
    });
  }

  // As a fallback, support event delegation in case li handlers fail
  if (ticketsEl) {
    ticketsEl.style.cursor = 'pointer';
    ticketsEl.addEventListener('click', (e) => {
      const li = e.target.closest && e.target.closest('li');
      if (!li) return;
      const id = li.dataset && li.dataset.id;
      if (id) {
        console.log('delegated ticket click', id);
        openTicket(id);
      }
    });
  }

  async function openTicket(id) {
    // set selected ticket immediately so UI actions know which ticket is active
    currentTicket = String(id);
    ticketTitle.textContent = `Ticket: ${id}`;
    listEl.innerHTML = '';
    empty.style.display = '';
    try {
      const { data, error } = await sb.from('messages').select('*').eq('ticket_id', currentTicket).order('created_at', { ascending: true });
      if (error) {
        console.error('open ticket', error);
        // common cause: messages table doesn't have ticket_id column (DB not migrated)
        if (error.message && error.message.toLowerCase().includes('ticket_id')) {
          empty.textContent = 'Could not load messages: database missing ticket_id column. Run migrate_messages_to_tickets.sql in Supabase.';
          // fallback: try loading all messages (prototype) so admin can still see something
          const { data: all, error: e2 } = await sb.from('messages').select('*').order('created_at', { ascending: true }).limit(500);
          if (!e2 && all) {
            listEl.innerHTML = '';
            all.forEach(m => listEl.appendChild(renderRow(m)));
            empty.style.display = (all && all.length) ? 'none' : '';
          }
        } else {
          empty.textContent = 'Could not load messages for this ticket.';
        }
        return;
      }
      listEl.innerHTML = '';
      (data || []).forEach(m => listEl.appendChild(renderRow(m)));
      empty.style.display = (data && data.length) ? 'none' : '';
    } catch (err) {
      console.error('openTicket unexpected error', err);
      empty.textContent = 'Unexpected error loading ticket messages.';
    }
  }

  let currentTicket = null;

  // subscribe to tickets (new tickets)
  const ticketsChannel = sb.channel('public:tickets')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
      loadTickets();
    })
    .subscribe();

  // subscribe to messages for UI updates
  const adminChannel = sb.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new;
      if (m.ticket_id && m.ticket_id === currentTicket) {
        empty.style.display = 'none';
        listEl.appendChild(renderRow(m));
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
      const id = payload.old?.id;
      if (!id) return;
      const li = listEl.querySelector(`li.msg[data-id="${id}"]`);
      if (li) li.remove();
    })
    .subscribe();

  // initial load
  load();
  loadTickets();

  // claim and close actions
  claimBtn.addEventListener('click', async () => {
    if (!currentTicket) return alert('Select a ticket first');
    let adminName = adminNameInput.value.trim();
    if (!adminName) adminName = prompt('Enter your name to claim the ticket') || 'Admin';
    const { error } = await sb.from('tickets').update({ assigned_admin: adminName }).eq('id', currentTicket);
    if (error) return alert('Could not claim ticket');
    loadTickets();
  });

  closeBtn.addEventListener('click', async () => {
    if (!currentTicket) return alert('Select a ticket first');
    if (!confirm('Close this ticket?')) return;
    const { error } = await sb.from('tickets').update({ status: 'closed' }).eq('id', currentTicket);
    if (error) return alert('Could not close ticket');
    loadTickets();
  });

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentTicket) return alert('Select a ticket first');
    const adminName = adminNameInput.value.trim() || 'Admin';
    const text = replyText.value.trim();
    if (!text) return;
    const { data, error } = await sb
      .from('messages')
      .insert([{ ticket_id: currentTicket, name: adminName, message: text, sender_role: 'admin' }])
      .select('*')
      .limit(1);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('row-level') || msg.includes('rls') || msg.includes('permission')) {
        return alert('Send failed: Supabase RLS is blocking inserts. Allow INSERT on public.messages for the anon key or authenticate admins.');
      }
      if (msg.includes('ticket_id')) {
        return alert('Send failed: messages table is missing ticket_id. Run migrate_messages_to_tickets.sql in Supabase.');
      }
      return alert('Send failed');
    }
    // Fallback UI update in case realtime isn’t enabled
    if (data && data[0]) {
      empty.style.display = 'none';
      listEl.appendChild(renderRow(data[0]));
      listEl.scrollTop = listEl.scrollHeight;
    }
    replyText.value = '';
  });
})();
