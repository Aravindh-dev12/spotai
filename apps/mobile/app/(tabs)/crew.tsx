import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { createCrew, createCrewInvite, joinCrew, listCrews, type Crew } from '../../lib/api';

export default function CrewScreen() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function load() { try { setCrews((await listCrews()).crews); } catch (e) { setMessage(String(e)); } }
  useEffect(() => { void load(); }, []);

  async function addCrew() {
    try { await createCrew(name.trim() || undefined); setName(''); await load(); } catch (e) { setMessage(String(e)); }
  }
  async function invite(crewId: string) {
    try {
      const result = await createCrewInvite(crewId);
      setMessage(`Invite token: ${result.token}\nShare the deep link privately with someone you want in this Crew.`);
    } catch (e) { setMessage(String(e)); }
  }
  async function join() {
    try { await joinCrew(inviteToken.trim()); setInviteToken(''); setMessage('Joined Crew.'); await load(); } catch (e) { setMessage(String(e)); }
  }

  return <SafeAreaView style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ marginTop: 28, letterSpacing: 2 }}>CREW</Text>
    <Text style={{ fontSize: 36, fontWeight: '800' }}>Identity gets stronger with people you actually know.</Text>
    <Text style={{ opacity: 0.6 }}>Crews are intentionally small. No follower counts, public feed, or strangers-by-default.</Text>

    <View style={{ gap: 10, paddingVertical: 12 }}>
      <TextInput value={name} onChangeText={setName} placeholder="Crew name (optional)" style={{ borderWidth: 1, borderRadius: 14, padding: 15 }} />
      <Pressable onPress={addCrew} style={{ borderWidth: 1, borderRadius: 14, padding: 16 }}><Text style={{ textAlign: 'center' }}>Create Crew</Text></Pressable>
    </View>

    {crews.map(crew => <View key={crew.id} style={{ borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 21, fontWeight: '700' }}>{crew.name ?? 'Unnamed Crew'}</Text>
      <Text style={{ opacity: 0.55 }}>{crew.memberCount ?? 1} members · {crew.role ?? 'member'}</Text>
      <Pressable onPress={() => invite(crew.id)} style={{ paddingVertical: 10 }}><Text>Invite someone →</Text></Pressable>
    </View>)}

    <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 12 }}>Join with invite</Text>
    <TextInput value={inviteToken} onChangeText={setInviteToken} autoCapitalize="none" placeholder="Paste invite token" style={{ borderWidth: 1, borderRadius: 14, padding: 15 }} />
    <Pressable onPress={join} disabled={!inviteToken.trim()} style={{ borderWidth: 1, borderRadius: 14, padding: 16, opacity: inviteToken.trim() ? 1 : 0.35 }}><Text style={{ textAlign: 'center' }}>Join Crew</Text></Pressable>
    {message ? <Text>{message}</Text> : null}
  </ScrollView></SafeAreaView>;
}
