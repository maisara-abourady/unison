// Playlist detail screen — view dynamic track list, manage membership.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { usePlaylistsStore } from '../../src/store/playlists';
import { useTagsStore } from '../../src/store/tags';
import { TrackRow } from '../../src/components/TrackRow';
import { EmptyState } from '../../src/components/EmptyState';
import { openTrack } from '../../src/utils/deep-links';
import type { Playlist, Track } from '../../src/types';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPlaylistDetail, deletePlaylist, removeTrackFromPlaylist, loadPlaylists } = usePlaylistsStore();
  const { getTagCount } = useTagsStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    const detail = getPlaylistDetail(id);
    if (detail) {
      setPlaylist(detail.playlist);
      setTracks(detail.tracks);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = () => {
    if (!playlist) return;
    Alert.alert(
      'Delete Playlist',
      `Delete "${playlist.name}"? Your tracks and tags will not be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleRemoveTrack = (track: Track) => {
    if (!playlist) return;
    const tagList = playlist.filterTags.map((t) => `${t.category}:${t.value}`).join(', ');

    Alert.alert(
      'Remove from Playlist',
      `This will remove the tags [${tagList}] from "${track.title}". It may also be removed from other playlists using these tags.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeTrackFromPlaylist(playlist.id, track.id);
            load();
          },
        },
      ]
    );
  };

  if (!playlist) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Playlist not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <View style={styles.playlistHeader}>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        {playlist.description && (
          <Text style={styles.playlistDesc}>{playlist.description}</Text>
        )}
        <View style={styles.filterTags}>
          {playlist.filterTags.map((tag) => (
            <View key={`${tag.category}:${tag.value}`} style={styles.filterTag}>
              <Text style={styles.filterTagText}>{tag.category}:{tag.value}</Text>
            </View>
          ))}
          {playlist.filterTags.length === 0 && (
            <Text style={styles.noFilters}>No filters — showing all tracks</Text>
          )}
        </View>
        <Text style={styles.trackCount}>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            tagCount={getTagCount(item.id)}
            onPress={() => router.push(`/track/${item.id}`)}
            onPlay={() => openTrack(item)}
            rightAction={
              <Pressable onPress={() => handleRemoveTrack(item)} style={styles.removeBtn}>
                <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
              </Pressable>
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="No tracks match"
            subtitle="Tag some tracks to see them here."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 8,
  },
  playlistHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  playlistName: {
    ...typography.title,
    color: colors.text,
  },
  playlistDesc: {
    ...typography.body,
    color: colors.textMuted,
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  filterTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.accent + '20',
    borderRadius: 10,
  },
  filterTagText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  noFilters: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  trackCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  removeBtn: {
    padding: 4,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
});
