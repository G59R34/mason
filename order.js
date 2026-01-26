// order.js — handles order form and creates an announcement site-wide
// order.js — handles order form and creates an announcement site-wide
const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';
// Reuse a single client if already created to avoid GoTrue conflicts
const sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));

// placeOrder API: call with { name, email, plan, amount }
window.placeOrder = async function placeOrder({ name, email, plan, amount, customAnnouncement, booking } = {}) {
  if (!plan) throw new Error('missing plan');
  const payload = { customer_name: name || 'Guest', email: email || '', plan, amount: amount || null };
  const { error: oer, data: odata } = await sb.from('orders').insert([payload]).select('id').limit(1);
  if (oer) return { success: false, error: oer };
  const orderId = odata && odata[0] && odata[0].id;
  const announcementMessage = (customAnnouncement && String(customAnnouncement).trim())
    ? String(customAnnouncement).trim()
    : `New order: ${plan} by ${payload.customer_name}`;
  const { error: aerr } = await sb.from('announcements').insert([{ message: announcementMessage }]);
  if (aerr) return { success: false, orderId, error: aerr };
  // Create a session booking tied to this order
  try {
    const { data: userData } = await sb.auth.getUser();
    const user_id = userData && userData.user ? userData.user.id : null;
    const sessionPayload = {
      customer_name: payload.customer_name,
      contact: payload.email || (booking && booking.contact) || '',
      details: booking && booking.details ? booking.details : `Booked via pricing — ${plan}`,
      location: booking && booking.location ? booking.location : null,
      duration_minutes: booking && booking.duration_minutes ? booking.duration_minutes : null,
      price: amount || null,
      scheduled_for: booking && booking.scheduled_for ? booking.scheduled_for : null,
      status: 'requested',
      user_id
    };
    await sb.from('sessions').insert([sessionPayload]);
  } catch (e) {
    // ignore booking errors so order still succeeds
    console.warn('session booking failed', e);
  }

  return { success: true, orderId };
};

// If an order form exists on the page, wire it to use placeOrder
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('orderForm');
  const status = document.getElementById('status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const plan = document.getElementById('plan').value;
      const amount = document.getElementById('amount') ? parseFloat(document.getElementById('amount').value) : null;
      const customAnnouncement = document.getElementById('announcement') ? document.getElementById('announcement').value.trim() : null;
      if (!plan) return;
      if (status) status.textContent = 'Placing order...';
      const res = await window.placeOrder({ name, email, plan, amount, customAnnouncement });
      if (!res.success) {
        if (status) status.textContent = 'Order failed';
        console.error('order error', res.error);
        return;
      }
      if (status) status.textContent = 'Order placed — thank you!';
      form.reset();
    });
  }

  // Attach direct-order buttons (from pricing page)
    document.querySelectorAll('.place-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const plan = btn.dataset.plan || btn.innerText || 'Custom';
      const amount = btn.dataset.amount || null;
      const name = window.prompt('Your name (optional):', 'Guest') || 'Guest';
      const email = window.prompt('Email (optional, for receipt):', '') || '';
      const when = window.prompt('When do you want to book? (e.g. 2026-02-01 18:00)', '') || '';
      const duration = window.prompt('Session duration (minutes):', '60') || '';
      const location = window.prompt('Location (optional):', '') || '';
      const details = window.prompt('Notes / details (optional):', '') || '';
      const customAnnouncement = window.prompt('Custom announcement message to send site-wide (optional):', '') || '';
      try {
        btn.disabled = true;
        btn.textContent = 'Placing...';
        const booking = {
          scheduled_for: when || null,
          duration_minutes: duration ? Number(duration) : null,
          location: location || null,
          details: details || null,
          contact: email || null
        };
        const res = await window.placeOrder({ name, email, plan, amount, customAnnouncement, booking });
        if (res.success) {
          alert('Order placed — thank you!');
        } else {
          alert('Order failed. Check console for details.');
        }
      } catch (err) {
        console.error(err);
        alert('Unexpected error placing order');
      } finally {
        btn.disabled = false;
        btn.textContent = btn.getAttribute('data-label') || 'Order Now';
      }
    });
  });
});
