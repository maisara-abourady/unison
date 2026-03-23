import { View, Text, StyleSheet } from 'react-native';
import type { Platform } from '../types';
import { platformMeta } from '../constants/platforms';

interface PlatformBadgeProps {
  platform: Platform;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const meta = platformMeta[platform];

  return (
    <View style={[styles.badge, { backgroundColor: meta.color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.text, { color: meta.color }]}>{meta.abbreviation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
