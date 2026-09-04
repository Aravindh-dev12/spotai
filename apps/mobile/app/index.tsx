import { Link } from 'expo-router';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: '#fff' }}>
      <View style={{ gap: 18, marginTop: 72 }}>
        <Text style={{ fontSize: 13, letterSpacing: 3, fontWeight: '700' }}>SPOTAI · WORKING NAME</Text>
        <Text style={{ fontSize: 48, lineHeight: 52, fontWeight: '800' }}>Feel closer to the people who matter.</Text>
        <Text style={{ fontSize: 18, lineHeight: 26, opacity: 0.64 }}>No feed. No follower count. You control when you are around, present, or ready to come near.</Text>
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>SEE WHO IS HERE</Text>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>COME NEAR</Text>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>EXPERIENCE TOGETHER</Text>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>RETURN TO THE RELATIONSHIP</Text>
        </View>
      </View>
      <View style={{ gap: 12, marginBottom: 24 }}>
        <Text style={{ opacity: 0.55, lineHeight: 20 }}>18+ alpha. Presence is explicit and temporary. Camera, microphone, recording, AI memory and Shared Reality never bypass your permissions.</Text>
        <Link href="/signup" asChild>
          <Pressable style={{ padding: 18, borderRadius: 999, backgroundColor: '#111' }}>
            <Text style={{ textAlign: 'center', fontSize: 18, color: '#fff', fontWeight: '800' }}>Enter NEAR</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
