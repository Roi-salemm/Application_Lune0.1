// Modal de creation/edition d'une note pour une date.
// Pourquoi : regrouper les champs et controles dans un seul composant reutilisable.
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

import { ThemedText } from '@/components/shared/themed-text';
import { Colors, withAlpha } from '@/constants/theme';
import { COLORS, MONTHS, WEEKDAY_LONG } from '@/features/calendar/ui/CalendarConstants';
import { formatTimeLabel, formatTimeValue, parseTimeValue } from '@/features/calendar/domain/CalendarDateUtils';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const title = useThemeColor({}, 'title');
  const annex = useThemeColor({}, 'annex');
  const action = useThemeColor({}, 'btn-action');
  const formBackdrop = useThemeColor(
    {
      light: withAlpha(Colors.light.text, 0.65),
      dark: withAlpha(Colors.dark.background, 0.8),
    },
    'background',
  );
  const formBg = surface;
  const headerBorder = withAlpha(border, 0.6);
  const headerButtonBg = withAlpha(surface, 0.2);
  const headerButtonPrimaryBg = action;
  const formText = text;
  const formSubText = annex;
  const infoPillBg = withAlpha(surface, 0.2);
  const infoPillText = text;
  const inputBg = background;
  const inputText = text;
  const inputPlaceholder = withAlpha(annex, 0.7);
  const colorRowBg = withAlpha(surface, 0.16);
  const colorSelectedBorder = action;
  const transparentColor = withAlpha(border, 0);
  const switchTrackOff = withAlpha(border, 0.5);
  const switchTrackOn = withAlpha(action, 0.6);
  const switchThumb = title;
  const alertPickerBg = surface;
  const alertPickerBorder = withAlpha(border, 0.6);
  const handleAlertToggle = (value: boolean) => {
    if (!value) {
      setShowAlertTimePicker(false);
    }
    onChangeAlertEnabled(value);
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.formOverlay}>
      <Pressable style={[styles.formBackdrop, { backgroundColor: formBackdrop }]} onPress={Keyboard.dismiss} />
      <View style={[styles.formCard, { backgroundColor: formBg }]}>
        <View style={[styles.formHeader, { borderBottomColor: headerBorder }]}>
          <Pressable style={[styles.headerButton, { backgroundColor: headerButtonBg }]} onPress={onClose}>
            <ThemedText type="default" style={styles.headerButtonText} lightColor={formText} darkColor={formText}>
              Annuler
            </ThemedText>
          </Pressable>
          <ThemedText type="default" style={styles.formTitle} lightColor={formText} darkColor={formText}>
            {effectiveHeaderTitle}
          </ThemedText>
          <Pressable
            style={[styles.headerButton, { backgroundColor: headerButtonPrimaryBg }]}
            onPress={onSave}>
            <ThemedText type="default" style={styles.headerButtonText} lightColor={formText} darkColor={formText}>
              {effectiveSubmitLabel}
            </ThemedText>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.infoPill, { backgroundColor: infoPillBg }]} onPress={() => setShowDatePicker(true)}>
            <ThemedText type="default" style={styles.infoPillText} lightColor={infoPillText} darkColor={infoPillText}>
              {dateLabel}
            </ThemedText>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={effectiveDate}
              textColor={Platform.OS === 'ios' ? formText : undefined}
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
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, { backgroundColor: inputBg, color: inputText }]}
          />
          <View style={[styles.colorRow, { backgroundColor: colorRowBg }]}>
            <ThemedText type="default" style={styles.rowLabel} lightColor={formSubText} darkColor={formSubText}>
              Couleur
            </ThemedText>
            <View style={styles.colorSwatches}>
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => onChangeColor(color)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color, borderColor: transparentColor },
                    formColor === color && { borderColor: colorSelectedBorder },
                  ]}
                />
              ))}
            </View>
          </View>
          <TextInput
            value={formBody}
            onChangeText={onChangeBody}
            placeholder="Notte"
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: inputText }]}
            multiline
          />
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel} lightColor={formSubText} darkColor={formSubText}>
              Ajouter une alerte
            </ThemedText>
            <Switch
              value={alertEnabled}
              onValueChange={handleAlertToggle}
              thumbColor={switchThumb}
              trackColor={{ false: switchTrackOff, true: switchTrackOn }}
            />
          </View>
          {alertEnabled ? (
            <>
              <Pressable
                style={[styles.alertTimeRow, { backgroundColor: inputBg }]}
                onPress={() => setShowAlertTimePicker((value) => !value)}>
                <ThemedText type="default" style={styles.switchLabel} lightColor={formSubText} darkColor={formSubText}>
                  Heure de l&apos;evenement
                </ThemedText>
                <ThemedText type="default" style={styles.alertTimeValue} lightColor={formSubText} darkColor={formSubText}>
                  {alertTimeLabel}
                </ThemedText>
              </Pressable>
              {showAlertTimePicker ? (
                <View style={[styles.alertPickerCard, { backgroundColor: alertPickerBg, borderColor: alertPickerBorder }]}>
                  <DateTimePicker
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={parseTimeValue(alertTime)}
                    textColor={Platform.OS === 'ios' ? formText : undefined}
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') {
                        setShowAlertTimePicker(false);
                      }
                      if (date) {
                        onChangeAlertTime(formatTimeValue(date));
                      }
                    }}
                  />
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel} lightColor={formSubText} darkColor={formSubText}>
              Sauvegarde cloud
            </ThemedText>
            <Switch
              value={false}
              onValueChange={() => {}}
              thumbColor={switchThumb}
              trackColor={{ false: switchTrackOff, true: switchTrackOff }}
            />
          </View>
          <View style={styles.switchRow}>
            <ThemedText type="default" style={styles.switchLabel} lightColor={formSubText} darkColor={formSubText}>
              Sauvegarde local
            </ThemedText>
            <Switch
              value={true}
              onValueChange={() => {}}
              thumbColor={switchThumb}
              trackColor={{ false: switchTrackOff, true: switchTrackOn }}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formOverlay: {
    position: 'absolute',
    top: -70,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 24,
  },
  formBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  formCard: {
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
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 14,
  },
  formContent: {
    gap: 12,
    paddingTop: 15,
    paddingBottom: 6,
  },
  formTitle: {
    fontSize: 16,
  },
  infoPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  infoPillText: {
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 8,
  },
  rowLabel: {
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
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
  },
  switchValue: {
    fontSize: 13,
  },
  alertTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  alertTimeValue: {
    fontSize: 13,
  },
  alertPickerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
});
