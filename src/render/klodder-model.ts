// The Klodder and bubble models (v18). STUBS until V18e: a dark friendly blob with two eyes, and a dark glossy
// sphere. Few meshes, flat colours, no textures. The bubble is 1.2 blocks wide at scale 1.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { ActorModel } from './actor-render';

export const KLODDER_MESH_LIMIT = 4;

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
  return {
    root,
    setPose(pose, time) {
      body.scale.y = pose === 'jump' ? 1.15 : 1 + Math.sin(time * 3) * 0.04;
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
  const mesh = new Mesh(geometry, material);
  root.add(mesh);
  return {
    root,
    setPose(_pose, time) {
      mesh.scale.setScalar(1 + Math.sin(time * 2) * 0.03);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
