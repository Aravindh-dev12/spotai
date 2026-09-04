import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices
} from 'react-native-webrtc';
import {
  getNearTransport,
  pollNearSignals,
  reportNearTransport,
  sendNearSignal,
  type NearLevel,
  type NearSignalMessage
} from './api';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'spotai.sessionToken';
const SIGNAL_POLL_MS = 500;

interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

interface IceResponse {
  iceServers: IceServerConfig[];
  expiresAt: string | null;
}

export interface NearRtcCallbacks {
  onLocalStream?: (stream: MediaStream | null) => void;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onState?: (state: 'preparing' | 'connecting' | 'connected' | 'ended' | 'failed') => void;
  onError?: (error: Error) => void;
}

async function getIceConfiguration(): Promise<IceResponse> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('signup_required');
  const response = await fetch(`${API_URL}/v1/realtime/ice`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const body = await response.json().catch(() => null) as IceResponse | { error?: string } | null;
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? `ice_config_failed_${response.status}`);
  return body as IceResponse;
}

export class NearRtcSessionController {
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private cursor = '0-0';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private connectedReported = false;
  private pendingIce: RTCIceCandidate[] = [];

  constructor(
    private readonly sessionId: string,
    private readonly level: NearLevel,
    private readonly callbacks: NearRtcCallbacks = {}
  ) {}

  async start() {
    if (this.peer || this.closed) return;
    this.callbacks.onState?.('preparing');
    try {
      const [transport, ice] = await Promise.all([getNearTransport(this.sessionId), getIceConfiguration()]);
      const self = transport.participants.find(item => item.state !== undefined);
      const userIds = transport.participants.map(item => item.userId).sort();
      if (!self || userIds.length !== 2) throw new Error('near_requires_two_participants');

      const token = await AsyncStorage.getItem('spotai.userId');
      if (!token) throw new Error('signup_required');
      const selfUserId = token;
      const peerUserId = userIds.find(id => id !== selfUserId);
      if (!peerUserId) throw new Error('near_peer_not_found');

      const wantsVideo = this.level !== 'voice';
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: wantsVideo ? { facingMode: 'user', width: 1280, height: 720, frameRate: 30 } : false
      });
      this.callbacks.onLocalStream?.(this.localStream);

      const peer = new RTCPeerConnection({ iceServers: ice.iceServers });
      this.peer = peer;
      this.localStream.getTracks().forEach(track => peer.addTrack(track, this.localStream!));

      peer.addEventListener('icecandidate', event => {
        if (!event.candidate || this.closed) return;
        void sendNearSignal(this.sessionId, 'ice', JSON.stringify(event.candidate)).catch(error => this.fail(error));
      });
      peer.addEventListener('track', event => {
        const stream = event.streams?.[0];
        if (!stream) return;
        this.remoteStream = stream;
        this.callbacks.onRemoteStream?.(stream);
      });
      peer.addEventListener('connectionstatechange', () => {
        const state = peer.connectionState;
        if (state === 'connected' && !this.connectedReported) {
          this.connectedReported = true;
          this.callbacks.onState?.('connected');
          void reportNearTransport(this.sessionId, 'connected').catch(error => this.fail(error));
        } else if (state === 'failed') {
          void this.fail(new Error('rtc_connection_failed'));
        } else if (state === 'closed' && !this.closed) {
          void this.finish(false);
        }
      });

      await reportNearTransport(this.sessionId, 'connecting');
      this.callbacks.onState?.('connecting');
      this.schedulePoll(0);

      const initiator = selfUserId.localeCompare(peerUserId) < 0;
      if (initiator) {
        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: wantsVideo });
        await peer.setLocalDescription(offer);
        await sendNearSignal(this.sessionId, 'offer', JSON.stringify(offer));
      }
    } catch (error) {
      await this.fail(error);
      throw error;
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(track => { track.enabled = enabled; });
  }

  async switchCamera() {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return;
    const settings = track.getSettings();
    const next = settings.facingMode === 'environment' ? 'user' : 'environment';
    await track.applyConstraints({ facingMode: next });
  }

  async end() {
    if (this.closed) return;
    try { await sendNearSignal(this.sessionId, 'hangup', '{}'); } catch {}
    await this.finish(true);
  }

  private schedulePoll(delay = SIGNAL_POLL_MS) {
    if (this.closed) return;
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private async poll() {
    if (this.closed) return;
    try {
      const result = await pollNearSignals(this.sessionId, this.cursor);
      this.cursor = result.cursor;
      for (const message of result.messages) await this.handleSignal(message);
      if (result.closed) return void this.finish(false);
      this.schedulePoll();
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.schedulePoll(1_000);
    }
  }

  private async handleSignal(message: NearSignalMessage) {
    const peer = this.peer;
    if (!peer || this.closed) return;

    if (message.type === 'hangup') {
      await this.finish(false);
      return;
    }
    if (message.type === 'offer') {
      const description = new RTCSessionDescription(JSON.parse(message.payload));
      await peer.setRemoteDescription(description);
      await this.flushPendingIce();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendNearSignal(this.sessionId, 'answer', JSON.stringify(answer));
      return;
    }
    if (message.type === 'answer') {
      await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(message.payload)));
      await this.flushPendingIce();
      return;
    }
    if (message.type === 'ice') {
      const candidate = new RTCIceCandidate(JSON.parse(message.payload));
      if (peer.remoteDescription) await peer.addIceCandidate(candidate);
      else this.pendingIce.push(candidate);
    }
  }

  private async flushPendingIce() {
    const peer = this.peer;
    if (!peer?.remoteDescription) return;
    const queued = this.pendingIce.splice(0);
    for (const candidate of queued) await peer.addIceCandidate(candidate);
  }

  private async fail(cause: unknown) {
    if (this.closed) return;
    const error = cause instanceof Error ? cause : new Error(String(cause));
    this.callbacks.onError?.(error);
    this.callbacks.onState?.('failed');
    try { await reportNearTransport(this.sessionId, 'failed'); } catch {}
    this.dispose();
  }

  private async finish(report: boolean) {
    if (this.closed) return;
    this.callbacks.onState?.('ended');
    if (report) {
      try { await reportNearTransport(this.sessionId, 'ended'); } catch {}
    }
    this.dispose();
  }

  private dispose() {
    if (this.closed) return;
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peer?.close();
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callbacks.onLocalStream?.(null);
    this.callbacks.onRemoteStream?.(null);
  }
}
