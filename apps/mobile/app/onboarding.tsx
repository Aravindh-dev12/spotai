import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { createLifeMode } from '../lib/api';

const choices = ['More friends', 'Adventure', 'Confidence', 'Creativity', 'Energy', 'Learning', 'Calm', 'Trying new things'];

export default function Onboarding() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (value: string) => setSelected(current => current.includes(value) ? current.filter(x => x !== value) : current.length < 3 ? [...current, value] : current);

  async function continueFlow() {
    if (!selected.length || loading) return;
    setLoading(true);
    setError(null);
    try {
      await createLifeMode(selected);
      router.replace('/awakening');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 34, fontWeight: '700', marginTop: 48 }}>What do you want more of right now?</Text>
      <Text style={{ marginTop: 12, opacity: 0.6 }}>Choose up to three. This sets direction; it does not assign your Form.</Text>
      <View style={{ gap: 10, marginTop: 28 }}>
        {choices.map(choice => <Pressable key={choice} onPress={() => toggle(choice)} style={{ padding: 16, borderWidth: 1, borderRadius: 14, opacity: selected.includes(choice) ? 1 : 0.55 }}><Text>{selected.includes(choice) ? '✓ ' : ''}{choice}</Text></Pressable>)}
      </View>
      <View style={{ marginTop: 'auto', paddingVertical: 24, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600' }}>{selected.length ? 'UNKNOWN FORM' : 'Choose your direction'}</Text>
        <Text style={{ opacity: 0.6 }}>{selected.length ? 'Your current signal is forming. Live first; your identity awakens from moments you choose to count.' : 'Your Form is never inferred from your face.'}</Text>
        {error ? <Text>{error}</Text> : null}
        <Pressable disabled={!selected.length || loading} onPress={continueFlow} style={{ padding: 18, borderWidth: 1, borderRadius: 16, opacity: selected.length ? 1 : 0.35 }}>
          {loading ? <ActivityIndicator /> : <Text style={{ textAlign: 'center', fontSize: 18 }}>Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
