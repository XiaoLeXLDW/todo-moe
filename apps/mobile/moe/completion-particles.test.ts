import { describe, expect, it } from 'vitest';
import { createCompletionParticles } from './completion-particles';

describe('completion particle trajectories', () => {
  it('keeps checklist feedback compact and visibly below the parent task blast', () => {
    const checklist = createCompletionParticles('checklist', 194, 'maximal');
    const parent = createCompletionParticles('task', 194, 'maximal');
    const furthest = (particles: ReturnType<typeof createCompletionParticles>) => Math.max(...particles.map(particle => (
      Math.hypot(particle.x.at(-1)! - particle.x[0], particle.y.at(-1)! - particle.y[0])
    )));

    expect(checklist).toHaveLength(10);
    expect(checklist.length).toBeLessThan(parent.length / 3);
    expect(furthest(checklist)).toBeLessThan(furthest(parent) / 2);
  });

  it.each(['task', 'list'] as const)('makes the maximal %s blast unmistakably denser and wider than Enhanced', variant => {
    const lively = createCompletionParticles(variant, 194, 'lively');
    const maximal = createCompletionParticles(variant, 194, 'maximal');
    const furthest = (particles: ReturnType<typeof createCompletionParticles>) => Math.max(...particles.map(particle => (
      Math.hypot(particle.x.at(-1)! - particle.x[0], particle.y.at(-1)! - particle.y[0])
    )));

    expect(maximal).not.toEqual(lively);
    expect(maximal.length).toBeGreaterThanOrEqual(Math.ceil(lively.length * 1.5));
    expect(furthest(maximal)).toBeGreaterThan(furthest(lively) * 1.3);
  });

  it.each([
    ['task', 320, 430],
    ['list', 500, 820],
  ] as const)('keeps the maximal %s blast finite and within its bounded overlay budget', (variant, maxX, maxY) => {
    for (const seed of [0, 1, 194, 712, -50, Number.NaN, Number.POSITIVE_INFINITY]) {
      for (const particle of createCompletionParticles(variant, seed, 'maximal')) {
        for (const table of [particle.x, particle.y, particle.scale, particle.squash, particle.opacity]) {
          expect(table.every(Number.isFinite)).toBe(true);
        }
        expect(Math.max(...particle.x.map(Math.abs))).toBeLessThan(maxX);
        expect(Math.max(...particle.y.map(Math.abs))).toBeLessThan(maxY);
        expect(particle.opacity[0]).toBe(0);
        expect(particle.opacity.at(-1)).toBe(0);
      }
    }
  });

  it('replays the same operation without changing its blast, while a new seed varies it', () => {
    expect(createCompletionParticles('task', 712)).toEqual(createCompletionParticles('task', 712));
    expect(createCompletionParticles('task', 713)).not.toEqual(createCompletionParticles('task', 712));
  });

  it.each(['task', 'list'] as const)('keeps %s interpolation tables finite, bounded and invisible at both ends', variant => {
    for (const seed of [0, 1, 712, -50, Number.NaN, Number.POSITIVE_INFINITY]) {
      for (const particle of createCompletionParticles(variant, seed)) {
        expect(particle.frames[0]).toBe(0);
        expect(particle.frames.at(-1)).toBe(1);
        expect(particle.frames.every((frame, index, frames) => index === 0 || frame > frames[index - 1])).toBe(true);
        for (const table of [particle.x, particle.y, particle.scale, particle.squash, particle.opacity]) {
          expect(table).toHaveLength(particle.frames.length);
          expect(table.every(Number.isFinite)).toBe(true);
        }
        expect(particle.rotation.every(rotation => Number.isFinite(Number.parseFloat(rotation)))).toBe(true);
        expect(particle.opacity[0]).toBe(0);
        expect(particle.opacity.at(-1)).toBe(0);
        expect(particle.opacity.every(value => value >= 0 && value <= 1)).toBe(true);
        expect(Math.max(...particle.opacity)).toBeGreaterThan(0.8);
        expect(Math.max(...particle.x.map(Math.abs))).toBeLessThan(variant === 'list' ? 275 : 150);
        expect(Math.max(...particle.y.map(Math.abs))).toBeLessThan(variant === 'list' ? 500 : 210);
        expect(particle.scale.every(value => value > 0 && value <= 1)).toBe(true);
        expect(particle.squash.every(value => value > 0 && value <= 1)).toBe(true);
      }
    }
  });

  it('splits the initial square in many directions and gives pieces different travel distances', () => {
    const particles = createCompletionParticles('task', 194);
    const frame = particles[0].frames.indexOf(0.26);
    const sectors = new Set(particles.map(particle => Math.floor((Math.atan2(particle.y[frame] - particle.y[0], particle.x[frame] - particle.x[0]) + Math.PI) / (Math.PI / 4))));
    expect(sectors.size).toBeGreaterThanOrEqual(7);
    expect(particles.every(particle => Math.abs(particle.x[0]) <= 11 && Math.abs(particle.y[0]) <= 11)).toBe(true);
    const distances = particles.map(particle => Math.hypot(particle.x[frame] - particle.x[0], particle.y[frame] - particle.y[0]));
    expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(35);
  });

  it('slows the initial blast and lets list fragments fall instead of moving along straight rays', () => {
    const particles = createCompletionParticles('list', 194);
    const early = particles[0].frames.indexOf(0.18);
    const middle = particles[0].frames.indexOf(0.48);
    const late = particles[0].frames.indexOf(0.76);
    const sideways = particles.filter(particle => Math.abs(particle.x.at(-1)! - particle.x[0]) > 100);
    expect(sideways.length).toBeGreaterThan(5);
    for (const particle of sideways) {
      const earlySpeed = Math.abs(particle.x[early] - particle.x[0]) / 0.18;
      const lateSpeed = Math.abs(particle.x[late] - particle.x[middle]) / (0.76 - 0.48);
      expect(earlySpeed).toBeGreaterThan(lateSpeed * 2);
    }
    const rising = particles.filter(particle => particle.y[early] < particle.y[0] - 50);
    expect(rising.length).toBeGreaterThan(5);
    expect(rising.every(particle => particle.y.at(-1)! > Math.min(...particle.y) + 70)).toBe(true);
  });
});
