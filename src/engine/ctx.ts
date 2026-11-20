import type * as THREE from 'three';
import type { BodyModel } from './model';
import type { FishUniforms, SkinLook } from './shader';
import type { Species } from './types';
/** Shared build context handed to every anatomical sub-builder. */
export interface Ctx {
  sp: Species;
  model: BodyModel;
  L: number;
  u: FishUniforms;
  seed: number;
  addMesh: (g: THREE.BufferGeometry, m: THREE.Material, order?: number, shareMat?: boolean) => THREE.Mesh;
  track: (d: { dispose: () => void }) => void;
  bodyMat: THREE.MeshPhysicalMaterial;
  /** body skin with vertex colours enabled (lips, orbit shading) – same texture and integument */
  tintMat: THREE.MeshPhysicalMaterial;
  /** a new material with the body integument (texture, scales, optics) plus extra parameters */
  skinMat: (extra: THREE.MeshPhysicalMaterialParameters) => THREE.MeshPhysicalMaterial;
  skinLook: SkinLook;
  skinTex: THREE.Texture;
  bump: THREE.Texture;
}
