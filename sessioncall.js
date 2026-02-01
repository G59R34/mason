// sessioncall.js - WebRTC audio calling via Supabase signaling
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
  const role = (params.get('role') || 'client').toLowerCase();

  const metaEl = document.getElementById('sessionMeta');
  const noticeEl = document.getElementById('callNotice');
  const statusEl = document.getElementById('callStatus');
  const startBtn = document.getElementById('startCallBtn');
  const joinBtn = document.getElementById('joinCallBtn');
  const hangupBtn = document.getElementById('hangupBtn');
  const muteBtn = document.getElementById('muteBtn');
  const remoteAudio = document.getElementById('remoteAudio');

  let pc = null;
  let localStream = null;
  let callId = null;
  let signalChannel = null;
  let isMuted = false;
  let lastSignalAt = null;

  function setNotice(text) {
    noticeEl.textContent = text || '';
  }

  function setStatus(text) {
    statusEl.textContent = text || 'Idle';
  }

  function setButtons(state) {
    startBtn.style.display = role === 'admin' ? '' : 'none';
    joinBtn.style.display = role === 'client' ? '' : 'none';
    startBtn.disabled = state !== 'idle' && state !== 'ready';
    joinBtn.disabled = state !== 'idle' && state !== 'ready';
    hangupBtn.disabled = state === 'idle';
  }

  async function loadSession() {
    if (!sessionId) return null;
    const { data, error } = await sb.from('sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error) return null;
    return data || null;
  }

  async function findActiveCall() {
    const { data } = await sb
      .from('call_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!data || !data.length) return null;
    const latest = data[0];
    if (latest.status === 'ended') return null;
    return latest;
  }

  async function createCallSession() {
    const { data, error } = await sb
      .from('call_sessions')
      .insert([{ session_id: sessionId, status: 'calling', started_by_role: role }])
      .select('*')
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  }

  async function startCall() {
    const call = await createCallSession();
    if (!call) {
      setNotice('Could not start call.');
      return;
    }
    callId = call.id;
    await setupPeer();
    await subscribeSignals();
    await createOffer();
    await loadExistingSignals();
    setStatus('Calling...');
  }

  async function joinCall() {
    const call = await findActiveCall();
    if (!call) {
      setNotice('No active call yet.');
      return;
    }
    callId = call.id;
    await setupPeer();
    await subscribeSignals();
    await loadExistingSignals();
    setStatus('Joining...');
  }

  async function setupPeer() {
    if (pc) return;
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        sb.from('call_signals').insert([{
          call_id: callId,
          sender_role: role,
          signal_type: 'ice',
          payload: event.candidate
        }]);
      }
    };
    pc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('Connected');
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatus('Disconnected');
      }
    };

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  async function createOffer() {
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sb.from('call_signals').insert([{
      call_id: callId,
      sender_role: role,
      signal_type: 'offer',
      payload: offer
    }]);
  }

  async function handleOffer(offer) {
    if (!pc) await setupPeer();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sb.from('call_signals').insert([{
      call_id: callId,
      sender_role: role,
      signal_type: 'answer',
      payload: answer
    }]);
  }

  async function handleAnswer(answer) {
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async function handleIce(candidate) {
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore
    }
  }

  async function subscribeSignals() {
    if (signalChannel || !callId) return;
    signalChannel = sb.channel(`call_signals:${callId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals' }, async (payload) => {
        const signal = payload.new;
        if (!signal || signal.call_id !== callId) return;
        if (signal.sender_role === role) return;
        lastSignalAt = signal.created_at;
        if (signal.signal_type === 'offer') await handleOffer(signal.payload);
        if (signal.signal_type === 'answer') await handleAnswer(signal.payload);
        if (signal.signal_type === 'ice') await handleIce(signal.payload);
        if (signal.signal_type === 'hangup') await hangup(false);
      })
      .subscribe();
  }

  async function loadExistingSignals() {
    if (!callId) return;
    const { data } = await sb
      .from('call_signals')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: true });
    (data || []).forEach(async (signal) => {
      if (signal.sender_role === role) return;
      lastSignalAt = signal.created_at;
      if (signal.signal_type === 'offer') await handleOffer(signal.payload);
      if (signal.signal_type === 'answer') await handleAnswer(signal.payload);
      if (signal.signal_type === 'ice') await handleIce(signal.payload);
    });
  }

  async function hangup(sendSignal = true) {
    if (sendSignal && callId) {
      await sb.from('call_signals').insert([{
        call_id: callId,
        sender_role: role,
        signal_type: 'hangup',
        payload: {}
      }]);
      await sb.from('call_sessions').update({ status: 'ended' }).eq('id', callId);
    }
    if (signalChannel) {
      sb.removeChannel(signalChannel);
      signalChannel = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    setStatus('Ended');
    setButtons('idle');
  }

  muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
  });

  startBtn.addEventListener('click', startCall);
  joinBtn.addEventListener('click', joinCall);
  hangupBtn.addEventListener('click', () => hangup(true));

  const sessionData = await loadSession();
  if (!sessionData) {
    setNotice('Session not found.');
    setButtons('idle');
    return;
  }
  metaEl.textContent = `${sessionData.customer_name || 'Session'} • ${sessionData.status || 'requested'}`;
  setButtons('ready');
  if (role === 'client') {
    window.setInterval(async () => {
      if (callId) return;
      const call = await findActiveCall();
      if (call) {
        callId = call.id;
        await setupPeer();
        await subscribeSignals();
        await loadExistingSignals();
        setStatus('Joining...');
        setNotice('');
      }
    }, 3000);
  }
})();
