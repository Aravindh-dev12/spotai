import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, Text, TextInput, View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { addLifeSignal, type FormState } from '../lib/api';

const traitKeys: Array<keyof FormState['traits']> = ['explore', 'connect', 'create', 'move', 'build', 'care'];

export default function Awakening() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [state, setState] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await addLifeSignal(description.trim());
      setState(result.form);
      setDescription('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this moment');
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text style={{ marginTop: 36, letterSpacing: 2 }}>UNKNOWN FORM</Text>
    <Text style={{ fontSize: 38, fontWeight: '700' }}>What happened that should count?</Text>
    <Text style={{ opacity: 0.62, fontSize: 17 }}>You choose the moments. We use them to build an explainable signal over time.</Text>
    <TextInput value={description} onChangeText={setDescription} multiline placeholder="Example: I went to a new place with two friends instead of staying home." style={{ minHeight: 130, borderWidth: 1, borderRadius: 16, padding: 16, textAlignVertical: 'top', fontSize: 17 }} />
    <Pressable onPress={submit} disabled={!description.trim() || loading} style={{ padding: 18, borderWidth: 1, borderRadius: 16, opacity: description.trim() ? 1 : 0.35 }}>
      {loading ? <ActivityIndicator /> : <Text style={{ textAlign: 'center', fontSize: 18 }}>Count this moment</Text>}
    </Pressable>
    {error ? <Text>{error}</Text> : null}
    {state ? <View style={{ marginTop: 18, gap: 10 }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>{state.archetype ?? 'UNKNOWN FORM'}</Text>
      <Text style={{ fontSize: 18 }}>{state.awakeningProgress}% awakened</Text>
      <View style={{ height: 10, borderWidth: 1, borderRadius: 99, overflow: 'hidden' }}><View style={{ height: '100%', width: `${state.awakeningProgress}%`, backgroundColor: '#111' }} /></View>
      {traitKeys.map(key => <Text key={key}>{key.toUpperCase()} · {state.traits[key].toFixed(1)}</Text>)}
      <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 14, padding: 18, borderWidth: 1, borderRadius: 16 }}><Text style={{ textAlign: 'center', fontSize: 18 }}>Open my Form</Text></Pressable>
    </View> : null}
  </ScrollView></SafeAreaView>;
}
