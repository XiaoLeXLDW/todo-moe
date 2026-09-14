export type CompletionParticleVariant = 'task' | 'list';
export type CompletionParticleShape = 'tile' | 'triangle' | 'sliver' | 'fleck';

export interface CompletionParticle {
  id: number;
  shape: CompletionParticleShape;
  tone: 'primary' | 'secondary' | 'highlight';
  width: number;
  height: number;
  tilt: number;
  frames: number[];
  x: number[];
  y: number[];
  rotation: string[];
  scale: number[];
  squash: number[];
  opacity: number[];
}

const FRAME_TIMES = [0, 0.012, 0.028, 0.05, 0.08, 0.12, 0.18, 0.26, 0.36, 0.48, 0.62, 0.76, 0.9, 1];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function seededRandom(seed: number) {
  let state = (Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

/** Precompute the whole blast once; the native driver only interpolates tables. */
export function createCompletionParticles(variant: CompletionParticleVariant = 'task', seed = 1): CompletionParticle[] {
  const random = seededRandom(seed);
  const isList = variant === 'list';
  const directionOffset = random() * Math.PI * 2;
  return Array.from({ length: isList ? 54 : 28 }, (_, id) => {
    const choice = random();
    const shape: CompletionParticleShape = choice < 0.35 ? 'triangle' : choice < 0.7 ? 'tile' : choice < 0.88 ? 'sliver' : 'fleck';
    const small = shape === 'fleck' || shape === 'sliver';
    const size = (isList ? 6 : 4.5) + random() * (isList ? 7 : 5);
    const width = shape === 'fleck' ? 2 + random() * 2 : shape === 'sliver' ? 2 + random() * 1.5 : size;
    const height = shape === 'fleck' ? width : shape === 'sliver' ? size * 1.35 : size * (0.65 + random() * 0.5);
    // Jitter a distributed set of directions. No shared radius or radial lines:
    // every shard has its own launch point, drag, spin, delay and gravity.
    const angle = directionOffset + id * GOLDEN_ANGLE + (random() - 0.5) * 1.2;
    const distance = (isList ? 135 : 72) + random() * (isList ? 115 : 62);
    const velocityX = Math.cos(angle) * distance;
    const velocityY = Math.sin(angle) * distance - (isList ? 55 : 12);
    const originX = (random() - 0.5) * 22;
    const originY = (random() - 0.5) * 22;
    const gravity = (isList ? 180 : 36) + random() * (isList ? 95 : 35);
    const drag = 3.8 + random() * 2.7;
    const delay = small ? 0.025 + random() * 0.075 : 0.004 + random() * 0.025;
    const lifetime = (isList ? 0.84 : 0.7) + random() * (isList ? 0.15 : 0.27);
    const initialRotation = random() * 360;
    const spin = (random() < 0.5 ? -1 : 1) * (220 + random() * 680);
    const tumble = 1 + random() * 1.5;
    const tilt = (random() - 0.5) * 30;
    const tone = shape === 'fleck' ? 'highlight' : random() < 0.3 ? 'secondary' : 'primary';
    const particle: CompletionParticle = {
      id, shape, tone, width, height, tilt,
      frames: [...FRAME_TIMES], x: [], y: [], rotation: [], scale: [], squash: [], opacity: [],
    };
    for (const frame of FRAME_TIMES) {
      const time = clamp((frame - delay) / lifetime);
      // A fast impulse loses horizontal speed, while gravity keeps pulling the
      // separated pieces down. List fragments have time for a confetti fall.
      const travel = (1 - Math.exp(-drag * time)) / (1 - Math.exp(-drag));
      particle.x.push(originX + velocityX * travel);
      particle.y.push(originY + velocityY * travel + gravity * time * time);
      particle.rotation.push(`${initialRotation + spin * time}deg`);
      particle.scale.push(time < 0.08 ? 0.55 + time / 0.08 * 0.45 : 1 - 0.46 * ((time - 0.08) / 0.92));
      particle.squash.push(small ? 1 : 0.25 + 0.75 * Math.abs(Math.cos(time * Math.PI * tumble)));
      particle.opacity.push(frame === 0 || frame === 1 ? 0 : clamp(time / 0.045) * Math.pow(1 - clamp((time - 0.4) / 0.6), 1.15));
    }
    return particle;
  });
}
