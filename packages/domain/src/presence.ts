import { z } from 'zod';

export const presenceStates = ['away', 'around', 'present', 'near', 'together'] as const;
export const presenceStateSchema = z.enum(presenceStates);
export type PresenceState = z.infer<typeof presenceStateSchema>;

export const presenceRepresentations = ['signal', 'voice', 'camera', 'shared_reality'] as const;
export const presenceRepresentationSchema = z.enum(presenceRepresentations);
export type PresenceRepresentation = z.infer<typeof presenceRepresentationSchema>;

export const nearLevels = ['voice', 'camera', 'shared_reality'] as const;
export const nearLevelSchema = z.enum(nearLevels);
export type NearLevel = z.infer<typeof nearLevelSchema>;

export const recordingPolicySchema = z.enum(['never', 'ask_every_time']);
export type RecordingPolicy = z.infer<typeof recordingPolicySchema>;

export const connectionPermissionsSchema = z.object({
  sharePresence: z.boolean(),
  voice: z.boolean(),
  camera: z.boolean(),
  sharedReality: z.boolean(),
  aiMemory: z.boolean(),
  privateMoments: z.boolean(),
  matureThemes: z.boolean(),
  sensitiveMedia: z.boolean(),
  recording: recordingPolicySchema
}).strict();
export type ConnectionPermissions = z.infer<typeof connectionPermissionsSchema>;

export const DEFAULT_CONNECTION_PERMISSIONS: ConnectionPermissions = Object.freeze({
  sharePresence: true,
  voice: true,
  camera: true,
  sharedReality: true,
  aiMemory: false,
  privateMoments: true,
  matureThemes: false,
  sensitiveMedia: false,
  recording: 'ask_every_time'
});

export const connectionPermissionsPatchSchema = connectionPermissionsSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one permission must be provided.' }
);

export const connectionRequestSchema = z.object({
  otherUserId: z.string().uuid(),
  clientRequestId: z.string().uuid()
}).strict();

export const connectionResponseSchema = z.object({
  action: z.enum(['accept', 'decline'])
}).strict();

export const presenceUpdateSchema = z.object({
  state: presenceStateSchema,
  representation: presenceRepresentationSchema.default('signal'),
  ttlSeconds: z.number().int().min(60).max(14_400).default(1_800)
}).strict();

export const nearInviteRequestSchema = z.object({
  clientRequestId: z.string().uuid(),
  level: nearLevelSchema
}).strict();

export const nearInviteResponseSchema = z.object({
  action: z.enum(['accept', 'decline'])
}).strict();

const allowedTransitions: Record<PresenceState, ReadonlySet<PresenceState>> = {
  away: new Set(['away', 'around', 'present']),
  around: new Set(['away', 'around', 'present']),
  present: new Set(['away', 'around', 'present', 'near']),
  near: new Set(['away', 'present', 'near', 'together']),
  together: new Set(['away', 'present', 'near', 'together'])
};

export function canTransitionPresence(from: PresenceState, to: PresenceState) {
  return allowedTransitions[from].has(to);
}

export function isPresenceRepresentationAllowed(state: PresenceState, representation: PresenceRepresentation) {
  switch (state) {
    case 'away':
    case 'around':
      return representation === 'signal';
    case 'present':
      return representation === 'signal' || representation === 'voice';
    case 'near':
      return representation === 'signal' || representation === 'voice' || representation === 'camera';
    case 'together':
      return representation === 'voice' || representation === 'camera' || representation === 'shared_reality';
  }
}

export function permissionForRepresentation(representation: PresenceRepresentation): keyof ConnectionPermissions | null {
  switch (representation) {
    case 'voice': return 'voice';
    case 'camera': return 'camera';
    case 'shared_reality': return 'sharedReality';
    default: return null;
  }
}

export function permissionForNearLevel(level: NearLevel): keyof ConnectionPermissions {
  switch (level) {
    case 'voice': return 'voice';
    case 'camera': return 'camera';
    case 'shared_reality': return 'sharedReality';
  }
}

export function canUseRepresentation(permissions: ConnectionPermissions, representation: PresenceRepresentation) {
  if (!permissions.sharePresence && representation === 'signal') return false;
  const permission = permissionForRepresentation(representation);
  return permission ? Boolean(permissions[permission]) : permissions.sharePresence;
}

export function presenceStateForNearLevel(level: NearLevel): PresenceState {
  return level === 'shared_reality' ? 'together' : 'near';
}
