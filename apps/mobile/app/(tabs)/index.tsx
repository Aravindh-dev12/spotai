import { useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { getCurrentForm, getFormHistory, type FormHistoryItem, type FormState } from '../../lib/api';

const traitLabels = ['explore', 'connect', 'create', 'move', 'build', 'care'] as const;

function DeltaRow({ item }: { item: FormHistoryItem }) {
  const changes = traitLabels
    .map(key => [key, item.deltaTraits[key]] as const)
    .filter(([, value]) => value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3);

  return <View style={{ padding: 16, borderWidth: 1, borderRadius: 16, gap: 8 }}>
    <Text style={{ fontWeight: '700' }}>{item.changeType === 'awakened' ? `FORM AWAKENED · ${item.archetype}` : 'FORM CHANGED'}</Text>
    <Text>{item.reason}</Text>
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
      {changes.map(([key, value]) => <Text key={key} style={{ fontWeight: '600' }}>{key.toUpperCase()} {value > 0 ? '+' : ''}{value}</Text>)}
    </View>
    <Text style={{ opacity: 0.5 }}>{item.awakeningProgress}% · {item.rulesVersion}</Text>
  </View>;
}

export default function YouScreen() {
  const [form, setForm] = useState<FormState | null>(null);
  const [history, setHistory] = useState<FormHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [nextForm, nextHistory] = await Promise.all([getCurrentForm(), getFormHistory()]);
      setForm(nextForm);
      setHistory(nextHistory.history);
    } finally { setLoading(false); }
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

      <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 12 }}>Current traits</Text>
      <View style={{ gap: 8 }}>
        {traitLabels.map(key => <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>{key.toUpperCase()}</Text><Text style={{ fontWeight: '700' }}>{form?.traits?.[key] ?? 0}</Text>
        </View>)}
      </View>

      <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 20 }}>Why my Form changed</Text>
      <Text style={{ opacity: 0.58 }}>Only moments you chose to count are used. Removing a moment recomputes this history.</Text>
      {history.slice(0, 8).map(item => <DeltaRow key={item.id} item={item} />)}
      {!history.length ? <Text style={{ opacity: 0.55 }}>Record your first chosen moment to begin building an explainable history.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
