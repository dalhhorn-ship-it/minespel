// The Klodder and bubble models (v18, final). Klodder is a dark, silly blob: body, two big eyes, a little smile and
// two round ears, 6 meshes. The bubble is a dark glossy sphere with a light spot, 2 meshes. Flat colours, no
// textures, nothing scary. The bubble is 1.2 blocks wide at scale 1.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { ActorModel } from './actor-render';

/** With prefers-reduced-motion the models stand calm: no bounce, no pulse, nothing shakes (AC228). */
function calm(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const KLODDER_MESH_LIMIT = 6;

export function createKlodderModel(): ActorModel {
  const root = new Group();
  const geometries: BoxGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];
  function part(w: number, h: number, d: number, color: number, x: number, y: number, z: number): Mesh {
    const g = new BoxGeometry(w, h, d);
    const m = new MeshBasicMaterial({ color });
    geometries.push(g);
    materials.push(m);
    const mesh = new Mesh(g, m);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }
  const body = part(0.8, 1.0, 0.8, 0x1a1a24, 0, 0.5, 0);
  part(0.15, 0.15, 0.05, 0xffffff, -0.18, 0.7, 0.41);
  part(0.15, 0.15, 0.05, 0xffffff, 0.18, 0.7, 0.41);
  part(0.3, 0.06, 0.05, 0xf2a0b8, 0, 0.4, 0.41);
  const ears = [part(0.18, 0.18, 0.18, 0x2a2a38, -0.3, 1.08, 0), part(0.18, 0.18, 0.18, 0x2a2a38, 0.3, 1.08, 0)];
  return {
    root,
    setPose(pose, time) {
      body.scale.y = calm() ? 1 : pose === 'jump' ? 1.15 : 1 + Math.sin(time * 3) * 0.04;
      for (const e of ears) e.position.y = 1.0 + body.scale.y * 0.08;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

export function createBubbleModel(): ActorModel {
  const root = new Group();
  const geometry = new SphereGeometry(0.6, 12, 8);
  const material = new MeshBasicMaterial({ color: 0x14141c, transparent: true, opacity: 0.85 });
  const shineGeometry = new SphereGeometry(0.12, 6, 4);
  const shineMaterial = new MeshBasicMaterial({ color: 0x8c8ca8, transparent: true, opacity: 0.7 });
  const mesh = new Mesh(geometry, material);
  const shine = new Mesh(shineGeometry, shineMaterial);
  shine.position.set(-0.22, 0.25, 0.45);
  root.add(mesh, shine);
  return {
    root,
    setPose(_pose, time) {
      mesh.scale.setScalar(calm() ? 1 : 1 + Math.sin(time * 2) * 0.03);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      shineGeometry.dispose();
      shineMaterial.dispose();
    },
  };
}
