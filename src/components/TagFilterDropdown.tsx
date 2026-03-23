import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TagCategoryGroup } from './TagCategoryGroup';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import type { TagFilter } from '../types';

interface TagFilterDropdownProps {
  presets: Record<string, string[]>;
  selectedTags: TagFilter[];
  onToggleTag: (category: string, value: string) => void;
  onClearAll: () => void;
}

export function TagFilterDropdown({ presets, selectedTags, onToggleTag, onClearAll }: TagFilterDropdownProps) {
  const [visible, setVisible] = useState(false);

  const selectedCount = selectedTags.length;
  const triggerLabel = selectedCount > 0
    ? `${selectedCount} tag${selectedCount !== 1 ? 's' : ''} selected`
    : 'Select tags to filter';

  return (
    <View>
      <Pressable
        style={[styles.trigger, selectedCount > 0 && styles.triggerActive]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="pricetag-outline" size={16} color={selectedCount > 0 ? colors.accent : colors.textMuted} />
        <Text style={[styles.triggerText, selectedCount > 0 && styles.triggerTextActive]}>
          {triggerLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      {selectedCount > 0 && (
        <View style={styles.appliedTags}>
          {selectedTags.map((tag) => (
            <Pressable
              key={`${tag.category}:${tag.value}`}
              style={styles.appliedTag}
              onPress={() => onToggleTag(tag.category, tag.value)}
            >
              <Text style={styles.appliedTagText}>{tag.category}:{tag.value}</Text>
              <Ionicons name="close" size={12} color={colors.accent} />
            </Pressable>
          ))}
          <Pressable style={styles.clearBtn} onPress={onClearAll}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Tags</Text>
            <View style={styles.modalHeaderRight}>
              {selectedCount > 0 && (
                <Pressable onPress={onClearAll}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setVisible(false)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {Object.entries(presets)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, values]) => {
                const selectedForCategory = selectedTags
                  .filter((t) => t.category === category)
                  .map((t) => t.value);

                return (
                  <TagCategoryGroup
                    key={category}
                    category={category}
                    values={values}
                    selectedValues={selectedForCategory}
                    onToggle={(value) => onToggleTag(category, value)}
                  />
                );
              })}
          </ScrollView>

          {selectedCount > 0 && (
            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>{selectedCount} tag{selectedCount !== 1 ? 's' : ''} selected</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerActive: {
    borderColor: colors.accent,
  },
  triggerText: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  triggerTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  appliedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  appliedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.accent + '20',
    borderRadius: 12,
  },
  appliedTagText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearAllText: {
    ...typography.body,
    color: colors.error,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  doneBtnText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 20,
    gap: 24,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
