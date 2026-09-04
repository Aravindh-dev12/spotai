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
    setLoading(true);
    setError(null);
    try {
      await signUp({ handle: handle.trim() || undefined, birthDate });
      router.replace('/onboarding');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: '#fff' }}>
    <View style={{ marginTop: 56, gap: 14 }}>
      <Text style={{ letterSpacing: 2, fontWeight: '700' }}>18+ ALPHA</Text>
      <Text style={{ fontSize: 40, lineHeight: 44, fontWeight: '800' }}>Create your person identity.</Text>
      <Text style={{ opacity: 0.62, fontSize: 17, lineHeight: 24 }}>Your account is a real person. Relationships only become active when the other person accepts.</Text>
      <TextInput value={handle} onChangeText={setHandle} autoCapitalize="none" autoCorrect={false} placeholder="Handle (optional)" style={{ borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 14, padding: 16, fontSize: 17 }} />
      <TextInput value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" placeholder="Birth date · YYYY-MM-DD" style={{ borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 14, padding: 16, fontSize: 17 }} />
      <Text style={{ opacity: 0.55 }}>Birth date is used for the adult launch gate in this alpha.</Text>
      {error ? <Text style={{ color: '#b42318' }}>{error}</Text> : null}
    </View>
    <Pressable onPress={() => void submit()} disabled={loading || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)} style={{ marginTop: 'auto', marginBottom: 24, borderRadius: 999, padding: 18, backgroundColor: '#111', opacity: loading || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? 0.4 : 1 }}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ textAlign: 'center', fontSize: 18, color: '#fff', fontWeight: '800' }}>Continue</Text>}
    </Pressable>
  </SafeAreaView>;
}
