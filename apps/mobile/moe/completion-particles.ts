export type CompletionParticleVariant = 'task' | 'list';
export type CompletionParticleProfile = 'lively' | 'maximal';
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
export function createCompletionParticles(
  variant: CompletionParticleVariant = 'task',
  seed = 1,
  profile: CompletionParticleProfile = 'lively',
): CompletionParticle[] {
  const random = seededRandom(seed);
  const isList = variant === 'list';
  const maximal = profile === 'maximal';
  const directionOffset = random() * Math.PI * 2;
  const particleCount = isList ? (maximal ? 96 : 54) : (maximal ? 52 : 28);
  return Array.from({ length: particleCount }, (_, id) => {
    const choice = random();
    const shape: CompletionParticleShape = choice < 0.35 ? 'triangle' : choice < 0.7 ? 'tile' : choice < 0.88 ? 'sliver' : 'fleck';
    const small = shape === 'fleck' || shape === 'sliver';
    const size = (isList ? (maximal ? 8.5 : 6) : (maximal ? 6.5 : 4.5))
      + random() * (isList ? (maximal ? 11 : 7) : (maximal ? 9 : 5));
    const width = shape === 'fleck'
      ? (maximal ? 2.5 : 2) + random() * (maximal ? 3 : 2)
      : shape === 'sliver' ? (maximal ? 2.6 : 2) + random() * (maximal ? 2 : 1.5) : size;
    const height = shape === 'fleck' ? width : shape === 'sliver' ? size * 1.35 : size * (0.65 + random() * 0.5);
    // Jitter a distributed set of directions. No shared radius or radial lines:
    // every shard has its own launch point, drag, spin, delay and gravity.
    const angle = directionOffset + id * GOLDEN_ANGLE + (random() - 0.5) * 1.2;
    const distance = (isList ? (maximal ? 210 : 135) : (maximal ? 118 : 72))
      + random() * (isList ? (maximal ? 230 : 115) : (maximal ? 142 : 62));
    const velocityX = Math.cos(angle) * distance;
    const velocityY = Math.sin(angle) * distance - (isList ? (maximal ? 105 : 55) : (maximal ? 28 : 12));
    const originSpread = maximal ? 36 : 22;
    const originX = (random() - 0.5) * originSpread;
    const originY = (random() - 0.5) * originSpread;
    const gravity = (isList ? (maximal ? 240 : 180) : (maximal ? 50 : 36))
      + random() * (isList ? (maximal ? 170 : 95) : (maximal ? 90 : 35));
    const drag = (maximal ? 2.7 : 3.8) + random() * (maximal ? 2.1 : 2.7);
    const delay = small
      ? (maximal ? 0.012 : 0.025) + random() * (maximal ? 0.05 : 0.075)
      : (maximal ? 0.002 : 0.004) + random() * (maximal ? 0.014 : 0.025);
    const lifetime = (isList ? (maximal ? 0.9 : 0.84) : (maximal ? 0.78 : 0.7))
      + random() * (isList ? (maximal ? 0.1 : 0.15) : (maximal ? 0.2 : 0.27));
    const initialRotation = random() * 360;
    const spin = (random() < 0.5 ? -1 : 1) * ((maximal ? 360 : 220) + random() * (maximal ? 900 : 680));
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
