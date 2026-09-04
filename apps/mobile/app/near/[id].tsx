import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaStream, RTCView } from 'react-native-webrtc';
import { getNearSession, type NearLevel } from '../../lib/api';
import { NearRtcSessionController } from '../../lib/near-rtc';

type SessionUiState = 'preparing' | 'connecting' | 'connected' | 'ended' | 'failed';

export default function NearSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const controllerRef = useRef<NearRtcSessionController | null>(null);
  const [level, setLevel] = useState<NearLevel>('voice');
  const [state, setState] = useState<SessionUiState>('preparing');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    let controller: NearRtcSessionController | null = null;

    void (async () => {
      try {
        const session = await getNearSession(sessionId);
        if (!mounted) return;
        setLevel(session.level);
        controller = new NearRtcSessionController(sessionId, session.level, {
          onLocalStream: stream => mounted && setLocalStream(stream),
          onRemoteStream: stream => mounted && setRemoteStream(stream),
          onState: next => mounted && setState(next),
          onError: cause => mounted && setError(cause.message)
        });
        controllerRef.current = controller;
        await controller.start();
      } catch (cause) {
        if (!mounted) return;
        setState('failed');
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();

    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') void controllerRef.current?.end();
    });

    return () => {
      mounted = false;
      subscription.remove();
      void controller?.end();
      controllerRef.current = null;
    };
  }, [sessionId]);

  async function end() {
    await controllerRef.current?.end();
    router.replace('/(tabs)');
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    controllerRef.current?.setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    controllerRef.current?.setCameraEnabled(next);
  }

  const hasVideo = level !== 'voice';
  const statusCopy = state === 'preparing' ? 'Preparing your private session…'
    : state === 'connecting' ? 'Finding each other…'
      : state === 'connected' ? 'You are near.'
        : state === 'failed' ? 'Connection could not be completed.'
          : 'Session ended.';

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
    <View style={{ flex: 1 }}>
      {hasVideo && remoteStream ? <RTCView
        streamURL={remoteStream.toURL()}
        objectFit="cover"
        mirror={false}
        style={{ position: 'absolute', inset: 0 }}
      /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <Text style={{ color: '#fff', fontSize: 13, letterSpacing: 3, fontWeight: '800' }}>NEAR · {level.replace('_', ' ').toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '800', textAlign: 'center' }}>{statusCopy}</Text>
        {state === 'connecting' ? <Text style={{ color: '#aaa', textAlign: 'center', lineHeight: 21 }}>Media is not marked connected until both devices establish the transport.</Text> : null}
      </View>}

      {hasVideo && localStream && cameraEnabled ? <RTCView
        streamURL={localStream.toURL()}
        objectFit="cover"
        mirror
        style={{ position: 'absolute', top: 24, right: 18, width: 112, height: 164, borderRadius: 18 }}
      /> : null}

      <View style={{ position: 'absolute', left: 18, right: 18, bottom: 26, gap: 12 }}>
        {error ? <View style={{ backgroundColor: 'rgba(180,35,24,0.9)', padding: 12, borderRadius: 14 }}><Text style={{ color: '#fff' }}>{error}</Text></View> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={toggleMute} style={{ flex: 1, padding: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{muted ? 'Unmute' : 'Mute'}</Text>
          </Pressable>
          {hasVideo ? <Pressable onPress={toggleCamera} style={{ flex: 1, padding: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{cameraEnabled ? 'Camera off' : 'Camera on'}</Text>
          </Pressable> : null}
          {hasVideo ? <Pressable onPress={() => void controllerRef.current?.switchCamera()} style={{ flex: 1, padding: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Flip</Text>
          </Pressable> : null}
        </View>
        <Pressable onPress={() => void end()} style={{ padding: 17, borderRadius: 999, backgroundColor: '#fff' }}>
          <Text style={{ color: '#111', textAlign: 'center', fontSize: 17, fontWeight: '900' }}>Leave NEAR</Text>
        </Pressable>
        <Text style={{ color: '#777', textAlign: 'center', fontSize: 12 }}>Leaving stops local media tracks and reports the session ended.</Text>
      </View>
    </View>
  </SafeAreaView>;
}
