// The Monstermol model (v16). STUB until V16c: one purple box, so the seam draws something. V16c makes it purple with
// big glasses and a pink nose, at most 6 meshes, calm with reduced motion, poses rise, walk, boe and sink.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export function createMoleModel(): ActorModel {
  const root = new Group();
  const geometry = new BoxGeometry(0.8, 0.9, 0.8);
  const material = new MeshBasicMaterial({ color: 0x8e5bd6 });
  const body = new Mesh(geometry, material);
  body.position.y = 0.45;
  root.add(body);
  return {
    root,
    setPose() {},
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
