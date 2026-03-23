import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function TagChip({ label, selected = false, onPress }: TagChipProps) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent + '30',
    borderColor: colors.accent,
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
  },
  textSelected: {
    color: colors.accent,
    fontWeight: '500',
  },
});
