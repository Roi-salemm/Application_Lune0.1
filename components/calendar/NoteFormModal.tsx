// Modal form to create a new note for a selected date.
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { COLORS } from '@/constants/calendar';
import { formatDisplay } from '@/lib/calendar-utils';

type NoteFormModalProps = {
  visible: boolean;
  selectedDate: Date | null;
  formTitle: string;
  formBody: string;
  formColor: string;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeColor: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function NoteFormModal({
  visible,
  selectedDate,
  formTitle,
  formBody,
  formColor,
  onChangeTitle,
  onChangeBody,
  onChangeColor,
  onClose,
  onSave,
}: NoteFormModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formOverlay}>
      <Pressable style={styles.formBackdrop} onPress={Keyboard.dismiss} />
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.formTitle}>
            Nouvelle notte
          </ThemedText>
          <TextInput
            value={formTitle}
            onChangeText={onChangeTitle}
            placeholder="Titre"
            placeholderTextColor="#7A7A7A"
            style={styles.input}
          />
          <View style={styles.dateRow}>
            <ThemedText type="default" style={styles.dateLabel}>
              Date:
            </ThemedText>
            <ThemedText type="default" style={styles.dateValue}>
              {selectedDate ? formatDisplay(selectedDate) : ''}
            </ThemedText>
          </View>
          <View style={styles.colorRow}>
            {COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => onChangeColor(color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  formColor === color && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>
          <TextInput
            value={formBody}
            onChangeText={onChangeBody}
            placeholder="Notte"
            placeholderTextColor="#7A7A7A"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <View style={styles.formActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <ThemedText type="default" style={styles.cancelButtonText}>
                Annuler
              </ThemedText>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={onSave}>
              <ThemedText type="default" style={styles.saveButtonText}>
                Sauvegarder
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 24,
  },
  formBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  formCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%',
  },
  formContent: {
    gap: 12,
  },
  formTitle: {
    fontSize: 20,
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F5F5F5',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateLabel: {
    opacity: 0.7,
  },
  dateValue: {
    opacity: 0.9,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#F5F5F5',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#B5B5B5',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#D3B658',
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#1E1E1E',
  },
});
