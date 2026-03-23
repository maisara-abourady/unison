import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { useLibraryStore } from '../../src/store/library';
import { usePlaylistsStore } from '../../src/store/playlists';
import { useTagsStore } from '../../src/store/tags';
import { TrackRow } from '../../src/components/TrackRow';
import { PlaylistCard } from '../../src/components/PlaylistCard';

export default function HomeScreen() {
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

  const recentTracks = tracks.slice(0, 5);
  const recentPlaylists = playlists.slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <Text style={styles.title}>Unison</Text>
            <Text style={styles.subtitle}>Your playlists, unified.</Text>

            {recentPlaylists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Playlists</Text>
                {recentPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPress={() => router.push(`/playlist/${playlist.id}`)}
                  />
                ))}
              </View>
            )}

            {recentTracks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently Added</Text>
                {recentTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    tagCount={getTagCount(track.id)}
                    onPress={() => router.push(`/track/${track.id}`)}
                  />
                ))}
              </View>
            )}

            {recentTracks.length === 0 && recentPlaylists.length === 0 && (
              <View style={styles.welcome}>
                <Text style={styles.welcomeText}>
                  Search for tracks across Spotify and YouTube, save them to your library, tag them, and let dynamic playlists do the rest.
                </Text>
                <Pressable style={styles.startBtn} onPress={() => router.push('/(tabs)/search')}>
                  <Text style={styles.startBtnText}>Start Searching</Text>
                </Pressable>
              </View>
            )}
          </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  section: {
    marginTop: 24,
    gap: 10,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: 4,
  },
  welcome: {
    marginTop: 60,
    alignItems: 'center',
    gap: 20,
  },
  welcomeText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  startBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  startBtnText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
