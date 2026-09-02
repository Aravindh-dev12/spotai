import { randomUUID } from 'node:crypto';
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { ClassifiedSignal, EvidenceLevel, LifeSignal, TraitVector } from '@form/domain';
import { TRAIT_RULE_VERSION } from '@form/domain';

export const pool = mysql.createPool(process.env.DATABASE_URL ?? 'mysql://form:form@localhost:3306/form');

export interface FormStateRow {
  userId: string;
  seasonId: string;
  traits: TraitVector;
  awakeningProgress: number;
  archetype: string | null;
  level: number;
  rulesVersion: string;
}

export type StoredClassification = ClassifiedSignal & { evidenceLevel: EvidenceLevel };
type Row = RowDataPacket & Record<string, unknown>;

const parseJson = <T>(value: unknown): T => typeof value === 'string' ? JSON.parse(value) as T : value as T;

export async function assertOwnedSeason(userId: string, seasonId: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, status FROM seasons WHERE id = ? AND user_id = ? LIMIT 1`,
    [seasonId, userId]
  );
  const row = rows[0] as Row | undefined;
  if (!row) throw new Error('season_not_found');
  return { id: String(row.id), status: String(row.status) };
}

export async function createDevUser(handle?: string) {
  const id = randomUUID();
  await pool.execute(`INSERT INTO users (id, handle, is_adult_verified) VALUES (?, ?, TRUE)`, [id, handle ?? null]);
  return { id, handle: handle ?? null, isAdultVerified: true };
}

export async function getActiveSeason(userId: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, user_id AS userId, label, starts_at AS startsAt, ends_at AS endsAt, status
     FROM seasons WHERE user_id = ? AND status = 'active' AND ends_at > CURRENT_TIMESTAMP(3)
     ORDER BY starts_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function createSeason(userId: string, label: string, startsAt: Date, endsAt: Date) {
  const active = await getActiveSeason(userId);
  if (active) return active;
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO seasons (id, user_id, label, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, label, startsAt, endsAt]
  );
  return { id, userId, label, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: 'active' as const };
}

export async function createLifeMode(input: {
  userId: string; seasonId: string; label: string; wantsMore: string[]; wantsLess: string[]; desiredFeeling?: string;
}) {
  const season = await assertOwnedSeason(input.userId, input.seasonId);
  if (season.status !== 'active') throw new Error('season_inactive');
  const [existing] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM life_modes WHERE user_id = ? AND season_id = ? LIMIT 1`, [input.userId, input.seasonId]
  );
  const id = existing[0]?.id ? String(existing[0].id) : randomUUID();
  await pool.execute(
    `INSERT INTO life_modes (id, user_id, season_id, label, wants_more, wants_less, desired_feeling)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE label=VALUES(label), wants_more=VALUES(wants_more), wants_less=VALUES(wants_less), desired_feeling=VALUES(desired_feeling)`,
    [id, input.userId, input.seasonId, input.label, JSON.stringify(input.wantsMore), JSON.stringify(input.wantsLess), input.desiredFeeling ?? null]
  );
  return { id, userId: input.userId, seasonId: input.seasonId, label: input.label, wantsMore: input.wantsMore, wantsLess: input.wantsLess, desiredFeeling: input.desiredFeeling ?? null, createdAt: new Date().toISOString() };
}

export async function insertLifeSignal(signal: LifeSignal) {
  const season = await assertOwnedSeason(signal.userId, signal.seasonId);
  if (season.status !== 'active') throw new Error('season_inactive');
  await pool.execute(
    `INSERT INTO life_signals (id, user_id, season_id, description, evidence_level, visibility, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [signal.id, signal.userId, signal.seasonId, signal.description, signal.evidenceLevel, signal.visibility, new Date(signal.occurredAt)]
  );
  return signal;
}

export async function listLifeSignals(userId: string, seasonId: string) {
  await assertOwnedSeason(userId, seasonId);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, description, evidence_level AS evidenceLevel, visibility, occurred_at AS occurredAt, created_at AS createdAt
     FROM life_signals WHERE user_id = ? AND season_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC`,
    [userId, seasonId]
  );
  return rows;
}

export async function saveClassification(classification: ClassifiedSignal) {
  await pool.execute(
    `INSERT INTO signal_classifications (signal_id, weights, confidence, rationale, model_metadata)
     VALUES (?, ?, ?, ?, JSON_OBJECT('rulesVersion', ?))
     ON DUPLICATE KEY UPDATE weights=VALUES(weights), confidence=VALUES(confidence), rationale=VALUES(rationale), model_metadata=VALUES(model_metadata)`,
    [classification.signalId, JSON.stringify(classification.weights), classification.confidence, classification.rationale, TRAIT_RULE_VERSION]
  );
}

export async function listActiveClassifications(userId: string, seasonId: string): Promise<StoredClassification[]> {
  await assertOwnedSeason(userId, seasonId);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT sc.signal_id AS signalId, sc.weights, sc.confidence, sc.rationale, ls.evidence_level AS evidenceLevel
     FROM signal_classifications sc JOIN life_signals ls ON ls.id = sc.signal_id
     WHERE ls.user_id = ? AND ls.season_id = ? AND ls.deleted_at IS NULL
     ORDER BY ls.occurred_at ASC, ls.created_at ASC`,
    [userId, seasonId]
  );
  return rows.map(row => {
    const item = row as Row;
    return { signalId: String(item.signalId), weights: parseJson<TraitVector>(item.weights), confidence: Number(item.confidence), rationale: String(item.rationale), evidenceLevel: String(item.evidenceLevel) as EvidenceLevel };
  });
}

export async function softDeleteSignal(userId: string, signalId: string) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE life_signals SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [signalId, userId]
  );
  return result.affectedRows > 0;
}

export async function upsertFormState(state: Omit<FormStateRow, 'rulesVersion'> & { rulesVersion?: string }) {
  const rulesVersion = state.rulesVersion ?? TRAIT_RULE_VERSION;
  await pool.execute(
    `INSERT INTO form_states (user_id, season_id, traits, awakening_progress, archetype, level, rules_version)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE traits=VALUES(traits), awakening_progress=VALUES(awakening_progress), archetype=VALUES(archetype), level=VALUES(level), rules_version=VALUES(rules_version), updated_at=CURRENT_TIMESTAMP(3)`,
    [state.userId, state.seasonId, JSON.stringify(state.traits), state.awakeningProgress, state.archetype, state.level, rulesVersion]
  );
  return { ...state, rulesVersion } as FormStateRow;
}

export async function getFormState(userId: string, seasonId: string): Promise<FormStateRow | null> {
  await assertOwnedSeason(userId, seasonId);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT user_id AS userId, season_id AS seasonId, traits, awakening_progress AS awakeningProgress, archetype, level, rules_version AS rulesVersion
     FROM form_states WHERE user_id = ? AND season_id = ? LIMIT 1`, [userId, seasonId]
  );
  const row = rows[0] as Row | undefined;
  if (!row) return null;
  return { userId: String(row.userId), seasonId: String(row.seasonId), traits: parseJson<TraitVector>(row.traits), awakeningProgress: Number(row.awakeningProgress), archetype: row.archetype == null ? null : String(row.archetype), level: Number(row.level), rulesVersion: String(row.rulesVersion) };
}

export async function appendFormHistory(input: {
  userId: string; seasonId: string; triggerSignalId?: string | null; changeType: 'signal_added'|'signal_removed'|'recomputed'|'awakened'|'evolved'; previousTraits: TraitVector; deltaTraits: TraitVector; resultingTraits: TraitVector; awakeningProgress: number; archetype: string | null; reason: string;
}) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO form_history (id, user_id, season_id, trigger_signal_id, change_type, rules_version, previous_traits, delta_traits, resulting_traits, awakening_progress, archetype, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.seasonId, input.triggerSignalId ?? null, input.changeType, TRAIT_RULE_VERSION, JSON.stringify(input.previousTraits), JSON.stringify(input.deltaTraits), JSON.stringify(input.resultingTraits), input.awakeningProgress, input.archetype, input.reason]
  );
  return id;
}

export async function getFormHistory(userId: string, seasonId: string) {
  await assertOwnedSeason(userId, seasonId);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, trigger_signal_id AS triggerSignalId, change_type AS changeType, rules_version AS rulesVersion,
            delta_traits AS deltaTraits, resulting_traits AS resultingTraits, awakening_progress AS awakeningProgress,
            archetype, reason, created_at AS createdAt
     FROM form_history WHERE user_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 100`, [userId, seasonId]
  );
  return rows.map(row => ({ ...row, deltaTraits: parseJson<TraitVector>(row.deltaTraits), resultingTraits: parseJson<TraitVector>(row.resultingTraits), awakeningProgress: Number(row.awakeningProgress) }));
}

export async function createCrew(ownerUserId: string, name?: string) {
  const connection = await pool.getConnection();
  const id = randomUUID();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO crews (id, name, owner_user_id) VALUES (?, ?, ?)`, [id, name ?? null, ownerUserId]);
    await connection.execute(`INSERT INTO crew_members (crew_id, user_id, role) VALUES (?, ?, 'owner')`, [id, ownerUserId]);
    await connection.commit();
    return { id, name: name ?? null, ownerUserId, memberCount: 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
