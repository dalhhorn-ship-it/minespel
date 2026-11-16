// The Monstermol model (v16, final). A round, friendly purple mole: body, big black glasses with white lenses, a pink
// nose and dark feet. 5 meshes (cap 6), flat colours, nothing scary. Poses: rise, walk, boe, sink and sleep (v22: caught in his pen, eyes shut: the lenses are a thin line, a little lower). With
// prefers-reduced-motion he stands calm: no waddle, no bounce (AC228). Faces +z, like the other actor models.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export const MOLE_MESH_LIMIT = 6;

function calm(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createMoleModel(): ActorModel {
  const root = new Group();
  const rig = new Group();
  root.add(rig);
  const geometries: BoxGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];
  function part(w: number, h: number, d: number, color: number, x: number, y: number, z: number): Mesh {
    const g = new BoxGeometry(w, h, d);
    const m = new MeshBasicMaterial({ color });
    geometries.push(g);
    materials.push(m);
    const mesh = new Mesh(g, m);
    mesh.position.set(x, y, z);
    rig.add(mesh);
    return mesh;
  }
  part(0.8, 0.8, 0.8, 0x8e5bd6, 0, 0.5, 0); // body
  part(0.7, 0.26, 0.05, 0x14141c, 0, 0.62, 0.41); // glasses, one wide frame
  const lenses = part(0.52, 0.18, 0.05, 0xffffff, 0, 0.62, 0.44); // lenses, in front of the frame
  part(0.2, 0.14, 0.12, 0xf2a0b8, 0, 0.4, 0.45); // nose
  part(0.76, 0.1, 0.76, 0x5a3a96, 0, 0.05, 0); // feet
  return {
    root,
    setPose(pose, time) {
      // Reset to standing, then add the pose. Calm: only the sink (he must go down) and nothing else moves.
      rig.rotation.z = 0;
      rig.position.y = 0;
      rig.scale.set(1, 1, 1);
      lenses.scale.y = 1;
      if (pose === 'sleep') {
        // Eyes shut and calm, whatever the motion setting says.
        lenses.scale.y = 0.12;
        rig.scale.y = 0.92;
        return;
      }
      const still = calm();
      if (pose === 'sink') {
        rig.scale.y = 0.6;
        return;
      }
      if (pose === 'rise') {
        if (!still) rig.scale.y = 0.85 + Math.abs(Math.sin(time * 6)) * 0.1;
        return;
      }
      if (still) return;
      if (pose === 'walk') rig.rotation.z = Math.sin(time * 8) * 0.12;
      else if (pose === 'boe') rig.position.y = Math.abs(Math.sin(time * 10)) * 0.15;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
