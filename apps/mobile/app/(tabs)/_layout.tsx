import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'You' }} />
    <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
    <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
    <Tabs.Screen name="season" options={{ title: 'Season' }} />
  </Tabs>;
}
