import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabase.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'why', label: 'Why Editor' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'super', label: 'SUPER ADMIN STUFF' },
  { id: 'settings', label: 'Settings' }
];

const STAFF_TABS = [
  { id: 'sessions', label: 'My Sessions' }
];

const emptyCounts = {
  Reviews: 0,
  Conversations: 0,
  Messages: 0,
  Sessions: 0,
  Announcements: 0
};

function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [adminState, setAdminState] = useState({ status: 'idle', error: '' });
  const [staffState, setStaffState] = useState({ status: 'idle', error: '' });
  const [staffProfile, setStaffProfile] = useState(null);
  const [loginMode, setLoginMode] = useState(() => {
    return window.localStorage.getItem('ms_login_mode') || 'admin';
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [counts, setCounts] = useState(emptyCounts);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementStatic, setAnnouncementStatic] = useState(false);
  const [announcementLabel, setAnnouncementLabel] = useState('NOTICE');
  const [announcementColor, setAnnouncementColor] = useState('#0f766e');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editAnnouncement, setEditAnnouncement] = useState({ message: '', label: '', color: '' });
  const [conversations, setConversations] = useState([]);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentConversationMeta, setCurrentConversationMeta] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffActive, setNewStaffActive] = useState(true);
  const [newStaffSortOrder, setNewStaffSortOrder] = useState(0);
  const [newStaffUserId, setNewStaffUserId] = useState('');
  const [staffStatus, setStaffStatus] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sessionNoteDrafts, setSessionNoteDrafts] = useState({});
  const [sessionMessageDrafts, setSessionMessageDrafts] = useState({});
  const [sessionChatMessages, setSessionChatMessages] = useState({});
  const [sessionChatOpen, setSessionChatOpen] = useState({});
  const [sessionActionStatus, setSessionActionStatus] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, session: null });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [hasConversationSubject, setHasConversationSubject] = useState(false);
  const [hasConversationClosedAt, setHasConversationClosedAt] = useState(false);
  const [hasConversationLastMessageAt, setHasConversationLastMessageAt] = useState(false);
  const [hasAnnouncementStatic, setHasAnnouncementStatic] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    customer_name: '',
    contact: '',
    details: '',
    scheduled_for: '',
    location: '',
    duration_minutes: '',
    price: '',
    status: 'scheduled',
    staff_name: '',
    user_id: ''
  });
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [settingsStatus, setSettingsStatus] = useState('');
  const [valueCards, setValueCards] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [whyMeasurements, setWhyMeasurements] = useState([]);
  const [newValueCard, setNewValueCard] = useState({ title: '', body: '', sort_order: 0 });
  const [newQuote, setNewQuote] = useState({ quote: '', author: '', sort_order: 0 });
  const [newWhyMeasurement, setNewWhyMeasurement] = useState({
    label: '',
    value_cm: '',
    color: '#0ea5a4',
    sort_order: 0
  });
  const [whyStatus, setWhyStatus] = useState('');
  const [typingStatus, setTypingStatus] = useState('');
  const [pricingPlans, setPricingPlans] = useState([]);
  const [newPricingPlan, setNewPricingPlan] = useState({
    title: '',
    price: '',
    price_subtitle: '',
    features: '',
    cta_label: '',
    cta_plan: '',
    cta_amount: '',
    sort_order: 0
  });
  const [pricingPage, setPricingPage] = useState({
    title: '',
    subtitle: '',
    custom_title: '',
    custom_body: '',
    custom_cta_label: '',
    custom_cta_url: ''
  });
  const [pricingStatus, setPricingStatus] = useState('');
  const [ticketForm, setTicketForm] = useState({
    customer_name: '',
    subject: ''
  });
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryCaption, setGalleryCaption] = useState('');
  const [gallerySort, setGallerySort] = useState(0);
  const [galleryStatus, setGalleryStatus] = useState('');
  const typingChannelRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const [gravityEnabled, setGravityEnabled] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [introLoopEnabled, setIntroLoopEnabled] = useState(false);
  const [jumpscareStatus, setJumpscareStatus] = useState('');
  const gravityTimeoutRef = useRef(null);
  const [now, setNow] = useState(new Date());

  const isStaffMode = loginMode === 'staff';
  const isReady = useMemo(() => {
    if (!session) return false;
    return isStaffMode ? staffState.status === 'allowed' : adminState.status === 'allowed';
  }, [session, isStaffMode, adminState.status, staffState.status]);

  const rangeStart = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [now]);
  const rangeEnd = useMemo(() => new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000), [rangeStart]);
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const timelineSessions = useMemo(() => {
    return sessions
      .filter((s) => s.scheduled_for)
      .map((sessionItem) => {
        const start = new Date(sessionItem.scheduled_for);
        const duration = sessionItem.duration_minutes || 60;
        const end = new Date(start.getTime() + duration * 60000);
        if (end < rangeStart || start > rangeEnd) return null;
        return { sessionItem, start, end };
      })
      .filter(Boolean);
  }, [sessions, rangeStart, rangeEnd]);
  const staffBuckets = useMemo(() => {
    const activeStaff = staff.filter((row) => row.active).map((row) => row.name);
    const sessionStaff = timelineSessions
      .map(({ sessionItem }) => sessionItem.staff_name)
      .filter(Boolean);
    const labels = Array.from(new Set([...activeStaff, ...sessionStaff, 'Unassigned']));
    const map = new Map(labels.map((name) => [name, []]));
    timelineSessions.forEach(({ sessionItem, start, end }) => {
      const staffName = sessionItem.staff_name || 'Unassigned';
      if (!map.has(staffName)) map.set(staffName, []);
      map.get(staffName).push({ sessionItem, start, end });
    });
    return Array.from(map.entries());
  }, [timelineSessions, staff]);
  const scheduleDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      return new Date(rangeStart.getTime() + idx * 24 * 60 * 60 * 1000);
    });
  }, [rangeStart]);
  const scheduleRows = useMemo(() => {
    const dayKey = (date) => date.toISOString().slice(0, 10);
    return staffBuckets.map(([staff, items]) => {
      const byDay = new Map(scheduleDays.map((day) => [dayKey(day), []]));
      items.forEach(({ sessionItem, start, end }) => {
        const key = dayKey(start);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push({ sessionItem, start, end });
      });
      return { staff, items, byDay };
    });
  }, [staffBuckets, scheduleDays]);
  const nowOffsetPercent = clamp(((now.getTime() - rangeStart.getTime()) / rangeMs) * 100, 0, 100);

  useEffect(() => {
    if (!session) {
      setAdminState({ status: 'idle', error: '' });
      setStaffState({ status: 'idle', error: '' });
      setStaffProfile(null);
      return;
    }
    let mounted = true;
    if (isStaffMode) {
      setStaffState({ status: 'checking', error: '' });
      supabase
        .from('staff')
        .select('id, name, active, user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!mounted) return;
          if (error) {
            setStaffState({ status: 'denied', error: error.message });
            setStaffProfile(null);
            return;
          }
          if (data && data.active) {
            setStaffState({ status: 'allowed', error: '' });
            setStaffProfile(data);
          } else {
            setStaffState({ status: 'denied', error: 'No active staff record found.' });
            setStaffProfile(null);
          }
        })
        .catch((err) => {
          if (!mounted) return;
          setStaffState({ status: 'denied', error: err.message });
          setStaffProfile(null);
        });
    } else {
      setAdminState({ status: 'checking', error: '' });
      supabase
        .rpc('is_admin')
        .then(({ data, error }) => {
          if (!mounted) return;
          if (error) {
            setAdminState({ status: 'denied', error: error.message });
          } else if (data) {
            setAdminState({ status: 'allowed', error: '' });
          } else {
            setAdminState({ status: 'denied', error: '' });
          }
        })
        .catch((err) => {
          if (!mounted) return;
          setAdminState({ status: 'denied', error: err.message });
        });
    }
    return () => {
      mounted = false;
    };
  }, [session, isStaffMode]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!contextMenu.open) return undefined;
    const handleClick = () => {
      setContextMenu({ open: false, x: 0, y: 0, session: null });
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setContextMenu({ open: false, x: 0, y: 0, session: null });
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu.open]);

  useEffect(() => {
    if (!isReady) return;
    loadSessions();
    if (!isStaffMode) {
      loadDashboard();
      loadAnnouncements();
      loadConversations();
      loadReviews();
      loadClients();
      loadStaff();
      detectConversationColumns();
      detectAnnouncementColumns();
      loadAdminProfile();
      loadWhyContent();
      loadPricingContent();
      loadGalleryContent();
    }
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (isStaffMode) return;
    const convoChannel = supabase
      .channel('admin:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          loadConversations();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('conversations realtime status', status);
        }
      });

    const messageChannel = supabase
      .channel('admin:conversation_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_messages' },
        (payload) => {
          loadDashboard();
          if (payload.new?.conversation_id && payload.new.conversation_id === currentConversation) {
            loadConversationMessages(currentConversation);
          } else {
            loadConversations();
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('messages realtime status', status);
        }
      });

    const announcementsChannel = supabase
      .channel('admin:announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          loadAnnouncements();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('announcements realtime status', status);
        }
      });

    const reviewsChannel = supabase
      .channel('admin:reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          loadReviews();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('reviews realtime status', status);
        }
      });

    const pollId = window.setInterval(() => {
      loadConversations();
      loadDashboard();
      if (currentConversation) {
        loadConversationMessages(currentConversation);
      }
    }, 8000);

    return () => {
      supabase.removeChannel(convoChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(reviewsChannel);
      window.clearInterval(pollId);
    };
  }, [isReady, currentConversation, isStaffMode]);

  async function detectConversationColumns() {
    try {
      const subjectProbe = await supabase.from('conversations').select('subject').limit(1);
      setHasConversationSubject(!subjectProbe.error);
    } catch (e) {
      setHasConversationSubject(false);
    }
    try {
      const closedProbe = await supabase.from('conversations').select('closed_at').limit(1);
      setHasConversationClosedAt(!closedProbe.error);
    } catch (e) {
      setHasConversationClosedAt(false);
    }
    try {
      const lastProbe = await supabase.from('conversations').select('last_message_at').limit(1);
      setHasConversationLastMessageAt(!lastProbe.error);
    } catch (e) {
      setHasConversationLastMessageAt(false);
    }
  }

  async function detectAnnouncementColumns() {
    try {
      const probe = await supabase.from('announcements').select('is_static').limit(1);
      setHasAnnouncementStatic(!probe.error);
    } catch (e) {
      setHasAnnouncementStatic(false);
    }
  }

  useEffect(() => {
    if (!currentConversation) return;
    const meta = conversations.find((item) => item.id === currentConversation) || null;
    setCurrentConversationMeta(meta);
  }, [conversations, currentConversation]);

  useEffect(() => {
    if (!isReady || !currentConversation) return;
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    let timeout = null;
    const channel = supabase
      .channel(`typing:conversation:${currentConversation}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload || {};
        if (data.role === 'admin') return;
        if (timeout) clearTimeout(timeout);
        if (data.typing) {
          setTypingStatus(`${data.name || 'User'} is typing...`);
          timeout = setTimeout(() => setTypingStatus(''), 2000);
        } else {
          setTypingStatus('');
        }
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      if (timeout) clearTimeout(timeout);
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, [isReady, currentConversation]);

  useEffect(() => {
    if (!isReady) return;
    let mounted = true;
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'physics_mode')
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setGravityEnabled(Boolean(data?.value?.enabled));
      });
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setMaintenanceEnabled(Boolean(data?.value?.enabled));
      });
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'intro_loop')
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setIntroLoopEnabled(Boolean(data?.value?.enabled));
      });
    return () => {
      mounted = false;
    };
  }, [isReady]);

  async function updatePhysicsMode(enabled) {
    setGravityEnabled(enabled);
    await supabase.from('site_settings').upsert([
      { key: 'physics_mode', value: { enabled }, updated_at: new Date().toISOString() }
    ]);
  }

  async function updateMaintenanceMode(enabled) {
    setMaintenanceEnabled(enabled);
    await supabase.from('site_settings').upsert([
      { key: 'maintenance_mode', value: { enabled }, updated_at: new Date().toISOString() }
    ]);
  }

  async function updateIntroLoop(enabled) {
    setIntroLoopEnabled(enabled);
    await supabase.from('site_settings').upsert([
      { key: 'intro_loop', value: { enabled }, updated_at: new Date().toISOString() }
    ]);
  }

  async function triggerJumpscare() {
    setJumpscareStatus('Triggering...');
    const nonce = Date.now();
    const { error } = await supabase.from('site_settings').upsert([
      { key: 'jumpscare', value: { enabled: true, nonce }, updated_at: new Date().toISOString() }
    ]);
    if (error) {
      setJumpscareStatus(`Failed: ${error.message}`);
      return;
    }
    // Auto-reset so it won't replay on page load
    setTimeout(() => {
      supabase.from('site_settings').upsert([
        { key: 'jumpscare', value: { enabled: false, nonce }, updated_at: new Date().toISOString() }
      ]);
    }, 500);
    setJumpscareStatus('Triggered.');
    setTimeout(() => setJumpscareStatus(''), 2000);
  }

  async function loadDashboard() {
    const tables = [
      ['reviews', 'Reviews'],
      ['conversations', 'Conversations'],
      ['conversation_messages', 'Messages'],
      ['sessions', 'Sessions'],
      ['announcements', 'Announcements']
    ];
    const nextCounts = { ...emptyCounts };
    for (const [table, label] of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      nextCounts[label] = count || 0;
    }
    setCounts(nextCounts);
  }

  async function loadAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setAnnouncements(data || []);
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setConversations(data || []);
  }

  async function loadConversationMessages(conversationId) {
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setConversationMessages(data || []);
  }

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setReviews(data || []);
  }

  async function loadSessions() {
    let query = supabase
      .from('sessions')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(100);
    if (isStaffMode && staffProfile?.name) {
      query = query.eq('staff_name', staffProfile.name);
    }
    const { data } = await query;
    setSessions(data || []);
  }

  async function loadStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.warn('load staff failed', error);
      setStaffStatus(error.message || 'Failed to load staff.');
      setStaff([]);
      return;
    }
    setStaff(data || []);
  }

  function normalizeStaffName(value) {
    return String(value || '')
      .replace(/[\u00a0\u200b\u200c\u200d\u2060]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function createStaff(event) {
    event.preventDefault();
    const name = normalizeStaffName(newStaffName);
    if (!name) {
      setStaffStatus('Staff name is required.');
      return;
    }
    const exists = staff.some(
      (row) => normalizeStaffName(row.name).toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setStaffStatus('That staff name already exists.');
      return;
    }
    setStaffStatus('Saving...');
    const { error } = await supabase.from('staff').insert([{
      name,
      active: newStaffActive,
      sort_order: Number(newStaffSortOrder || 0),
      user_id: newStaffUserId.trim() || null
    }]);
    if (error) {
      setStaffStatus(error.message || 'Failed to create staff.');
      return;
    }
    setNewStaffName('');
    setNewStaffActive(true);
    setNewStaffSortOrder(0);
    setNewStaffUserId('');
    setStaffStatus('Saved.');
    loadStaff();
  }

  async function updateStaffUserId(staffItem, value) {
    const userId = value.trim() || null;
    const { error } = await supabase
      .from('staff')
      .update({ user_id: userId })
      .eq('id', staffItem.id);
    if (error) {
      setStaffStatus(error.message || 'Failed to update staff user.');
      return;
    }
    loadStaff();
  }

  async function toggleStaffActive(staffItem) {
    const { error } = await supabase
      .from('staff')
      .update({ active: !staffItem.active })
      .eq('id', staffItem.id);
    if (error) {
      setStaffStatus(error.message || 'Failed to update staff.');
      return;
    }
    loadStaff();
  }

  async function deleteStaff(staffItem) {
    if (!window.confirm(`Delete staff "${staffItem.name}"?`)) return;
    const { error } = await supabase.from('staff').delete().eq('id', staffItem.id);
    if (error) {
      setStaffStatus(error.message || 'Failed to delete staff.');
      return;
    }
    loadStaff();
  }

  async function loadClients() {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, email')
      .order('created_at', { ascending: false });
    setClients(data || []);
  }

  async function loadWhyContent() {
    const { data: cardData } = await supabase
      .from('why_value_cards')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setValueCards(cardData || []);

    const { data: quoteData } = await supabase
      .from('why_quotes')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setQuotes(quoteData || []);

    const { data: measurementData } = await supabase
      .from('why_measurements')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setWhyMeasurements(measurementData || []);
  }

  async function loadPricingContent() {
    const { data: plans } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setPricingPlans(plans || []);

    const { data: page } = await supabase
      .from('pricing_page_content')
      .select('*')
      .limit(1);
    if (page && page.length) {
      const row = page[0];
      setPricingPage({
        title: row.title || '',
        subtitle: row.subtitle || '',
        custom_title: row.custom_title || '',
        custom_body: row.custom_body || '',
        custom_cta_label: row.custom_cta_label || '',
        custom_cta_url: row.custom_cta_url || ''
      });
    }
  }

  async function loadGalleryContent() {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setGalleryImages(data || []);
  }

  async function loadAdminProfile() {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('admins')
      .select('display_name')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) return;
    setAdminDisplayName(data?.display_name || '');
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = (form.get('email') || '').toString().trim();
    const password = (form.get('password') || '').toString();
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isStaffMode) {
        setStaffState({ status: 'denied', error: error.message });
      } else {
        setAdminState({ status: 'denied', error: error.message });
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setActiveTab('dashboard');
  }

  function handleLoginModeChange(mode) {
    setLoginMode(mode);
    window.localStorage.setItem('ms_login_mode', mode);
    setActiveTab(mode === 'staff' ? 'sessions' : 'dashboard');
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementStatus('Publishing...');
    const payload = { message: announcementText.trim() };
    if (announcementStatic) {
      if (!hasAnnouncementStatic) {
        alert('Static announcements are not enabled yet. Run announcement_static_upgrade.sql in Supabase.');
      } else {
        payload.is_static = true;
        if (announcementLabel.trim()) {
          payload.label = announcementLabel.trim();
        }
        if (announcementColor.trim()) {
          payload.color = announcementColor.trim();
        }
      }
    }
    const { error } = await supabase.from('announcements').insert([payload]);
    if (error) {
      setAnnouncementStatus(`Failed: ${error.message}`);
      return;
    }
    setAnnouncementText('');
    setAnnouncementStatic(false);
    setAnnouncementLabel('NOTICE');
    setAnnouncementColor('#0f766e');
    setAnnouncementStatus('Published.');
    loadAnnouncements();
  }

  async function deleteAnnouncement(id) {
    await supabase.from('announcements').delete().eq('id', id);
    loadAnnouncements();
  }

    function startEditAnnouncement(item) {
    setEditingAnnouncementId(item.id);
    setEditAnnouncement({
      message: item.message || '',
      label: item.label || '',
      color: item.color || ''
    });
  }

  function cancelEditAnnouncement() {
    setEditingAnnouncementId(null);
    setEditAnnouncement({ message: '', label: '', color: '' });
  }

  async function saveEditAnnouncement(id) {
    if (!id) return;
    const payload = { message: editAnnouncement.message.trim() };
    if (hasAnnouncementStatic) {
      payload.label = editAnnouncement.label.trim() || null;
      payload.color = editAnnouncement.color.trim() || null;
    }
    const { error } = await supabase
      .from('announcements')
      .update(payload)
      .eq('id', id);
    if (error) {
      setAnnouncementStatus(`Failed: ${error.message}`);
      return;
    }
    cancelEditAnnouncement();
    loadAnnouncements();
  }


  async function openConversation(conversationId) {
    setCurrentConversation(conversationId);
    const meta = conversations.find((item) => item.id === conversationId) || null;
    setCurrentConversationMeta(meta);
    await loadConversationMessages(conversationId);
  }

  async function updateConversationStatus(nextStatus) {
    if (!currentConversation) return;
    const payload = { status: nextStatus };
    if (hasConversationClosedAt) {
      payload.closed_at = nextStatus === 'closed' ? new Date().toISOString() : null;
    }
    await supabase.from('conversations').update(payload).eq('id', currentConversation);
    await loadConversations();
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', currentConversation)
      .maybeSingle();
    setCurrentConversationMeta(data || null);
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!currentConversation || !replyText.trim()) return;
    if (currentConversationMeta?.status === 'closed') return;
    await supabase.from('conversation_messages').insert([
      {
        conversation_id: currentConversation,
        sender: adminDisplayName || session?.user?.email || 'Mason Admin',
        body: replyText.trim(),
        sender_role: 'admin'
      }
    ]);
    if (hasConversationLastMessageAt) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation);
    }
    setReplyText('');
    await loadConversationMessages(currentConversation);
    sendAdminTyping(false);
  }

  function sendAdminTyping(isTyping) {
    if (!typingChannelRef.current || !currentConversation) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        role: 'admin',
        name: adminDisplayName || session?.user?.email || 'Admin',
        typing: Boolean(isTyping)
      }
    });
  }

  async function updateReviewReply(reviewId) {
    const existing = reviews.find((review) => review.id === reviewId);
    const current = existing?.mason_reply || '';
    const nextReply = window.prompt('Reply as Mason:', current);
    if (nextReply === null) return;
    await supabase.from('reviews').update({ mason_reply: nextReply }).eq('id', reviewId);
    loadReviews();
  }

  async function editReview(reviewId) {
    const existing = reviews.find((review) => review.id === reviewId);
    const nextComment = window.prompt('Edit review comment:', existing?.comment || '');
    if (nextComment === null) return;
    const nextRating = window.prompt('Edit rating (0-5):', String(existing?.rating ?? 0));
    if (nextRating === null) return;
    await supabase
      .from('reviews')
      .update({ comment: nextComment, rating: Number(nextRating) })
      .eq('id', reviewId);
    loadReviews();
  }

  async function deleteReview(reviewId) {
    if (!window.confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', reviewId);
    loadReviews();
  }

  function clientLabel(client) {
    if (!client) return 'Unassigned';
    return client.display_name || client.email || client.user_id;
  }

  function sessionStatusLabel(status) {
    return status || 'requested';
  }

  function formatDayLabel(date) {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(date) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function openSessionDetails(sessionItem) {
    setSelectedSession(sessionItem);
    setContextMenu({ open: false, x: 0, y: 0, session: null });
  }

  function openSessionContextMenu(event, sessionItem) {
    event.preventDefault();
    setContextMenu({ open: true, x: event.clientX, y: event.clientY, session: sessionItem });
  }

  function openSessionCall(sessionItem) {
    window.open(
      `${window.location.origin}/sessioncall.html?session=${sessionItem.id}&role=admin`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function updateSessionStatus(id, nextStatus) {
    if (!id) return;
    await supabase.from('sessions').update({ status: nextStatus }).eq('id', id);
    loadSessions();
  }

  async function updateSessionAssignment(id, userId) {
    if (!id) return;
    await supabase.from('sessions').update({ user_id: userId || null }).eq('id', id);
    loadSessions();
  }

  async function deleteSession(id) {
    if (!id) return;
    if (!window.confirm('Delete this session?')) return;
    await supabase.from('sessions').delete().eq('id', id);
    loadSessions();
  }

  function setSessionStatus(id, status) {
    setSessionActionStatus((prev) => ({ ...prev, [id]: status }));
  }

  async function saveSessionFeedback(id) {
    const note = (sessionNoteDrafts[id] || '').trim();
    setSessionStatus(id, 'Saving feedback...');
    const { error } = await supabase.from('sessions').update({ admin_feedback: note }).eq('id', id);
    setSessionStatus(id, error ? `Error: ${error.message}` : 'Feedback saved.');
    loadSessions();
  }

  async function ensureSessionConversation(sessionItem) {
    if (sessionItem.session_chat_id) return sessionItem.session_chat_id;
    if (!sessionItem.user_id) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        customer_name: sessionItem.customer_name || sessionItem.contact || 'Client',
        user_id: sessionItem.user_id,
        status: 'open'
      }])
      .select('id')
      .limit(1);
    if (error || !data || !data.length) return null;
    const convoId = data[0].id;
    await supabase.from('sessions').update({ session_chat_id: convoId }).eq('id', sessionItem.id);
    return convoId;
  }

  async function openSessionChat(sessionItem) {
    const convoId = await ensureSessionConversation(sessionItem);
    if (!convoId) {
      setSessionStatus(sessionItem.id, 'Assign a client before opening chat.');
      return;
    }
    const url = `${window.location.origin}/sessionchat.html?session=${sessionItem.id}&role=admin`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function loadSessionChat(sessionItem) {
    const convoId = await ensureSessionConversation(sessionItem);
    if (!convoId) {
      setSessionStatus(sessionItem.id, 'Assign a client before opening chat.');
      return;
    }
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('load chat failed', error);
      return;
    }
    setSessionChatMessages((prev) => ({ ...prev, [sessionItem.id]: data || [] }));
  }

  function toggleSessionChat(sessionItem) {
    setSessionChatOpen((prev) => {
      const next = !prev[sessionItem.id];
      if (next) loadSessionChat(sessionItem);
      return { ...prev, [sessionItem.id]: next };
    });
  }

  async function sendSessionMessage(sessionItem) {
    const message = (sessionMessageDrafts[sessionItem.id] || '').trim();
    if (!message) return;
    setSessionStatus(sessionItem.id, 'Sending message...');
    const convoId = await ensureSessionConversation(sessionItem);
    if (!convoId) {
      setSessionStatus(sessionItem.id, 'Assign a client before messaging.');
      return;
    }
    const payload = { admin_message: message, admin_message_sent_at: new Date().toISOString() };
    const { error: sessionErr } = await supabase.from('sessions').update(payload).eq('id', sessionItem.id);
    const { error: msgErr } = await supabase.from('conversation_messages').insert([{
      conversation_id: convoId,
      sender: isStaffMode ? (staffProfile?.name || session?.user?.email || 'Staff') : (adminDisplayName || 'Mason Admin'),
      body: message,
      sender_role: 'admin'
    }]);
    if (msgErr) {
      setSessionStatus(sessionItem.id, `Error: ${msgErr.message}`);
      return;
    }
    if (sessionErr) {
      setSessionStatus(sessionItem.id, `Error: ${sessionErr.message}`);
      return;
    }
    try {
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convoId);
    } catch (err) {
      console.warn('last_message_at update failed', err);
    }
    setSessionStatus(sessionItem.id, 'Message sent.');
    setSessionMessageDrafts((prev) => ({ ...prev, [sessionItem.id]: '' }));
    loadSessions();
    if (isStaffMode && sessionChatOpen[sessionItem.id]) {
      loadSessionChat(sessionItem);
    }
  }

  function handleSessionChange(event) {
    const { name, value } = event.target;
    setSessionForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTicketChange(event) {
    const { name, value } = event.target;
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  }

  async function createTicket(event) {
    event.preventDefault();
    if (!ticketForm.customer_name.trim()) return;
    const payload = {
      customer_name: ticketForm.customer_name.trim(),
      status: 'open'
    };
    if (hasConversationSubject && ticketForm.subject.trim()) {
      payload.subject = ticketForm.subject.trim();
    }
    await supabase.from('conversations').insert([payload]);
    setTicketForm({ customer_name: '', subject: '' });
    loadConversations();
  }

  async function createSession(event) {
    event.preventDefault();
    if (isStaffMode && !editingSessionId) return;
    if (!sessionForm.customer_name.trim() || !sessionForm.contact.trim()) return;
    const basePayload = {
      customer_name: sessionForm.customer_name.trim(),
      contact: sessionForm.contact.trim(),
      details: sessionForm.details.trim(),
      scheduled_for: sessionForm.scheduled_for || null,
      location: sessionForm.location.trim() || null,
      duration_minutes: sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : null
    };
    const payload = isStaffMode
      ? basePayload
      : {
          ...basePayload,
          price: sessionForm.price ? Number(sessionForm.price) : null,
          status: sessionForm.status.trim() || 'scheduled',
          staff_name: sessionForm.staff_name.trim() || null,
          user_id: sessionForm.user_id || null
        };
    if (editingSessionId) {
      await supabase.from('sessions').update(payload).eq('id', editingSessionId);
    } else {
      await supabase.from('sessions').insert([payload]);
    }
    setSessionForm({
      customer_name: '',
      contact: '',
      details: '',
      scheduled_for: '',
      location: '',
      duration_minutes: '',
      price: '',
      status: 'scheduled',
      staff_name: '',
      user_id: ''
    });
    setEditingSessionId(null);
    loadSessions();
  }

  function startEditSession(sessionItem) {
    setEditingSessionId(sessionItem.id);
    setSessionForm({
      customer_name: sessionItem.customer_name || '',
      contact: sessionItem.contact || '',
      details: sessionItem.details || '',
      scheduled_for: sessionItem.scheduled_for ? new Date(sessionItem.scheduled_for).toISOString().slice(0, 16) : '',
      location: sessionItem.location || '',
      duration_minutes: sessionItem.duration_minutes ? String(sessionItem.duration_minutes) : '',
      price: sessionItem.price ? String(sessionItem.price) : '',
      status: sessionItem.status || 'scheduled',
      staff_name: sessionItem.staff_name || '',
      user_id: sessionItem.user_id || ''
    });
  }

  function cancelEditSession() {
    setEditingSessionId(null);
    setSessionForm({
      customer_name: '',
      contact: '',
      details: '',
      scheduled_for: '',
      location: '',
      duration_minutes: '',
      price: '',
      status: 'scheduled',
      staff_name: '',
      user_id: ''
    });
  }

  async function saveAdminProfile(event) {
    event.preventDefault();
    if (!session?.user?.id) return;
    setSettingsStatus('Saving...');
    const payload = { user_id: session.user.id, display_name: adminDisplayName.trim() || null };
    const { error } = await supabase.from('admins').upsert([payload], { onConflict: 'user_id' });
    if (error) {
      setSettingsStatus(`Failed: ${error.message}`);
      return;
    }
    setSettingsStatus('Saved.');
  }

  function updateValueCardField(id, field, value) {
    setValueCards((prev) => prev.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  }

  function updateQuoteField(id, field, value) {
    setQuotes((prev) => prev.map((quote) => (quote.id === id ? { ...quote, [field]: value } : quote)));
  }

  async function createValueCard(event) {
    event.preventDefault();
    if (!newValueCard.title.trim() || !newValueCard.body.trim()) return;
    setWhyStatus('Saving...');
    const { error } = await supabase.from('why_value_cards').insert([{
      title: newValueCard.title.trim(),
      body: newValueCard.body.trim(),
      sort_order: Number(newValueCard.sort_order) || 0
    }]);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setNewValueCard({ title: '', body: '', sort_order: 0 });
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function saveValueCard(card) {
    if (!card.id) return;
    setWhyStatus('Saving...');
    const { error } = await supabase.from('why_value_cards')
      .update({
        title: card.title,
        body: card.body,
        sort_order: Number(card.sort_order) || 0
      })
      .eq('id', card.id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function deleteValueCard(id) {
    if (!window.confirm('Delete this value card?')) return;
    const { error } = await supabase.from('why_value_cards').delete().eq('id', id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    loadWhyContent();
  }

  async function createQuote(event) {
    event.preventDefault();
    if (!newQuote.quote.trim() || !newQuote.author.trim()) return;
    setWhyStatus('Saving...');
    const { error } = await supabase.from('why_quotes').insert([{
      quote: newQuote.quote.trim(),
      author: newQuote.author.trim(),
      sort_order: Number(newQuote.sort_order) || 0
    }]);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setNewQuote({ quote: '', author: '', sort_order: 0 });
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function saveQuote(quote) {
    if (!quote.id) return;
    setWhyStatus('Saving...');
    const { error } = await supabase.from('why_quotes')
      .update({
        quote: quote.quote,
        author: quote.author,
        sort_order: Number(quote.sort_order) || 0
      })
      .eq('id', quote.id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function deleteQuote(id) {
    if (!window.confirm('Delete this quote?')) return;
    const { error } = await supabase.from('why_quotes').delete().eq('id', id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    loadWhyContent();
  }

  function updateWhyMeasurementField(id, field, value) {
    setWhyMeasurements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function createWhyMeasurement(event) {
    event.preventDefault();
    if (!newWhyMeasurement.label.trim() || newWhyMeasurement.value_cm === '') return;
    setWhyStatus('Saving...');
    const payload = {
      label: newWhyMeasurement.label.trim(),
      value_cm: Number(newWhyMeasurement.value_cm),
      color: newWhyMeasurement.color.trim() || null,
      sort_order: Number(newWhyMeasurement.sort_order) || 0
    };
    const { error } = await supabase.from('why_measurements').insert([payload]);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setNewWhyMeasurement({ label: '', value_cm: '', color: '#0ea5a4', sort_order: 0 });
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function saveWhyMeasurement(item) {
    if (!item.id) return;
    setWhyStatus('Saving...');
    const payload = {
      label: item.label,
      value_cm: Number(item.value_cm),
      color: item.color || null,
      sort_order: Number(item.sort_order) || 0
    };
    const { error } = await supabase.from('why_measurements').update(payload).eq('id', item.id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    setWhyStatus('Saved.');
    loadWhyContent();
  }

  async function deleteWhyMeasurement(id) {
    if (!window.confirm('Delete this comparator?')) return;
    const { error } = await supabase.from('why_measurements').delete().eq('id', id);
    if (error) {
      setWhyStatus(`Failed: ${error.message}`);
      return;
    }
    loadWhyContent();
  }
  function updatePricingPlanField(id, field, value) {
    setPricingPlans((prev) => prev.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan)));
  }

  async function createPricingPlan(event) {
    event.preventDefault();
    if (!newPricingPlan.title.trim() || !newPricingPlan.price.trim()) return;
    setPricingStatus('Saving...');
    const payload = {
      title: newPricingPlan.title.trim(),
      price: newPricingPlan.price.trim(),
      price_subtitle: newPricingPlan.price_subtitle.trim(),
      features: newPricingPlan.features.split('\n').map((f) => f.trim()).filter(Boolean),
      cta_label: newPricingPlan.cta_label.trim(),
      cta_plan: newPricingPlan.cta_plan.trim(),
      cta_amount: newPricingPlan.cta_amount ? Number(newPricingPlan.cta_amount) : null,
      sort_order: Number(newPricingPlan.sort_order) || 0
    };
    const { error } = await supabase.from('pricing_plans').insert([payload]);
    if (error) {
      setPricingStatus(`Failed: ${error.message}`);
      return;
    }
    setNewPricingPlan({
      title: '',
      price: '',
      price_subtitle: '',
      features: '',
      cta_label: '',
      cta_plan: '',
      cta_amount: '',
      sort_order: 0
    });
    setPricingStatus('Saved.');
    loadPricingContent();
  }

  async function savePricingPlan(plan) {
    if (!plan.id) return;
    setPricingStatus('Saving...');
    const payload = {
      title: plan.title,
      price: plan.price,
      price_subtitle: plan.price_subtitle,
      features: Array.isArray(plan.features)
        ? plan.features
        : String(plan.features || '').split('\n').map((f) => f.trim()).filter(Boolean),
      cta_label: plan.cta_label,
      cta_plan: plan.cta_plan,
      cta_amount: plan.cta_amount ? Number(plan.cta_amount) : null,
      sort_order: Number(plan.sort_order) || 0
    };
    const { error } = await supabase.from('pricing_plans').update(payload).eq('id', plan.id);
    if (error) {
      setPricingStatus(`Failed: ${error.message}`);
      return;
    }
    setPricingStatus('Saved.');
    loadPricingContent();
  }

  async function deletePricingPlan(id) {
    if (!window.confirm('Delete this plan?')) return;
    const { error } = await supabase.from('pricing_plans').delete().eq('id', id);
    if (error) {
      setPricingStatus(`Failed: ${error.message}`);
      return;
    }
    loadPricingContent();
  }

  function updatePricingPageField(field, value) {
    setPricingPage((prev) => ({ ...prev, [field]: value }));
  }

  async function savePricingPage(event) {
    event.preventDefault();
    setPricingStatus('Saving...');
    const payload = {
      title: pricingPage.title.trim() || null,
      subtitle: pricingPage.subtitle.trim() || null,
      custom_title: pricingPage.custom_title.trim() || null,
      custom_body: pricingPage.custom_body.trim() || null,
      custom_cta_label: pricingPage.custom_cta_label.trim() || null,
      custom_cta_url: pricingPage.custom_cta_url.trim() || null,
      updated_at: new Date().toISOString()
    };
    const existing = await supabase.from('pricing_page_content').select('id').limit(1);
    if (existing.data && existing.data.length) {
      const { error } = await supabase
        .from('pricing_page_content')
        .update(payload)
        .eq('id', existing.data[0].id);
      if (error) {
        setPricingStatus(`Failed: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from('pricing_page_content').insert([payload]);
      if (error) {
        setPricingStatus(`Failed: ${error.message}`);
        return;
      }
    }
    setPricingStatus('Saved.');
    loadPricingContent();
  }
  async function uploadGalleryImages(event) {
    event.preventDefault();
    const files = Array.from(event.target.elements.images.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      setGalleryStatus('Max 5 images at a time.');
      return;
    }
    setGalleryStatus('Uploading...');

    for (const file of files) {
      const pathName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('gallery')
        .upload(pathName, file, { contentType: file.type, upsert: true });
      if (uploadError) {
        setGalleryStatus(`Upload failed: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage.from('gallery').getPublicUrl(pathName);
      const publicUrl = data?.publicUrl || '';
      const { error: insertError } = await supabase.from('gallery_images').insert([{
        storage_path: pathName,
        public_url: publicUrl,
        caption: galleryCaption.trim() || null,
        sort_order: Number(gallerySort) || 0,
        uploaded_by: session?.user?.id || null
      }]);
      if (insertError) {
        setGalleryStatus(`Save failed: ${insertError.message}`);
        return;
      }
    }

    event.target.reset();
    setGalleryCaption('');
    setGallerySort(0);
    setGalleryStatus('Uploaded.');
    loadGalleryContent();
  }

  async function deleteGalleryImage(img) {
    if (!window.confirm('Delete this image?')) return;
    const { error: storageError } = await supabase
      .storage
      .from('gallery')
      .remove([img.storage_path]);
    if (storageError) {
      setGalleryStatus(`Storage delete failed: ${storageError.message}`);
      return;
    }
    const { error } = await supabase.from('gallery_images').delete().eq('id', img.id);
    if (error) {
      setGalleryStatus(`Delete failed: ${error.message}`);
      return;
    }
    loadGalleryContent();
  }

  function updateGalleryField(id, field, value) {
    setGalleryImages((prev) => prev.map((img) => (img.id === id ? { ...img, [field]: value } : img)));
  }

  async function saveGalleryImage(img) {
    const { error } = await supabase.from('gallery_images')
      .update({ caption: img.caption, sort_order: Number(img.sort_order) || 0 })
      .eq('id', img.id);
    if (error) {
      setGalleryStatus(`Save failed: ${error.message}`);
      return;
    }
    setGalleryStatus('Saved.');
    loadGalleryContent();
  }



  if (authLoading) {
    return (
      <div className="screen">
        <div className="card">
          <h2>Loading Mason Admin</h2>
          <p className="muted">Authenticating secure session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="screen">
        <div className="card auth">
          <div>
            <p className="eyebrow">{isStaffMode ? 'Mason Staff Access' : 'Mason Admin Access'}</p>
            <h1>Sign in to continue</h1>
            <p className="muted">
              {isStaffMode
                ? 'Staff accounts only. You will only see your assigned sessions.'
                : 'This admin console is isolated from the public website. Approved admins only.'}
            </p>
          </div>
          <div className="row" style={{ marginBottom: '12px' }}>
            <button
              type="button"
              className={loginMode === 'admin' ? '' : 'ghost'}
              onClick={() => handleLoginModeChange('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={loginMode === 'staff' ? '' : 'ghost'}
              onClick={() => handleLoginModeChange('staff')}
            >
              Staff
            </button>
          </div>
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email
              <input type="email" name="email" placeholder="you@company.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="••••••••" required />
            </label>
            <button type="submit">Sign In</button>
            {isStaffMode
              ? (staffState.error ? <p className="error">{staffState.error}</p> : null)
              : (adminState.error ? <p className="error">{adminState.error}</p> : null)}
          </form>
        </div>
      </div>
    );
  }

  if ((isStaffMode ? staffState.status : adminState.status) === 'checking') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Verifying access</h2>
          <p className="muted">
            Checking {isStaffMode ? 'staff' : 'admin'} permissions for {session.user.email}.
          </p>
        </div>
      </div>
    );
  }

  if ((isStaffMode ? staffState.status : adminState.status) !== 'allowed') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Access denied</h2>
          <p className="muted">
            {(isStaffMode ? staffState.error : adminState.error) ||
              (isStaffMode ? 'Your account is not registered as staff yet.' : 'Your account is not registered as an admin yet.')}
          </p>
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">MA</div>
          <div>
            <p className="eyebrow">{isStaffMode ? 'Mason Staff' : 'Mason Admin'}</p>
            <p className="muted">{isStaffMode ? 'Appointments' : 'Operations Console'}</p>
          </div>
        </div>
        <nav className="nav">
          {(isStaffMode ? STAFF_TABS : TABS).map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
          <div className="profile">
            <div>
              <p className="muted">Signed in</p>
              <p className="profile-name">{isStaffMode ? (staffProfile?.name || 'STAFF') : (adminDisplayName || 'ADMIN')}</p>
            </div>
            <button type="button" onClick={handleLogout} className="ghost">
              Sign out
            </button>
          </div>
      </aside>
      <main className="main">
        <header className="header">
          <div>
            <h1>{(isStaffMode ? STAFF_TABS : TABS).find((tab) => tab.id === activeTab)?.label}</h1>
            <p className="muted">
              {isStaffMode ? 'Only your assigned appointments are shown.' : 'Realtime operations snapshot for Mason portal data.'}
            </p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={loadSessions} className="ghost">
              Refresh
            </button>
          </div>
        </header>

        {!isStaffMode && activeTab === 'dashboard' && (
          <section className="stack">
            <div className="grid">
              {Object.entries(counts).map(([label, value]) => (
                <div key={label} className="card stat">
                  <p className="muted">{label}</p>
                  <h2>{value}</h2>
                </div>
              ))}
              <div className="card note">
                <h3>Admin playbook</h3>
                <p className="muted">
                  This console mirrors Mason portal activity in one secure workspace. Use the
                  navigation to respond to conversations, publish announcements, and keep sessions
                  moving.
                </p>
              </div>
            </div>
            <div className="card gantt-card">
              <div className="gantt-header">
                <div>
                  <h3>Session timeline</h3>
                  <p className="muted">Live view of scheduled sessions for the next 7 days.</p>
                </div>
                <div className="gantt-now">
                  <span className="pill">Now</span>
                  <span>{formatDayLabel(now)} - {formatTime(now)}</span>
                </div>
              </div>
              <div className="schedule-board" style={{ '--now-left': nowOffsetPercent }}>
                <div className="schedule-head">
                  <div className="schedule-staff-head">Staff</div>
                  <div className="schedule-days">
                    {scheduleDays.map((day) => (
                      <div key={day.toISOString()} className="schedule-day">
                        <div className="schedule-day-label">{formatDayLabel(day)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="schedule-body">
                  <div className="schedule-now-line" />
                  {timelineSessions.length === 0 && (
                    <div className="schedule-empty muted">No scheduled sessions in the next 7 days.</div>
                  )}
                  {scheduleRows.map((row) => (
                    <div key={row.staff} className="schedule-row">
                      <div className="schedule-staff">
                        <div className="staff-name">{row.staff}</div>
                        <div className="staff-count">{row.items.length} sessions</div>
                      </div>
                      <div className="schedule-cells">
                        {scheduleDays.map((day) => {
                          const key = day.toISOString().slice(0, 10);
                          const items = row.byDay.get(key) || [];
                          return (
                            <div key={key} className="schedule-cell">
                              {items.length === 0 && <span className="schedule-empty-cell">—</span>}
                              {items.map(({ sessionItem, start, end }) => (
                                <button
                                  key={sessionItem.id}
                                  type="button"
                                  className={`schedule-chip status-${sessionStatusLabel(sessionItem.status)}`}
                                  onClick={() => openSessionDetails(sessionItem)}
                                  onContextMenu={(event) => openSessionContextMenu(event, sessionItem)}
                                  title="Click for details. Right-click to edit."
                                >
                                  <div className="chip-title">{sessionItem.customer_name || 'Session'}</div>
                                  <div className="chip-meta">
                                    {formatTime(start)} - {sessionItem.duration_minutes || 60} min
                                  </div>
                                  <div className="chip-meta">
                                    {sessionItem.location ? `@ ${sessionItem.location}` : 'Location TBD'}
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedSession && (
                <div className="session-detail-drawer">
                  <div className="session-detail-header">
                    <div>
                      <h4>Session details</h4>
                      <p className="muted">
                        {selectedSession.customer_name || 'Session'} - {selectedSession.staff_name || 'Unassigned'}
                      </p>
                    </div>
                    <button type="button" className="ghost" onClick={() => setSelectedSession(null)}>
                      Close
                    </button>
                  </div>
                  <div className="session-detail-grid">
                    <div>
                      <span className="detail-label">Status</span>
                      <span>{sessionStatusLabel(selectedSession.status)}</span>
                    </div>
                    <div>
                      <span className="detail-label">Scheduled</span>
                      <span>
                        {selectedSession.scheduled_for
                          ? new Date(selectedSession.scheduled_for).toLocaleString()
                          : 'Not scheduled'}
                      </span>
                    </div>
                    <div>
                      <span className="detail-label">Duration</span>
                      <span>{selectedSession.duration_minutes || '—'} mins</span>
                    </div>
                    <div>
                      <span className="detail-label">Location</span>
                      <span>{selectedSession.location || 'Location TBD'}</span>
                    </div>
                    <div>
                      <span className="detail-label">Contact</span>
                      <span>{selectedSession.contact || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="detail-label">Price</span>
                      <span>{selectedSession.price || '—'}</span>
                    </div>
                  </div>
                  {selectedSession.details && (
                    <div className="session-detail-notes">
                      <span className="detail-label">Details</span>
                      <p>{selectedSession.details}</p>
                    </div>
                  )}
                  <div className="session-detail-actions">
                    <button
                      type="button"
                      onClick={() => {
                        startEditSession(selectedSession);
                        setActiveTab('sessions');
                      }}
                    >
                      Edit session
                    </button>
                    <button type="button" className="ghost" onClick={() => openSessionChat(selectedSession)}>
                      Open chat
                    </button>
                    <button type="button" className="ghost" onClick={() => openSessionCall(selectedSession)}>
                      Call client
                    </button>
                    <button type="button" className="danger" onClick={() => deleteSession(selectedSession.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {!isStaffMode && activeTab === 'announcements' && (
          <section className="stack">
            <form className="card form" onSubmit={submitAnnouncement}>
              <h3>Post announcement</h3>
              <textarea
                value={announcementText}
                onChange={(event) => setAnnouncementText(event.target.value)}
                rows={3}
                placeholder="Write a short announcement for clients."
              />
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={announcementStatic}
                  onChange={(event) => setAnnouncementStatic(event.target.checked)}
                />
                Static top bar (stays until deleted)
              </label>
              {announcementStatic && (
                <label>
                  Label
                  <input
                    type="text"
                    value={announcementLabel}
                    onChange={(event) => setAnnouncementLabel(event.target.value)}
                    placeholder="NOTICE"
                  />
                </label>
              )}
              {announcementStatic && (
                <label>
                  Banner color
                  <input
                    type="color"
                    value={announcementColor}
                    onChange={(event) => setAnnouncementColor(event.target.value)}
                  />
                </label>
              )}
              {announcementStatus && <p className="muted">{announcementStatus}</p>}
              <button type="submit">Publish</button>
            </form>
            <div className="card list">
              <h3>Recent announcements</h3>
              {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
              {announcements.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <p>{item.message}</p>
                    {editingAnnouncementId === item.id && (
                      <div className="form" style={{ marginTop: '0.75rem' }}>
                        <label>
                          Message
                          <textarea
                            rows={3}
                            value={editAnnouncement.message}
                            onChange={(event) => setEditAnnouncement((prev) => ({ ...prev, message: event.target.value }))}
                          />
                        </label>
                        <label>
                          Label
                          <input
                            type="text"
                            value={editAnnouncement.label}
                            onChange={(event) => setEditAnnouncement((prev) => ({ ...prev, label: event.target.value }))}
                          />
                        </label>
                        <label>
                          Color
                          <input
                            type="color"
                            value={editAnnouncement.color || '#0f766e'}
                            onChange={(event) => setEditAnnouncement((prev) => ({ ...prev, color: event.target.value }))}
                          />
                        </label>
                        <div className="review-actions">
                          <button type="button" onClick={() => saveEditAnnouncement(item.id)}>Save</button>
                          <button type="button" className="ghost" onClick={cancelEditAnnouncement}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <p className="muted">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </p>
                    {item.is_static && <span className="pill">Static bar</span>}
                    {item.label && <span className="pill" style={{ marginLeft: '0.4rem' }}>{item.label}</span>}
                    {item.color && (
                      <span
                        className="pill"
                        style={{ marginLeft: '0.4rem', background: item.color, color: '#fff' }}
                      >
                        {item.color}
                      </span>
                    )}
                  </div>
                  <div className="review-actions">
                    <button type="button" className="ghost" onClick={() => startEditAnnouncement(item)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteAnnouncement(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isStaffMode && activeTab === 'conversations' && (
          <section className="two-col">
            <div className="card list">
              <h3>Client conversations</h3>
              <form className="form" onSubmit={createTicket}>
                <label>
                  Client name
                  <input
                    name="customer_name"
                    value={ticketForm.customer_name}
                    onChange={handleTicketChange}
                    placeholder="Client name"
                  />
                </label>
                <label>
                  Subject (optional)
                  <input
                    name="subject"
                    value={ticketForm.subject}
                    onChange={handleTicketChange}
                    placeholder="Ticket subject"
                  />
                </label>
                <button type="submit">Create ticket</button>
              </form>
              {conversations.length === 0 && <p className="muted">No conversations yet.</p>}
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`list-row ${currentConversation === conversation.id ? 'selected' : ''}`}
                  onClick={() => openConversation(conversation.id)}
                >
                  <div>
                    <p>{conversation.customer_name || 'Anonymous'}</p>
                    <p className="muted">
                      {hasConversationSubject && conversation.subject
                        ? conversation.subject
                        : conversation.status || 'open'}
                    </p>
                  </div>
                  <span className="pill">{conversation.id.slice(0, 6)}</span>
                </button>
              ))}
            </div>
            <div className="card list">
              <h3>Thread</h3>
              {!currentConversation && <p className="muted">Pick a conversation to review.</p>}
              {currentConversation && (
                <div className="list-row" style={{ padding: '0.75rem 1rem' }}>
                  <div>
                    <p>{currentConversationMeta?.customer_name || 'Customer'}</p>
                    <p className="muted">
                      {currentConversationMeta?.status || 'open'}
                    </p>
                    {typingStatus && <p className="muted">{typingStatus}</p>}
                  </div>
                  <div className="review-actions">
                    {currentConversationMeta?.status === 'closed' ? (
                      <button type="button" onClick={() => updateConversationStatus('open')}>
                        Reopen
                      </button>
                    ) : (
                      <button type="button" className="ghost" onClick={() => updateConversationStatus('closed')}>
                        Close ticket
                      </button>
                    )}
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        if (!currentConversation) return;
                        if (!window.confirm('Delete this ticket and all messages?')) return;
                        const { error } = await supabase
                          .from('conversations')
                          .delete()
                          .eq('id', currentConversation);
                        if (error) {
                          alert(`Delete failed: ${error.message}`);
                          return;
                        }
                        setCurrentConversation(null);
                        setCurrentConversationMeta(null);
                        setConversationMessages([]);
                        loadConversations();
                      }}
                    >
                      Delete ticket
                    </button>
                  </div>
                </div>
              )}
              {conversationMessages.map((message) => (
                <div key={message.id} className="message">
                  <div className="message-meta">
                    <span>{message.sender || 'Unknown'}</span>
                    <span>{message.sender_role}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              ))}
              {currentConversation && (
                <form className="reply" onSubmit={sendReply}>
                  <textarea
                    value={replyText}
                    onChange={(event) => {
                      setReplyText(event.target.value);
                      sendAdminTyping(true);
                      if (typingDebounceRef.current) {
                        window.clearTimeout(typingDebounceRef.current);
                      }
                      typingDebounceRef.current = window.setTimeout(() => sendAdminTyping(false), 1200);
                    }}
                    rows={3}
                    placeholder={
                      currentConversationMeta?.status === 'closed'
                        ? 'Ticket is closed'
                        : 'Reply as admin...'
                    }
                    disabled={currentConversationMeta?.status === 'closed'}
                    onBlur={() => sendAdminTyping(false)}
                  />
                  <button type="submit" disabled={currentConversationMeta?.status === 'closed'}>
                    Send reply
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {!isStaffMode && activeTab === 'reviews' && (
          <section className="stack">
            <div className="card list">
              <h3>Latest reviews</h3>
              {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} className="review">
                  <div>
                    <p className="review-title">
                      {review.name || 'Anonymous'} <span className="pill">{review.rating}★</span>
                    </p>
                    <p>{review.comment}</p>
                    {review.mason_reply && (
                      <p className="muted">Mason reply: {review.mason_reply}</p>
                    )}
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => updateReviewReply(review.id)}>
                      {review.mason_reply ? 'Edit reply' : 'Reply'}
                    </button>
                    <button type="button" className="ghost" onClick={() => editReview(review.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteReview(review.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'sessions' && (
          <section className={isStaffMode ? 'stack' : 'two-col'}>
            {!isStaffMode && (
              <form className="card form" onSubmit={createSession}>
                <h3>Create session</h3>
                <label>
                  Client name
                  <input
                    name="customer_name"
                    value={sessionForm.customer_name}
                    onChange={handleSessionChange}
                    placeholder="Client name"
                  />
                </label>
                <label>
                  Contact
                  <input
                    name="contact"
                    value={sessionForm.contact}
                    onChange={handleSessionChange}
                    placeholder="Phone or email"
                  />
                </label>
                <label>
                  Details
                  <textarea
                    name="details"
                    value={sessionForm.details}
                    onChange={handleSessionChange}
                    rows={3}
                    placeholder="Session notes"
                  />
                </label>
                <label>
                  Scheduled for
                  <input
                    type="datetime-local"
                    name="scheduled_for"
                    value={sessionForm.scheduled_for}
                    onChange={handleSessionChange}
                  />
                </label>
                <label>
                  Location
                  <input
                    name="location"
                    value={sessionForm.location}
                    onChange={handleSessionChange}
                    placeholder="Address or on-site"
                  />
                </label>
                <label>
                  Book with
                  <select name="staff_name" value={sessionForm.staff_name} onChange={handleSessionChange}>
                    <option value="">No preference</option>
                    {staff
                      .filter((row) => row.active || row.name === sessionForm.staff_name)
                      .map((row) => (
                      <option key={row.id} value={row.name}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    name="duration_minutes"
                    value={sessionForm.duration_minutes}
                    onChange={handleSessionChange}
                    placeholder="60"
                  />
                </label>
                <label>
                  Price
                  <input
                    type="number"
                    name="price"
                    value={sessionForm.price}
                    onChange={handleSessionChange}
                    placeholder="0"
                  />
                </label>
                <label>
                  Status
                  <select name="status" value={sessionForm.status} onChange={handleSessionChange}>
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </label>
                <label>
                  Assign to client
                  <select name="user_id" value={sessionForm.user_id} onChange={handleSessionChange}>
                    <option value="">Unassigned</option>
                    {clients.map((client) => (
                      <option key={client.user_id} value={client.user_id}>
                        {clientLabel(client)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="row">
                  <button type="submit">{editingSessionId ? 'Update session' : 'Save session'}</button>
                  {editingSessionId && (
                    <button type="button" className="ghost" onClick={cancelEditSession}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            )}

            {isStaffMode && editingSessionId && (
              <form className="card form" onSubmit={createSession}>
                <h3>Edit appointment</h3>
                <label>
                  Client name
                  <input
                    name="customer_name"
                    value={sessionForm.customer_name}
                    onChange={handleSessionChange}
                    placeholder="Client name"
                  />
                </label>
                <label>
                  Contact
                  <input
                    name="contact"
                    value={sessionForm.contact}
                    onChange={handleSessionChange}
                    placeholder="Phone or email"
                  />
                </label>
                <label>
                  Details
                  <textarea
                    name="details"
                    value={sessionForm.details}
                    onChange={handleSessionChange}
                    rows={3}
                    placeholder="Session notes"
                  />
                </label>
                <label>
                  Scheduled for
                  <input
                    type="datetime-local"
                    name="scheduled_for"
                    value={sessionForm.scheduled_for}
                    onChange={handleSessionChange}
                  />
                </label>
                <label>
                  Location
                  <input
                    name="location"
                    value={sessionForm.location}
                    onChange={handleSessionChange}
                    placeholder="Address or on-site"
                  />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    name="duration_minutes"
                    value={sessionForm.duration_minutes}
                    onChange={handleSessionChange}
                    placeholder="60"
                  />
                </label>
                <div className="row">
                  <button type="submit">Save changes</button>
                  <button type="button" className="ghost" onClick={cancelEditSession}>
                    Cancel edit
                  </button>
                </div>
              </form>
            )}

            <div className="card list">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{isStaffMode ? 'Your appointments' : 'Upcoming sessions'}</h3>
                {!isStaffMode && (
                  <select
                    value={sessionFilter}
                    onChange={(event) => setSessionFilter(event.target.value)}
                    style={{ maxWidth: '180px' }}
                  >
                    <option value="all">All</option>
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                )}
              </div>
              {sessions.length === 0 && <p className="muted">No sessions scheduled yet.</p>}
              {sessions
                .filter((sessionItem) =>
                  isStaffMode ? true : (sessionFilter === 'all' ? true : sessionItem.status === sessionFilter)
                )
                .map((sessionItem) => (
                  <div key={sessionItem.id} className="session-card">
                    <div className="session-main">
                      <div className="session-title">
                        <div>
                          <p className="session-name">{sessionItem.customer_name || 'Session'}</p>
                          <p className="muted">
                            {sessionItem.scheduled_for
                              ? new Date(sessionItem.scheduled_for).toLocaleString()
                              : 'Not scheduled'}
                          </p>
                        </div>
                      <span className="pill">{sessionStatusLabel(sessionItem.status)}</span>
                      </div>
                      <div className="session-meta">
                        <p>Contact: {sessionItem.contact || '—'}</p>
                        <p>Location: {sessionItem.location || '—'}</p>
                        <p>Duration: {sessionItem.duration_minutes || '—'} mins</p>
                        <p>Price: {sessionItem.price || '—'}</p>
                      </div>
                      {!isStaffMode && (
                        <div className="session-actions">
                          <label>
                            Assign client
                            <select
                              value={sessionItem.user_id || ''}
                              onChange={(event) => updateSessionAssignment(sessionItem.id, event.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {clients.map((client) => (
                                <option key={client.user_id} value={client.user_id}>
                                  {clientLabel(client)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="row">
                            <button type="button" onClick={() => updateSessionStatus(sessionItem.id, 'approved')}>
                              Approve
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => updateSessionStatus(sessionItem.id, 'denied')}
                            >
                              Deny
                            </button>
                            <button type="button" className="ghost" onClick={() => startEditSession(sessionItem)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => openSessionCall(sessionItem)}
                            >
                              Call
                            </button>
                            <button type="button" className="ghost" onClick={() => deleteSession(sessionItem.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                      {isStaffMode && (
                        <div className="row">
                          <button type="button" onClick={() => updateSessionStatus(sessionItem.id, 'approved')}>
                            Approve
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => updateSessionStatus(sessionItem.id, 'denied')}
                          >
                            Deny
                          </button>
                          <button type="button" className="ghost" onClick={() => startEditSession(sessionItem)}>
                            Edit appointment
                          </button>
                        </div>
                      )}
                    </div>
                    {!isStaffMode && (
                      <div className="session-comms">
                        <label>
                          Admin feedback (private)
                          <textarea
                            rows={3}
                            value={sessionNoteDrafts[sessionItem.id] ?? sessionItem.admin_feedback ?? ''}
                            onChange={(event) =>
                              setSessionNoteDrafts((prev) => ({
                                ...prev,
                                [sessionItem.id]: event.target.value
                              }))
                            }
                            placeholder="Internal notes about this appointment."
                          />
                        </label>
                        <div className="row">
                          <button type="button" className="ghost" onClick={() => saveSessionFeedback(sessionItem.id)}>
                            Save feedback
                          </button>
                          <span className="muted">{sessionActionStatus[sessionItem.id] || ''}</span>
                        </div>
                        <label>
                          Message to client
                          <textarea
                            rows={3}
                            value={sessionMessageDrafts[sessionItem.id] ?? ''}
                            onChange={(event) =>
                              setSessionMessageDrafts((prev) => ({
                                ...prev,
                                [sessionItem.id]: event.target.value
                              }))
                            }
                            placeholder="Send an update directly to the client."
                          />
                        </label>
                        <div className="row">
                          <button type="button" onClick={() => sendSessionMessage(sessionItem)}>
                            Send message
                          </button>
                          <button type="button" className="ghost" onClick={() => openSessionChat(sessionItem)}>
                            Open chat
                          </button>
                          <span className="muted">
                            {sessionItem.admin_message_sent_at
                              ? `Last sent ${new Date(sessionItem.admin_message_sent_at).toLocaleString()}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}
                    {isStaffMode && (
                      <div className="session-comms">
                        <label>
                          Message to client
                          <textarea
                            rows={3}
                            value={sessionMessageDrafts[sessionItem.id] ?? ''}
                            onChange={(event) =>
                              setSessionMessageDrafts((prev) => ({
                                ...prev,
                                [sessionItem.id]: event.target.value
                              }))
                            }
                            placeholder="Send an update directly to the client."
                          />
                        </label>
                        <div className="row">
                          <button type="button" onClick={() => sendSessionMessage(sessionItem)}>
                            Send message
                          </button>
                          <button type="button" className="ghost" onClick={() => toggleSessionChat(sessionItem)}>
                            {sessionChatOpen[sessionItem.id] ? 'Hide chat' : 'Show chat'}
                          </button>
                          <span className="muted">
                            {sessionItem.admin_message_sent_at
                              ? `Last sent ${new Date(sessionItem.admin_message_sent_at).toLocaleString()}`
                              : ''}
                          </span>
                        </div>
                        {sessionChatOpen[sessionItem.id] && (
                          <div className="list" style={{ marginTop: '0.75rem' }}>
                            {(sessionChatMessages[sessionItem.id] || []).length === 0 && (
                              <p className="muted">No messages yet.</p>
                            )}
                            {(sessionChatMessages[sessionItem.id] || []).map((msg) => (
                              <div key={msg.id} className="message">
                                <div className="message-meta">
                                  <span>{msg.sender || 'Unknown'}</span>
                                  <span>{msg.sender_role}</span>
                                </div>
                                <p>{msg.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {activeTab === 'pricing' && (
          <section className="stack">
            <form className="card form" onSubmit={savePricingPage}>
              <h3>Pricing page content</h3>
              <label>
                Title
                <input
                  type="text"
                  value={pricingPage.title}
                  onChange={(event) => updatePricingPageField('title', event.target.value)}
                />
              </label>
              <label>
                Subtitle
                <input
                  type="text"
                  value={pricingPage.subtitle}
                  onChange={(event) => updatePricingPageField('subtitle', event.target.value)}
                />
              </label>
              <label>
                Custom section title
                <input
                  type="text"
                  value={pricingPage.custom_title}
                  onChange={(event) => updatePricingPageField('custom_title', event.target.value)}
                />
              </label>
              <label>
                Custom section body
                <textarea
                  rows={3}
                  value={pricingPage.custom_body}
                  onChange={(event) => updatePricingPageField('custom_body', event.target.value)}
                />
              </label>
              <label>
                CTA label
                <input
                  type="text"
                  value={pricingPage.custom_cta_label}
                  onChange={(event) => updatePricingPageField('custom_cta_label', event.target.value)}
                />
              </label>
              <label>
                CTA URL
                <input
                  type="text"
                  value={pricingPage.custom_cta_url}
                  onChange={(event) => updatePricingPageField('custom_cta_url', event.target.value)}
                />
              </label>
              {pricingStatus && <p className="muted">{pricingStatus}</p>}
              <button type="submit">Save page content</button>
            </form>

            <div className="card form">
              <h3>Pricing plans</h3>
              <form onSubmit={createPricingPlan} className="form">
                <label>
                  Title
                  <input
                    type="text"
                    value={newPricingPlan.title}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                <label>
                  Price
                  <input
                    type="text"
                    value={newPricingPlan.price}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, price: event.target.value }))}
                  />
                </label>
                <label>
                  Price subtitle
                  <input
                    type="text"
                    value={newPricingPlan.price_subtitle}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, price_subtitle: event.target.value }))}
                  />
                </label>
                <label>
                  Features (one per line)
                  <textarea
                    rows={3}
                    value={newPricingPlan.features}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, features: event.target.value }))}
                  />
                </label>
                <label>
                  CTA label
                  <input
                    type="text"
                    value={newPricingPlan.cta_label}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, cta_label: event.target.value }))}
                  />
                </label>
                <label>
                  CTA plan
                  <input
                    type="text"
                    value={newPricingPlan.cta_plan}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, cta_plan: event.target.value }))}
                  />
                </label>
                <label>
                  CTA amount
                  <input
                    type="number"
                    value={newPricingPlan.cta_amount}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, cta_amount: event.target.value }))}
                  />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    value={newPricingPlan.sort_order}
                    onChange={(event) => setNewPricingPlan((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                </label>
                <button type="submit">Add plan</button>
              </form>
              {pricingPlans.map((plan) => (
                <div key={plan.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label>
                      Title
                      <input
                        type="text"
                        value={plan.title}
                        onChange={(event) => updatePricingPlanField(plan.id, 'title', event.target.value)}
                      />
                    </label>
                    <label>
                      Price
                      <input
                        type="text"
                        value={plan.price}
                        onChange={(event) => updatePricingPlanField(plan.id, 'price', event.target.value)}
                      />
                    </label>
                    <label>
                      Price subtitle
                      <input
                        type="text"
                        value={plan.price_subtitle || ''}
                        onChange={(event) => updatePricingPlanField(plan.id, 'price_subtitle', event.target.value)}
                      />
                    </label>
                    <label>
                      Features (one per line)
                      <textarea
                        rows={3}
                        value={Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || '')}
                        onChange={(event) => updatePricingPlanField(plan.id, 'features', event.target.value)}
                      />
                    </label>
                    <label>
                      CTA label
                      <input
                        type="text"
                        value={plan.cta_label || ''}
                        onChange={(event) => updatePricingPlanField(plan.id, 'cta_label', event.target.value)}
                      />
                    </label>
                    <label>
                      CTA plan
                      <input
                        type="text"
                        value={plan.cta_plan || ''}
                        onChange={(event) => updatePricingPlanField(plan.id, 'cta_plan', event.target.value)}
                      />
                    </label>
                    <label>
                      CTA amount
                      <input
                        type="number"
                        value={plan.cta_amount ?? ''}
                        onChange={(event) => updatePricingPlanField(plan.id, 'cta_amount', event.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={plan.sort_order ?? 0}
                        onChange={(event) => updatePricingPlanField(plan.id, 'sort_order', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => savePricingPlan(plan)}>Save</button>
                    <button type="button" className="danger" onClick={() => deletePricingPlan(plan.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="stack">
            <form className="card form" onSubmit={saveAdminProfile}>
              <h3>User settings</h3>
              <label>
                Display name
                <input
                  type="text"
                  value={adminDisplayName}
                  onChange={(event) => setAdminDisplayName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              {settingsStatus && <p className="muted">{settingsStatus}</p>}
              <button type="submit">Save</button>
            </form>
            <div className="card list">
              <h3>Staff</h3>
              <form className="row" onSubmit={createStaff}>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(event) => setNewStaffName(event.target.value)}
                  placeholder="Staff name"
                />
                <input
                  type="text"
                  value={newStaffUserId}
                  onChange={(event) => setNewStaffUserId(event.target.value)}
                  placeholder="Auth user id (optional)"
                />
                <input
                  type="number"
                  value={newStaffSortOrder}
                  onChange={(event) => setNewStaffSortOrder(event.target.value)}
                  placeholder="Sort"
                  min="0"
                />
                <label className="row" style={{ gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={newStaffActive}
                    onChange={(event) => setNewStaffActive(event.target.checked)}
                  />
                  Active
                </label>
                <button type="submit">Add</button>
              </form>
              {staffStatus && <p className="muted">{staffStatus}</p>}
              {staff.length === 0 && <p className="muted">No staff yet.</p>}
              {staff.map((row) => (
                <div key={row.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{row.name}</strong>{' '}
                    <span className="pill">{row.active ? 'Active' : 'Inactive'}</span>
                    {row.user_id && <div className="muted">User: {row.user_id}</div>}
                  </div>
                  <div className="row">
                    <input
                      type="text"
                      placeholder="Set user id"
                      defaultValue={row.user_id || ''}
                      onBlur={(event) => updateStaffUserId(row, event.target.value)}
                      style={{ maxWidth: '220px' }}
                    />
                    <button type="button" className="ghost" onClick={() => toggleStaffActive(row)}>
                      {row.active ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" className="danger" onClick={() => deleteStaff(row)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'super' && (
          <section className="stack">
            <div className="card form">
              <h3>Site controls</h3>
              <label className="gravity-toggle">
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={(event) => updateMaintenanceMode(event.target.checked)}
                />
                Site Down
              </label>
              <label className="gravity-toggle">
                <input
                  type="checkbox"
                  checked={introLoopEnabled}
                  onChange={(event) => updateIntroLoop(event.target.checked)}
                />
                Intro Loop
              </label>
              <label className="gravity-toggle">
                <input
                  type="checkbox"
                  checked={gravityEnabled}
                  onChange={(event) => updatePhysicsMode(event.target.checked)}
                />
                Physics Mode (website)
              </label>
              <div className="review-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="danger" onClick={triggerJumpscare}>
                  Trigger Jumpscare
                </button>
                {jumpscareStatus && <span className="muted">{jumpscareStatus}</span>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'gallery' && (
          <section className="stack">
            <form className="card form" onSubmit={uploadGalleryImages}>
              <h3>Upload gallery images</h3>
              <label>
                Images (max 5)
                <input type="file" name="images" accept="image/*" multiple />
              </label>
              <label>
                Caption (applies to all uploads)
                <input
                  type="text"
                  value={galleryCaption}
                  onChange={(event) => setGalleryCaption(event.target.value)}
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={gallerySort}
                  onChange={(event) => setGallerySort(event.target.value)}
                />
              </label>
              {galleryStatus && <p className="muted">{galleryStatus}</p>}
              <button type="submit">Upload</button>
            </form>

            <div className="card list">
              <h3>Existing images</h3>
              {galleryImages.length === 0 && <p className="muted">No images yet.</p>}
              {galleryImages.map((img) => (
                <div key={img.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'grid', gap: '0.6rem' }}>
                    <img src={img.public_url} alt={img.caption || 'Gallery image'} style={{ width: '160px', borderRadius: '10px', border: '1px solid #eee' }} />
                    <label>
                      Caption
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(event) => updateGalleryField(img.id, 'caption', event.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={img.sort_order ?? 0}
                        onChange={(event) => updateGalleryField(img.id, 'sort_order', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => saveGalleryImage(img)}>Save</button>
                    <button type="button" className="danger" onClick={() => deleteGalleryImage(img)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'why' && (
          <section className="stack">
            <div className="card form">
              <h3>What clients value most</h3>
              <form onSubmit={createValueCard} className="form">
                <label>
                  Title
                  <input
                    type="text"
                    value={newValueCard.title}
                    onChange={(event) =>
                      setNewValueCard((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Card title"
                  />
                </label>
                <label>
                  Body
                  <textarea
                    rows={3}
                    value={newValueCard.body}
                    onChange={(event) =>
                      setNewValueCard((prev) => ({ ...prev, body: event.target.value }))
                    }
                    placeholder="Card description"
                  />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    value={newValueCard.sort_order}
                    onChange={(event) =>
                      setNewValueCard((prev) => ({ ...prev, sort_order: event.target.value }))
                    }
                  />
                </label>
                <button type="submit">Add card</button>
              </form>
              {valueCards.map((card) => (
                <div key={card.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label>
                      Title
                      <input
                        type="text"
                        value={card.title}
                        onChange={(event) => updateValueCardField(card.id, 'title', event.target.value)}
                      />
                    </label>
                    <label>
                      Body
                      <textarea
                        rows={3}
                        value={card.body}
                        onChange={(event) => updateValueCardField(card.id, 'body', event.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={card.sort_order ?? 0}
                        onChange={(event) => updateValueCardField(card.id, 'sort_order', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => saveValueCard(card)}>Save</button>
                    <button type="button" className="danger" onClick={() => deleteValueCard(card.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card form">
              <h3>Client quotes</h3>
              <form onSubmit={createQuote} className="form">
                <label>
                  Quote
                  <textarea
                    rows={3}
                    value={newQuote.quote}
                    onChange={(event) =>
                      setNewQuote((prev) => ({ ...prev, quote: event.target.value }))
                    }
                    placeholder="Quote text"
                  />
                </label>
                <label>
                  Author
                  <input
                    type="text"
                    value={newQuote.author}
                    onChange={(event) =>
                      setNewQuote((prev) => ({ ...prev, author: event.target.value }))
                    }
                    placeholder="Client Name, Company/Role"
                  />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    value={newQuote.sort_order}
                    onChange={(event) =>
                      setNewQuote((prev) => ({ ...prev, sort_order: event.target.value }))
                    }
                  />
                </label>
                <button type="submit">Add quote</button>
              </form>
              {quotes.map((quote) => (
                <div key={quote.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label>
                      Quote
                      <textarea
                        rows={3}
                        value={quote.quote}
                        onChange={(event) => updateQuoteField(quote.id, 'quote', event.target.value)}
                      />
                    </label>
                    <label>
                      Author
                      <input
                        type="text"
                        value={quote.author}
                        onChange={(event) => updateQuoteField(quote.id, 'author', event.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={quote.sort_order ?? 0}
                        onChange={(event) => updateQuoteField(quote.id, 'sort_order', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => saveQuote(quote)}>Save</button>
                    <button type="button" className="danger" onClick={() => deleteQuote(quote.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card form">
              <h3>Weiner length chart</h3>
              <form onSubmit={createWhyMeasurement} className="form">
                <label>
                  Label
                  <input
                    type="text"
                    value={newWhyMeasurement.label}
                    onChange={(event) =>
                      setNewWhyMeasurement((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder="Comparator name"
                  />
                </label>
                <label>
                  Length (cm)
                  <input
                    type="number"
                    step="0.01"
                    value={newWhyMeasurement.value_cm}
                    onChange={(event) =>
                      setNewWhyMeasurement((prev) => ({ ...prev, value_cm: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={newWhyMeasurement.color}
                    onChange={(event) =>
                      setNewWhyMeasurement((prev) => ({ ...prev, color: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    value={newWhyMeasurement.sort_order}
                    onChange={(event) =>
                      setNewWhyMeasurement((prev) => ({ ...prev, sort_order: event.target.value }))
                    }
                  />
                </label>
                <button type="submit">Add comparator</button>
              </form>
              {whyMeasurements.map((item) => (
                <div key={item.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label>
                      Label
                      <input
                        type="text"
                        value={item.label}
                        onChange={(event) => updateWhyMeasurementField(item.id, 'label', event.target.value)}
                      />
                    </label>
                    <label>
                      Length (cm)
                      <input
                        type="number"
                        step="0.01"
                        value={item.value_cm ?? 0}
                        onChange={(event) => updateWhyMeasurementField(item.id, 'value_cm', event.target.value)}
                      />
                    </label>
                    <label>
                      Color
                      <input
                        type="color"
                        value={item.color || '#0ea5a4'}
                        onChange={(event) => updateWhyMeasurementField(item.id, 'color', event.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={item.sort_order ?? 0}
                        onChange={(event) => updateWhyMeasurementField(item.id, 'sort_order', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => saveWhyMeasurement(item)}>Save</button>
                    <button type="button" className="danger" onClick={() => deleteWhyMeasurement(item.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {whyStatus && <p className="muted">{whyStatus}</p>}
          </section>
        )}
        {contextMenu.open && contextMenu.session && (
          <div className="session-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button
              type="button"
              onClick={() => {
                openSessionDetails(contextMenu.session);
                setContextMenu({ open: false, x: 0, y: 0, session: null });
              }}
            >
              View details
            </button>
            <button
              type="button"
              onClick={() => {
                startEditSession(contextMenu.session);
                setActiveTab('sessions');
                setContextMenu({ open: false, x: 0, y: 0, session: null });
              }}
            >
              Edit session
            </button>
            <button
              type="button"
              onClick={() => {
                openSessionChat(contextMenu.session);
                setContextMenu({ open: false, x: 0, y: 0, session: null });
              }}
            >
              Open chat
            </button>
            <button
              type="button"
              onClick={() => {
                openSessionCall(contextMenu.session);
                setContextMenu({ open: false, x: 0, y: 0, session: null });
              }}
            >
              Call client
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                deleteSession(contextMenu.session.id);
                setContextMenu({ open: false, x: 0, y: 0, session: null });
              }}
            >
              Delete session
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
