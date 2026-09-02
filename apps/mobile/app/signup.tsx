import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { signUp } from '../lib/api';

export default function Signup() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (loading || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return;
    setLoading(true); setError(null);
    try {
      await signUp({ handle: handle.trim() || undefined, birthDate });
      router.replace('/onboarding');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create account');
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={{ flex: 1, padding: 24 }}>
    <View style={{ marginTop: 56, gap: 14 }}>
      <Text style={{ letterSpacing: 2 }}>18+ ALPHA</Text>
      <Text style={{ fontSize: 38, fontWeight: '700' }}>Start your life identity.</Text>
      <Text style={{ opacity: 0.62, fontSize: 17 }}>Only moments you explicitly choose can affect your Form.</Text>
      <TextInput value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="Handle (optional)" style={{ borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 17 }} />
      <TextInput value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" placeholder="Birth date · YYYY-MM-DD" style={{ borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 17 }} />
      <Text style={{ opacity: 0.55 }}>We use birth date only for the adult launch gate in this alpha.</Text>
      {error ? <Text>{error}</Text> : null}
    </View>
    <Pressable onPress={submit} disabled={loading || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)} style={{ marginTop: 'auto', marginBottom: 24, borderWidth: 1, borderRadius: 16, padding: 18 }}>
      {loading ? <ActivityIndicator /> : <Text style={{ textAlign: 'center', fontSize: 18 }}>Continue</Text>}
    </Pressable>
  </SafeAreaView>;
}
