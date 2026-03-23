// Modal for adding/removing a track to/from playlists.
import { View, Text, StyleSheet, Pressable, FlatList, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Playlist, Track } from '../types';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { EmptyState } from './EmptyState';

interface AddToPlaylistModalProps {
  visible: boolean;
  track: Track | null;
  playlists: Playlist[];
  trackInPlaylists: Set<string>;
  onClose: () => void;
  onAdd: (playlistId: string) => void;
  onRemove: (playlistId: string) => void;
}

export function AddToPlaylistModal({ visible, track, playlists, trackInPlaylists, onClose, onAdd, onRemove }: AddToPlaylistModalProps) {
  if (!track) return null;

  const handleToggle = (playlist: Playlist, isIn: boolean) => {
    if (isIn) {
      const sharedTags = playlist.filterTags
        .map((t) => `${t.category}:${t.value}`)
        .join(', ');

      Alert.alert(
        'Remove from Playlist',
        `This will remove the tags [${sharedTags}] from "${track.title}". It may also be removed from other playlists using these tags.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onRemove(playlist.id) },
        ]
      );
    } else {
      onAdd(playlist.id);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Add to Playlist</Text>
            <Text style={styles.trackInfo} numberOfLines={1}>
              {track.title} — {track.artist}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isIn = trackInPlaylists.has(item.id);
            return (
              <Pressable
                style={[styles.playlistRow, isIn && styles.playlistRowActive]}
                onPress={() => handleToggle(item, isIn)}
              >
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{item.name}</Text>
                  <Text style={styles.playlistCount}>{item.trackCount ?? 0} tracks</Text>
                </View>
                {isIn ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                ) : (
                  <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="list-outline"
              title="No playlists yet"
              subtitle="Create a playlist first to add tracks."
            />
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text,
  },
  trackInfo: {
    ...typography.caption,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 8,
  },
  list: {
    padding: 12,
    gap: 8,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playlistRowActive: {
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '08',
  },
  playlistInfo: {
    flex: 1,
    gap: 2,
  },
  playlistName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  playlistCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
