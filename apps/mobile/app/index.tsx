import { Link } from 'expo-router';
import { SafeAreaView, Text, View, Pressable } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ gap: 16, marginTop: 72 }}>
        <Text style={{ fontSize: 15, letterSpacing: 2 }}>SPOTAI · WORKING NAME</Text>
        <Text style={{ fontSize: 44, fontWeight: '700' }}>You don't choose your character.</Text>
        <Text style={{ fontSize: 44, fontWeight: '700' }}>Your life creates it.</Text>
        <Text style={{ fontSize: 18, opacity: 0.65 }}>Start with what you want more of. Only the moments you choose become part of your Form.</Text>
      </View>
      <Link href="/onboarding" asChild>
        <Pressable style={{ padding: 18, borderWidth: 1, borderRadius: 16 }}><Text style={{ textAlign: 'center', fontSize: 18 }}>Discover my signal</Text></Pressable>
      </Link>
    </SafeAreaView>
  );
}
