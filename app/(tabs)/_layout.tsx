import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { BottomMenu } from '@/components/shared/bottom-menu';
import { HapticTab } from '@/components/shared/haptic-tab';
import { ThemedView } from '@/components/shared/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_ROUTES = ['/', '/calendar', '/lunar-calendar', '/mancy', '/profile'] as const;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = Math.max(TAB_ROUTES.indexOf(pathname), 0);
  const handleMenuPress = (index: number) => {
    const target = TAB_ROUTES[index] ?? '/';
    router.push(target);
  };

  return (
    <ThemedView style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: { display: 'none' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="lunar-calendar"
          options={{
            title: 'Lunar Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="moon.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="mancy"
          options={{
            title: 'Mancy',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
      <BottomMenu activeIndex={activeIndex} onPressItem={handleMenuPress} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
