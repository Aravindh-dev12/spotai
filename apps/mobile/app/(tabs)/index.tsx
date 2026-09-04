import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import {
  ApiError,
  createConnection,
  createNearInvite,
  listConnections,
  listPendingNearInvites,
  respondToConnection,
  respondToNearInvite,
  setPresence,
  type Connection,
  type DeclaredPresenceState,
  type NearInvite,
  type NearLevel
} from '../../lib/api';

const shell = { padding: 24, gap: 16 } as const;
const card = { borderWidth: 1, borderColor: '#d8d8d8', borderRadius: 22, padding: 18, gap: 12 } as const;
const primary = { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#111' } as const;
const secondary = { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: '#cfcfcf' } as const;

function titleFor(connection: Connection) {
  return connection.other.handle ? `@${connection.other.handle}` : connection.other.userId.slice(0, 8);
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return `${error.code}${error.requestId ? ` · ${error.requestId}` : ''}`;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function PresencePill({ state }: { state: string }) {
  return <View style={{ alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' }}>
    <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{state.toUpperCase()}</Text>
  </View>;
}

export default function NowScreen() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nearInvites, setNearInvites] = useState<NearInvite[]>([]);
  const [otherUserId, setOtherUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const incomingConnections = useMemo(
    () => connections.filter(item => item.status === 'pending' && item.myRole === 'invitee' && item.myMembershipStatus === 'invited'),
    [connections]
  );
  const activeConnections = useMemo(() => connections.filter(item => item.status === 'active'), [connections]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectionResult, inviteResult] = await Promise.all([listConnections(), listPendingNearInvites()]);
      setConnections(connectionResult.connections);
      setNearInvites(inviteResult.invites);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusyKey(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusyKey(null);
    }
  }

  async function addConnection() {
    const id = otherUserId.trim();
    if (!id) return;
    await run('new-connection', async () => {
      await createConnection(id);
      setOtherUserId('');
    });
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerStyle={{ ...shell, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ marginTop: 28, gap: 8 }}>
        <Text style={{ fontSize: 13, letterSpacing: 3, fontWeight: '700' }}>NOW</Text>
        <Text style={{ fontSize: 40, fontWeight: '800', lineHeight: 44 }}>Who feels close right now?</Text>
        <Text style={{ fontSize: 17, lineHeight: 24, opacity: 0.62 }}>Presence is declared, temporary, and relationship-specific. You decide when people can see you.</Text>
      </View>

      {error ? <View style={{ ...card, borderColor: '#b42318' }}>
        <Text style={{ color: '#b42318', fontWeight: '700' }}>Could not complete that action</Text>
        <Text style={{ color: '#b42318' }}>{error}</Text>
      </View> : null}

      <View style={card}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>Add someone you trust</Text>
        <Text style={{ opacity: 0.6 }}>Temporary developer flow: enter their user ID. Contact discovery replaces this before public release.</Text>
        <TextInput
          value={otherUserId}
          onChangeText={setOtherUserId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="User UUID"
          style={{ borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 14, padding: 14 }}
        />
        <Pressable disabled={!otherUserId.trim() || busyKey !== null} onPress={() => void addConnection()} style={{ ...primary, opacity: !otherUserId.trim() || busyKey !== null ? 0.4 : 1 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{busyKey === 'new-connection' ? 'Sending…' : 'Request Connection'}</Text>
        </Pressable>
      </View>

      {incomingConnections.length ? <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Connection requests</Text>
        {incomingConnections.map(item => <View key={item.id} style={card}>
          <Text style={{ fontSize: 19, fontWeight: '800' }}>{titleFor(item)}</Text>
          <Text style={{ opacity: 0.62 }}>Wants to create a persistent US connection with you.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={busyKey !== null} onPress={() => void run(`connection:${item.id}:accept`, () => respondToConnection(item.id, 'accept'))} style={{ ...primary, flex: 1 }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Accept</Text>
            </Pressable>
            <Pressable disabled={busyKey !== null} onPress={() => void run(`connection:${item.id}:decline`, () => respondToConnection(item.id, 'decline'))} style={{ ...secondary, flex: 1 }}>
              <Text style={{ textAlign: 'center', fontWeight: '700' }}>Decline</Text>
            </Pressable>
          </View>
        </View>)}
      </View> : null}

      {nearInvites.length ? <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Come Near</Text>
        {nearInvites.map(invite => <View key={invite.id} style={card}>
          <Text style={{ fontSize: 19, fontWeight: '800' }}>{invite.inviterHandle ? `@${invite.inviterHandle}` : invite.inviterUserId.slice(0, 8)}</Text>
          <Text style={{ opacity: 0.62 }}>Invited you to {invite.level.replace('_', ' ')}. Accepting authorizes the attempt; it does not turn on your camera or microphone by itself.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={busyKey !== null} onPress={() => void run(`near:${invite.id}:accept`, () => respondToNearInvite(invite.id, 'accept'))} style={{ ...primary, flex: 1 }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Come Near</Text>
            </Pressable>
            <Pressable disabled={busyKey !== null} onPress={() => void run(`near:${invite.id}:decline`, () => respondToNearInvite(invite.id, 'decline'))} style={{ ...secondary, flex: 1 }}>
              <Text style={{ textAlign: 'center', fontWeight: '700' }}>Not now</Text>
            </Pressable>
          </View>
        </View>)}
      </View> : null}

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Your people</Text>
        {loading && !connections.length ? <ActivityIndicator /> : null}
        {!loading && !activeConnections.length ? <Text style={{ opacity: 0.58 }}>No active Connections yet. A Connection becomes active only after the other person accepts.</Text> : null}
        {activeConnections.map(item => <ConnectionCard key={item.id} item={item} busy={busyKey !== null} run={run} />)}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function ConnectionCard({ item, busy, run }: { item: Connection; busy: boolean; run: (key: string, action: () => Promise<unknown>) => Promise<void> }) {
  const [presenceState, setPresenceState] = useState<DeclaredPresenceState>('around');
  const [nearLevel, setNearLevel] = useState<NearLevel>('voice');
  const name = titleFor(item);

  return <View style={card}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <View style={{ gap: 5, flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>{name}</Text>
        <Text style={{ opacity: 0.55 }}>US · {item.other.presence.representation.replace('_', ' ')}</Text>
      </View>
      <PresencePill state={item.other.presence.state} />
    </View>

    <Text style={{ fontWeight: '700' }}>Your presence with {name}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['away', 'around', 'present'] as DeclaredPresenceState[]).map(state => <Pressable
        key={state}
        disabled={busy}
        onPress={() => setPresenceState(state)}
        style={{ ...(presenceState === state ? primary : secondary), paddingVertical: 10 }}
      ><Text style={{ color: presenceState === state ? '#fff' : '#111', fontWeight: '700' }}>{state.toUpperCase()}</Text></Pressable>)}
    </View>
    <Pressable disabled={busy} onPress={() => void run(`presence:${item.id}`, () => setPresence(item.id, presenceState, 'signal', presenceState === 'away' ? 60 : 1800))} style={secondary}>
      <Text style={{ textAlign: 'center', fontWeight: '800' }}>{presenceState === 'away' ? 'Step away' : 'Share for 30 minutes'}</Text>
    </Pressable>

    <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 2 }} />
    <Text style={{ fontWeight: '700' }}>COME NEAR</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['voice', 'camera', 'shared_reality'] as NearLevel[]).map(level => <Pressable
        key={level}
        disabled={busy}
        onPress={() => setNearLevel(level)}
        style={{ ...(nearLevel === level ? primary : secondary), paddingVertical: 10 }}
      ><Text style={{ color: nearLevel === level ? '#fff' : '#111', fontWeight: '700' }}>{level.replace('_', ' ').toUpperCase()}</Text></Pressable>)}
    </View>
    <Pressable disabled={busy} onPress={() => void run(`near:${item.id}`, () => createNearInvite(item.id, nearLevel))} style={primary}>
      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Invite {name}</Text>
    </Pressable>
    <Text style={{ fontSize: 12, opacity: 0.52 }}>The other person must accept. Camera, microphone and Shared Reality remain bounded by permissions and the later transport handshake.</Text>
  </View>;
}
