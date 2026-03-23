// Unified search screen — search Spotify & YouTube, save results to library.
import { useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { SearchBar } from '../../src/components/SearchBar';
import { TrackRow } from '../../src/components/TrackRow';
import { EmptyState } from '../../src/components/EmptyState';
import { useSearchStore } from '../../src/store/search';
import { useAuthStore } from '../../src/store/auth';
import { useLibraryStore } from '../../src/store/library';
import type { Track, SearchResult } from '../../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const { query, spotifyResults, youtubeResults, isLoading, errors, setQuery, search, clear } = useSearchStore();
  const { spotifyConnected, connectSpotify: doConnect, hydrate } = useAuthStore();
  const { saveTrack, isInLibrary } = useLibraryStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { hydrate(); }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { clear(); return; }
    debounceRef.current = setTimeout(() => { search(text); }, 400);
  }, []);

  const handleSaveTrack = (trackData: Omit<Track, 'id' | 'addedAt' | 'updatedAt'>) => {
    const result = saveTrack(trackData);
    router.push(`/track/${result.track.id}`);
  };

  const sections = [
    ...(spotifyResults.length > 0 ? [{ title: 'Spotify', data: spotifyResults, platform: 'spotify' as const }] : []),
    ...(youtubeResults.length > 0 ? [{ title: 'YouTube', data: youtubeResults, platform: 'youtube' as const }] : []),
  ];

  const hasResults = spotifyResults.length > 0 || youtubeResults.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Search</Text></View>
      <View style={styles.searchContainer}>
        <SearchBar value={query} onChangeText={handleQueryChange} placeholder="Search Spotify & YouTube..." />
      </View>

      {!spotifyConnected && (
        <Pressable style={styles.connectCard} onPress={doConnect}>
          <Ionicons name="musical-notes" size={20} color={colors.spotify} />
          <View style={styles.connectInfo}>
            <Text style={styles.connectTitle}>Connect Spotify</Text>
            <Text style={styles.connectSubtitle}>Sign in to search Spotify tracks</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {Object.entries(errors).map(([platform, error]) => (
        <View key={platform} style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={styles.errorText}>{platform}: {error}</Text>
        </View>
      ))}

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!isLoading && hasResults && (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.track.platformTrackId}-${index}`}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length} results</Text>
            </View>
          )}
          renderItem={({ item }: { item: SearchResult }) => {
            const alreadySaved = isInLibrary(item.track.platform, item.track.platformTrackId);
            return (
              <TrackRow
                track={item.track as Track}
                rightAction={
                  <Pressable style={styles.saveBtn} onPress={() => handleSaveTrack(item.track)}>
                    <Ionicons
                      name={alreadySaved ? 'checkmark-circle' : 'add-circle-outline'}
                      size={24}
                      color={alreadySaved ? colors.success : colors.accent}
                    />
                  </Pressable>
                }
              />
            );
          }}
        />
      )}

      {!isLoading && !hasResults && query.length > 0 && (
        <EmptyState icon="search-outline" title="No results" subtitle="Try a different search term." />
      )}

      {!query && !isLoading && (
        <EmptyState icon="search" title="Find tracks across platforms" subtitle="Search Spotify and YouTube from one place." />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { ...typography.title, color: colors.text },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 12 },
  connectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.spotify + '30' },
  connectInfo: { flex: 1, gap: 2 },
  connectTitle: { ...typography.body, color: colors.text, fontWeight: '500' },
  connectSubtitle: { ...typography.caption, color: colors.textMuted },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.warning + '15', borderRadius: 10 },
  errorText: { ...typography.caption, color: colors.warning, flex: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { ...typography.body, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.background },
  sectionTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  sectionCount: { ...typography.caption, color: colors.textMuted },
  saveBtn: { padding: 4 },
});
