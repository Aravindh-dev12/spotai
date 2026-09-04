import { z } from 'zod';

export const nearSessionStatuses = ['authorized', 'connecting', 'connected', 'ended', 'failed'] as const;
export const nearSessionStatusSchema = z.enum(nearSessionStatuses);
export type NearSessionStatus = z.infer<typeof nearSessionStatusSchema>;

export const nearParticipantTransportStates = ['idle', 'connecting', 'connected', 'ended', 'failed'] as const;
export const nearParticipantTransportStateSchema = z.enum(nearParticipantTransportStates);
export type NearParticipantTransportState = z.infer<typeof nearParticipantTransportStateSchema>;

export const transportStateReportSchema = z.object({
  state: nearParticipantTransportStateSchema,
  observedAt: z.string().datetime().optional()
}).strict();

export const signalingMessageTypes = ['offer', 'answer', 'ice', 'hangup'] as const;
export const signalingMessageTypeSchema = z.enum(signalingMessageTypes);
export type SignalingMessageType = z.infer<typeof signalingMessageTypeSchema>;

export const signalingMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  type: signalingMessageTypeSchema,
  payload: z.string().max(32_000)
}).strict();

export function deriveNearSessionStatus(states: NearParticipantTransportState[]): NearSessionStatus {
  if (states.some(state => state === 'failed')) return 'failed';
  if (states.some(state => state === 'ended')) return 'ended';
  if (states.length >= 2 && states.every(state => state === 'connected')) return 'connected';
  if (states.some(state => state === 'connecting' || state === 'connected')) return 'connecting';
  return 'authorized';
}
