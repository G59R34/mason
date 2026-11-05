import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SectionIntro } from '../components/SectionIntro';
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
    <div>
      <SectionIntro eyebrow="Contact" title="Talk to Mason" lead="Start a direct chat, or pick up where you left off." />

      <div className="contact-grid">
        <section className="card">
          <h3>Start a chat</h3>
          <p className="muted">Fast response • Clear communication • No fluff</p>
          <form className="form" onSubmit={startChat}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              required
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell Mason what you need..."
              aria-label="Message"
              required
              rows={5}
            />
            <button type="submit" className="btn btn--sm">
              Send &amp; open chat
            </button>
            {status && <p className="muted">{status}</p>}
          </form>
        </section>

        <aside className="card card--quiet">
          <h3>Already talking to Mason?</h3>
          <p className="muted">
            {storedId ? 'Continue your last conversation on this device.' : 'Use your saved conversation ID to jump back in.'}
          </p>
          {storedId && (
            <Link to={`/tickets?conversation=${encodeURIComponent(storedId)}`} className="btn btn--sm">
              Open saved conversation
            </Link>
          )}
          <details className="disclosure disclosure--flat">
            <summary>Resume with an ID</summary>
            <form className="form" onSubmit={resume}>
              <input name="conversationId" placeholder="Conversation ID" aria-label="Conversation ID" />
              <button type="submit" className="btn btn-ghost btn--sm">
                Open conversation
              </button>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
