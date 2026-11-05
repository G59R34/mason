import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionIntro } from '../components/SectionIntro';
import { supabase } from '../lib/supabase';

type ValueCard = { title: string; body: string };
type Quote = { quote: string; author: string };
type Measurement = { label: string; value_cm: number; color: string };

const fallbackCards: ValueCard[] = [
  { title: 'Some good top', body: 'Clear expectations and straight gagging from day one.' },
  { title: 'Hands-on quality', body: 'Every detail gets personal attention and fast iteration.' },
  { title: 'Partial follow-through', body: 'Finishes sometimes' },
];

const fallbackQuotes: Quote[] = [
  { quote: '"Your quote here."', author: 'Client Name, Company/Role' },
  { quote: '"Your quote here."', author: 'Client Name, Company/Role' },
  { quote: '"Your quote here."', author: 'Client Name, Company/Role' },
];

const fallbackChart: Measurement[] = [
  { label: 'Mason', value_cm: 0.1, color: '#0ea5a4' },
  { label: 'Average human', value_cm: 13, color: '#6366f1' },
  { label: 'Ant', value_cm: 0.3, color: '#f97316' },
  { label: 'Molecular Atom', value_cm: 0.00001, color: '#f43f5e' },
];

function toUnit(cm: number, unit: 'cm' | 'in') {
  return unit === 'in' ? cm / 2.54 : cm;
}

function formatValue(val: number, unit: 'cm' | 'in') {
  return `${val.toFixed(unit === 'in' ? 2 : 1)} ${unit}`;
}

function WhyChart({
  data,
  unit,
  onUnitChange,
}: {
  data: Measurement[];
  unit: 'cm' | 'in';
  onUnitChange: (u: 'cm' | 'in') => void;
}) {
  const maxValue = Math.max(...data.map((d) => Number(d.value_cm) || 0), 0.00001);

  return (
    <section className="chart-card" aria-label="Weiner length comparison">
      <div className="chart-card__head">
        <div>
          <h3>Weiner length comparison</h3>
          <p className="muted">Mason, an ant, and an average human.</p>
        </div>
        <label className="field-inline">
          <span>Units</span>
          <select value={unit} onChange={(e) => onUnitChange(e.target.value as 'cm' | 'in')}>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </label>
      </div>

      <ul className="bar-chart">
        {data.map((item) => {
          const valueCm = Number(item.value_cm) || 0;
          const pct = Math.max(1.5, (valueCm / maxValue) * 100);
          return (
            <li key={item.label} className="bar-chart__row">
              <span className="bar-chart__label">{item.label}</span>
              <span className="bar-chart__track">
                <span className="bar-chart__fill" style={{ width: `${pct}%`, background: item.color || '#8b5cf6' }} />
              </span>
              <span className="bar-chart__value">{formatValue(toUnit(valueCm, unit), unit)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WhyPage() {
  const [cards, setCards] = useState<ValueCard[]>(fallbackCards);
  const [quotes, setQuotes] = useState<Quote[]>(fallbackQuotes);
  const [chartItems, setChartItems] = useState<Measurement[]>(fallbackChart);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const load = useCallback(async () => {
    let nextCards = fallbackCards;
    let nextQuotes = fallbackQuotes;
    let nextChart = fallbackChart;

    const { data: cardData } = await supabase
      .from('why_value_cards')
      .select('title,body,sort_order,created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (cardData?.length) nextCards = cardData as ValueCard[];

    const { data: quoteData } = await supabase
      .from('why_quotes')
      .select('quote,author,sort_order,created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (quoteData?.length) nextQuotes = quoteData as Quote[];

    const { data: measurementData } = await supabase
      .from('why_measurements')
      .select('label,value_cm,color,sort_order,created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (measurementData?.length) {
      nextChart = measurementData.map((r: { label: string; value_cm: number; color: string }) => ({
        label: r.label,
        value_cm: Number(r.value_cm),
        color: r.color || '#0ea5a4',
      }));
    }

    setCards(nextCards);
    setQuotes(nextQuotes);
    setChartItems(nextChart);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <SectionIntro eyebrow="Why Mason" title="Why Mason?" lead="Mason wants to FUCK." />

      <p className="tag-line">Slow ass response • No communication • Straight business</p>

      <dl className="facts">
        <div>
          <dt>Average response time</dt>
          <dd>4 to 12 business days</dd>
        </div>
        <div>
          <dt>Happy clients</dt>
          <dd>3%</dd>
        </div>
        <div>
          <dt>Sessions delivered</dt>
          <dd>12,700+</dd>
        </div>
      </dl>

      <section className="section">
        <h3 className="subhead">What clients value most</h3>
        <ul className="tile-grid">
          {cards.map((c, i) => (
            <li key={`${c.title}-${i}`} className="tile">
              <h4>{c.title}</h4>
              <p className="muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3 className="subhead">Client quotes</h3>
        <ul className="tile-grid">
          {quotes.map((q, i) => (
            <li key={`${q.author}-${i}`} className="tile tile--quote">
              <blockquote>
                <p>{q.quote}</p>
                <cite>— {q.author}</cite>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>

      <WhyChart data={chartItems} unit={unit} onUnitChange={setUnit} />

      <div className="cta-band">
        <p>Want Mason to FUCK you? Book a session.</p>
        <Link to={{ pathname: '/', hash: 'pricing' }} className="btn">
          View pricing
        </Link>
      </div>
    </div>
  );
}
