import { describe, expect, it } from 'vitest';
import { deriveNearSessionStatus } from './near-transport.js';

describe('deriveNearSessionStatus', () => {
  it('stays authorized until a participant actually starts transport', () => {
    expect(deriveNearSessionStatus(['idle', 'idle'])).toBe('authorized');
  });

  it('enters connecting when either participant reports transport progress', () => {
    expect(deriveNearSessionStatus(['connecting', 'idle'])).toBe('connecting');
    expect(deriveNearSessionStatus(['connected', 'connecting'])).toBe('connecting');
  });

  it('only becomes connected when both participants report connected', () => {
    expect(deriveNearSessionStatus(['connected', 'connected'])).toBe('connected');
  });

  it('fails closed on a failed participant and ends when either participant ends', () => {
    expect(deriveNearSessionStatus(['connected', 'failed'])).toBe('failed');
    expect(deriveNearSessionStatus(['connected', 'ended'])).toBe('ended');
  });
});
