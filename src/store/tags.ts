// Zustand store for tag presets and applied tags on tracks.
import { create } from 'zustand';
import * as tagDb from '../db/tags';
import * as presetDb from '../db/tag-presets';
import type { Tag, TagPreset } from '../types';

interface TagsState {
  presets: Record<string, string[]>;
  allPresets: TagPreset[];
  trackTags: Record<string, Tag[]>;

  loadPresets: () => void;
  addPreset: (category: string, value: string) => TagPreset | null;
  deletePreset: (id: string) => void;
  deleteCategory: (category: string) => void;

  loadTagsForTrack: (trackId: string) => void;
  applyTag: (trackId: string, category: string, value: string) => void;
  removeTag: (trackId: string, category: string, value: string) => void;
  getTagCount: (trackId: string) => number;
}

export const useTagsStore = create<TagsState>((set) => ({
  presets: {},
  allPresets: [],
  trackTags: {},

  loadPresets: () => {
    const presets = presetDb.getPresetsGrouped();
    const allPresets = presetDb.getAllPresets();
    set({ presets, allPresets });
  },

  addPreset: (category, value) => {
    const preset = presetDb.addPreset(category, value);
    if (preset) {
      set({
        presets: presetDb.getPresetsGrouped(),
        allPresets: presetDb.getAllPresets(),
      });
    }
    return preset;
  },

  deletePreset: (id) => {
    presetDb.deletePreset(id);
    set({
      presets: presetDb.getPresetsGrouped(),
      allPresets: presetDb.getAllPresets(),
    });
  },

  deleteCategory: (category) => {
    presetDb.deleteCategory(category);
    set({
      presets: presetDb.getPresetsGrouped(),
      allPresets: presetDb.getAllPresets(),
    });
  },

  loadTagsForTrack: (trackId) => {
    const tags = tagDb.getTagsForTrack(trackId);
    set((state) => ({
      trackTags: { ...state.trackTags, [trackId]: tags },
    }));
  },

  applyTag: (trackId, category, value) => {
    tagDb.applyTag(trackId, category, value);
    const tags = tagDb.getTagsForTrack(trackId);
    set((state) => ({
      trackTags: { ...state.trackTags, [trackId]: tags },
    }));
  },

  removeTag: (trackId, category, value) => {
    tagDb.removeTag(trackId, category, value);
    const tags = tagDb.getTagsForTrack(trackId);
    set((state) => ({
      trackTags: { ...state.trackTags, [trackId]: tags },
    }));
  },

  getTagCount: (trackId) => {
    return tagDb.getTagCountForTrack(trackId);
  },
}));
