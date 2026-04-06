import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  scale,
  onUnitChange,
  onScaleChange,
}: {
  data: Measurement[];
  unit: 'cm' | 'in';
  scale: number;
  onUnitChange: (u: 'cm' | 'in') => void;
  onScaleChange: (s: number) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const bars = useMemo(() => {
    const rows = data.map((item) => ({
      label: item.label,
      valueCm: Number(item.value_cm),
      color: item.color || '#0ea5a4',
    }));
    if (!rows.length) return { rows: [] as typeof rows, maxValue: 0.00001, scaleFactor: 1 };
    const maxValue = Math.max(...rows.map((d) => d.valueCm), 0.00001);
    const width = 880;
    const scaleFactor = (width - 160) / (maxValue * scale);
    return { rows, maxValue, scaleFactor };
  }, [data, scale]);

  return (
    <section className="chart-card" aria-label="Weiner length comparison">
      <div className="chart-header">
        <div>
          <h2>Weiner length comparison</h2>
          <p className="muted">Compare Mason, an ant, and an average human. Hover or tap the bars.</p>
        </div>
        <div className="chart-controls">
          <label className="toggle">
            Units:
            <select value={unit} onChange={(e) => onUnitChange(e.target.value as 'cm' | 'in')}>
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
          <label>
            Zoom
            <input type="range" min={1} max={5} step={0.1} value={scale} onChange={(e) => onScaleChange(Number(e.target.value))} />
          </label>
        </div>
      </div>
      <div className="chart-area" style={{ position: 'relative' }}>
        <svg
          width="100%"
          height="240"
          viewBox="0 0 900 240"
          role="img"
          aria-label="Length chart"
          onMouseLeave={() => setTip(null)}
        >
          {bars.rows.map((d, i) => {
            const barHeight = 38;
            const gap = 20;
            const y = 20 + i * (barHeight + gap);
            const value = toUnit(d.valueCm, unit);
            const barWidth = Math.max(6, d.valueCm * bars.scaleFactor);
            return (
              <g key={d.label + i}>
                <text x={0} y={y + 26} fill="#fafafa" fontSize={15} fontFamily="DM Sans, system-ui, sans-serif">
                  {d.label}
                </text>
                <rect
                  x={140}
                  y={y}
                  rx={12}
                  ry={12}
                  width={barWidth}
                  height={barHeight}
                  fill={d.color}
                  style={{ cursor: 'pointer', transition: 'width 0.4s ease' }}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setTip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: `${d.label}: ${formatValue(value, unit)}`,
                    });
                  }}
                  onClick={(e) => {
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setTip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: `${d.label}: ${formatValue(value, unit)}`,
                    });
                  }}
                />
                <text x={140 + barWidth + 12} y={y + 26} fill="#a1a1aa" fontSize={14} fontFamily="DM Sans, system-ui, sans-serif">
                  {formatValue(value, unit)}
                </text>
              </g>
            );
          })}
        </svg>
        {tip && (
          <div
            className="tooltip show"
            style={{
              position: 'absolute',
              left: tip.x,
              top: tip.y,
              pointerEvents: 'none',
            }}
          >
            {tip.text}
          </div>
        )}
      </div>
      <div className="chart-legend">
        {bars.rows.map((d) => (
          <span key={d.label} className="legend-pill">
            <span className="legend-dot" style={{ background: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function WhyPage() {
  const [cards, setCards] = useState<ValueCard[]>(fallbackCards);
  const [quotes, setQuotes] = useState<Quote[]>(fallbackQuotes);
  const [chartItems, setChartItems] = useState<Measurement[]>(fallbackChart);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [scale, setScale] = useState(1.8);

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
    <>
      <section className="card hero">
        <div>
          <div className="eyebrow">Why Mason</div>
          <h1>Why Mason?</h1>
          <p>Mason Wants To FUCK</p>
          <div className="pill">Slow Ass response • No communication • Straight Business</div>
        </div>
        <div className="stats">
          <div className="stat-card">
            <strong>4 to 12 Business Days</strong>
            Average response time
          </div>
          <div className="stat-card">
            <strong>3%</strong>
            Happy clients
          </div>
          <div className="stat-card">
            <strong>12700+</strong>
            Sessions delivered
          </div>
        </div>
      </section>

      <section className="section">
        <h2>What clients value most</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {cards.map((c, i) => (
            <div key={i} className="card">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section client-quotes">
        <h2>Client quotes</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {quotes.map((q, i) => (
            <blockquote key={i} className="quote">
              <p>{q.quote}</p>
              <cite>— {q.author}</cite>
            </blockquote>
          ))}
        </div>
      </section>

      <WhyChart data={chartItems} unit={unit} scale={scale} onUnitChange={setUnit} onScaleChange={setScale} />

      <section className="cta-banner">
        <div>Want Mason to FUCK you? book a session.</div>
        <Link to="/pricing">View Pricing</Link>
      </section>
    </>
  );
}
