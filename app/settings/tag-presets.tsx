// Tag preset management screen — add/delete categories and values.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { useTagsStore } from '../../src/store/tags';

export default function TagPresetsScreen() {
  const router = useRouter();
  const { presets, allPresets, loadPresets, addPreset, deletePreset, deleteCategory } = useTagsStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingValueTo, setAddingValueTo] = useState<string | null>(null);
  const [newValueName, setNewValueName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => { loadPresets(); }, []);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const result = addPreset(newCategoryName.trim(), 'new');
    if (result) { setNewCategoryName(''); setShowNewCategory(false); }
  };

  const handleDeleteCategory = (category: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category}" and all its values? Tags already applied to tracks will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(category) },
      ]
    );
  };

  const handleAddValue = (category: string) => {
    if (!newValueName.trim()) return;
    addPreset(category, newValueName.trim());
    setNewValueName('');
    setAddingValueTo(null);
  };

  const handleDeleteValue = (category: string, value: string) => {
    const preset = allPresets.find((p) => p.category === category && p.value === value);
    if (preset) deletePreset(preset.id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <Text style={styles.headerTitle}>Tag Presets</Text>
        <Pressable onPress={() => setShowNewCategory(true)} style={styles.addCategoryBtn}><Ionicons name="add" size={22} color={colors.accent} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showNewCategory && (
          <NewItemRow
            value={newCategoryName}
            onChange={setNewCategoryName}
            onConfirm={handleAddCategory}
            onCancel={() => { setShowNewCategory(false); setNewCategoryName(''); }}
            placeholder="New category name"
          />
        )}

        {Object.entries(presets).sort(([a], [b]) => a.localeCompare(b)).map(([category, values]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category}</Text>
              <View style={styles.categoryActions}>
                <Pressable onPress={() => { setAddingValueTo(category); setNewValueName(''); }} style={styles.iconBtn}><Ionicons name="add" size={18} color={colors.accent} /></Pressable>
                <Pressable onPress={() => handleDeleteCategory(category)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={colors.error} /></Pressable>
              </View>
            </View>
            <View style={styles.values}>
              {values.map((value) => (
                <View key={value} style={styles.valueChip}>
                  <Text style={styles.valueText}>{value}</Text>
                  <Pressable onPress={() => handleDeleteValue(category, value)}><Ionicons name="close" size={14} color={colors.textMuted} /></Pressable>
                </View>
              ))}
            </View>
            {addingValueTo === category && (
              <NewItemRow value={newValueName} onChange={setNewValueName} onConfirm={() => handleAddValue(category)} onCancel={() => setAddingValueTo(null)} placeholder="New value" />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NewItemRow({ value, onChange, onConfirm, onCancel, placeholder }: {
  value: string; onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; placeholder: string;
}) {
  return (
    <View style={rowStyles.row}>
      <TextInput style={rowStyles.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} autoFocus onSubmitEditing={onConfirm} />
      <Pressable onPress={onConfirm} style={rowStyles.btn}><Ionicons name="checkmark" size={18} color={colors.success} /></Pressable>
      <Pressable onPress={onCancel} style={rowStyles.btn}><Ionicons name="close" size={18} color={colors.error} /></Pressable>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, ...typography.caption, color: colors.text, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  btn: { padding: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 8 },
  headerTitle: { ...typography.heading, color: colors.text },
  addCategoryBtn: { padding: 8 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  categorySection: { gap: 10 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { ...typography.body, color: colors.text, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  categoryActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  valueText: { ...typography.caption, color: colors.text },
});
