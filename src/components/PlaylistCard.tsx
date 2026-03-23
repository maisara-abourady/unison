import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Playlist } from '../types';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress?: () => void;
}

export function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
  const filterSummary = playlist.filterTags
    .map((t) => `${t.category}:${t.value}`)
    .join(', ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name="list" size={22} color={colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
        {filterSummary ? (
          <Text style={styles.filters} numberOfLines={1}>{filterSummary}</Text>
        ) : (
          <Text style={styles.filters}>No filters</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.count}>{playlist.trackCount ?? 0}</Text>
        <Text style={styles.countLabel}>tracks</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  filters: {
    ...typography.caption,
    color: colors.textMuted,
  },
  right: {
    alignItems: 'center',
  },
  count: {
    ...typography.heading,
    color: colors.text,
  },
  countLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
});
