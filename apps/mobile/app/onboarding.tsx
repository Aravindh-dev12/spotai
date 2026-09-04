import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

const principles = [
  ['Presence expires', 'AROUND and PRESENT are temporary declarations. You can step away whenever you want.'],
  ['Closeness is mutual', 'NEAR and TOGETHER only happen through mutual interaction. The app does not infer intimacy.'],
  ['Media stays permissioned', 'Camera, microphone, Shared Reality, recording and AI memory never bypass your choices.']
] as const;

export default function Onboarding() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: '#fff' }}>
      <View style={{ marginTop: 48, gap: 12 }}>
        <Text style={{ fontSize: 13, letterSpacing: 3, fontWeight: '700' }}>HOW NEAR WORKS</Text>
        <Text style={{ fontSize: 38, lineHeight: 43, fontWeight: '800' }}>Closer, without losing boundaries.</Text>
        <Text style={{ fontSize: 17, lineHeight: 24, opacity: 0.62 }}>The relationship is the durable object. Presence is temporary. Increasing intimacy always requires explicit permission.</Text>
      </View>

      <View style={{ marginTop: 30, gap: 12 }}>
        {principles.map(([title, body], index) => <View key={title} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 20, padding: 18, gap: 8 }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, opacity: 0.5 }}>0{index + 1}</Text>
          <Text style={{ fontSize: 19, fontWeight: '800' }}>{title}</Text>
          <Text style={{ opacity: 0.62, lineHeight: 21 }}>{body}</Text>
        </View>)}
      </View>

      <View style={{ marginTop: 'auto', paddingVertical: 24, gap: 12 }}>
        <Pressable onPress={() => setAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <View style={{ width: 24, height: 24, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: accepted ? '#111' : '#fff' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{accepted ? '✓' : ''}</Text>
          </View>
          <Text style={{ flex: 1, lineHeight: 20 }}>I understand that presence and media access remain under my control.</Text>
        </Pressable>
        <Pressable disabled={!accepted} onPress={() => router.replace('/(tabs)')} style={{ padding: 18, borderRadius: 999, backgroundColor: '#111', opacity: accepted ? 1 : 0.35 }}>
          <Text style={{ textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '800' }}>Open NOW</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
