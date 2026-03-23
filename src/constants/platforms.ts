import type { Platform } from '../types';
import { colors } from './colors';

interface PlatformMeta {
  displayName: string;
  abbreviation: string;
  color: string;
  iconName: string;
}

export const platformMeta: Record<Platform, PlatformMeta> = {
  spotify: {
    displayName: 'Spotify',
    abbreviation: 'SPO',
    color: colors.spotify,
    iconName: 'musical-notes',
  },
  youtube: {
    displayName: 'YouTube',
    abbreviation: 'YT',
    color: colors.youtube,
    iconName: 'play',
  },
  soundcloud: {
    displayName: 'SoundCloud',
    abbreviation: 'SC',
    color: colors.soundcloud,
    iconName: 'cloud',
  },
};
