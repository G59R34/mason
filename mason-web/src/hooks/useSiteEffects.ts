import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type MaintenanceState = boolean;
type BlockModal = {
  enabled: boolean;
  title?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
};

/** Footer Masoncord link when site_settings + env are unset */
export const DEFAULT_MASONCORD_PUBLIC_URL = 'https://cord.sexwithmason.com';

export function useSiteEffects() {
  const [maintenance, setMaintenance] = useState<MaintenanceState>(false);
  const [blockModal, setBlockModal] = useState<BlockModal | null>(null);
  const [masoncordPublicUrl, setMasoncordPublicUrl] = useState('');

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;

    async function apply() {
      const { data } = await supabase
        .from('site_settings')
        .select('key,value')
        .in('key', ['maintenance_mode', 'admin_block_modal', 'masoncord_url']);

      const map = new Map((data || []).map((r) => [r.key, r.value]));
      setMaintenance(Boolean(map.get('maintenance_mode')?.enabled));
      const bm = map.get('admin_block_modal') as BlockModal | undefined;
      if (bm?.enabled) setBlockModal(bm);
      else setBlockModal(null);

      const cordRaw = map.get('masoncord_url') as { url?: string } | undefined;
      const cord = typeof cordRaw?.url === 'string' ? cordRaw.url.trim() : '';
      setMasoncordPublicUrl(cord);
    }

    apply();

    ch = supabase
      .channel('site_settings_public')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload) => {
          const key = (payload.new as { key?: string })?.key || (payload.old as { key?: string })?.key;
          if (key === 'maintenance_mode') {
            setMaintenance(Boolean((payload.new as { value?: { enabled?: boolean } })?.value?.enabled));
          }
          if (key === 'admin_block_modal') {
            const v = (payload.new as { value?: BlockModal })?.value;
            if (v?.enabled) setBlockModal(v);
            else setBlockModal(null);
          }
          if (key === 'masoncord_url') {
            const v = (payload.new as { value?: { url?: string } })?.value;
            const u = typeof v?.url === 'string' ? v.url.trim() : '';
            setMasoncordPublicUrl(u);
          }
        }
      )
      .subscribe();

    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  return { maintenance, blockModal, masoncordPublicUrl };
}
