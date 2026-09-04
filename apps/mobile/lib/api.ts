import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'spotai.sessionToken';
const USER_KEY = 'spotai.userId';
const SEASON_KEY = 'spotai.activeSeasonId';
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(public code: string, public status: number, public requestId?: string) {
    super(code);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = authenticated ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) }
    });
    const requestId = response.headers.get('x-request-id') ?? undefined;
    const text = await response.text();
    let body: any = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = { error: `invalid_response_${response.status}` }; }
    }
    if (response.status === 401 && authenticated) {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, SEASON_KEY]);
    }
    if (!response.ok) throw new ApiError(body?.error ?? `request_failed_${response.status}`, response.status, requestId);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('request_timeout', 0);
    throw new ApiError('network_unavailable', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export async function signUp(input: { handle?: string; birthDate: string }) {
  const session = await request<{ user: { id: string }; token: string }>('/v1/auth/guest', { method: 'POST', body: JSON.stringify(input) }, false);
  await AsyncStorage.multiSet([[TOKEN_KEY, session.token], [USER_KEY, session.user.id]]);
  return session;
}

export async function ensureSession() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const userId = await AsyncStorage.getItem(USER_KEY);
  if (!token || !userId) throw new Error('signup_required');
  let seasonId = await AsyncStorage.getItem(SEASON_KEY);
  if (!seasonId) {
    const active = await request<{ season: { id: string } | null }>('/v1/seasons/active');
    seasonId = active.season?.id ?? null;
  }
  if (!seasonId) {
    const season = await request<{ id: string }>('/v1/seasons', {
      method: 'POST', body: JSON.stringify({ label: new Date().toLocaleString('en', { month: 'long' }).toUpperCase(), days: 30 })
    });
    seasonId = season.id;
  }
  await AsyncStorage.setItem(SEASON_KEY, seasonId);
  return { userId, seasonId };
}

export async function createLifeMode(wantsMore: string[], wantsLess: string[] = [], desiredFeeling?: string) {
  const { seasonId } = await ensureSession();
  return request<{ id: string; label: string }>('/v1/life-modes', {
    method: 'POST', body: JSON.stringify({ seasonId, wantsMore, wantsLess, desiredFeeling })
  });
}

export async function addLifeSignal(description: string, mediaIds: string[] = []) {
  const { seasonId } = await ensureSession();
  return request<{ form: FormState }>('/v1/life-signals', {
    method: 'POST', body: JSON.stringify({ seasonId, description, evidenceLevel: mediaIds.length ? 'media' : 'self', mediaIds, visibility: 'private' })
  });
}

export async function listLifeSignals() {
  const { seasonId } = await ensureSession();
  return request<{ signals: LifeSignalSummary[] }>(`/v1/life-signals?seasonId=${encodeURIComponent(seasonId)}`);
}

export async function deleteLifeSignal(signalId: string) {
  const { seasonId } = await ensureSession();
  return request<{ deleted: true; form: FormState }>(`/v1/life-signals/${encodeURIComponent(signalId)}?seasonId=${encodeURIComponent(seasonId)}`, { method: 'DELETE' });
}

export async function getCurrentForm() {
  const { seasonId } = await ensureSession();
  return request<FormState>(`/v1/form?seasonId=${encodeURIComponent(seasonId)}`);
}

export async function getFormHistory() {
  const { seasonId } = await ensureSession();
  return request<{ history: FormHistoryItem[] }>(`/v1/form/history?seasonId=${encodeURIComponent(seasonId)}`);
}

export async function listConnections() {
  return request<{ connections: Connection[] }>('/v1/connections');
}

export async function createConnection(otherUserId: string) {
  return request<{ id: string; status: ConnectionStatus; created: boolean; createdByUserId: string }>('/v1/connections', {
    method: 'POST',
    body: JSON.stringify({ otherUserId, clientRequestId: Crypto.randomUUID() })
  });
}

export async function respondToConnection(connectionId: string, action: 'accept' | 'decline') {
  return request<{ connectionId: string; status: ConnectionStatus; accepted: boolean; alreadyResolved: boolean }>(`/v1/connections/${encodeURIComponent(connectionId)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}

export async function setPresence(connectionId: string, state: DeclaredPresenceState, representation: PresenceRepresentation = 'signal', ttlSeconds = 1800) {
  return request<Presence>(`/v1/connections/${encodeURIComponent(connectionId)}/presence`, {
    method: 'PUT',
    body: JSON.stringify({ state, representation, ttlSeconds })
  });
}

export async function createNearInvite(connectionId: string, level: NearLevel) {
  return request<NearInvite & { reused: boolean }>(`/v1/connections/${encodeURIComponent(connectionId)}/near-invites`, {
    method: 'POST',
    body: JSON.stringify({ clientRequestId: Crypto.randomUUID(), level })
  });
}

export async function listPendingNearInvites() {
  return request<{ invites: NearInvite[] }>('/v1/near-invites/pending');
}

export async function respondToNearInvite(inviteId: string, action: 'accept' | 'decline') {
  return request<{ accepted: boolean; connectionId: string; session?: NearSession | null }>(`/v1/near-invites/${encodeURIComponent(inviteId)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}

export async function getNearSession(sessionId: string) {
  return request<NearSession>(`/v1/near-sessions/${encodeURIComponent(sessionId)}`);
}

export async function getNearTransport(sessionId: string) {
  return request<NearTransportSnapshot>(`/v1/near-sessions/${encodeURIComponent(sessionId)}/transport`);
}

export async function reportNearTransport(sessionId: string, state: NearParticipantTransportState) {
  return request<NearTransportReport>(`/v1/near-sessions/${encodeURIComponent(sessionId)}/transport`, {
    method: 'POST',
    body: JSON.stringify({ state, observedAt: new Date().toISOString() })
  });
}

export async function sendNearSignal(sessionId: string, type: NearSignalType, payload: string) {
  return request<{ accepted: boolean; duplicate: boolean; cursor?: string | null }>(`/v1/near-sessions/${encodeURIComponent(sessionId)}/signals`, {
    method: 'POST',
    body: JSON.stringify({ clientMessageId: Crypto.randomUUID(), type, payload })
  });
}

export async function pollNearSignals(sessionId: string, after = '0-0') {
  return request<NearSignalPoll>(`/v1/near-sessions/${encodeURIComponent(sessionId)}/signals?after=${encodeURIComponent(after)}`);
}

export async function listCrews() { return request<{ crews: Crew[] }>('/v1/crews'); }
export async function createCrew(name?: string) { return request<Crew>('/v1/crews', { method: 'POST', body: JSON.stringify({ name }) }); }
export async function createCrewInvite(crewId: string) { return request<{ token: string; deepLink: string }>(`/v1/crews/${crewId}/invites`, { method: 'POST', body: '{}' }); }
export async function joinCrew(token: string) { return request<{ crewId: string }>('/v1/crews/join', { method: 'POST', body: JSON.stringify({ token }) }); }

export async function createUploadIntent(contentType: 'image/jpeg'|'image/png'|'image/webp'|'video/mp4', purpose: 'life_signal'|'form_reveal'|'memory'|'crew', participantUserIds: string[] = []) {
  return request<{ media: { id: string; consentRequired?: boolean }; uploadUrl: string; requiredHeaders: Record<string,string> }>('/v1/media/upload-intents', {
    method: 'POST', body: JSON.stringify({ contentType, purpose, participantUserIds })
  });
}

export async function uploadFile(uploadUrl: string, uri: string, contentType: string) {
  const local = await fetch(uri);
  const blob = await local.blob();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(uploadUrl, { method: 'PUT', signal: controller.signal, headers: { 'content-type': contentType }, body: blob });
    if (!response.ok) throw new ApiError(`upload_failed_${response.status}`, response.status);
    return blob.size;
  } finally {
    clearTimeout(timeout);
  }
}

export async function completeMedia(mediaId: string, byteSize?: number) { return request(`/v1/media/${mediaId}/complete`, { method: 'POST', body: JSON.stringify({ byteSize }) }); }
export async function approveMediaConsent(mediaId: string) { return request<{ mediaId: string; status: 'approved' }>(`/v1/media/${mediaId}/consent`, { method: 'POST', body: '{}' }); }

export async function createReveal(sourceMediaId: string) {
  const { seasonId } = await ensureSession();
  return request<{ id: string; status: string }>('/v1/reveals', { method: 'POST', body: JSON.stringify({ seasonId, sourceMediaId }) });
}

export async function getSeasonRecap() {
  const { seasonId } = await ensureSession();
  return request<SeasonRecap>(`/v1/seasons/${seasonId}/recap`);
}

export type ConnectionStatus = 'pending' | 'active' | 'blocked' | 'ended';
export type DeclaredPresenceState = 'away' | 'around' | 'present';
export type PresenceState = DeclaredPresenceState | 'near' | 'together';
export type PresenceRepresentation = 'signal' | 'voice' | 'camera' | 'shared_reality';
export type NearLevel = 'voice' | 'camera' | 'shared_reality';
export type NearParticipantTransportState = 'idle' | 'connecting' | 'connected' | 'ended' | 'failed';
export type NearSignalType = 'offer' | 'answer' | 'ice' | 'hangup';

export interface Presence {
  state: PresenceState;
  representation: PresenceRepresentation;
  expiresAt: string | null;
}

export interface ConnectionPermissions {
  sharePresence: boolean;
  voice: boolean;
  camera: boolean;
  sharedReality: boolean;
  aiMemory: boolean;
  privateMoments: boolean;
  matureThemes: boolean;
  sensitiveMedia: boolean;
  recording: 'never' | 'ask_every_time';
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  createdByUserId: string;
  createdAt: string | null;
  activatedAt: string | null;
  myRole: 'initiator' | 'invitee';
  myMembershipStatus: 'active' | 'invited' | 'left';
  other: {
    userId: string;
    handle: string | null;
    membershipStatus: 'active' | 'invited' | 'left';
    presence: Presence;
  };
  permissions: ConnectionPermissions | null;
}

export interface NearInvite {
  id: string;
  connectionId: string;
  inviterUserId: string;
  inviterHandle: string | null;
  level: NearLevel;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface NearSession {
  id: string;
  connectionId: string;
  level: NearLevel;
  status: 'authorized' | 'connecting' | 'connected' | 'ended' | 'failed';
  createdAt?: string | null;
  connectedAt?: string | null;
  endedAt?: string | null;
}

export interface NearTransportParticipant {
  userId: string;
  state: NearParticipantTransportState;
  observedAt?: string | null;
  updatedAt?: string | null;
}

export interface NearTransportSnapshot {
  session: NearSession;
  participants: NearTransportParticipant[];
}

export interface NearTransportReport {
  session: NearSession;
  changed: boolean;
  previousStatus?: NearSession['status'];
  participantStates: Array<{ userId: string; state: NearParticipantTransportState }>;
}

export interface NearSignalMessage {
  cursor: string;
  senderUserId: string;
  clientMessageId: string;
  type: NearSignalType;
  payload: string;
}

export interface NearSignalPoll {
  messages: NearSignalMessage[];
  cursor: string;
  closed: boolean;
}

export interface FormState {
  userId: string;
  seasonId: string;
  traits: Record<'explore'|'connect'|'create'|'move'|'build'|'care', number>;
  awakeningProgress: number;
  archetype: string | null;
  level: number;
  rulesVersion?: string;
  reasons?: Array<{ signalId: string; rationale: string; confidence: number; evidenceLevel?: string }>;
}
export interface FormHistoryItem {
  id: string;
  triggerSignalId: string | null;
  changeType: string;
  rulesVersion: string;
  deltaTraits: Record<'explore'|'connect'|'create'|'move'|'build'|'care', number>;
  resultingTraits: Record<string, number>;
  awakeningProgress: number;
  archetype: string | null;
  reason: string;
  createdAt: string;
}
export interface LifeSignalSummary { id: string; description: string; evidenceLevel: string; visibility: string; occurredAt: string; createdAt: string; }
export interface Crew { id: string; name: string | null; ownerUserId: string; role?: string; memberCount?: number; }
export interface SeasonRecap { seasonId: string; signalCount: number; friendConfirmed: number; mediaSupported: number; form: { traits: Record<string,number>; awakeningProgress: number; archetype: string | null; level: number } | null; }
