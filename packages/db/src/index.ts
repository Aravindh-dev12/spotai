import pg from 'pg';
import type { ClassifiedSignal, LifeSignal, TraitVector } from '@form/domain';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/form'
});

export interface FormStateRow {
  userId: string;
  seasonId: string;
  traits: TraitVector;
  awakeningProgress: number;
  archetype: string | null;
  level: number;
}

export async function createSeason(userId: string, label: string, startsAt: Date, endsAt: Date) {
  const { rows } = await pool.query(
    `INSERT INTO seasons (user_id, label, starts_at, ends_at)
     VALUES ($1,$2,$3,$4)
     RETURNING id, user_id AS "userId", label, starts_at AS "startsAt", ends_at AS "endsAt", status`,
    [userId, label, startsAt, endsAt]
  );
  return rows[0];
}

export async function createLifeMode(input: {
  userId: string; seasonId: string; label: string; wantsMore: string[]; wantsLess: string[]; desiredFeeling?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO life_modes (user_id, season_id, label, wants_more, wants_less, desired_feeling)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)
     RETURNING id, user_id AS "userId", season_id AS "seasonId", label, wants_more AS "wantsMore", wants_less AS "wantsLess", desired_feeling AS "desiredFeeling", created_at AS "createdAt"`,
    [input.userId, input.seasonId, input.label, JSON.stringify(input.wantsMore), JSON.stringify(input.wantsLess), input.desiredFeeling ?? null]
  );
  return rows[0];
}

export async function insertLifeSignal(signal: LifeSignal) {
  await pool.query(
    `INSERT INTO life_signals (id,user_id,season_id,description,evidence_level,visibility,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [signal.id, signal.userId, signal.seasonId, signal.description, signal.evidenceLevel, signal.visibility, signal.occurredAt]
  );
  return signal;
}

export async function saveClassification(classification: ClassifiedSignal) {
  await pool.query(
    `INSERT INTO signal_classifications (signal_id,weights,confidence,rationale)
     VALUES ($1,$2::jsonb,$3,$4)
     ON CONFLICT (signal_id) DO UPDATE SET weights=EXCLUDED.weights, confidence=EXCLUDED.confidence, rationale=EXCLUDED.rationale`,
    [classification.signalId, JSON.stringify(classification.weights), classification.confidence, classification.rationale]
  );
}

export async function listActiveClassifications(userId: string, seasonId: string): Promise<ClassifiedSignal[]> {
  const { rows } = await pool.query(
    `SELECT sc.signal_id AS "signalId", sc.weights, sc.confidence::float, sc.rationale
     FROM signal_classifications sc
     JOIN life_signals ls ON ls.id=sc.signal_id
     WHERE ls.user_id=$1 AND ls.season_id=$2 AND ls.deleted_at IS NULL
     ORDER BY ls.occurred_at ASC, ls.created_at ASC`,
    [userId, seasonId]
  );
  return rows;
}

export async function softDeleteSignal(userId: string, signalId: string) {
  const result = await pool.query(
    `UPDATE life_signals SET deleted_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
    [signalId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function upsertFormState(state: FormStateRow) {
  await pool.query(
    `INSERT INTO form_states (user_id,season_id,traits,awakening_progress,archetype,level)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6)
     ON CONFLICT (user_id,season_id) DO UPDATE SET traits=EXCLUDED.traits, awakening_progress=EXCLUDED.awakening_progress, archetype=EXCLUDED.archetype, level=EXCLUDED.level, updated_at=now()`,
    [state.userId, state.seasonId, JSON.stringify(state.traits), state.awakeningProgress, state.archetype, state.level]
  );
  return state;
}

export async function getFormState(userId: string, seasonId: string): Promise<FormStateRow | null> {
  const { rows } = await pool.query(
    `SELECT user_id AS "userId", season_id AS "seasonId", traits, awakening_progress AS "awakeningProgress", archetype, level
     FROM form_states WHERE user_id=$1 AND season_id=$2`,
    [userId, seasonId]
  );
  return rows[0] ?? null;
}

export async function createCrew(ownerUserId: string, name?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`INSERT INTO crews (name,owner_user_id) VALUES ($1,$2) RETURNING id,name,owner_user_id AS "ownerUserId"`, [name ?? null, ownerUserId]);
    const crew = rows[0];
    await client.query(`INSERT INTO crew_members (crew_id,user_id,role) VALUES ($1,$2,'owner')`, [crew.id, ownerUserId]);
    await client.query('COMMIT');
    return crew;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
