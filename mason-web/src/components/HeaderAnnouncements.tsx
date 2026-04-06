import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type StaticAnnouncement = {
  id: string;
  message: string | null;
  label?: string | null;
  color?: string | null;
};

export function HeaderAnnouncements() {
  const [item, setItem] = useState<StaticAnnouncement | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id,message,label,color,is_static,created_at')
        .eq('is_static', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        if (error.message?.includes('is_static') || error.code === '42703') {
          setItem(null);
          return;
        }
        console.warn('static announcements', error);
        setItem(null);
        return;
      }
      const row = data?.[0];
      if (row?.message) {
        setItem({
          id: String(row.id),
          message: row.message,
          label: row.label,
          color: row.color,
        });
      } else {
        setItem(null);
      }
    } catch (e) {
      console.warn('static announcements load failed', e);
      setItem(null);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('header_announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  if (!item?.message?.trim()) return null;

  const label = (item.label || 'NOTICE').trim();
  const bg = item.color?.trim() || '';
  const useCustom = bg.length > 0 && /^(#|rgb|hsla?\(|hsl\()/i.test(bg);

  return (
    <div className="header-announcements" aria-live="polite">
      <div
        className={`header-ann-bar ${useCustom ? 'header-ann-bar--custom' : ''}`}
        style={useCustom ? { background: bg } : undefined}
      >
        <span className="header-ann-pill">{label}</span>
        <span className="header-ann-text">{item.message.trim()}</span>
      </div>
    </div>
  );
}
