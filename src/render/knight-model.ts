// The knight model. V17a is a stub: one grey block. V17d builds the real one (helmet, tabard, wooden sword,
// at most 6 meshes) behind the same `createKnightModel`.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export function createKnightModel(): ActorModel {
  const root = new Group();
  const geometry = new BoxGeometry(0.6, 1.8, 0.6);
  geometry.translate(0, 0.9, 0);
  const material = new MeshBasicMaterial({ color: 0x9aa5b1 });
  root.add(new Mesh(geometry, material));
  return {
    root,
    setPose() {},
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
