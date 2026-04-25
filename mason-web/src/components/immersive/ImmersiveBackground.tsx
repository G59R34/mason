import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { GlContextHandlers } from './GlContextHandlers';
import { MasonScene } from './MasonScene';

/**
 * Full-viewport WebGL layer (pointer-events: none). Parent controls visibility.
 * Canvas mounts after one animation frame to reduce dev StrictMode double-create pressure.
 */
export function ImmersiveBackground() {
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanvasReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="imm-webgl-root" aria-hidden>
      {canvasReady ? (
        <Canvas
          className="imm-webgl-canvas"
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'default',
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 1.25]}
          camera={{ position: [0, 0.2, 8.2], fov: 46 }}
          style={{ position: 'absolute', inset: 0 }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
          }}
        >
          <GlContextHandlers />
          <color attach="background" args={['#000000']} />
          <Suspense fallback={null}>
            <MasonScene />
          </Suspense>
        </Canvas>
      ) : null}
      <div className="imm-webgl-vignette" />
      <div className="imm-webgl-noise" />
    </div>
  );
}
