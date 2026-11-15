// The knight model (V17d): a friendly cartoon knight with a helmet, a tabard and a wooden sword.
// Six meshes at most (performance on the iPad), flat colours, no textures. Pose 'march' swings the sword arm.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export const KNIGHT_MESH_LIMIT = 6;

export function createKnightModel(): ActorModel {
  const root = new Group();
  const geometries: BoxGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];

  function part(w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: Group = root): Mesh {
    const g = new BoxGeometry(w, h, d);
    const m = new MeshBasicMaterial({ color });
    geometries.push(g);
    materials.push(m);
    const mesh = new Mesh(g, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  part(0.4, 0.7, 0.3, 0x4a5568, 0, 0.35, 0); // legs
  part(0.6, 0.6, 0.4, 0x2b6cb0, 0, 1.0, 0); // tabard (blue)
  part(0.4, 0.35, 0.4, 0xf2c9a0, 0, 1.475, 0); // head
  part(0.5, 0.25, 0.5, 0xa0aec0, 0, 1.7, 0); // helmet (silver)
  // The sword arm swings as one group: the wooden sword is one mesh.
  const arm = new Group();
  arm.position.set(0.4, 1.2, 0);
  root.add(arm);
  part(0.1, 0.8, 0.1, 0x9c6b3a, 0, -0.2, 0.1, arm); // wooden sword
  part(0.3, 0.3, 0.08, 0xc53030, -0.38, 1.05, 0.22, root); // shield (red)

  return {
    root,
    setPose(pose, time) {
      arm.rotation.x = pose === 'march' ? Math.sin(time * 6) * 0.6 : 0;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
