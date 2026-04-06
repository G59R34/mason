import type { CSSProperties } from 'react';

/** Deterministic hue from user id for avatar backgrounds */
export function avatarHue(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) % 360;
  }
  return h;
}

export function avatarStyle(userId: string): CSSProperties {
  const h = avatarHue(userId);
  return {
    background: `linear-gradient(135deg, hsl(${h}, 55%, 42%) 0%, hsl(${(h + 40) % 360}, 50%, 32%) 100%)`,
  };
}
