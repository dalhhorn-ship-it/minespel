import { describe, expect, it } from 'vitest';
import { guardReport } from './guard-report';

const spot = { x: 20, y: 5, z: 20 };
const at = (kind: string, dx: number, dz = 0) => ({ kind, x: 20 + dx, y: 5, z: 20 + dz });

describe('AC206, AC333: guard report', () => {
  it('AC333: 4 dinos at 2 blocks and 2 chickens at 6 give the cap line', () => {
    const animals = [at('compy', 2), at('trex', -2), at('triceratops', 0, 2), at('stegosaurus', 0, -2), at('kip', 6), at('kip', -6)];
    expect(guardReport(spot, animals)).toBe("Ik pas op 4 dino's. Meer dan 4 lukt me niet. Alles veilig!");
  });
  it('AC333: 3 dinos and 1 chicken have no cap line', () => {
    const animals = [at('compy', 2), at('trex', -2), at('triceratops', 0, 2), at('kip', 6)];
    expect(guardReport(spot, animals)).toBe('Ik pas op 3 dino\'s en 1 kip. Alles veilig!');
  });
  it('AC333: the nearest 4 are counted, a dino at 12 never is', () => {
    const animals = [at('compy', 1), at('trex', -3), at('kip', 2), at('kip', -5), at('compy', 7), at('compy', 12)];
    expect(guardReport(spot, animals)).toBe("Ik pas op 2 dino's en 2 kippen. Meer dan 4 lukt me niet. Alles veilig!");
  });
  it('no animal within 8 blocks', () => {
    expect(guardReport(spot, [at('compy', 12), at('kip', 9)])).toBe('Hier zijn nog geen dieren.');
    expect(guardReport(spot, [])).toBe('Hier zijn nog geen dieren.');
  });
  it('one animal reads in the singular, one kind alone is fine', () => {
    expect(guardReport(spot, [at('compy', 1)])).toBe('Ik pas op 1 dino. Alles veilig!');
    expect(guardReport(spot, [at('kip', 1), at('kip', 2)])).toBe('Ik pas op 2 kippen. Alles veilig!');
  });
  it('height counts along its own axis', () => {
    expect(guardReport(spot, [{ kind: 'compy', x: 20, y: 20, z: 20 }])).toBe('Hier zijn nog geen dieren.');
  });
});
