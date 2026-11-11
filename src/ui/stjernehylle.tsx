import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LayoutAnimationConfig, ZoomIn } from 'react-native-reanimated';

import { Stjerne } from '@/ui/stjerne';

export type ViewRef = ComponentRef<typeof View>;

/** Plassen stjernene får på hylla. Mange stjerner gjør dem litt mindre. */
export function hylleStorrelse(antall: number) {
  return antall > 15 ? 16 : 22;
}

/**
 * Ukens stjerner som ekte stjerner barna kan telle, pluss én stiplet ledig plass
 * der neste stjerne lander. Nye stjerner spretter inn.
 */
export function Stjernehylle({ antall, ledigRef }: { antall: number; ledigRef: Ref<ViewRef> }) {
  const s = hylleStorrelse(antall + 1);
  return (
    <View
      style={styles.hylle}
      accessible
      accessibilityLabel={`${antall} ${antall === 1 ? 'stjerne' : 'stjerner'} denne uka`}>
      <LayoutAnimationConfig skipEntering>
        {Array.from({ length: antall }, (_, i) => (
          <Animated.View key={i} entering={ZoomIn.springify().damping(9)}>
            <Stjerne storrelse={s} />
          </Animated.View>
        ))}
      </LayoutAnimationConfig>
      <View ref={ledigRef} collapsable={false}>
        <Stjerne storrelse={s} tom />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hylle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    minHeight: 30,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
