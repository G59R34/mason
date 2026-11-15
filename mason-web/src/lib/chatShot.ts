import type { MasonBotMessage } from './masonBot';

/**
 * Renders the chat transcript to a JPEG data URL so the review can carry a
 * picture of the conversation. Drawn by hand rather than via a DOM screenshot
 * library: no new dependency, no webfont/CORS trouble, and it always fits the
 * panel width.
 */

const WIDTH = 620;
const PAD = 22;
const HEADER_H = 62;
const FOOTER_H = 34;
const MAX_BUBBLE = Math.floor(WIDTH * 0.76);
const LINE_H = 21;
const FONT_SIZE = 15;
const FONT = `${FONT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
const MAX_MESSAGES = 12;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function renderConversationShot(messages: MasonBotMessage[]): Promise<string | null> {
  const recent = messages.slice(-MAX_MESSAGES);
  if (!recent.length) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = FONT;

  const bubblePadX = 14;
  const bubblePadY = 10;
  const laidOut = recent.map((m) => {
    const lines = wrap(ctx, m.content, MAX_BUBBLE - bubblePadX * 2);
    return { role: m.role, lines, height: lines.length * LINE_H + bubblePadY * 2 };
  });

  const gap = 10;
  const bodyH = laidOut.reduce((sum, b) => sum + b.height + gap, 0);
  const height = HEADER_H + PAD + bodyH + PAD + FOOTER_H;

  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = Math.ceil(height) * scale;
  ctx.scale(scale, scale);

  // Background + window chrome
  ctx.fillStyle = '#101014';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = '#16101f';
  ctx.fillRect(0, 0, WIDTH, HEADER_H);

  ctx.fillStyle = '#c4b5fd';
  ctx.beginPath();
  ctx.arc(PAD + 16, HEADER_H / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0b0d';
  ctx.font = `bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MB', PAD + 16, HEADER_H / 2 + 4);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#f4f4f5';
  ctx.font = `bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.fillText('Mason Bot', PAD + 44, HEADER_H / 2 - 1);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `12px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.fillText('Replies instantly. Not Mason.', PAD + 44, HEADER_H / 2 + 16);

  // Bubbles
  let y = HEADER_H + PAD;
  ctx.font = FONT;
  for (const bubble of laidOut) {
    const bubbleW = Math.min(
      MAX_BUBBLE,
      Math.max(...bubble.lines.map((l) => ctx.measureText(l).width), 40) + bubblePadX * 2,
    );
    const isUser = bubble.role === 'user';
    const x = isUser ? WIDTH - PAD - bubbleW : PAD;

    ctx.fillStyle = isUser ? '#2a1d47' : '#1b1b21';
    ctx.strokeStyle = isUser ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + bubbleW - r, y);
    ctx.quadraticCurveTo(x + bubbleW, y, x + bubbleW, y + r);
    ctx.lineTo(x + bubbleW, y + bubble.height - r);
    ctx.quadraticCurveTo(x + bubbleW, y + bubble.height, x + bubbleW - r, y + bubble.height);
    ctx.lineTo(x + r, y + bubble.height);
    ctx.quadraticCurveTo(x, y + bubble.height, x, y + bubble.height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isUser ? '#ede9fe' : '#e4e4e7';
    bubble.lines.forEach((line, i) => {
      ctx.fillText(line, x + bubblePadX, y + bubblePadY + LINE_H * i + FONT_SIZE);
    });

    y += bubble.height + gap;
  }

  // Footer watermark
  ctx.fillStyle = '#71717a';
  ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.fillText('sexwithmason.com · Mason Bot chat log', PAD, height - 12);

  return canvas.toDataURL('image/jpeg', 0.82);
}
