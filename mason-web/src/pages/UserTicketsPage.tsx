import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { addTicketIdToStorage, CURRENT_TICKET_KEY, CUSTOMER_NAME_KEY, TICKET_LIST_KEY } from '../lib/ticketStorage';

type ConversationRow = {
  id: string;
  customer_name: string | null;
  status: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender: string;
  body: string | null;
  sender_role: string | null;
  created_at: string;
};

function getTicketIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TICKET_LIST_KEY) || '[]').filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export function UserTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramConversation = searchParams.get('conversation');

  const [ticketIds, setTicketIds] = useState<string[]>(() => getTicketIds());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [nameDraft, setNameDraft] = useState(() => localStorage.getItem(CUSTOMER_NAME_KEY) || '');
  const [nameLocked] = useState(
    () => typeof window !== 'undefined' && Boolean(localStorage.getItem(CUSTOMER_NAME_KEY))
  );
  const [messageDraft, setMessageDraft] = useState('');
  const [typingHint, setTypingHint] = useState('');
  const [status, setStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closed = conversation?.status === 'closed';

  const syncUrl = useCallback(
    (id: string | null) => {
      if (id) {
        setSearchParams({ conversation: id }, { replace: true });
        localStorage.setItem(CURRENT_TICKET_KEY, id);
      } else {
        setSearchParams({}, { replace: true });
        localStorage.removeItem(CURRENT_TICKET_KEY);
      }
    },
    [setSearchParams]
  );

  useEffect(() => {
    const next = paramConversation ?? localStorage.getItem(CURRENT_TICKET_KEY);
    if (!next) {
      setCurrentId(null);
      return;
    }
    setCurrentId(next);
    addTicketIdToStorage(next);
    setTicketIds(getTicketIds());
    if (!paramConversation) {
      setSearchParams({ conversation: next }, { replace: true });
    }
  }, [paramConversation, setSearchParams]);

  useEffect(() => {
    if (!currentId) return;
    if (!getTicketIds().includes(currentId)) {
      addTicketIdToStorage(currentId);
      setTicketIds(getTicketIds());
    }
  }, [currentId]);

  const [ticketLabelMap, setTicketLabelMap] = useState<Map<string, ConversationRow>>(new Map());

  useEffect(() => {
    const ids = ticketIds;
    if (!ids.length) {
      setTicketLabelMap(new Map());
      return;
    }
    let cancelled = false;
    void supabase
      .from('conversations')
      .select('id,status,customer_name')
      .in('id', ids)
      .then(({ data }) => {
        if (cancelled) return;
        setTicketLabelMap(new Map((data || []).map((r) => [(r as ConversationRow).id, r as ConversationRow])));
      });
    return () => {
      cancelled = true;
    };
  }, [ticketIds]);

  const setupTypingChannel = useCallback((conversationId: string) => {
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    const ch = supabase
      .channel(`typing:conversation:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as { role?: string; typing?: boolean; name?: string };
        if (data.role === 'user') return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.typing) {
          setTypingHint(`${data.name || 'Staff'} is typing…`);
          typingTimeoutRef.current = setTimeout(() => setTypingHint(''), 2000);
        } else {
          setTypingHint('');
        }
      })
      .subscribe();
    typingChannelRef.current = ch;
  }, []);

  useEffect(() => {
    return () => {
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
    };
  }, []);

  const sendTyping = useCallback((conversationId: string, typing: boolean) => {
    const ch = typingChannelRef.current;
    if (!ch || !conversationId) return;
    ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { role: 'user', typing },
    });
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      setConversation(null);
      setStatus('Ticket not found.');
      return;
    }
    setConversation(data as ConversationRow);
    setStatus('');
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (error) {
      setMessages([]);
      return;
    }
    setMessages((data || []) as MessageRow[]);
  }, []);

  useEffect(() => {
    if (!currentId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    setupTypingChannel(currentId);
    void loadConversation(currentId);
    void loadMessages(currentId);
  }, [currentId, loadConversation, loadMessages, setupTypingChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!currentId) return;
    const sub = supabase
      .channel(`user-tickets-messages:${currentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_messages' },
        (payload) => {
          const m = payload.new as MessageRow;
          if (m.conversation_id === currentId) {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentId]);

  useEffect(() => {
    const sub = supabase
      .channel('user-tickets-convos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async (payload) => {
          const updatedId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          if (!updatedId) return;
          if (updatedId === currentId) void loadConversation(currentId);
          const ids = getTicketIds();
          if (ids.includes(updatedId)) {
            const { data } = await supabase.from('conversations').select('id,status,customer_name').in('id', ids);
            setTicketLabelMap(new Map((data || []).map((r) => [(r as ConversationRow).id, r as ConversationRow])));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentId, loadConversation]);

  useEffect(() => {
    if (currentId) setStatus('');
  }, [currentId]);

  const loadingTicket = Boolean(currentId && !conversation && status !== 'Ticket not found.');

  async function createNewTicket(): Promise<string | null> {
    const name = nameDraft.trim() || localStorage.getItem(CUSTOMER_NAME_KEY) || '';
    if (!name) {
      setStatus('Enter your name first.');
      return null;
    }
    const { data: cdata, error } = await supabase
      .from('conversations')
      .insert([{ customer_name: name, status: 'open' }])
      .select('id')
      .limit(1);
    if (error || !cdata?.[0]) {
      setStatus(error?.message || 'Could not create ticket.');
      return null;
    }
    const id = cdata[0].id as string;
    addTicketIdToStorage(id);
    localStorage.setItem(CUSTOMER_NAME_KEY, name);
    setCurrentId(id);
    syncUrl(id);
    setTicketIds(getTicketIds());
    setStatus('');
    return id;
  }

  function selectTicket(id: string) {
    setCurrentId(id);
    syncUrl(id);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const name = nameDraft.trim();
    const text = messageDraft.trim();
    if (!name || !text) return;
    if (closed) {
      setStatus('This ticket is closed. Start a new one.');
      return;
    }
    localStorage.setItem(CUSTOMER_NAME_KEY, name);
    let convId = currentId;
    if (!convId) {
      convId = await createNewTicket();
      if (!convId) return;
    }
    const { error } = await supabase.from('conversation_messages').insert([
      { conversation_id: convId, sender: name, body: text, sender_role: 'user' },
    ]);
    if (error) {
      setStatus(error.message);
      return;
    }
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
    setMessageDraft('');
    sendTyping(convId, false);
    await loadMessages(convId);
  }

  const onMessageInput = (v: string) => {
    setMessageDraft(v);
    if (!currentId) return;
    sendTyping(currentId, true);
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    localTypingTimeoutRef.current = setTimeout(() => currentId && sendTyping(currentId, false), 1200);
  };

  const ticketOptions = useMemo(() => {
    return ticketIds.map((id) => {
      const info = ticketLabelMap.get(id);
      const label = info
        ? `${info.customer_name || 'Ticket'} · ${info.status || 'open'}`
        : `Ticket ${id.slice(0, 8)}…`;
      return { id, label };
    });
  }, [ticketIds, ticketLabelMap]);

  return (
    <div className="portal-page tickets-page">
      <div className="portal-page-inner">
        <header className="portal-page-head">
          <p className="portal-eyebrow">Support</p>
          <h1>Your tickets</h1>
          <p className="muted portal-lead">
            Chat stays in the site — use the same saved list on this device as before.
          </p>
        </header>

        <div className="card tickets-toolbar">
          <label className="tickets-select-label">
            <span className="muted">Open ticket</span>
            <select
              value={currentId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                selectTicket(v);
              }}
            >
              {ticketOptions.length === 0 ? (
                <option value="">No tickets yet</option>
              ) : (
                ticketOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => void createNewTicket()}>
            New ticket
          </button>
          <Link to="/#contact" className="btn btn-ghost">
            Contact form
          </Link>
        </div>

        {status && <p className="muted tickets-status">{status}</p>}

        <div className="card tickets-thread">
          {loadingTicket && <p className="muted">Loading ticket…</p>}
          {currentId && conversation ? (
            <>
              <div className="tickets-thread-head">
                <div>
                  <h2 className="tickets-subject">Ticket {conversation.id}</h2>
                  <p className="muted tickets-meta">
                    Status: <strong>{conversation.status || 'open'}</strong>
                  </p>
                </div>
              </div>
              <ul className="tickets-messages" aria-live="polite">
                {messages.length === 0 && <li className="muted tickets-empty">No messages yet.</li>}
                {messages.map((m) => (
                  <li key={m.id} className={`tickets-msg ${m.sender_role === 'user' ? 'tickets-msg--user' : ''}`}>
                    <div className="tickets-msg-meta">
                      {m.sender} · {new Date(m.created_at).toLocaleString()}
                      {m.sender_role ? ` · ${m.sender_role}` : ''}
                    </div>
                    <div className="tickets-msg-body">{m.body || ''}</div>
                  </li>
                ))}
                <div ref={messagesEndRef} />
              </ul>
              {typingHint && <p className="tickets-typing muted">{typingHint}</p>}
              <form className="form tickets-reply" onSubmit={sendReply}>
                <label>
                  Your name
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Name"
                    required
                    readOnly={nameLocked}
                  />
                </label>
                <label>
                  Message
                  <textarea
                    value={messageDraft}
                    onChange={(e) => onMessageInput(e.target.value)}
                    onBlur={() => currentId && sendTyping(currentId, false)}
                    placeholder={closed ? 'Ticket closed' : 'Write a message…'}
                    rows={3}
                    disabled={closed}
                    required
                  />
                </label>
                <button type="submit" className="btn" disabled={closed}>
                  Send
                </button>
              </form>
            </>
          ) : !currentId ? (
            <p className="muted">
              No ticket selected. Start from the{' '}
              <Link to="/#contact">contact</Link> section, use <strong>New ticket</strong> above, or resume with a
              conversation ID you already have (add <code>?conversation=…</code> to this page’s URL).
            </p>
          ) : status === 'Ticket not found.' ? (
            <p className="muted">{status}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
