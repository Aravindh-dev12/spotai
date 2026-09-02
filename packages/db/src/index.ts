import { randomUUID } from 'node:crypto';
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { ClassifiedSignal, LifeSignal, TraitVector } from '@form/domain';

export const pool = mysql.createPool(
  process.env.DATABASE_URL ?? 'mysql://form:form@localhost:3306/form'
);

export interface FormStateRow {
  userId: string;
  seasonId: string;
  traits: TraitVector;
  awakeningProgress: number;
  archetype: string | null;
  level: number;
}

type Row = RowDataPacket & Record<string, unknown>;

const parseJson = <T>(value: unknown): T => {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
};

export async function createDevUser(handle?: string) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO users (id, handle, is_adult_verified) VALUES (?, ?, TRUE)`,
    [id, handle ?? null]
  );
  return { id, handle: handle ?? null, isAdultVerified: true };
}

export async function createSeason(userId: string, label: string, startsAt: Date, endsAt: Date) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO seasons (id, user_id, label, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, label, startsAt, endsAt]
  );
  return { id, userId, label, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: 'active' as const };
}

export async function createLifeMode(input: {
  userId: string;
  seasonId: string;
  label: string;
  wantsMore: string[];
  wantsLess: string[];
  desiredFeeling?: string;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.execute(
    `INSERT INTO life_modes (id, user_id, season_id, label, wants_more, wants_less, desired_feeling)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.seasonId, input.label, JSON.stringify(input.wantsMore), JSON.stringify(input.wantsLess), input.desiredFeeling ?? null]
  );
  return {
    id,
    userId: input.userId,
    seasonId: input.seasonId,
    label: input.label,
    wantsMore: input.wantsMore,
    wantsLess: input.wantsLess,
    desiredFeeling: input.desiredFeeling ?? null,
    createdAt
  };
}

export async function insertLifeSignal(signal: LifeSignal) {
  await pool.execute(
    `INSERT INTO life_signals (id, user_id, season_id, description, evidence_level, visibility, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [signal.id, signal.userId, signal.seasonId, signal.description, signal.evidenceLevel, signal.visibility, new Date(signal.occurredAt)]
  );
  return signal;
}

export async function saveClassification(classification: ClassifiedSignal) {
  await pool.execute(
    `INSERT INTO signal_classifications (signal_id, weights, confidence, rationale, model_metadata)
     VALUES (?, ?, ?, ?, JSON_OBJECT())
     ON DUPLICATE KEY UPDATE weights=VALUES(weights), confidence=VALUES(confidence), rationale=VALUES(rationale)`,
    [classification.signalId, JSON.stringify(classification.weights), classification.confidence, classification.rationale]
  );
}

export async function listActiveClassifications(userId: string, seasonId: string): Promise<ClassifiedSignal[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT sc.signal_id AS signalId, sc.weights, sc.confidence, sc.rationale
     FROM signal_classifications sc
     JOIN life_signals ls ON ls.id = sc.signal_id
     WHERE ls.user_id = ? AND ls.season_id = ? AND ls.deleted_at IS NULL
     ORDER BY ls.occurred_at ASC, ls.created_at ASC`,
    [userId, seasonId]
  );
  return rows.map((row) => {
    const item = row as Row;
    return {
      signalId: String(item.signalId),
      weights: parseJson<TraitVector>(item.weights),
      confidence: Number(item.confidence),
      rationale: String(item.rationale)
    };
  });
}

export async function softDeleteSignal(userId: string, signalId: string) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE life_signals SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [signalId, userId]
  );
  return result.affectedRows > 0;
}

export async function upsertFormState(state: FormStateRow) {
  await pool.execute(
    `INSERT INTO form_states (user_id, season_id, traits, awakening_progress, archetype, level)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       traits=VALUES(traits),
       awakening_progress=VALUES(awakening_progress),
       archetype=VALUES(archetype),
       level=VALUES(level),
       updated_at=CURRENT_TIMESTAMP(3)`,
    [state.userId, state.seasonId, JSON.stringify(state.traits), state.awakeningProgress, state.archetype, state.level]
  );
  return state;
}

export async function getFormState(userId: string, seasonId: string): Promise<FormStateRow | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT user_id AS userId, season_id AS seasonId, traits, awakening_progress AS awakeningProgress, archetype, level
     FROM form_states WHERE user_id = ? AND season_id = ? LIMIT 1`,
    [userId, seasonId]
  );
  const row = rows[0] as Row | undefined;
  if (!row) return null;
  return {
    userId: String(row.userId),
    seasonId: String(row.seasonId),
    traits: parseJson<TraitVector>(row.traits),
    awakeningProgress: Number(row.awakeningProgress),
    archetype: row.archetype == null ? null : String(row.archetype),
    level: Number(row.level)
  };
}

export async function createCrew(ownerUserId: string, name?: string) {
  const connection = await pool.getConnection();
  const id = randomUUID();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO crews (id, name, owner_user_id) VALUES (?, ?, ?)`,
      [id, name ?? null, ownerUserId]
    );
    await connection.execute(
      `INSERT INTO crew_members (crew_id, user_id, role) VALUES (?, ?, 'owner')`,
      [id, ownerUserId]
    );
    await connection.commit();
    return { id, name: name ?? null, ownerUserId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
