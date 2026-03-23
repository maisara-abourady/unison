// Library screen — browse saved tracks and playlists.
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { useLibraryStore } from '../../src/store/library';
import { usePlaylistsStore } from '../../src/store/playlists';
import { useTagsStore } from '../../src/store/tags';
import { TrackRow } from '../../src/components/TrackRow';
import { PlaylistCard } from '../../src/components/PlaylistCard';
import { EmptyState } from '../../src/components/EmptyState';
import { openTrack } from '../../src/utils/deep-links';

type Tab = 'tracks' | 'playlists';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('tracks');
  const router = useRouter();
  const { tracks, loadTracks } = useLibraryStore();
  const { playlists, loadPlaylists } = usePlaylistsStore();
  const { getTagCount } = useTagsStore();

  useFocusEffect(
    useCallback(() => {
      loadTracks();
      loadPlaylists();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push('/settings/tag-presets')}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'tracks' && styles.tabActive]}
          onPress={() => setActiveTab('tracks')}
        >
          <Text style={[styles.tabText, activeTab === 'tracks' && styles.tabTextActive]}>
            Tracks ({tracks.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'playlists' && styles.tabActive]}
          onPress={() => setActiveTab('playlists')}
        >
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
            Playlists ({playlists.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'tracks' ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              tagCount={getTagCount(item.id)}
              onPress={() => router.push(`/track/${item.id}`)}
              onPlay={() => openTrack(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="musical-notes-outline"
              title="No tracks yet"
              subtitle="Search for tracks and save them to your library."
            />
          }
        />
      ) : (
        <View style={styles.playlistsContainer}>
          <Pressable
            style={styles.createPlaylistBtn}
            onPress={() => router.push('/playlist/create')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createPlaylistText}>Create Playlist</Text>
          </Pressable>
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.playlistsList}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                onPress={() => router.push(`/playlist/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="list-outline"
                title="No playlists yet"
                subtitle="Create a playlist with tag filters to organize your tracks."
              />
            }
          />
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  settingsBtn: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.accent,
  },
  playlistsContainer: {
    flex: 1,
  },
  createPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  createPlaylistText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  playlistsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
