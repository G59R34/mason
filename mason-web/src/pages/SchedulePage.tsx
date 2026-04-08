import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/** Columns exposed by session_schedule_public / public schedule queries */
export type PublicSessionRow = {
  id: string;
  customer_name: string | null;
  contact: string | null;
  details: string | null;
  location: string | null;
  duration_minutes: number | null;
  price: number | string | null;
  scheduled_for: string;
  status: string;
  staff_name: string | null;
  session_type?: string | null;
  created_at?: string | null;
};

const SCHEDULE_SELECT =
  'id, customer_name, contact, details, location, duration_minutes, price, scheduled_for, status, staff_name, session_type, created_at';

function startOfLocalDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endHorizon(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 9);
  return d;
}

function formatDayHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  const s = status || 'requested';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'approved') return 'Approved';
  if (s === 'requested') return 'Requested';
  if (s === 'denied') return 'Denied';
  return s;
}

function formatPrice(p: number | string | null | undefined): string | null {
  if (p == null || p === '') return null;
  const n = typeof p === 'string' ? parseFloat(p) : Number(p);
  if (Number.isNaN(n)) return String(p);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function SchedulePage() {
  const [rows, setRows] = useState<PublicSessionRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoadError(null);
    const from = startOfLocalDay().toISOString();
    const to = endHorizon().toISOString();

    const base = supabase
      .from('session_schedule_public')
      .select(SCHEDULE_SELECT)
      .gte('scheduled_for', from)
      .lte('scheduled_for', to)
      .order('scheduled_for', { ascending: true });

    const first = await base;
    let rowsOut: PublicSessionRow[];

    if (first.error) {
      const full = await supabase
        .from('sessions')
        .select(SCHEDULE_SELECT)
        .not('scheduled_for', 'is', null)
        .not('status', 'eq', 'denied')
        .gte('scheduled_for', from)
        .lte('scheduled_for', to)
        .order('scheduled_for', { ascending: true });

      if (!full.error && full.data) {
        rowsOut = full.data as PublicSessionRow[];
      } else {
        const minimal = await supabase
          .from('sessions')
          .select(
            'id, customer_name, contact, details, location, duration_minutes, price, scheduled_for, status, staff_name, created_at'
          )
          .not('scheduled_for', 'is', null)
          .not('status', 'eq', 'denied')
          .gte('scheduled_for', from)
          .lte('scheduled_for', to)
          .order('scheduled_for', { ascending: true });

        if (minimal.error) {
          setLoadError(
            minimal.error.message ||
              full.error?.message ||
              first.error.message ||
              'Could not load schedule. Run sessions_schedule_public_view.sql or check Supabase policies.'
          );
          setRows([]);
          setLoading(false);
          return;
        }
        rowsOut = (minimal.data || []).map((r) => ({ ...r, session_type: null as string | null })) as PublicSessionRow[];
      }
    } else {
      rowsOut = (first.data || []) as PublicSessionRow[];
    }

    rowsOut = rowsOut.filter((r) => (r.status || '').toLowerCase() !== 'denied');

    setRows(rowsOut);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('mason_public_schedule')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, PublicSessionRow[]>();
    for (const row of rows) {
      const dayKey = new Date(row.scheduled_for).toDateString();
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(row);
    }
    return map;
  }, [rows]);

  const dayKeys = useMemo(() => Array.from(byDay.keys()), [byDay]);

  return (
    <div className="schedule-page">
      <div className="schedule-page-inner">
        <header className="schedule-page-head">
          <p className="schedule-page-eyebrow">Live calendar</p>
          <h1>Session schedule</h1>
          <p className="schedule-page-lead muted">
            Upcoming sessions with full details. Times are in your local timezone. The list refreshes when sessions change.
          </p>
          <div className="schedule-page-actions">
            <Link to="/order" className="btn">
              Book a session
            </Link>
            <Link to="/#contact" className="btn btn-ghost">
              Contact
            </Link>
          </div>
        </header>

        {loading && <p className="muted schedule-page-status">Loading schedule…</p>}
        {!loading && loadError && (
          <div className="schedule-page-error" role="alert">
            {loadError}
          </div>
        )}
        {!loading && !loadError && rows.length === 0 && (
          <p className="schedule-page-empty muted">No upcoming sessions on the calendar yet. Check back soon.</p>
        )}

        {!loading && !loadError && dayKeys.length > 0 && (
          <div className="schedule-days">
            {dayKeys.map((dayKey) => {
              const list = byDay.get(dayKey)!;
              const first = list[0];
              return (
                <section key={dayKey} className="schedule-day" aria-labelledby={`day-${dayKey}`}>
                  <h2 id={`day-${dayKey}`} className="schedule-day-title">
                    {formatDayHeading(first.scheduled_for)}
                  </h2>
                  <ul className="schedule-list">
                    {list.map((s) => {
                      const priceStr = formatPrice(s.price);
                      return (
                        <li key={s.id} className="schedule-card">
                          <div className="schedule-card-time">{formatTime(s.scheduled_for)}</div>
                          <div className="schedule-card-body">
                            <p className="schedule-card-client">
                              {s.customer_name?.trim() || 'Session'}
                            </p>
                            <div className="schedule-card-row">
                              <span className={`schedule-status schedule-status--${s.status || 'requested'}`}>
                                {statusLabel(s.status)}
                              </span>
                              {s.session_type?.trim() ? (
                                <span className="schedule-type">{s.session_type}</span>
                              ) : null}
                            </div>
                            <dl className="schedule-dl">
                              {s.staff_name && s.staff_name !== 'Unassigned' ? (
                                <>
                                  <dt>Staff</dt>
                                  <dd>{s.staff_name}</dd>
                                </>
                              ) : null}
                              {s.duration_minutes != null ? (
                                <>
                                  <dt>Duration</dt>
                                  <dd>{s.duration_minutes} min</dd>
                                </>
                              ) : null}
                              {priceStr ? (
                                <>
                                  <dt>Price</dt>
                                  <dd>{priceStr}</dd>
                                </>
                              ) : null}
                              {s.location?.trim() ? (
                                <>
                                  <dt>Location</dt>
                                  <dd>{s.location}</dd>
                                </>
                              ) : null}
                              {s.contact?.trim() ? (
                                <>
                                  <dt>Contact</dt>
                                  <dd>{s.contact}</dd>
                                </>
                              ) : null}
                              {s.details?.trim() ? (
                                <>
                                  <dt>Details</dt>
                                  <dd className="schedule-details-text">{s.details}</dd>
                                </>
                              ) : null}
                              {s.created_at ? (
                                <>
                                  <dt>Booked</dt>
                                  <dd className="muted">{formatDateTime(s.created_at)}</dd>
                                </>
                              ) : null}
                            </dl>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
