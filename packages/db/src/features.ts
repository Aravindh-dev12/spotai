import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type mysql from 'mysql2/promise';
import { pool } from './index.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const makeToken = () => randomBytes(32).toString('base64url');

export async function createUserAndSession(input: { handle?: string; birthDate: string }) {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO users (id, handle, birth_date, is_adult_verified) VALUES (?, ?, ?, TRUE)`, [userId, input.handle ?? null, input.birthDate]);
    await connection.execute(`INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`, [sessionId, userId, hashToken(token), expiresAt]);
    await connection.commit();
    return { user: { id: userId, handle: input.handle ?? null, birthDate: input.birthDate }, token, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function createSession(userId: string) {
  const id = randomUUID();
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await pool.execute(`INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`, [id, userId, hashToken(token), expiresAt]);
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function resolveSession(token: string): Promise<string | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT user_id AS userId FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3) LIMIT 1`, [hashToken(token)]);
  return rows[0]?.userId ?? null;
}

export async function revokeSession(token: string) {
  const [result] = await pool.execute<mysql.ResultSetHeader>(`UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE token_hash = ? AND revoked_at IS NULL`, [hashToken(token)]);
  return result.affectedRows > 0;
}

export async function getUser(userId: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT id, handle, birth_date AS birthDate, is_adult_verified AS isAdultVerified, created_at AS createdAt FROM users WHERE id = ? LIMIT 1`, [userId]);
  return rows[0] ?? null;
}

export async function createCrewInvite(userId: string, crewId: string) {
  const [memberRows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT role FROM crew_members WHERE crew_id = ? AND user_id = ? LIMIT 1`, [crewId, userId]);
  if (!memberRows[0]) throw new Error('crew_forbidden');
  const [countRows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS memberCount FROM crew_members WHERE crew_id = ?`, [crewId]);
  if (Number(countRows[0]?.memberCount ?? 0) >= 5) throw new Error('crew_full');
  const id = randomUUID();
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.execute(`INSERT INTO crew_invites (id, crew_id, inviter_user_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)`, [id, crewId, userId, hashToken(token), expiresAt]);
  await appendDomainEvent(userId, 'crew_invite_created', 'crew', crewId, { inviteId: id });
  return { id, crewId, token, expiresAt: expiresAt.toISOString() };
}

export async function joinCrewWithInvite(userId: string, token: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(`SELECT id, crew_id AS crewId FROM crew_invites WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3) LIMIT 1 FOR UPDATE`, [hashToken(token)]);
    const invite = rows[0];
    if (!invite) throw new Error('invite_invalid');
    await connection.execute(`SELECT id FROM crews WHERE id = ? FOR UPDATE`, [invite.crewId]);
    const [existing] = await connection.execute<mysql.RowDataPacket[]>(`SELECT 1 FROM crew_members WHERE crew_id = ? AND user_id = ? LIMIT 1`, [invite.crewId, userId]);
    if (!existing[0]) {
      const [countRows] = await connection.execute<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS memberCount FROM crew_members WHERE crew_id = ?`, [invite.crewId]);
      if (Number(countRows[0]?.memberCount ?? 0) >= 5) throw new Error('crew_full');
      await connection.execute(`INSERT INTO crew_members (crew_id, user_id, role) VALUES (?, ?, 'member')`, [invite.crewId, userId]);
    }
    await connection.execute(`UPDATE crew_invites SET accepted_by_user_id = ?, accepted_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [userId, invite.id]);
    await insertDomainEvent(connection, userId, 'crew_joined', 'crew', invite.crewId, { inviteId: invite.id });
    await connection.commit();
    return { crewId: invite.crewId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function listUserCrews(userId: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT c.id, c.name, c.owner_user_id AS ownerUserId, cm.role, cm.joined_at AS joinedAt, (SELECT COUNT(*) FROM crew_members x WHERE x.crew_id = c.id) AS memberCount FROM crew_members cm JOIN crews c ON c.id = cm.crew_id WHERE cm.user_id = ? ORDER BY cm.joined_at DESC`, [userId]);
  return rows.map(row => ({ ...row, memberCount: Number(row.memberCount) }));
}

export async function listCrewMembers(userId: string, crewId: string) {
  const [allowed] = await pool.execute<mysql.RowDataPacket[]>(`SELECT 1 FROM crew_members WHERE crew_id = ? AND user_id = ? LIMIT 1`, [crewId, userId]);
  if (!allowed[0]) throw new Error('crew_forbidden');
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT u.id, u.handle, cm.role, cm.joined_at AS joinedAt FROM crew_members cm JOIN users u ON u.id = cm.user_id WHERE cm.crew_id = ? ORDER BY cm.joined_at ASC`, [crewId]);
  return rows;
}

export async function createMediaAsset(input: { ownerUserId: string; objectKey: string; mediaType: string; purpose: 'life_signal'|'form_reveal'|'memory'|'crew'; consentScope: { participantUserIds?: string[]; [key: string]: unknown } }) {
  const id = randomUUID();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO media_assets (id, owner_user_id, object_key, media_type, purpose, consent_scope, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`, [id, input.ownerUserId, input.objectKey, input.mediaType, input.purpose, JSON.stringify(input.consentScope)]);
    const uniqueParticipants = [...new Set(input.consentScope.participantUserIds ?? [])].filter(userId => userId !== input.ownerUserId);
    for (const participantUserId of uniqueParticipants) {
      await connection.execute(`INSERT INTO media_participant_consents (media_id, participant_user_id, status) VALUES (?, ?, 'pending')`, [id, participantUserId]);
    }
    await connection.commit();
    return { id, objectKey: input.objectKey, mediaType: input.mediaType, purpose: input.purpose, status: 'pending' as const, consentRequired: uniqueParticipants.length > 0 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function markMediaReady(userId: string, mediaId: string, byteSize?: number) {
  const [result] = await pool.execute<mysql.ResultSetHeader>(`UPDATE media_assets SET status = 'ready', byte_size = COALESCE(?, byte_size) WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL`, [byteSize ?? null, mediaId, userId]);
  if (!result.affectedRows) throw new Error('media_not_found');
  return { id: mediaId, status: 'ready' as const };
}

export async function approveMediaConsent(userId: string, mediaId: string) {
  const [result] = await pool.execute<mysql.ResultSetHeader>(`UPDATE media_participant_consents SET status = 'approved', decided_at = CURRENT_TIMESTAMP(3) WHERE media_id = ? AND participant_user_id = ? AND status = 'pending'`, [mediaId, userId]);
  if (!result.affectedRows) throw new Error('consent_not_found');
  await appendDomainEvent(userId, 'media_consent_approved', 'media', mediaId, {});
  return { mediaId, status: 'approved' as const };
}

export async function mediaConsentSatisfied(mediaId: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS pendingCount FROM media_participant_consents WHERE media_id = ? AND status <> 'approved'`, [mediaId]);
  return Number(rows[0]?.pendingCount ?? 0) === 0;
}

export async function getMediaAsset(userId: string, mediaId: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT id, object_key AS objectKey, media_type AS mediaType, purpose, status, consent_scope AS consentScope FROM media_assets WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1`, [mediaId, userId]);
  return rows[0] ?? null;
}

export async function createRevealJob(input: { userId: string; seasonId: string; sourceMediaId: string; archetype: string }) {
  const id = randomUUID();
  await pool.execute(`INSERT INTO reveal_jobs (id, user_id, season_id, source_media_id, archetype, status) VALUES (?, ?, ?, ?, ?, 'queued')`, [id, input.userId, input.seasonId, input.sourceMediaId, input.archetype]);
  await appendDomainEvent(input.userId, 'form_reveal_queued', 'reveal', id, { seasonId: input.seasonId, sourceMediaId: input.sourceMediaId, archetype: input.archetype });
  return { id, ...input, status: 'queued' as const };
}

export async function updateRevealJob(id: string, update: { status: 'processing'|'ready'|'failed'; outputMediaId?: string; errorCode?: string }) {
  await pool.execute(`UPDATE reveal_jobs SET status = ?, output_media_id = COALESCE(?, output_media_id), error_code = ? WHERE id = ?`, [update.status, update.outputMediaId ?? null, update.errorCode ?? null, id]);
}

export async function getRevealJob(userId: string, id: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT id, season_id AS seasonId, source_media_id AS sourceMediaId, archetype, status, output_media_id AS outputMediaId, error_code AS errorCode, created_at AS createdAt, updated_at AS updatedAt FROM reveal_jobs WHERE id = ? AND user_id = ? LIMIT 1`, [id, userId]);
  return rows[0] ?? null;
}

export async function appendDomainEvent(userId: string | null, eventType: string, aggregateType: string, aggregateId: string, payload: unknown) {
  await insertDomainEvent(pool, userId, eventType, aggregateType, aggregateId, payload);
}

async function insertDomainEvent(executor: Pick<mysql.Pool, 'execute'> | Pick<mysql.PoolConnection, 'execute'>, userId: string | null, eventType: string, aggregateType: string, aggregateId: string, payload: unknown) {
  await executor.execute(`INSERT INTO domain_events (id, user_id, event_type, aggregate_type, aggregate_id, payload) VALUES (?, ?, ?, ?, ?, ?)`, [randomUUID(), userId, eventType, aggregateType, aggregateId, JSON.stringify(payload)]);
}

export async function trackEvent(userId: string | null, eventName: string, properties: unknown = {}) {
  await pool.execute(`INSERT INTO analytics_events (id, user_id, event_name, properties) VALUES (?, ?, ?, ?)`, [randomUUID(), userId, eventName, JSON.stringify(properties)]);
}

export async function getSeasonRecap(userId: string, seasonId: string) {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS signalCount, SUM(evidence_level = 'friend') AS friendConfirmed, SUM(evidence_level = 'media') AS mediaSupported FROM life_signals WHERE user_id = ? AND season_id = ? AND deleted_at IS NULL`, [userId, seasonId]);
  const [stateRows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT traits, awakening_progress AS awakeningProgress, archetype, level, rules_version AS rulesVersion FROM form_states WHERE user_id = ? AND season_id = ? LIMIT 1`, [userId, seasonId]);
  const aggregate = rows[0] ?? {};
  const state = stateRows[0] ?? null;
  return { seasonId, signalCount: Number(aggregate.signalCount ?? 0), friendConfirmed: Number(aggregate.friendConfirmed ?? 0), mediaSupported: Number(aggregate.mediaSupported ?? 0), form: state ? { ...state, traits: typeof state.traits === 'string' ? JSON.parse(state.traits) : state.traits } : null };
}
