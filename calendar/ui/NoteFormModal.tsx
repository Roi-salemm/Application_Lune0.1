// Modal form to create a new note for a selected date.
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { COLORS, MONTHS, WEEKDAY_LONG } from '@/calendar/ui/CalendarConstants';
import { formatTimeLabel, formatTimeValue, parseTimeValue } from '@/calendar/domain/CalendarDateUtils';

type NoteFormModalProps = {
  visible: boolean;
  selectedDate: Date | null;
  formTitle: string;
  formBody: string;
  formColor: string;
  alertEnabled: boolean;
  alertTime: string;
  headerTitle?: string;
  submitLabel?: string;
  onChangeDate: (value: Date) => void;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeColor: (value: string) => void;
  onChangeAlertEnabled: (value: boolean) => void;
  onChangeAlertTime: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function NoteFormModal({
  visible,
  selectedDate,
  formTitle,
  formBody,
  formColor,
  alertEnabled,
  alertTime,
  headerTitle,
  submitLabel,
  onChangeDate,
  onChangeTitle,
  onChangeBody,
  onChangeColor,
  onChangeAlertEnabled,
  onChangeAlertTime,
  onClose,
  onSave,
}: NoteFormModalProps) {
  if (!visible) {
    return null;
  }

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAlertTimePicker, setShowAlertTimePicker] = useState(false);
  const effectiveDate = selectedDate ?? new Date();
  const effectiveHeaderTitle = headerTitle ?? 'Nouvelle notte';
  const effectiveSubmitLabel = submitLabel ?? 'Ajouter';
  const dateLabel = useMemo(() => {
    const weekday = WEEKDAY_LONG[(effectiveDate.getDay() + 6) % 7];
    return `${weekday} | ${effectiveDate.getDate()} | ${MONTHS[effectiveDate.getMonth()]} | ${effectiveDate.getFullYear()}`;
  }, [effectiveDate]);
  const alertTimeLabel = useMemo(() => formatTimeLabel(alertTime), [alertTime]);
  const handleAlertToggle = (value: boolean) => {
    if (!value) {
      setShowAlertTimePicker(false);
    }
    onChangeAlertEnabled(value);
  };

  return (
    <View style={styles.formOverlay}>
      <Pressable style={styles.formBackdrop} onPress={Keyboard.dismiss} />
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Pressable style={styles.headerButton} onPress={onClose}>
            <ThemedText type="default" style={styles.headerButtonText}>
              Annuler
            </ThemedText>
          </Pressable>
          <ThemedText type="default" style={styles.formTitle}>
            {effectiveHeaderTitle}
          </ThemedText>
          <Pressable style={[styles.headerButton, styles.headerButtonPrimary]} onPress={onSave}>
            <ThemedText type="default" style={styles.headerButtonText}>
              {effectiveSubmitLabel}
            </ThemedText>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          <Pressable style={styles.infoPill} onPress={() => setShowDatePicker(true)}>
            <ThemedText type="default" style={styles.infoPillText}>
              {dateLabel}
            </ThemedText>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={effectiveDate}
              textColor={Platform.OS === 'ios' ? '#E7E9EC' : undefined}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (date) {
                  onChangeDate(date);
                }
              }}
            />
          ) : null}
          <TextInput
            value={formTitle}
            onChangeText={onChangeTitle}
            placeholder="Titre"
            placeholderTextColor="#7A7A7A"
            style={styles.input}
          />
          <View style={styles.colorRow}>
            <ThemedText type="default" style={styles.rowLabel}>
              Couleur
            </ThemedText>
            <View style={styles.colorSwatches}>
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
          </View>
          <TextInput
            value={formBody}
            onChangeText={onChangeBody}
            placeholder="Notte"
            placeholderTextColor="#7A7A7A"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel}>
              Ajouter une alerte
            </ThemedText>
            <Switch
              value={alertEnabled}
              onValueChange={handleAlertToggle}
              thumbColor="#E7E9EC"
              trackColor={{ false: '#2B2B2B', true: '#D3B658' }}
            />
          </View>
          {alertEnabled ? (
            <>
              <Pressable
                style={styles.alertTimeRow}
                onPress={() => setShowAlertTimePicker(true)}>
                <ThemedText type="default" style={styles.switchLabel}>
                  Heure de l&apos;evenement
                </ThemedText>
                <ThemedText type="default" style={styles.alertTimeValue}>
                  {alertTimeLabel}
                </ThemedText>
              </Pressable>
              {showAlertTimePicker ? (
                <DateTimePicker
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  value={parseTimeValue(alertTime)}
                  textColor={Platform.OS === 'ios' ? '#E7E9EC' : undefined}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') {
                      setShowAlertTimePicker(false);
                    }
                    if (date) {
                      onChangeAlertTime(formatTimeValue(date));
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel}>
              Sauvegarde cloud
            </ThemedText>
            <Switch value={false} onValueChange={() => {}} thumbColor="#E7E9EC" trackColor={{ false: '#2B2B2B', true: '#2B2B2B' }} />
          </View>
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel}>
              Sauvegarde local
            </ThemedText>
            <Switch value={true} onValueChange={() => {}} thumbColor="#E7E9EC" trackColor={{ false: '#2B2B2B', true: '#D3B658' }} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formOverlay: {
    position: 'absolute',
    top: -90,
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
    backgroundColor: '#4A4A4A',
    borderRadius: 18,
    padding: 18,
    maxHeight: '85%',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 70,
    alignItems: 'center',
  },
  headerButtonPrimary: {
    backgroundColor: '#5A5A5A',
  },
  headerButtonText: {
    color: '#E7E9EC',
    fontSize: 14,
  },
  formContent: {
    gap: 12,
    paddingTop: 15,
    paddingBottom: 6,
  },
  formTitle: {
    fontSize: 16,
    color: '#E7E9EC',
  },
  infoPill: {
    borderRadius: 16,
    backgroundColor: '#3E3E3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  infoPillText: {
    color: '#C9CDD2',
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#3E3E3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F5F5F5',
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#3E3E3E',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#C9CDD2',
    fontSize: 13,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#F5F5F5',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  switchLabel: {
    color: '#C9CDD2',
    fontSize: 13,
  },
  switchValue: {
    color: '#C9CDD2',
    fontSize: 13,
  },
  alertTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#3E3E3E',
  },
  alertTimeValue: {
    color: '#C9CDD2',
    fontSize: 13,
  },
});
