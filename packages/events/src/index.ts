import { z } from 'zod';

const base = z.object({ id: z.string().uuid(), occurredAt: z.string().datetime(), actorUserId: z.string().uuid() });
export const lifeSignalSubmitted = base.extend({ type: z.literal('life.signal.submitted'), signalId: z.string().uuid() });
export const signalClassified = base.extend({ type: z.literal('life.signal.classified'), signalId: z.string().uuid() });
export const formAwakened = base.extend({ type: z.literal('form.awakened'), archetype: z.string(), seasonId: z.string().uuid() });
export const crewJoined = base.extend({ type: z.literal('crew.joined'), crewId: z.string().uuid() });
export const seasonCompleted = base.extend({ type: z.literal('season.completed'), seasonId: z.string().uuid() });
export const domainEventSchema = z.discriminatedUnion('type', [lifeSignalSubmitted, signalClassified, formAwakened, crewJoined, seasonCompleted]);
export type DomainEvent = z.infer<typeof domainEventSchema>;
