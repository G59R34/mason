import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';
import { ImageBackdrop } from './ImageBackdrop';

/**
 * 3D centerpiece: metallic forms, parallax from pointer, ambient stars/sparkles.
 * Kept relatively light for frame time (single torus knot + two accent meshes).
 */
export function MasonScene() {
  const root = useRef<Group>(null);
  const { size } = useThree();

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    const px = state.pointer.x;
    const py = state.pointer.y;
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, py * 0.14, 0.045);
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, px * 0.2, 0.045);
    root.current.position.y = Math.sin(t * 0.2) * 0.12 + Math.sin(t * 0.37) * 0.04;
    const s = 0.9 + 0.05 * Math.sin(t * 0.25);
    root.current.scale.setScalar(s);
  });

  const sparkleCount = size.width < 700 ? 20 : 36;

  return (
    <>
      <ImageBackdrop />
      <fog attach="fog" args={['#000000', 24, 90]} />
      <ambientLight intensity={0.12} />
      <pointLight position={[6, 9, 5]} intensity={1.15} color="#a78bfa" distance={50} />
      <pointLight position={[-7, -3, 6]} intensity={0.55} color="#f59e0b" distance={45} />
      <spotLight
        position={[0, 12, 2]}
        angle={0.55}
        penumbra={0.8}
        intensity={0.35}
        color="#c4b5fd"
        castShadow={false}
      />
      <group ref={root}>
        <Float speed={1.9} rotationIntensity={0.4} floatIntensity={0.55}>
          <mesh>
            <torusKnotGeometry args={[0.88, 0.24, 96, 18]} />
            <meshStandardMaterial
              color="#0a0614"
              metalness={0.92}
              roughness={0.2}
              emissive="#4c1d95"
              emissiveIntensity={0.42}
            />
          </mesh>
        </Float>
        <Float speed={2.4} rotationIntensity={0.6} floatIntensity={0.45}>
          <mesh position={[1.9, 0.45, -1.4]}>
            <icosahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial
              color="#120c22"
              metalness={0.8}
              roughness={0.18}
              emissive="#6d28d9"
              emissiveIntensity={0.32}
            />
          </mesh>
        </Float>
        <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.3}>
          <mesh position={[-1.5, -0.6, 0.5]} rotation={[0.4, 0.7, 0.1]}>
            <torusGeometry args={[0.55, 0.1, 12, 48]} />
            <meshStandardMaterial
              color="#0d0a18"
              metalness={0.88}
              roughness={0.25}
              emissive="#5b21b6"
              emissiveIntensity={0.22}
            />
          </mesh>
        </Float>
      </group>
      <Sparkles
        count={sparkleCount}
        scale={14}
        size={1.8}
        speed={0.38}
        color="#a78bfa"
        opacity={0.5}
        noise={0.2}
      />
    </>
  );
}
