import { supabase } from './supabase';

export async function placeOrder(opts: {
  name?: string;
  email?: string;
  plan: string;
  amount?: number | null;
  customAnnouncement?: string;
  booking?: {
    contact?: string;
    details?: string;
    location?: string | null;
    duration_minutes?: number | null;
    scheduled_for?: string | null;
  };
}) {
  const { name, email, plan, amount, customAnnouncement, booking } = opts;
  if (!plan) throw new Error('missing plan');
  const payload = {
    customer_name: name || 'Guest',
    email: email || '',
    plan,
    amount: amount ?? null,
  };
  const { error: oer, data: odata } = await supabase.from('orders').insert([payload]).select('id').limit(1);
  if (oer) return { success: false as const, error: oer };
  const orderId = odata?.[0]?.id;
  const announcementMessage =
    customAnnouncement?.trim() || `New order: ${plan} by ${payload.customer_name}`;
  const { error: aerr } = await supabase.from('announcements').insert([{ message: announcementMessage }]);
  if (aerr) return { success: false as const, orderId, error: aerr };

  try {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id ?? null;
    await supabase.from('sessions').insert([
      {
        customer_name: payload.customer_name,
        contact: email || booking?.contact || '',
        details: booking?.details ?? `Booked via pricing — ${plan}`,
        location: booking?.location ?? null,
        duration_minutes: booking?.duration_minutes ?? null,
        price: amount ?? null,
        scheduled_for: booking?.scheduled_for ?? null,
        status: 'requested',
        user_id,
      },
    ]);
  } catch {
    // non-fatal
  }

  return { success: true as const, orderId };
}
