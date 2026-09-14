import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { createCompletionParticles, type CompletionParticleVariant } from './completion-particles';

export interface MoeCompletionParticlesProps {
  progress: Animated.Value;
  color: string;
  secondaryColor?: string;
  variant?: CompletionParticleVariant;
  reduced?: boolean;
  seed?: number;
}

/** Place the zero-size origin at the check's centre in an unclipped overlay. */
export const MoeCompletionParticles = React.memo(function MoeCompletionParticles({
  progress, color, secondaryColor = color, variant = 'task', reduced = false, seed = 1,
}: MoeCompletionParticlesProps) {
  const particles = useMemo(() => reduced ? [] : createCompletionParticles(variant, seed), [variant, seed, reduced]);
  const animatedParticles = useMemo(() => particles.map(particle => {
    const interpolate = (outputRange: number[]) => progress.interpolate({ inputRange: particle.frames, outputRange, extrapolate: 'clamp' });
    return {
      particle,
      opacity: interpolate(particle.opacity),
      x: interpolate(particle.x),
      y: interpolate(particle.y),
      scale: interpolate(particle.scale),
      squash: interpolate(particle.squash),
      rotate: progress.interpolate({ inputRange: particle.frames, outputRange: particle.rotation, extrapolate: 'clamp' }),
    };
  }), [particles, progress]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.origin}>
      {animatedParticles.map(({ particle, opacity, x, y, rotate, scale, squash }) => {
        const fill = particle.tone === 'highlight' ? '#FFFFFF' : particle.tone === 'secondary' ? secondaryColor : color;
        return (
          <Animated.View key={particle.id} style={[
            styles.particle,
            {
              width: particle.width, height: particle.height,
              left: -particle.width / 2, top: -particle.height / 2,
              opacity,
              transform: [{ translateX: x }, { translateY: y }, { rotate }, { scale }, { scaleX: squash }],
            },
          ]}>
            {particle.shape === 'triangle' ? (
              <View style={{
                width: 0, height: 0,
                borderLeftWidth: particle.width * 0.3, borderRightWidth: particle.width * 0.7,
                borderBottomWidth: particle.height,
                borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: fill,
              }} />
            ) : (
              <View style={[
                styles.fragment,
                {
                  backgroundColor: fill,
                  borderRadius: particle.shape === 'fleck' ? 1 : 0.6,
                  transform: [{ skewX: `${particle.tilt}deg` }],
                },
              ]} />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' },
  particle: { position: 'absolute', overflow: 'visible' },
  fragment: { width: '100%', height: '100%' },
});
