import type { ReactNode } from 'react';

export function SectionIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-intro">
      <div className="section-intro__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-intro__title">{title}</h2>
        {lead ? <p className="muted section-intro__lead">{lead}</p> : null}
      </div>
      {children ? <div className="section-intro__aside">{children}</div> : null}
    </div>
  );
}
