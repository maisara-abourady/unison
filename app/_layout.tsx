// Root layout — initializes database, runs migrations, hydrates stores.
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { colors } from '../src/constants/colors';
import { typography } from '../src/constants/typography';
import { runMigrations, seedDefaultTagPresets } from '../src/db/schema';
import { useLibraryStore } from '../src/store/library';
import { useTagsStore } from '../src/store/tags';
import { usePlaylistsStore } from '../src/store/playlists';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<unknown>(null);

  useEffect(() => {
    async function init() {
      try {
        await runMigrations();
        seedDefaultTagPresets();

        // Hydrate all stores from SQLite + secure storage
        useLibraryStore.getState().loadTracks();
        useTagsStore.getState().loadPresets();
        usePlaylistsStore.getState().loadPlaylists();
        // Why: token loading failure should not block app launch — user just won't be authenticated.
        await useAuthStore.getState().hydrate().catch(() => {});

        setIsReady(true);
      } catch (err) {
        console.error('[MIGRATION_FAILED] App init error:', err);
        setInitError(err);
      }
    }
    init();
  }, []);

  if (initError) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>Failed to initialize</Text>
        <Text style={styles.errorMessage}>
          {initError instanceof Error ? initError.message : 'Unknown error'}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            setInitError(null);
            setIsReady(false);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  retryText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
