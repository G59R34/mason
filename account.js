(async () => {
  const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';
  // Reuse a single client if already created to avoid GoTrue conflicts
  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

  const authStatus = document.getElementById('authStatus');
  const logoutBtn = document.getElementById('logoutBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showSignupBtn = document.getElementById('showSignupBtn');
  const loginPane = document.getElementById('loginPane');
  const signupPane = document.getElementById('signupPane');
  const authCard = document.getElementById('authCard');
  const accountCard = document.getElementById('accountCard');
  const accountEmail = document.getElementById('accountEmail');
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const bookingCard = document.getElementById('bookingCard');
  const sessionsCard = document.getElementById('sessionsCard');
  const bookingForm = document.getElementById('bookingForm');
  const bookingStatus = document.getElementById('bookingStatus');
  const sessionsList = document.getElementById('sessionsList');
  const profileForm = document.getElementById('profileForm');
  const displayNameInput = document.getElementById('displayName');
  const profileStatus = document.getElementById('profileStatus');

  let currentUser = null;

  function setLoggedInUI(on) {
    authCard.style.display = on ? 'none' : '';
    accountCard.style.display = on ? '' : 'none';
    bookingCard.style.display = on ? '' : 'none';
    sessionsCard.style.display = on ? '' : 'none';
    if (on && accountEmail) accountEmail.textContent = 'CLIENT';
  }

  function showLogin() {
    loginPane.style.display = '';
    signupPane.style.display = 'none';
    showLoginBtn.disabled = true;
    showSignupBtn.disabled = false;
  }

  function showSignup() {
    loginPane.style.display = 'none';
    signupPane.style.display = '';
    showLoginBtn.disabled = false;
    showSignupBtn.disabled = true;
  }

  function statusClass(status) {
    if (status === 'approved' || status === 'scheduled') return 'approved';
    if (status === 'denied' || status === 'cancelled') return 'denied';
    return 'requested';
  }

  function defaultDisplayName(email) {
    if (!email) return '';
    const [namePart] = email.split('@');
    return namePart ? namePart.replace(/[._-]+/g, ' ').trim() : '';
  }

  async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    if (data) {
      displayNameInput.value = data.display_name || '';
      if (accountEmail) accountEmail.textContent = 'CLIENT';
      return;
    }
    if (error && error.code && error.code !== 'PGRST116') return;
    const fallbackName = defaultDisplayName(currentUser.email);
    await sb.from('user_profiles').upsert([{
      user_id: currentUser.id,
      display_name: fallbackName,
      email: currentUser.email
    }]);
    displayNameInput.value = fallbackName;
  }

  async function loadSessions() {
    if (!currentUser) return;
    const { data, error } = await sb
      .from('sessions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) {
      sessionsList.innerHTML = '<div class="muted">Could not load sessions.</div>';
      return;
    }
    sessionsList.innerHTML = '';
    if (!data || data.length === 0) {
      sessionsList.innerHTML = '<div class="muted">No sessions yet.</div>';
      return;
    }
    data.forEach(s => {
      const item = document.createElement('div');
      item.className = 'item';
      const when = s.scheduled_for ? new Date(s.scheduled_for).toLocaleString() : 'TBD';
      const status = s.status || 'requested';
      item.innerHTML = `
        <div><strong>${s.customer_name || 'You'}</strong> <span class="badge ${statusClass(status)}">${status}</span></div>
        <div class="muted">When: ${when}</div>
        <div class="muted">Contact: ${s.contact || ''}</div>
        <div class="muted">Location: ${s.location || ''}</div>
        ${s.staff_name ? `<div class="muted"><strong>Booked with:</strong> ${s.staff_name}</div>` : ''}
        ${s.admin_message ? `<div class="muted"><strong>Message from admin:</strong> ${s.admin_message}</div>` : ''}
        <div>${s.details || ''}</div>
      `;
      const actions = document.createElement('div');
      actions.className = 'row';
      const chatBtn = document.createElement('button');
      chatBtn.type = 'button';
      chatBtn.textContent = s.session_chat_id ? 'Open chat' : 'Start chat';
      chatBtn.className = 'ghost';
      chatBtn.addEventListener('click', async () => {
        const chatId = await ensureSessionChat(s);
        if (!chatId) {
          alert('Unable to open chat yet. Please try again.');
          return;
        }
        window.open(`sessionchat.html?session=${s.id}`, '_blank', 'noopener,noreferrer');
      });
      actions.appendChild(chatBtn);
      const callBtn = document.createElement('button');
      callBtn.type = 'button';
      callBtn.textContent = 'Join call';
      callBtn.className = 'ghost';
      callBtn.addEventListener('click', () => {
        window.open(`sessioncall.html?session=${s.id}&role=client`, '_blank', 'noopener,noreferrer');
      });
      actions.appendChild(callBtn);
      item.appendChild(actions);
      sessionsList.appendChild(item);
    });
  }

  async function ensureSessionChat(session) {
    if (session.session_chat_id) return session.session_chat_id;
    if (!currentUser) return null;
    const { data, error } = await sb
      .from('conversations')
      .insert([{
        customer_name: session.customer_name || currentUser.email,
        user_id: currentUser.id,
        status: 'open'
      }])
      .select('id')
      .limit(1);
    if (error || !data || !data.length) return null;
    const convoId = data[0].id;
    const { error: updateErr } = await sb.from('sessions').update({ session_chat_id: convoId }).eq('id', session.id);
    if (updateErr) return null;
    session.session_chat_id = convoId;
    return convoId;
  }

  async function refreshAuth() {
    authStatus.textContent = 'Checking session...';
    const { data: sessionData } = await sb.auth.getSession();
    currentUser = sessionData && sessionData.session ? sessionData.session.user : null;
    if (currentUser) {
      authStatus.textContent = 'Signed in.';
      setLoggedInUI(true);
      loadProfile();
      loadSessions();
    } else {
      authStatus.textContent = 'Not signed in.';
      setLoggedInUI(false);
      showLogin();
    }
  }

  function showAuthError(err) {
    if (!err) return;
    const msg = err.message || err.error_description || 'Auth error';
    alert(msg);
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.querySelector('#suEmail').value.trim();
    const password = signupForm.querySelector('#suPassword').value.trim();
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return showAuthError(error);
    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    if (signInErr) return showAuthError(signInErr);
    await refreshAuth();
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('#liEmail').value.trim();
    const password = loginForm.querySelector('#liPassword').value.trim();
    authStatus.textContent = 'Logging in...';
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return showAuthError(error);
      // If no user is returned, show a hint
      if (!data || !data.user) {
        authStatus.textContent = 'Login did not return a user. Check credentials.';
      }
      await refreshAuth();
    } catch (err) {
      showAuthError(err);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    await refreshAuth();
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const payload = {
      customer_name: bookingForm.querySelector('#bkName').value.trim(),
      contact: bookingForm.querySelector('#bkContact').value.trim(),
      details: bookingForm.querySelector('#bkDetails').value.trim(),
      location: bookingForm.querySelector('#bkLocation').value.trim(),
      staff_name: bookingForm.querySelector('#bkStaff')?.value.trim() || null,
      scheduled_for: bookingForm.querySelector('#bkWhen').value.trim() || null,
      duration_minutes: Number(bookingForm.querySelector('#bkDuration').value || 0) || null,
      price: Number(bookingForm.querySelector('#bkPrice').value || 0) || null,
      status: 'requested',
      user_id: currentUser.id
    };
    if (!payload.customer_name || !payload.contact) return;
    bookingStatus.textContent = 'Saving...';
    const { error } = await sb.from('sessions').insert([payload]);
    bookingStatus.textContent = error ? 'Failed.' : 'Requested.';
    if (!error) {
      bookingForm.reset();
      loadSessions();
    }
  });

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const displayName = displayNameInput.value.trim();
    profileStatus.textContent = 'Saving...';
    const { error } = await sb.from('user_profiles').upsert([{
      user_id: currentUser.id,
      display_name: displayName,
      email: currentUser.email
    }]);
    profileStatus.textContent = error ? 'Could not save.' : 'Saved.';
  });

  showLoginBtn.addEventListener('click', showLogin);
  showSignupBtn.addEventListener('click', showSignup);

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      authStatus.textContent = 'Signed in.';
      setLoggedInUI(true);
      loadProfile();
      loadSessions();
    } else {
      authStatus.textContent = 'Not signed in.';
      setLoggedInUI(false);
      showLogin();
    }
  });
  await refreshAuth();
})();
