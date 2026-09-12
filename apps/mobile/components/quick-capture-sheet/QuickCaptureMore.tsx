import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { MOE_VISUAL } from '../../moe/visual-system';

/** Disclosure inside the existing scroll viewport: no IME dismissal or global
 * layout animation, and the title and save actions stay outside this region. */
export function QuickCaptureMore({ expanded, reduced, children }: {
  expanded: boolean; reduced: boolean; children: React.ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(expanded ? 1 : 0); return; }
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0, duration: MOE_VISUAL.motion.settleMs, useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress, reduced]);
  return (
    <Animated.View testID="quick-capture-more" pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      style={{ overflow: 'hidden', height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }), opacity: progress }}>
      <View style={{ position: 'absolute', left: 0, right: 0 }}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {children}
      </View>
    </Animated.View>
  );
}
