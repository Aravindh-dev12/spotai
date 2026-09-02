import { useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { getCurrentForm, type FormState } from '../../lib/api';

export default function YouScreen() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setForm(await getCurrentForm()); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <SafeAreaView style={{ flex: 1 }}>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ marginTop: 28, letterSpacing: 2 }}>YOUR FORM</Text>
      <Text style={{ fontSize: 46, fontWeight: '800' }}>{form?.archetype ?? 'UNKNOWN'}</Text>
      <Text style={{ fontSize: 19, opacity: 0.6 }}>{form?.awakeningProgress ?? 0}% awakened</Text>
      <View style={{ height: 12, borderWidth: 1, borderRadius: 99, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${form?.awakeningProgress ?? 0}%`, backgroundColor: '#111' }} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 20 }}>Why it changed</Text>
      {(form?.reasons ?? []).slice(-5).reverse().map(reason => <View key={reason.signalId} style={{ padding: 16, borderWidth: 1, borderRadius: 16, gap: 6 }}>
        <Text>{reason.rationale}</Text>
        <Text style={{ opacity: 0.5 }}>confidence {Math.round(reason.confidence * 100)}%</Text>
      </View>)}
      {!form?.reasons?.length ? <Text style={{ opacity: 0.55 }}>Record your first chosen moment to begin building an explainable history.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
