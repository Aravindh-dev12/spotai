import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'NOW' }} />
    <Tabs.Screen name="camera" options={{ href: null }} />
    <Tabs.Screen name="crew" options={{ href: null }} />
    <Tabs.Screen name="season" options={{ href: null }} />
  </Tabs>;
}
