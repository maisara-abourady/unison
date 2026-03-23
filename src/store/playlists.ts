// Zustand store for dynamic playlists (saved tag filters).
import { create } from 'zustand';
import * as playlistDb from '../db/playlists';
import * as tagDb from '../db/tags';
import * as trackDb from '../db/tracks';
import type { Playlist, TagFilter, Track } from '../types';

interface PlaylistsState {
  playlists: Playlist[];

  loadPlaylists: () => void;
  createPlaylist: (name: string, description?: string, filterTags?: TagFilter[]) => Playlist;
  updatePlaylist: (id: string, name: string, description?: string, filterTags?: TagFilter[]) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  getPlaylistDetail: (id: string) => { playlist: Playlist; tracks: Track[] } | null;
  getMatchingTracks: (filterTags: TagFilter[]) => Track[];
  isTrackInPlaylist: (playlistId: string, trackId: string) => boolean;
}

export const usePlaylistsStore = create<PlaylistsState>((set) => ({
  playlists: [],

  loadPlaylists: () => {
    const playlists = playlistDb.getPlaylists();
    set({ playlists });
  },

  createPlaylist: (name, description, filterTags = []) => {
    const playlist = playlistDb.createPlaylist(name, description, filterTags);
    set({ playlists: playlistDb.getPlaylists() });
    return playlist;
  },

  updatePlaylist: (id, name, description, filterTags) => {
    playlistDb.updatePlaylist(id, name, description, filterTags);
    set({ playlists: playlistDb.getPlaylists() });
  },

  deletePlaylist: (id) => {
    playlistDb.deletePlaylist(id);
    set({ playlists: playlistDb.getPlaylists() });
  },

  addTrackToPlaylist: (playlistId, trackId) => {
    const detail = playlistDb.getPlaylistById(playlistId);
    if (!detail) return;

    tagDb.applyFilterTagsToTrack(trackId, detail.playlist.filterTags);
    playlistDb.touchPlaylist(playlistId);
    set({ playlists: playlistDb.getPlaylists() });
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const detail = playlistDb.getPlaylistById(playlistId);
    if (!detail) return;

    tagDb.removeFilterTagsFromTrack(trackId, detail.playlist.filterTags);
    playlistDb.touchPlaylist(playlistId);
    set({ playlists: playlistDb.getPlaylists() });
  },

  getPlaylistDetail: (id) => {
    return playlistDb.getPlaylistById(id);
  },

  getMatchingTracks: (filterTags) => {
    return trackDb.getTracksByTagFilter(filterTags);
  },

  isTrackInPlaylist: (playlistId, trackId) => {
    const detail = playlistDb.getPlaylistById(playlistId);
    if (!detail) return false;
    return detail.tracks.some((t) => t.id === trackId);
  },
}));
