import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { placeOrder } from '../lib/order';

type Plan = {
  title: string;
  price: string;
  price_subtitle?: string;
  features: string[] | string;
  cta_label?: string;
  cta_plan?: string;
  cta_amount?: number;
};

const fallback: Plan[] = [
  {
    title: 'Basic',
    price: '$2.50',
    price_subtitle: 'Per session',
    features: ['Will slap it around a bit', 'No bust is included'],
    cta_label: 'Book Basic',
    cta_plan: 'Basic',
    cta_amount: 2.5,
  },
  {
    title: 'The "Happy Ending" Special',
    price: '$5',
    price_subtitle: 'Per Stroke',
    features: ['Mason will get it done QUICK!', 'Max 10 Strokes'],
    cta_label: 'Book Happy Ending',
    cta_plan: 'Standard',
    cta_amount: 10,
  },
  {
    title: 'The "Finishing" Move',
    price: '$100',
    price_subtitle: 'Custom',
    features: ['Priority scheduling', 'Full Stroke Experience', 'Gauranteed Bust!'],
    cta_label: 'Book Finishing Move',
    cta_plan: 'Premium',
    cta_amount: 100,
  },
];

export function Pricing() {
  const [title, setTitle] = useState('Mason — Pricing');
  const [subtitle, setSubtitle] = useState('Low Quality Service, for a Low Low Price');
  const [customTitle, setCustomTitle] = useState('Need a custom session?');
  const [customBody, setCustomBody] = useState('Contact mason for volume discounts and enterprise offerings.');
  const [customCta, setCustomCta] = useState('Contact Sales');
  const [customUrl, setCustomUrl] = useState('/contact');
  const [plans, setPlans] = useState<Plan[]>(fallback);

  useEffect(() => {
    (async () => {
      try {
        const { data: pageData } = await supabase.from('pricing_page_content').select('*').limit(1);
        const page = pageData?.[0];
        if (page) {
          if (page.title) setTitle(page.title);
          if (page.subtitle) setSubtitle(page.subtitle);
          if (page.custom_title) setCustomTitle(page.custom_title);
          if (page.custom_body) setCustomBody(page.custom_body);
          if (page.custom_cta_label) setCustomCta(page.custom_cta_label);
          if (page.custom_cta_url) setCustomUrl(page.custom_cta_url);
        }
      } catch {
        /* ignore */
      }
      const { data } = await supabase.from('pricing_plans').select('*').order('sort_order', { ascending: true });
      if (data?.length) setPlans(data as Plan[]);
    })();
  }, []);

  async function book(plan: Plan) {
    const name = window.prompt('Your name (optional):', 'Guest') || 'Guest';
    const email = window.prompt('Email (optional):', '') || '';
    const when = window.prompt('When do you want to book? (e.g. 2026-02-01 18:00)', '') || '';
    const duration = window.prompt('Session duration (minutes):', '60') || '';
    const location = window.prompt('Location (optional):', '') || '';
    const details = window.prompt('Notes / details (optional):', '') || '';
    const customAnnouncement = window.prompt('Custom announcement message site-wide (optional):', '') || '';
    const res = await placeOrder({
      name,
      email,
      plan: plan.cta_plan || plan.title,
      amount: plan.cta_amount ?? null,
      customAnnouncement: customAnnouncement || undefined,
      booking: {
        contact: email,
        details: details || `Booked — ${plan.title}`,
        location: location || null,
        duration_minutes: duration ? parseInt(duration, 10) : null,
        scheduled_for: when || null,
      },
    });
    if (!res.success) alert('Order failed');
    else alert('Order placed — thank you!');
  }

  return (
    <>
      <section className="card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </section>
      <section className="grid section" aria-label="pricing plans">
        {plans.map((plan) => {
          const features = Array.isArray(plan.features)
            ? plan.features
            : String(plan.features || '')
                .split('\n')
                .filter(Boolean);
          return (
            <article key={plan.title} className="card">
              <h2>{plan.title}</h2>
              <div className="price">{plan.price}</div>
              <p className="muted">{plan.price_subtitle}</p>
              <ul className="muted">
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button type="button" className="btn" style={{ marginTop: 16, width: '100%' }} onClick={() => book(plan)}>
                {plan.cta_label || 'Book'}
              </button>
            </article>
          );
        })}
      </section>
      <section className="card section">
        <h3>{customTitle}</h3>
        <p className="muted">{customBody}</p>
        {customUrl.startsWith('http') ? (
          <a href={customUrl} className="btn btn-dark" style={{ marginTop: 12, display: 'inline-flex' }}>
            {customCta}
          </a>
        ) : (
          <Link to={customUrl || '/contact'} className="btn btn-dark" style={{ marginTop: 12 }}>
            {customCta}
          </Link>
        )}
      </section>
    </>
  );
}
