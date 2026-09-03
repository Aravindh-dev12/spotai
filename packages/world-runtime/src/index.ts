export type FormArchetype = 'VECTOR' | 'ECHO' | 'FORGE' | 'ORBIT' | 'PULSE' | 'HAVEN';

export type BodyAction =
  | 'idle'
  | 'move_left'
  | 'move_right'
  | 'duck'
  | 'jump'
  | 'point'
  | 'open_palm'
  | 'hands_together';

export interface FormAssetManifest {
  schemaVersion: 1;
  archetype: FormArchetype;
  level: number;
  glb: string;
  rig: {
    armature: string;
    rootBone: string;
    hipsBone: string;
    headBone: string;
    leftHandBone: string;
    rightHandBone: string;
  };
  animations: Partial<Record<BodyAction, string>>;
  abilities: Array<{
    id: string;
    trigger: BodyAction;
    cooldownMs: number;
    description: string;
  }>;
}

export interface PoseFrame {
  timestampMs: number;
  confidence: number;
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  leftHip: { x: number; y: number };
  rightHip: { x: number; y: number };
}

export interface WorldDefinition {
  id: string;
  title: string;
  allowedForms: FormArchetype[];
  objective: string;
  durationSeconds: number;
  completionActions: BodyAction[];
  worldMark?: string;
}

export interface WorldSessionState {
  worldId: string;
  archetype: FormArchetype;
  startedAtMs: number;
  completedActions: BodyAction[];
  complete: boolean;
}

export function createWorldSession(world: WorldDefinition, archetype: FormArchetype, now = Date.now()): WorldSessionState {
  if (!world.allowedForms.includes(archetype)) throw new Error('form_not_allowed_in_world');
  return { worldId: world.id, archetype, startedAtMs: now, completedActions: [], complete: false };
}

export function reduceWorldAction(state: WorldSessionState, world: WorldDefinition, action: BodyAction): WorldSessionState {
  if (state.complete) return state;
  const completedActions = state.completedActions.includes(action)
    ? state.completedActions
    : [...state.completedActions, action];
  const complete = world.completionActions.every(required => completedActions.includes(required));
  return { ...state, completedActions, complete };
}

export function resolveAbility(manifest: FormAssetManifest, action: BodyAction) {
  return manifest.abilities.find(ability => ability.trigger === action) ?? null;
}

export function detectGesture(frame: PoseFrame): BodyAction {
  if (frame.confidence < 0.55) return 'idle';
  const shoulderY = (frame.leftShoulder.y + frame.rightShoulder.y) / 2;
  const hipY = (frame.leftHip.y + frame.rightHip.y) / 2;
  const handsDistance = Math.hypot(frame.leftWrist.x - frame.rightWrist.x, frame.leftWrist.y - frame.rightWrist.y);
  const bothHandsHigh = frame.leftWrist.y < shoulderY && frame.rightWrist.y < shoulderY;
  if (handsDistance < 0.12) return 'hands_together';
  if (bothHandsHigh && shoulderY - Math.min(frame.leftWrist.y, frame.rightWrist.y) > 0.18) return 'jump';
  if (frame.leftWrist.x < frame.leftShoulder.x - 0.18 || frame.rightWrist.x > frame.rightShoulder.x + 0.18) return 'open_palm';
  if (hipY - shoulderY < 0.18) return 'duck';
  return 'idle';
}

export const SIGNAL_ZERO: WorldDefinition = {
  id: 'signal-zero',
  title: 'Signal Zero',
  allowedForms: ['VECTOR', 'ECHO', 'FORGE', 'ORBIT', 'PULSE', 'HAVEN'],
  objective: 'Synchronize with O, activate one Form ability, and complete the first reality signal.',
  durationSeconds: 45,
  completionActions: ['open_palm', 'hands_together'],
  worldMark: 'FIRST_CONTACT'
};
