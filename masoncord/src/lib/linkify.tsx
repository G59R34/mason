import type { ReactNode } from 'react';

const URL_PART = /(https?:\/\/\S+|www\.\S+)/gi;

function hrefFor(part: string) {
  if (part.startsWith('http')) return part;
  return `https://${part}`;
}

function isUrlToken(s: string) {
  return /^https?:\/\//.test(s) || /^www\./.test(s);
}

export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_PART);
  return parts.map((part, i) => {
    if (part && isUrlToken(part)) {
      const href = hrefFor(part);
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="mc-msg-link">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
