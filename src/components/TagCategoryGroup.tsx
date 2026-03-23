import { View, Text, StyleSheet } from 'react-native';
import { TagChip } from './TagChip';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';

interface TagCategoryGroupProps {
  category: string;
  values: string[];
  selectedValues?: string[];
  onToggle?: (value: string) => void;
}

export function TagCategoryGroup({ category, values, selectedValues = [], onToggle }: TagCategoryGroupProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.categoryLabel}>{category}</Text>
      <View style={styles.chips}>
        {values.map((value) => (
          <TagChip
            key={value}
            label={value}
            selected={selectedValues.includes(value)}
            onPress={() => onToggle?.(value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
