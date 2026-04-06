import { useCallback, useEffect, useState } from 'react';
import { getSeenAnnouncementIds, markAnnouncementSeen } from '../lib/announcementStorage';
import { supabase } from '../lib/supabase';

type Row = {
  id: string;
  message: string | null;
  created_at: string | null;
  is_static?: boolean | null;
};

function formatTime(ts: string | null) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export function FloatingAnnouncement() {
  const [current, setCurrent] = useState<Row | null>(null);

  const pickNext = useCallback((rows: Row[]) => {
    const seen = new Set(getSeenAnnouncementIds());
    const next = rows.find((a) => !a.is_static && a.id && !seen.has(a.id));
    setCurrent(next || null);
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id,message,created_at,is_static')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        console.warn('floating announcements', error);
        return;
      }
      pickNext((data || []) as Row[]);
    } catch (e) {
      console.warn('floating announcements load failed', e);
    }
  }, [pickNext]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('floating_announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  useEffect(() => {
    if (current?.id) {
      markAnnouncementSeen(current.id);
    }
  }, [current?.id]);

  if (!current?.message?.trim()) return null;

  function dismiss() {
    setCurrent(null);
  }

  return (
    <div className="floating-announcement" role="status">
      <div className="floating-announcement-inner">
        <div className="floating-announcement-body">
          <strong className="floating-announcement-title">{current.message.trim()}</strong>
          <div className="floating-announcement-meta">Posted {formatTime(current.created_at)}</div>
        </div>
        <div className="floating-announcement-actions">
          <button type="button" className="btn btn-ghost floating-announcement-btn" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
