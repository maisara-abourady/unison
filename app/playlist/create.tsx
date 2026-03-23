// Playlist creation screen — select tag filters, preview matching tracks, save.
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { TagFilterDropdown } from '../../src/components/TagFilterDropdown';
import { TrackRow } from '../../src/components/TrackRow';
import { useTagsStore } from '../../src/store/tags';
import { usePlaylistsStore } from '../../src/store/playlists';
import type { TagFilter, Track } from '../../src/types';

export default function CreatePlaylistScreen() {
  const router = useRouter();
  const { presets, loadPresets } = useTagsStore();
  const { createPlaylist, getMatchingTracks } = usePlaylistsStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagFilter[]>([]);
  const [matchingTracks, setMatchingTracks] = useState<Track[]>([]);

  useEffect(() => { loadPresets(); }, []);

  useEffect(() => {
    const tracks = getMatchingTracks(selectedTags);
    setMatchingTracks(tracks);
  }, [selectedTags]);

  const handleToggleTag = (category: string, value: string) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.category === category && t.value === value);
      if (exists) return prev.filter((t) => !(t.category === category && t.value === value));
      return [...prev, { category, value }];
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), description.trim() || undefined, selectedTags);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Playlist</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]} disabled={!name.trim()}>
          <Text style={[styles.saveBtnText, !name.trim() && styles.saveBtnTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <FlatList
        data={matchingTracks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.form}>
            <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholder="Playlist name" placeholderTextColor={colors.textMuted} autoFocus />
            <TextInput style={styles.descInput} value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} multiline />
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Filter Tags</Text>
              <Text style={styles.helperText}>Tracks must match all selected tags</Text>
              <TagFilterDropdown presets={presets} selectedTags={selectedTags} onToggleTag={handleToggleTag} onClearAll={() => setSelectedTags([])} />
            </View>
            <Text style={styles.matchCount}>{matchingTracks.length} matching track{matchingTracks.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        renderItem={({ item }) => <TrackRow track={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 8 },
  headerTitle: { ...typography.heading, color: colors.text },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.success, borderRadius: 8 },
  saveBtnDisabled: { backgroundColor: colors.surfaceAlt },
  saveBtnText: { ...typography.body, color: '#fff', fontWeight: '600' },
  saveBtnTextDisabled: { color: colors.textMuted },
  form: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  nameInput: { ...typography.heading, color: colors.text, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  descInput: { ...typography.body, color: colors.text, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' },
  filterSection: { gap: 8 },
  sectionTitle: { ...typography.heading, color: colors.text },
  helperText: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  matchCount: { ...typography.caption, color: colors.textMuted, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
