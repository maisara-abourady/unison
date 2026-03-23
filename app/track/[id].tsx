// Track detail screen — view metadata and apply/remove tags.
import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { PlatformBadge } from '../../src/components/PlatformBadge';
import { TagCategoryGroup } from '../../src/components/TagCategoryGroup';
import { AddToPlaylistModal } from '../../src/components/AddToPlaylistModal';
import { useTagsStore } from '../../src/store/tags';
import { useLibraryStore } from '../../src/store/library';
import { usePlaylistsStore } from '../../src/store/playlists';
import { openTrack } from '../../src/utils/deep-links';
import type { Track } from '../../src/types';

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const { presets, trackTags, loadPresets, loadTagsForTrack, applyTag, removeTag } = useTagsStore();
  const { removeTrack, getTrack } = useLibraryStore();
  const { playlists, loadPlaylists, addTrackToPlaylist, removeTrackFromPlaylist, isTrackInPlaylist } = usePlaylistsStore();

  useEffect(() => {
    if (id) {
      setTrack(getTrack(id));
      loadPresets();
      loadTagsForTrack(id);
      loadPlaylists();
    }
  }, [id]);

  const currentTags = trackTags[id ?? ''] ?? [];

  const trackInPlaylists = useMemo(() => {
    if (!id) return new Set<string>();
    const set = new Set<string>();
    for (const p of playlists) {
      if (isTrackInPlaylist(p.id, id)) set.add(p.id);
    }
    return set;
  }, [playlists, id, currentTags]);

  const handleToggleTag = (category: string, value: string) => {
    if (!id) return;
    const isApplied = currentTags.some((t) => t.category === category && t.value === value);
    if (isApplied) {
      removeTag(id, category, value);
    } else {
      applyTag(id, category, value);
    }
  };

  const handleDeleteTrack = () => {
    if (!track) return;
    Alert.alert(
      'Delete Track',
      `Remove "${track.title}" from your library? This will also remove all its tags.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { removeTrack(track.id); router.back(); } },
      ]
    );
  };

  if (!track) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Track not found.</Text>
      </SafeAreaView>
    );
  }

  const durationText = track.durationSeconds
    ? `${Math.floor(track.durationSeconds / 60)}:${String(track.durationSeconds % 60).padStart(2, '0')}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => openTrack(track)} style={styles.headerBtn}>
            <Ionicons name="play-circle-outline" size={22} color={colors.accent} />
          </Pressable>
          <Pressable onPress={() => setShowPlaylistModal(true)} style={styles.headerBtn}>
            <Ionicons name="list-outline" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={handleDeleteTrack} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trackInfo}>
          {track.thumbnailUrl ? (
            <Image source={{ uri: track.thumbnailUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Ionicons name="musical-note" size={40} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.trackTitle}>{track.title}</Text>
          <Text style={styles.trackArtist}>{track.artist || 'Unknown'}</Text>
          <View style={styles.trackMeta}>
            <PlatformBadge platform={track.platform} />
            {durationText && <Text style={styles.duration}>{durationText}</Text>}
          </View>
        </View>

        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Tags ({currentTags.length})</Text>
          {Object.entries(presets)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, values]) => (
              <TagCategoryGroup
                key={category}
                category={category}
                values={values}
                selectedValues={currentTags.filter((t) => t.category === category).map((t) => t.value)}
                onToggle={(value) => handleToggleTag(category, value)}
              />
            ))}
        </View>
      </ScrollView>

      <AddToPlaylistModal
        visible={showPlaylistModal}
        track={track}
        playlists={playlists}
        trackInPlaylists={trackInPlaylists}
        onClose={() => { setShowPlaylistModal(false); if (id) loadTagsForTrack(id); }}
        onAdd={(playlistId) => { addTrackToPlaylist(playlistId, track.id); if (id) loadTagsForTrack(id); }}
        onRemove={(playlistId) => { removeTrackFromPlaylist(playlistId, track.id); if (id) loadTagsForTrack(id); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 8 },
  content: { paddingBottom: 40 },
  trackInfo: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 8 },
  artwork: { width: 160, height: 160, borderRadius: 12, backgroundColor: colors.surfaceAlt, marginBottom: 8 },
  artworkPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  trackTitle: { ...typography.heading, color: colors.text, textAlign: 'center' },
  trackArtist: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  trackMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  duration: { ...typography.caption, color: colors.textMuted },
  tagsSection: { paddingHorizontal: 20, gap: 20 },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: 4 },
  errorText: { ...typography.body, color: colors.error, textAlign: 'center', marginTop: 40 },
});
