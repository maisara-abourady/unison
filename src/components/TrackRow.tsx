import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '../types';
import { PlatformBadge } from './PlatformBadge';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';

interface TrackRowProps {
  track: Track;
  tagCount?: number;
  onPress?: () => void;
  onPlay?: () => void;
  rightAction?: React.ReactNode;
}

export function TrackRow({ track, tagCount, onPress, onPlay, rightAction }: TrackRowProps) {
  const durationText = track.durationSeconds
    ? `${Math.floor(track.durationSeconds / 60)}:${String(track.durationSeconds % 60).padStart(2, '0')}`
    : null;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Pressable onPress={onPlay} style={styles.thumbnailContainer}>
        {track.thumbnailUrl ? (
          <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={colors.textMuted} />
          </View>
        )}
        {onPlay && (
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        )}
      </Pressable>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.artist} numberOfLines={1}>{track.artist || 'Unknown'}</Text>
          {durationText && <Text style={styles.duration}>{durationText}</Text>}
        </View>
      </View>

      <View style={styles.right}>
        <PlatformBadge platform={track.platform} />
        {tagCount !== undefined && tagCount > 0 && (
          <View style={styles.tagBadge}>
            <Ionicons name="pricetag" size={10} color={colors.accent} />
            <Text style={styles.tagCount}>{tagCount}</Text>
          </View>
        )}
        {rightAction}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artist: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  duration: {
    ...typography.caption,
    color: colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tagCount: {
    ...typography.small,
    color: colors.accent,
  },
});
