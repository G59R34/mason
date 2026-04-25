import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import blackBg from '@assets/black.png';

/**
 * Full-sphere interior mapped with `src/assets/black.png`.
 * Geometry is kept modest to avoid WebGL context loss on lower-end GPUs.
 * (Do not dispose the texture here: drei's `useTexture` caches by URL.)
 */
export function ImageBackdrop() {
  const map = useTexture(blackBg);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = 2;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;

  return (
    <mesh renderOrder={-1000}>
      <sphereGeometry args={[120, 28, 28]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
