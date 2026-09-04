import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, type NearSession } from './api';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'spotai.sessionToken';

export async function listActiveNearSessions() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) throw new ApiError('unauthorized', 401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API_URL}/v1/near-sessions/active`, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${token}` }
    });
    const body = await response.json().catch(() => null) as { sessions?: NearSession[]; error?: string } | null;
    if (!response.ok) throw new ApiError(body?.error ?? `request_failed_${response.status}`, response.status, response.headers.get('x-request-id') ?? undefined);
    return { sessions: body?.sessions ?? [] };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('request_timeout', 0);
    throw new ApiError('network_unavailable', 0);
  } finally {
    clearTimeout(timeout);
  }
}
