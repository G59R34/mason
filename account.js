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

  let currentUser = null;

  function setLoggedInUI(on) {
    authCard.style.display = on ? 'none' : '';
    accountCard.style.display = on ? '' : 'none';
    bookingCard.style.display = on ? '' : 'none';
    sessionsCard.style.display = on ? '' : 'none';
    if (on && accountEmail && currentUser) accountEmail.textContent = currentUser.email || '';
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
      item.innerHTML = `
        <div><strong>${s.customer_name || 'You'}</strong> — ${s.status || 'requested'}</div>
        <div class="muted">When: ${when}</div>
        <div class="muted">Contact: ${s.contact || ''}</div>
        <div class="muted">Location: ${s.location || ''}</div>
        <div>${s.details || ''}</div>
      `;
      sessionsList.appendChild(item);
    });
  }

  async function refreshAuth() {
    // Prefer session check for persistence
    const { data: sessionData } = await sb.auth.getSession();
    if (sessionData && sessionData.session && sessionData.session.user) {
      currentUser = sessionData.session.user;
    } else {
      const { data } = await sb.auth.getUser();
      currentUser = data && data.user ? data.user : null;
    }
    if (currentUser) {
      authStatus.textContent = `Signed in as ${currentUser.email}`;
      setLoggedInUI(true);
      loadSessions();
    } else {
      authStatus.textContent = 'Not signed in.';
      setLoggedInUI(false);
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
      scheduled_for: bookingForm.querySelector('#bkWhen').value.trim() || null,
      duration_minutes: Number(bookingForm.querySelector('#bkDuration').value || 0) || null,
      price: Number(bookingForm.querySelector('#bkPrice').value || 0) || null,
      status: 'requested',
      user_id: currentUser.id
    };
    if (!payload.customer_name || !payload.contact) return;
    bookingStatus.textContent = 'Saving...';
    const { error } = await sb.from('sessions').insert([payload]);
    bookingStatus.textContent = error ? 'Failed.' : 'Booked.';
    if (!error) {
      bookingForm.reset();
      loadSessions();
    }
  });

  showLoginBtn.addEventListener('click', showLogin);
  showSignupBtn.addEventListener('click', showSignup);

  sb.auth.onAuthStateChange(() => refreshAuth());
  await refreshAuth();
  showLogin();
})();
