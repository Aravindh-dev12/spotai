import { useState } from 'react';
import { SafeAreaView, Text, View, Pressable } from 'react-native';

const choices = ['More friends', 'Adventure', 'Confidence', 'Creativity', 'Energy', 'Learning', 'Calm', 'Trying new things'];

export default function Onboarding() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (value: string) => setSelected(current => current.includes(value) ? current.filter(x => x !== value) : current.length < 3 ? [...current, value] : current);
  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 34, fontWeight: '700', marginTop: 48 }}>What do you want more of right now?</Text>
      <Text style={{ marginTop: 12, opacity: 0.6 }}>Choose up to three. This sets direction; it does not assign your Form.</Text>
      <View style={{ gap: 10, marginTop: 28 }}>
        {choices.map(choice => <Pressable key={choice} onPress={() => toggle(choice)} style={{ padding: 16, borderWidth: 1, borderRadius: 14, opacity: selected.includes(choice) ? 1 : 0.55 }}><Text>{selected.includes(choice) ? '✓ ' : ''}{choice}</Text></Pressable>)}
      </View>
      <View style={{ marginTop: 'auto', paddingVertical: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '600' }}>{selected.length ? 'UNKNOWN FORM' : 'Choose your direction'}</Text>
        <Text style={{ marginTop: 8, opacity: 0.6 }}>{selected.length ? 'Your current signal is forming. Live first; your identity awakens from moments you choose to count.' : 'Your Form is never inferred from your face.'}</Text>
      </View>
    </SafeAreaView>
  );
}
