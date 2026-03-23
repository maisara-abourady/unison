// SoundCloud manual paste screen — resolve track metadata from URL.
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { PlatformBadge } from '../../src/components/PlatformBadge';
import { resolveSoundCloudTrack } from '../../src/api/soundcloud';
import { mapSoundCloudOEmbed } from '../../src/utils/normalize-track';
import { useLibraryStore } from '../../src/store/library';
import type { Track } from '../../src/types';

export default function AddSoundCloudScreen() {
  const router = useRouter();
  const { saveTrack } = useLibraryStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Omit<Track, 'id' | 'addedAt' | 'updatedAt'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const oembed = await resolveSoundCloudTrack(url.trim());
      const trackData = mapSoundCloudOEmbed(oembed, url.trim());
      setPreview(trackData);
    } catch (e) {
      console.error('[SOUNDCLOUD_RESOLVE_FAILED]', e);
      setError('Could not resolve this URL. Make sure it\'s a valid public SoundCloud track link.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!preview) return;
    const result = saveTrack(preview);
    router.replace(`/track/${result.track.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <Text style={styles.headerTitle}>Add SoundCloud Track</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputRow}>
          <TextInput style={styles.urlInput} value={url} onChangeText={setUrl} placeholder="Paste SoundCloud URL..." placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" onSubmitEditing={handleResolve} />
          <Pressable style={[styles.resolveBtn, !url.trim() && styles.resolveBtnDisabled]} onPress={handleResolve} disabled={!url.trim() || loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {preview && (
          <View style={styles.previewCard}>
            {preview.thumbnailUrl && <Image source={{ uri: preview.thumbnailUrl }} style={styles.previewImage} />}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{preview.title}</Text>
              <Text style={styles.previewArtist}>{preview.artist}</Text>
              <PlatformBadge platform="soundcloud" />
            </View>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save to Library</Text>
            </Pressable>
          </View>
        )}

        {!preview && !error && !loading && (
          <View style={styles.hint}>
            <Ionicons name="cloud-outline" size={40} color={colors.textMuted} />
            <Text style={styles.hintText}>Paste a SoundCloud track URL to resolve its metadata and save it to your library.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 8 },
  headerTitle: { ...typography.heading, color: colors.text },
  content: { padding: 20, gap: 16 },
  inputRow: { flexDirection: 'row', gap: 10 },
  urlInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  resolveBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.soundcloud, alignItems: 'center', justifyContent: 'center' },
  resolveBtnDisabled: { opacity: 0.5 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.error + '15', borderRadius: 10 },
  errorText: { ...typography.body, color: colors.error, flex: 1 },
  previewCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  previewImage: { width: '100%', height: 200, backgroundColor: colors.surfaceAlt },
  previewInfo: { padding: 16, gap: 4 },
  previewTitle: { ...typography.heading, color: colors.text },
  previewArtist: { ...typography.body, color: colors.textMuted, marginBottom: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 0, paddingVertical: 12, backgroundColor: colors.accent, borderRadius: 10 },
  saveBtnText: { ...typography.body, color: '#fff', fontWeight: '600' },
  hint: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  hintText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
