// Notifications calendrier (rappels) configurees pour Android/iOS.
// Pourquoi : centraliser la permission et la creation du channel systeme.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';

const CALENDAR_ALERT_CHANNEL = 'calendar-alerts';

async function ensureCalendarAlertChannel() {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CALENDAR_ALERT_CHANNEL, {
    name: 'Calendar Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: Colors.dark['btn-action'],
  });
}

async function ensureNotificationPermission() {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === 'granted') {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.status === 'granted';
}

export async function scheduleCalendarAlert({
  title,
  body,
  triggerDate,
}: {
  title: string;
  body: string;
  triggerDate: Date;
}) {
  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return null;
  }

  await ensureCalendarAlertChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: triggerDate,
  });
}

export async function cancelCalendarAlert(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignore cancellation errors.
  }
}
