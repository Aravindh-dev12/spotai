import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'spotai.sessionToken';
const USER_KEY = 'spotai.userId';
const SEASON_KEY = 'spotai.activeSeasonId';

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = authenticated ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? `request_failed_${response.status}`);
  return body as T;
}

export async function signUp(input: { handle?: string; birthDate: string }) {
  const session = await request<{ user: { id: string }; token: string }>('/v1/auth/guest', {
    method: 'POST', body: JSON.stringify(input)
  }, false);
  await AsyncStorage.multiSet([[TOKEN_KEY, session.token], [USER_KEY, session.user.id]]);
  return session;
}

export async function ensureSession() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const userId = await AsyncStorage.getItem(USER_KEY);
  if (!token || !userId) throw new Error('signup_required');
  let seasonId = await AsyncStorage.getItem(SEASON_KEY);
  if (!seasonId) {
    const season = await request<{ id: string }>('/v1/seasons', {
      method: 'POST',
      body: JSON.stringify({ label: new Date().toLocaleString('en', { month: 'long' }).toUpperCase(), days: 30 })
    });
    seasonId = season.id;
    await AsyncStorage.setItem(SEASON_KEY, seasonId);
  }
  return { userId, seasonId };
}

export async function createLifeMode(wantsMore: string[]) {
  const { seasonId } = await ensureSession();
  return request<{ id: string; label: string }>('/v1/life-modes', {
    method: 'POST', body: JSON.stringify({ seasonId, wantsMore, wantsLess: [] })
  });
}

export async function addLifeSignal(description: string, mediaIds: string[] = []) {
  const { seasonId } = await ensureSession();
  return request<{ form: FormState }>('/v1/life-signals', {
    method: 'POST',
    body: JSON.stringify({ seasonId, description, evidenceLevel: mediaIds.length ? 'media' : 'self', mediaIds, visibility: 'private' })
  });
}

export async function getCurrentForm() {
  const { seasonId } = await ensureSession();
  return request<FormState>(`/v1/form?seasonId=${encodeURIComponent(seasonId)}`);
}

export async function listCrews() {
  return request<{ crews: Crew[] }>('/v1/crews');
}

export async function createCrew(name?: string) {
  return request<Crew>('/v1/crews', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function createCrewInvite(crewId: string) {
  return request<{ token: string; deepLink: string }>(`/v1/crews/${crewId}/invites`, { method: 'POST', body: '{}' });
}

export async function joinCrew(token: string) {
  return request<{ crewId: string }>('/v1/crews/join', { method: 'POST', body: JSON.stringify({ token }) });
}

export async function createUploadIntent(contentType: 'image/jpeg'|'image/png'|'image/webp'|'video/mp4', purpose: 'life_signal'|'form_reveal'|'memory'|'crew') {
  return request<{ media: { id: string }; uploadUrl: string; requiredHeaders: Record<string,string> }>('/v1/media/upload-intents', {
    method: 'POST', body: JSON.stringify({ contentType, purpose, participantUserIds: [] })
  });
}

export async function uploadFile(uploadUrl: string, uri: string, contentType: string) {
  const local = await fetch(uri);
  const blob = await local.blob();
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': contentType }, body: blob });
  if (!response.ok) throw new Error(`upload_failed_${response.status}`);
  return blob.size;
}

export async function completeMedia(mediaId: string, byteSize?: number) {
  return request(`/v1/media/${mediaId}/complete`, { method: 'POST', body: JSON.stringify({ byteSize }) });
}

export async function createReveal(sourceMediaId: string) {
  const { seasonId } = await ensureSession();
  return request<{ id: string; status: string }>('/v1/reveals', {
    method: 'POST', body: JSON.stringify({ seasonId, sourceMediaId })
  });
}

export async function getSeasonRecap() {
  const { seasonId } = await ensureSession();
  return request<SeasonRecap>(`/v1/seasons/${seasonId}/recap`);
}

export interface FormState {
  userId: string;
  seasonId: string;
  traits: Record<'explore'|'connect'|'create'|'move'|'build'|'care', number>;
  awakeningProgress: number;
  archetype: string | null;
  level: number;
  reasons?: Array<{ signalId: string; rationale: string; confidence: number }>;
}

export interface Crew { id: string; name: string | null; ownerUserId: string; role?: string; memberCount?: number; }
export interface SeasonRecap { seasonId: string; signalCount: number; friendConfirmed: number; mediaSupported: number; form: { traits: Record<string,number>; awakeningProgress: number; archetype: string | null; level: number } | null; }
