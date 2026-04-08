import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addTicketIdToStorage, CURRENT_TICKET_KEY, CUSTOMER_NAME_KEY } from '../lib/ticketStorage';
import { supabase } from '../lib/supabase';

export function ContactPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [storedId] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_TICKET_KEY) : null
  );

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setStatus('Sending...');
    const { data: cdata, error: cerr } = await supabase
      .from('conversations')
      .insert([{ customer_name: name.trim() }])
      .select('id')
      .limit(1);
    if (cerr || !cdata?.[0]) {
      setStatus('Could not create conversation.');
      return;
    }
    const cid = cdata[0].id as string;
    localStorage.setItem(CURRENT_TICKET_KEY, cid);
    localStorage.setItem(CUSTOMER_NAME_KEY, name.trim());
    addTicketIdToStorage(cid);
    const { error: merr } = await supabase.from('conversation_messages').insert([
      { conversation_id: cid, sender: name.trim(), body: message.trim(), sender_role: 'user' },
    ]);
    if (merr) {
      setStatus('Conversation created but message failed.');
      return;
    }
    setStatus('');
    navigate(`/tickets?conversation=${encodeURIComponent(cid)}`, { replace: true });
  }

  function resume(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const id = String(fd.get('conversationId') || '').trim();
    if (!id) return;
    addTicketIdToStorage(id);
    navigate(`/tickets?conversation=${encodeURIComponent(id)}`);
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <section className="card">
        <h2>Contact Mason</h2>
        <p className="muted">Start a direct chat, or pick up where you left off.</p>
        <div className="pill" style={{ marginTop: 12 }}>
          Fast response • Clear communication • No fluff
        </div>
      </section>
      <section className="card">
        <h2>Start a chat</h2>
        <form className="form" onSubmit={startChat}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell Mason what you need..."
            required
            rows={5}
          />
          <button type="submit" className="btn">
            Send & Open Chat
          </button>
          {status && <p className="muted">{status}</p>}
        </form>
      </section>
      <section className="card">
        <h2>Resume a conversation</h2>
        <p className="muted">Use your saved conversation link or ID.</p>
        <form className="form" onSubmit={resume}>
          <input name="conversationId" placeholder="Conversation ID" />
          <button type="submit" className="btn">
            Open Conversation
          </button>
        </form>
        <p className="muted" style={{ marginTop: 8 }}>
          {storedId ? `Saved conversation: ${storedId}` : 'No saved conversation on this device yet.'}
        </p>
        {storedId && (
          <Link
            to={`/tickets?conversation=${encodeURIComponent(storedId)}`}
            className="btn btn-ghost"
            style={{ marginTop: 8, display: 'inline-flex' }}
          >
            Open saved conversation
          </Link>
        )}
      </section>
    </div>
  );
}
