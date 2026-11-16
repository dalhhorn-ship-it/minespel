// The Lavakip-bar truck model (v23, decision 144). V22a holds a one box placeholder so the model name and the `props`
// group are real; V23b draws the truck (box made, orange and red, yellow awning, sign, dino cook, still steam) with
// at most `BAR_MESH_LIMIT` meshes and no animation. It faces +z like the other actor models.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActorModel } from './actor-render';

export const BAR_MESH_LIMIT = 4;

export function createLavakipBarModel(): ActorModel {
  const root = new Group();
  const geometry = new BoxGeometry(2, 1.5, 3);
  const material = new MeshBasicMaterial({ color: 0xe8742a });
  const body = new Mesh(geometry, material);
  body.position.set(0.5, 0.75, 1);
  root.add(body);
  return {
    root,
    setPose() {
      // The truck stands still.
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
