import { useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { getSeasonRecap, type SeasonRecap } from '../../lib/api';

export default function SeasonScreen() {
  const [recap, setRecap] = useState<SeasonRecap | null>(null);
  const [loading, setLoading] = useState(false);
  async function load() { setLoading(true); try { setRecap(await getSeasonRecap()); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);

  return <SafeAreaView style={{ flex: 1 }}><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ marginTop: 28, letterSpacing: 2 }}>THIS SEASON</Text>
    <Text style={{ fontSize: 38, fontWeight: '800' }}>Your month is becoming a history, not a feed.</Text>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Metric value={recap?.signalCount ?? 0} label="moments" />
      <Metric value={recap?.mediaSupported ?? 0} label="with media" />
      <Metric value={recap?.friendConfirmed ?? 0} label="friend confirmed" />
    </View>
    <Text style={{ fontSize: 25, fontWeight: '700', marginTop: 12 }}>{recap?.form?.archetype ?? 'UNKNOWN FORM'}</Text>
    <Text style={{ fontSize: 18, opacity: 0.6 }}>{recap?.form?.awakeningProgress ?? 0}% awakened this season</Text>
    <Text style={{ marginTop: 24, opacity: 0.6 }}>The production finale will add your cinematic recap and next Life Mode transition here. The current screen uses only stored, user-approved evidence.</Text>
  </ScrollView></SafeAreaView>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={{ flex: 1, borderWidth: 1, borderRadius: 16, padding: 14 }}><Text style={{ fontSize: 28, fontWeight: '800' }}>{value}</Text><Text style={{ opacity: 0.55 }}>{label}</Text></View>;
}
