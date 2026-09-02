import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const USER_KEY = 'spotai.devUserId';
const SEASON_KEY = 'spotai.activeSeasonId';

async function request<T>(path: string, init: RequestInit = {}, userId?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(init.headers ?? {})
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? `request_failed_${response.status}`);
  return body as T;
}

export async function ensureAlphaSession() {
  let userId = await AsyncStorage.getItem(USER_KEY);
  if (!userId) {
    const user = await request<{ id: string }>('/v1/dev/users', { method: 'POST', body: '{}' });
    userId = user.id;
    await AsyncStorage.setItem(USER_KEY, userId);
  }
  let seasonId = await AsyncStorage.getItem(SEASON_KEY);
  if (!seasonId) {
    const season = await request<{ id: string }>('/v1/seasons', {
      method: 'POST',
      body: JSON.stringify({ label: new Date().toLocaleString('en', { month: 'long' }).toUpperCase(), days: 30 })
    }, userId);
    seasonId = season.id;
    await AsyncStorage.setItem(SEASON_KEY, seasonId);
  }
  return { userId, seasonId };
}

export async function createLifeMode(wantsMore: string[]) {
  const { userId, seasonId } = await ensureAlphaSession();
  return request<{ id: string; label: string }>('/v1/life-modes', {
    method: 'POST',
    body: JSON.stringify({ seasonId, wantsMore, wantsLess: [] })
  }, userId);
}

export async function addLifeSignal(description: string) {
  const { userId, seasonId } = await ensureAlphaSession();
  return request<{ form: FormState }>('/v1/life-signals', {
    method: 'POST',
    body: JSON.stringify({ seasonId, description, evidenceLevel: 'self', visibility: 'private' })
  }, userId);
}

export async function getCurrentForm() {
  const { userId, seasonId } = await ensureAlphaSession();
  return request<FormState>(`/v1/form?seasonId=${encodeURIComponent(seasonId)}`, {}, userId);
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
