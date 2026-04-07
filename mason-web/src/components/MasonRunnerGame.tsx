import { useCallback, useEffect, useRef, useState } from 'react';
import cactusUrl from '../assets/dinocactus.png';

type GamePhase = 'idle' | 'playing' | 'dead';

const REF_W = 960;
const REF_H = 360;

const GRAVITY = 0.88;
const JUMP_V = -16.1;
const BASE_SPEED = 7.8;
const MAX_SPEED = 17.5;
const MIN_GAP = 160;
const MAX_GAP = 780;

type Obstacle = { x: number; w: number; h: number };

function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  pad = 0.1
) {
  const px = aw * pad;
  const py = ah * pad;
  const qx = bw * pad;
  const qy = bh * pad;
  return ax + px < bx + bw - qx && ax + aw - px > bx + qx && ay + py < by + bh - qy && ay + ah - py > by + qy;
}

function rollGapPx(wScale: number) {
  const s = Math.max(0.45, wScale);
  const u = Math.random();
  if (u < 0.18) {
    return (MIN_GAP + Math.random() * 120) * s;
  }
  if (u > 0.85) {
    return (560 + Math.random() * (MAX_GAP - 560)) * s;
  }
  return (220 + Math.random() * 380) * s;
}

/** Tighter than draw rect so near-misses feel fair (Chrome-style). */
function cactusHitbox(o: Obstacle, groundY: number) {
  const oy = groundY - o.h;
  const ix = o.w * 0.14;
  const topTrim = o.h * 0.1;
  const bottomTrim = o.h * 0.04;
  return {
    x: o.x + ix,
    y: oy + topTrim,
    w: o.w - ix * 2,
    h: o.h - topTrim - bottomTrim,
  };
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function MasonRunnerGame({
  onScoreUpdate,
  onGameOver,
}: {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<GamePhase>('idle');
  const rafRef = useRef<number>(0);
  const imgCactus = useRef<HTMLImageElement | null>(null);
  const [hudScore, setHudScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [hintPulse, setHintPulse] = useState(true);
  const lastHudRef = useRef(-1);
  const [remount, setRemount] = useState(0);

  const loadCactus = useCallback(() => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.src = cactusUrl;
    im.onload = () => {
      imgCactus.current = im;
    };
    im.onerror = () => {
      imgCactus.current = null;
    };
  }, []);

  useEffect(() => {
    loadCactus();
  }, [loadCactus]);

  useEffect(() => {
    const t = window.setInterval(() => setHintPulse((p) => !p), 880);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = ctx;

    let W = 960;
    let H = 360;
    let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let groundY = H - 88;
    let playerX = 140;
    let playerW = 52;
    let playerH = 62;
    let playerY = groundY - playerH;
    let vy = 0;
    let grounded = true;
    let obstacles: Obstacle[] = [];
    let speed = BASE_SPEED;
    let distance = 0;
    let frame = 0;
    let runFrame = 0;
    let shake = 0;
    let wScale = 1;
    let hScale = 1;
    let gapTarget = rollGapPx(1);

    phaseRef.current = 'idle';
    lastHudRef.current = -1;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.max(320, Math.floor(r.width));
      const parentH = Math.floor(r.height);
      if (parentH >= 200) {
        H = Math.min(580, Math.max(240, parentH));
      } else {
        H = Math.min(440, Math.max(260, Math.floor(r.width * 0.4)));
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      groundY = H - Math.max(72, H * 0.22);

      wScale = W / REF_W;
      hScale = H / REF_H;

      playerX = W * 0.12;
      playerW = Math.max(32, Math.min(58, W * 0.075));
      playerH = playerW * 1.18;
      playerY = groundY - playerH;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function spawnObstacle() {
      const im = imgCactus.current;
      const maxH = (groundY - 52) * 0.34;
      const baseH = im ? Math.min(maxH, im.height * hScale) : maxH * 0.85;
      const sc = baseH / (im?.height || 48);
      const w = im ? im.width * sc : Math.max(20, 26 * wScale);
      const h = im ? im.height * sc : baseH;
      const last = obstacles[obstacles.length - 1];
      const nx = last ? last.x + last.w + gapTarget : W + 48;
      obstacles.push({ x: nx, w, h });
      gapTarget = rollGapPx(wScale);
    }

    function resetRun() {
      speed = BASE_SPEED;
      distance = 0;
      obstacles = [];
      vy = 0;
      grounded = true;
      playerY = groundY - playerH;
      shake = 0;
      runFrame = 0;
      gapTarget = rollGapPx(wScale);
      spawnObstacle();
    }

    function jump() {
      if (phaseRef.current === 'dead') return;
      if (phaseRef.current !== 'playing') {
        if (phaseRef.current === 'idle') {
          phaseRef.current = 'playing';
          setPhase('playing');
          resetRun();
        }
        return;
      }
      if (grounded) {
        vy = JUMP_V * Math.max(0.65, hScale);
        grounded = false;
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    let last = performance.now();

    function die() {
      if (phaseRef.current !== 'playing') return;
      phaseRef.current = 'dead';
      setPhase('dead');
      shake = 22;
      const final = Math.max(0, Math.floor(distance / 8));
      setHudScore(final);
      onGameOver?.(final);
      onScoreUpdate?.(final);
    }

    function drawScene() {
      const ox = (Math.random() - 0.5) * shake;
      const oy = (Math.random() - 0.5) * shake;
      g.save();
      g.translate(ox, oy);

      const sky = g.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#07040d');
      sky.addColorStop(0.5, '#10081c');
      sky.addColorStop(1, '#1a0f2e');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      g.fillStyle = 'rgba(255,255,255,0.2)';
      for (let i = 0; i < 48; i++) {
        const sx = (i * 991) % W;
        const sy = (i * 677) % (groundY * 0.5);
        g.globalAlpha = 0.15 + (i % 6) * 0.08;
        g.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
      }
      g.globalAlpha = 1;

      const scroll = (frame * 1.2) % 100;
      g.fillStyle = '#111118';
      g.fillRect(0, groundY, W, H - groundY);
      g.strokeStyle = 'rgba(139, 92, 246, 0.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, groundY);
      g.lineTo(W, groundY);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.07)';
      for (let x = -scroll; x < W + 100; x += 90) {
        g.beginPath();
        g.moveTo(x, groundY + 10);
        g.lineTo(x + 45, groundY + 10);
        g.stroke();
      }

      for (const o of obstacles) {
        const oy = groundY - o.h;
        const im = imgCactus.current;
        if (im && im.complete && im.naturalWidth) {
          g.drawImage(im, o.x, oy, o.w, o.h);
        } else {
          g.fillStyle = '#16a34a';
          g.fillRect(o.x, oy + o.h * 0.38, o.w * 0.32, o.h * 0.62);
          g.fillRect(o.x + o.w * 0.34, oy, o.w * 0.32, o.h);
          g.fillRect(o.x + o.w * 0.68, oy + o.h * 0.28, o.w * 0.28, o.h * 0.72);
        }
      }

      const bob = phaseRef.current === 'playing' && grounded ? Math.sin(runFrame * 0.32) * 2.8 : 0;
      g.save();
      g.translate(playerX + playerW / 2, playerY + playerH / 2 + bob);
      g.translate(-playerW / 2, -playerH / 2);
      const grd = g.createLinearGradient(0, 0, playerW, playerH);
      grd.addColorStop(0, '#c4b5fd');
      grd.addColorStop(1, '#6d28d9');
      g.fillStyle = grd;
      roundRectPath(g, 4, playerH * 0.28, playerW - 8, playerH * 0.62, 10);
      g.fill();
      g.fillStyle = '#fde68a';
      g.beginPath();
      g.arc(playerW * 0.5, playerH * 0.22, playerW * 0.28, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0f0d15';
      g.beginPath();
      g.arc(playerW * 0.42, playerH * 0.17, playerW * 0.065, 0, Math.PI * 2);
      g.arc(playerW * 0.58, playerH * 0.17, playerW * 0.065, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.2)';
      g.lineWidth = 2;
      roundRectPath(g, 4, playerH * 0.28, playerW - 8, playerH * 0.62, 10);
      g.stroke();
      g.restore();

      g.restore();
    }

    function tick(now: number) {
      const rawDt = Math.min(38, now - last);
      last = now;
      const dt = rawDt / 16.67;
      frame += 1;

      const s = Math.max(0.55, wScale);

      if (phaseRef.current === 'playing') {
        runFrame += 1;
        speed = Math.min(MAX_SPEED * s, BASE_SPEED * s + distance * 0.00011 * s);
        distance += speed * dt * 1.5;
        const displayScore = Math.floor(distance / (8 * s));
        if (displayScore !== lastHudRef.current) {
          lastHudRef.current = displayScore;
          setHudScore(displayScore);
          onScoreUpdate?.(displayScore);
        }

        const hs = Math.max(0.65, hScale);
        vy += GRAVITY * hs * dt;
        playerY += vy * dt;
        if (playerY >= groundY - playerH) {
          playerY = groundY - playerH;
          vy = 0;
          grounded = true;
        }

        for (const o of obstacles) {
          o.x -= speed * dt;
        }
        obstacles = obstacles.filter((o) => o.x + o.w > -120);

        let rightmost = 0;
        for (const o of obstacles) {
          rightmost = Math.max(rightmost, o.x + o.w);
        }
        if (rightmost < W + 320 * s) {
          spawnObstacle();
        }

        const px = playerX;
        const py = playerY;
        for (const o of obstacles) {
          const hb = cactusHitbox(o, groundY);
          if (aabb(px, py, playerW, playerH, hb.x, hb.y, hb.w, hb.h, 0.12)) {
            die();
            break;
          }
        }
      }

      if (shake > 0.4) shake *= 0.9;
      else shake = 0;

      drawScene();

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };
    const onClick = () => jump();

    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('mousedown', onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('touchstart', onTouch);
      canvas.removeEventListener('mousedown', onClick);
    };
  }, [onGameOver, onScoreUpdate, loadCactus, remount]);

  const restart = useCallback(() => {
    setPhase('idle');
    setHudScore(0);
    lastHudRef.current = -1;
    setRemount((n) => n + 1);
  }, []);

  useEffect(() => {
    const w = window as unknown as { masonRunnerRestart?: () => void };
    w.masonRunnerRestart = restart;
    return () => {
      delete w.masonRunnerRestart;
    };
  }, [restart]);

  return (
    <div className="mason-runner-canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="mason-runner-canvas" />
      {phase === 'idle' && (
        <div className={`mason-runner-overlay ${hintPulse ? 'is-pulse' : ''}`}>
          <p className="mason-runner-overlay-title">Mason Runner</p>
          <p className="mason-runner-overlay-hint">Space · tap · click to jump</p>
        </div>
      )}
      {phase === 'playing' && (
        <div className="mason-runner-score-float" aria-live="polite">
          {hudScore.toLocaleString()}
        </div>
      )}
      {phase === 'dead' && (
        <div className="mason-runner-overlay mason-runner-overlay--dead">
          <p className="mason-runner-dead-title">Wrecked</p>
          <p className="mason-runner-dead-score">Score {hudScore.toLocaleString()}</p>
          <button type="button" className="btn mason-runner-again" onClick={restart}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
