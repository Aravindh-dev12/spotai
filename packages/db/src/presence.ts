import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import {
  DEFAULT_CONNECTION_PERMISSIONS,
  canTransitionPresence,
  canUseRepresentation,
  connectionPermissionsSchema,
  isPresenceRepresentationAllowed,
  permissionForNearLevel,
  presenceStateSchema,
  type ConnectionPermissions,
  type NearLevel,
  type PresenceRepresentation,
  type PresenceState
} from '@form/domain';
import { pool } from './index.js';

type SqlExecutor = Pick<Pool, 'execute'> | Pick<PoolConnection, 'execute'>;
type Row = RowDataPacket & Record<string, unknown>;

type ConnectionStatus = 'pending' | 'active' | 'blocked' | 'ended';
type ConnectionMembershipStatus = 'active' | 'invited' | 'left';

const iso = (value: unknown): string | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const canonicalPair = (a: string, b: string) => [a, b].sort().join(':');

async function executeRows(executor: SqlExecutor, sql: string, values: any[] = []): Promise<Row[]> {
  const [rows] = await executor.execute(sql, values);
  return rows as Row[];
}

function permissionRow(row: Row): ConnectionPermissions {
  return connectionPermissionsSchema.parse({
    sharePresence: Boolean(row.sharePresence),
    voice: Boolean(row.voice),
    camera: Boolean(row.camera),
    sharedReality: Boolean(row.sharedReality),
    aiMemory: Boolean(row.aiMemory),
    privateMoments: Boolean(row.privateMoments),
    matureThemes: Boolean(row.matureThemes),
    sensitiveMedia: Boolean(row.sensitiveMedia),
    recording: String(row.recording)
  });
}

async function connectionMembership(executor: SqlExecutor, userId: string, connectionId: string, lock = false) {
  const rows = await executeRows(
    executor,
    `SELECT c.id, c.status, cp.membership_status AS membershipStatus, cp.role
     FROM connections c
     JOIN connection_participants cp ON cp.connection_id = c.id
     WHERE c.id = ? AND cp.user_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [connectionId, userId]
  );
  const row = rows[0];
  if (!row) throw new Error('connection_not_found');
  return {
    id: String(row.id),
    status: String(row.status) as ConnectionStatus,
    membershipStatus: String(row.membershipStatus) as ConnectionMembershipStatus,
    role: String(row.role) as 'initiator' | 'invitee'
  };
}

async function assertActiveConnection(executor: SqlExecutor, userId: string, connectionId: string) {
  const membership = await connectionMembership(executor, userId, connectionId);
  if (membership.status === 'blocked') throw new Error('connection_blocked');
  if (membership.status !== 'active' || membership.membershipStatus !== 'active') throw new Error('connection_not_active');
  return membership;
}

async function getPermissions(executor: SqlExecutor, userId: string, connectionId: string): Promise<ConnectionPermissions> {
  const rows = await executeRows(
    executor,
    `SELECT share_presence AS sharePresence, voice, camera, shared_reality AS sharedReality,
            ai_memory AS aiMemory, private_moments AS privateMoments, mature_themes AS matureThemes,
            sensitive_media AS sensitiveMedia, recording_policy AS recording
     FROM connection_permissions WHERE connection_id = ? AND user_id = ? LIMIT 1`,
    [connectionId, userId]
  );
  const row = rows[0];
  if (!row) throw new Error('connection_permissions_missing');
  return permissionRow(row);
}

async function otherParticipant(executor: SqlExecutor, connectionId: string, userId: string) {
  const rows = await executeRows(
    executor,
    `SELECT user_id AS userId, membership_status AS membershipStatus
     FROM connection_participants WHERE connection_id = ? AND user_id <> ? LIMIT 1`,
    [connectionId, userId]
  );
  const row = rows[0];
  if (!row) throw new Error('connection_participant_missing');
  return { userId: String(row.userId), membershipStatus: String(row.membershipStatus) as ConnectionMembershipStatus };
}

async function ensureDefaultRelationshipState(executor: SqlExecutor, connectionId: string, userId: string) {
  const p = DEFAULT_CONNECTION_PERMISSIONS;
  await executor.execute(
    `INSERT IGNORE INTO connection_permissions
      (connection_id, user_id, share_presence, voice, camera, shared_reality, ai_memory, private_moments, mature_themes, sensitive_media, recording_policy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [connectionId, userId, p.sharePresence, p.voice, p.camera, p.sharedReality, p.aiMemory, p.privateMoments, p.matureThemes, p.sensitiveMedia, p.recording]
  );
  await executor.execute(
    `INSERT IGNORE INTO connection_presence (connection_id, user_id, state, representation)
     VALUES (?, ?, 'away', 'signal')`,
    [connectionId, userId]
  );
}

export async function createConnectionRequest(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new Error('connection_self_forbidden');
  const pairKey = canonicalPair(userId, otherUserId);
  const candidateId = randomUUID();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userRows = await executeRows(connection, `SELECT id FROM users WHERE id IN (?, ?)`, [userId, otherUserId]);
    if (userRows.length !== 2) throw new Error('connection_user_not_found');

    await connection.execute(
      `INSERT IGNORE INTO connections (id, kind, pair_key, status, created_by_user_id)
       VALUES (?, 'us', ?, 'pending', ?)`,
      [candidateId, pairKey, userId]
    );

    const rows = await executeRows(
      connection,
      `SELECT id, status, created_by_user_id AS createdByUserId FROM connections WHERE pair_key = ? LIMIT 1 FOR UPDATE`,
      [pairKey]
    );
    const row = rows[0];
    if (!row) throw new Error('connection_create_failed');
    const id = String(row.id);
    const status = String(row.status) as ConnectionStatus;
    if (status === 'blocked') throw new Error('connection_blocked');
    if (status === 'active') {
      await connection.commit();
      return { id, status, created: false, createdByUserId: String(row.createdByUserId) };
    }
    if (status === 'pending') {
      const existingParticipants = await executeRows(
        connection,
        `SELECT user_id AS userId FROM connection_participants WHERE connection_id = ? LIMIT 1`,
        [id]
      );
      if (existingParticipants.length > 0) {
        await connection.commit();
        return { id, status, created: false, createdByUserId: String(row.createdByUserId) };
      }
    }

    if (status === 'ended') {
      await connection.execute(
        `UPDATE connections SET status = 'pending', created_by_user_id = ?, activated_at = NULL, ended_at = NULL WHERE id = ?`,
        [userId, id]
      );
      await connection.execute(`DELETE FROM connection_participants WHERE connection_id = ?`, [id]);
    }

    await connection.execute(
      `INSERT INTO connection_participants (connection_id, user_id, role, membership_status, joined_at)
       VALUES (?, ?, 'initiator', 'active', CURRENT_TIMESTAMP(3))`,
      [id, userId]
    );
    await connection.execute(
      `INSERT INTO connection_participants (connection_id, user_id, role, membership_status)
       VALUES (?, ?, 'invitee', 'invited')`,
      [id, otherUserId]
    );
    await connection.commit();
    return { id, status: 'pending' as const, created: true, createdByUserId: userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function respondToConnection(userId: string, connectionId: string, action: 'accept' | 'decline') {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const membership = await connectionMembership(connection, userId, connectionId, true);
    if (membership.status === 'active' && membership.membershipStatus === 'active') {
      await connection.commit();
      return { connectionId, status: 'active' as const, accepted: true, alreadyResolved: true };
    }
    if (membership.status !== 'pending' || membership.membershipStatus !== 'invited') throw new Error('connection_response_forbidden');

    if (action === 'decline') {
      await connection.execute(
        `UPDATE connection_participants SET membership_status = 'left' WHERE connection_id = ? AND user_id = ?`,
        [connectionId, userId]
      );
      await connection.execute(
        `UPDATE connections SET status = 'ended', ended_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [connectionId]
      );
      await connection.commit();
      return { connectionId, status: 'ended' as const, accepted: false, alreadyResolved: false };
    }

    await connection.execute(
      `UPDATE connection_participants SET membership_status = 'active', joined_at = CURRENT_TIMESTAMP(3)
       WHERE connection_id = ? AND user_id = ?`,
      [connectionId, userId]
    );
    await connection.execute(
      `UPDATE connections SET status = 'active', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP(3)), ended_at = NULL WHERE id = ?`,
      [connectionId]
    );
    const participantRows = await executeRows(
      connection,
      `SELECT user_id AS userId FROM connection_participants WHERE connection_id = ? AND membership_status = 'active'`,
      [connectionId]
    );
    for (const row of participantRows) await ensureDefaultRelationshipState(connection, connectionId, String(row.userId));
    await connection.commit();
    return { connectionId, status: 'active' as const, accepted: true, alreadyResolved: false };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function queryConnections(userId: string, connectionId?: string) {
  const rows = await executeRows(
    pool,
    `SELECT c.id, c.status, c.created_by_user_id AS createdByUserId, c.created_at AS createdAt, c.activated_at AS activatedAt,
            mine.role AS myRole, mine.membership_status AS myMembershipStatus,
            other.user_id AS otherUserId, other.membership_status AS otherMembershipStatus, u.handle AS otherHandle,
            ownp.share_presence AS sharePresence, ownp.voice, ownp.camera, ownp.shared_reality AS sharedReality,
            ownp.ai_memory AS aiMemory, ownp.private_moments AS privateMoments, ownp.mature_themes AS matureThemes,
            ownp.sensitive_media AS sensitiveMedia, ownp.recording_policy AS recording,
            CASE
              WHEN c.status = 'active' AND otherp.share_presence = TRUE AND (presence.expires_at IS NULL OR presence.expires_at > CURRENT_TIMESTAMP(3))
              THEN COALESCE(presence.state, 'away') ELSE 'away'
            END AS otherPresenceState,
            CASE
              WHEN c.status = 'active' AND otherp.share_presence = TRUE AND (presence.expires_at IS NULL OR presence.expires_at > CURRENT_TIMESTAMP(3))
              THEN COALESCE(presence.representation, 'signal') ELSE 'signal'
            END AS otherPresenceRepresentation,
            CASE
              WHEN c.status = 'active' AND otherp.share_presence = TRUE AND (presence.expires_at IS NULL OR presence.expires_at > CURRENT_TIMESTAMP(3))
              THEN presence.expires_at ELSE NULL
            END AS otherPresenceExpiresAt
     FROM connection_participants mine
     JOIN connections c ON c.id = mine.connection_id
     JOIN connection_participants other ON other.connection_id = c.id AND other.user_id <> mine.user_id
     JOIN users u ON u.id = other.user_id
     LEFT JOIN connection_permissions ownp ON ownp.connection_id = c.id AND ownp.user_id = mine.user_id
     LEFT JOIN connection_permissions otherp ON otherp.connection_id = c.id AND otherp.user_id = other.user_id
     LEFT JOIN connection_presence presence ON presence.connection_id = c.id AND presence.user_id = other.user_id
     WHERE mine.user_id = ? AND c.status <> 'ended' ${connectionId ? 'AND c.id = ?' : ''}
     ORDER BY c.updated_at DESC`,
    connectionId ? [userId, connectionId] : [userId]
  );
  return rows.map(row => ({
    id: String(row.id),
    status: String(row.status) as ConnectionStatus,
    createdByUserId: String(row.createdByUserId),
    createdAt: iso(row.createdAt),
    activatedAt: iso(row.activatedAt),
    myRole: String(row.myRole),
    myMembershipStatus: String(row.myMembershipStatus),
    other: {
      userId: String(row.otherUserId),
      handle: row.otherHandle == null ? null : String(row.otherHandle),
      membershipStatus: String(row.otherMembershipStatus),
      presence: {
        state: presenceStateSchema.parse(String(row.otherPresenceState)),
        representation: String(row.otherPresenceRepresentation) as PresenceRepresentation,
        expiresAt: iso(row.otherPresenceExpiresAt)
      }
    },
    permissions: row.recording == null ? null : permissionRow(row)
  }));
}

export async function listConnections(userId: string) {
  return queryConnections(userId);
}

export async function getConnection(userId: string, connectionId: string) {
  const connections = await queryConnections(userId, connectionId);
  if (!connections[0]) throw new Error('connection_not_found');
  return connections[0];
}

export async function updateConnectionPermissions(userId: string, connectionId: string, patch: Partial<ConnectionPermissions>) {
  await assertActiveConnection(pool, userId, connectionId);
  const current = await getPermissions(pool, userId, connectionId);
  const next = connectionPermissionsSchema.parse({ ...current, ...patch });
  await pool.execute(
    `UPDATE connection_permissions SET share_presence = ?, voice = ?, camera = ?, shared_reality = ?, ai_memory = ?,
      private_moments = ?, mature_themes = ?, sensitive_media = ?, recording_policy = ?
     WHERE connection_id = ? AND user_id = ?`,
    [next.sharePresence, next.voice, next.camera, next.sharedReality, next.aiMemory, next.privateMoments, next.matureThemes,
      next.sensitiveMedia, next.recording, connectionId, userId]
  );

  const presenceRows = await executeRows(
    pool,
    `SELECT state, representation FROM connection_presence WHERE connection_id = ? AND user_id = ? LIMIT 1`,
    [connectionId, userId]
  );
  const presence = presenceRows[0];
  if (!next.sharePresence || (presence && !canUseRepresentation(next, String(presence.representation) as PresenceRepresentation))) {
    await pool.execute(
      `UPDATE connection_presence SET state = 'away', representation = 'signal', expires_at = NULL WHERE connection_id = ? AND user_id = ?`,
      [connectionId, userId]
    );
  }
  return next;
}

export async function setDeclaredPresence(input: {
  userId: string;
  connectionId: string;
  state: 'away' | 'around' | 'present';
  representation: PresenceRepresentation;
  ttlSeconds: number;
}) {
  await assertActiveConnection(pool, input.userId, input.connectionId);
  const permissions = await getPermissions(pool, input.userId, input.connectionId);
  if (!permissions.sharePresence && input.state !== 'away') throw new Error('presence_permission_denied');
  if (!isPresenceRepresentationAllowed(input.state, input.representation)) throw new Error('presence_representation_invalid');
  if (!canUseRepresentation(permissions, input.representation)) throw new Error('presence_permission_denied');

  const rows = await executeRows(
    pool,
    `SELECT state, expires_at AS expiresAt FROM connection_presence WHERE connection_id = ? AND user_id = ? LIMIT 1`,
    [input.connectionId, input.userId]
  );
  const row = rows[0];
  let current: PresenceState = row ? presenceStateSchema.parse(String(row.state)) : 'away';
  if (row?.expiresAt && new Date(row.expiresAt instanceof Date ? row.expiresAt : String(row.expiresAt)).getTime() <= Date.now()) current = 'away';
  if (!canTransitionPresence(current, input.state)) throw new Error('presence_transition_invalid');

  const expiresAt = input.state === 'away' ? null : new Date(Date.now() + input.ttlSeconds * 1000);
  await pool.execute(
    `INSERT INTO connection_presence (connection_id, user_id, state, representation, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE state = VALUES(state), representation = VALUES(representation), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP(3)`,
    [input.connectionId, input.userId, input.state, input.representation, expiresAt]
  );
  return { connectionId: input.connectionId, state: input.state, representation: input.representation, expiresAt: expiresAt?.toISOString() ?? null };
}

export async function createNearInvite(input: { userId: string; connectionId: string; clientRequestId: string; level: NearLevel }) {
  await assertActiveConnection(pool, input.userId, input.connectionId);
  const inviterPermissions = await getPermissions(pool, input.userId, input.connectionId);
  if (!inviterPermissions.sharePresence || !inviterPermissions[permissionForNearLevel(input.level)]) throw new Error('near_permission_denied');
  const other = await otherParticipant(pool, input.connectionId, input.userId);
  if (other.membershipStatus !== 'active') throw new Error('connection_not_active');
  const inviteePermissions = await getPermissions(pool, other.userId, input.connectionId);
  if (!inviteePermissions.sharePresence || !inviteePermissions[permissionForNearLevel(input.level)]) throw new Error('near_permission_denied');

  const retryRows = await executeRows(
    pool,
    `SELECT id, invitee_user_id AS inviteeUserId, requested_level AS level, status, expires_at AS expiresAt, created_at AS createdAt
     FROM near_invites WHERE connection_id = ? AND inviter_user_id = ? AND client_request_id = ? LIMIT 1`,
    [input.connectionId, input.userId, input.clientRequestId]
  );
  if (retryRows[0]) {
    const row = retryRows[0];
    return { id: String(row.id), connectionId: input.connectionId, inviteeUserId: String(row.inviteeUserId), level: String(row.level) as NearLevel, status: String(row.status), expiresAt: iso(row.expiresAt), createdAt: iso(row.createdAt), reused: true };
  }

  const pendingRows = await executeRows(
    pool,
    `SELECT id, invitee_user_id AS inviteeUserId, requested_level AS level, status, expires_at AS expiresAt, created_at AS createdAt
     FROM near_invites WHERE connection_id = ? AND inviter_user_id = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP(3)
     ORDER BY created_at DESC LIMIT 1`,
    [input.connectionId, input.userId]
  );
  if (pendingRows[0]) {
    const row = pendingRows[0];
    return { id: String(row.id), connectionId: input.connectionId, inviteeUserId: String(row.inviteeUserId), level: String(row.level) as NearLevel, status: String(row.status), expiresAt: iso(row.expiresAt), createdAt: iso(row.createdAt), reused: true };
  }

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 60_000);
  await pool.execute(
    `INSERT INTO near_invites (id, connection_id, inviter_user_id, invitee_user_id, client_request_id, requested_level, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.connectionId, input.userId, other.userId, input.clientRequestId, input.level, expiresAt]
  );
  await pool.execute(
    `UPDATE connection_presence SET state = CASE WHEN state = 'away' THEN 'present' ELSE state END,
      representation = CASE WHEN state = 'away' THEN 'signal' ELSE representation END,
      expires_at = CASE WHEN state = 'away' THEN ? ELSE expires_at END
     WHERE connection_id = ? AND user_id = ?`,
    [expiresAt, input.connectionId, input.userId]
  );
  return { id, connectionId: input.connectionId, inviteeUserId: other.userId, level: input.level, status: 'pending' as const, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), reused: false };
}

export async function listPendingNearInvites(userId: string) {
  await pool.execute(
    `UPDATE near_invites SET status = 'expired' WHERE invitee_user_id = ? AND status = 'pending' AND expires_at <= CURRENT_TIMESTAMP(3)`,
    [userId]
  );
  const rows = await executeRows(
    pool,
    `SELECT ni.id, ni.connection_id AS connectionId, ni.inviter_user_id AS inviterUserId, u.handle AS inviterHandle,
            ni.requested_level AS level, ni.expires_at AS expiresAt, ni.created_at AS createdAt
     FROM near_invites ni JOIN users u ON u.id = ni.inviter_user_id
     WHERE ni.invitee_user_id = ? AND ni.status = 'pending' AND ni.expires_at > CURRENT_TIMESTAMP(3)
     ORDER BY ni.created_at DESC LIMIT 50`,
    [userId]
  );
  return rows.map(row => ({
    id: String(row.id),
    connectionId: String(row.connectionId),
    inviterUserId: String(row.inviterUserId),
    inviterHandle: row.inviterHandle == null ? null : String(row.inviterHandle),
    level: String(row.level) as NearLevel,
    expiresAt: iso(row.expiresAt),
    createdAt: iso(row.createdAt)
  }));
}

export async function respondToNearInvite(userId: string, inviteId: string, action: 'accept' | 'decline') {
  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();
    const rows = await executeRows(
      connection,
      `SELECT id, connection_id AS connectionId, inviter_user_id AS inviterUserId, invitee_user_id AS inviteeUserId,
              requested_level AS level, status, expires_at AS expiresAt
       FROM near_invites WHERE id = ? LIMIT 1 FOR UPDATE`,
      [inviteId]
    );
    const invite = rows[0];
    if (!invite || String(invite.inviteeUserId) !== userId) throw new Error('near_invite_not_found');
    if (String(invite.status) !== 'pending') throw new Error('near_invite_resolved');
    if (new Date(invite.expiresAt instanceof Date ? invite.expiresAt : String(invite.expiresAt)).getTime() <= Date.now()) {
      await connection.execute(`UPDATE near_invites SET status = 'expired', responded_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [inviteId]);
      await connection.commit();
      committed = true;
      throw new Error('near_invite_expired');
    }
    const connectionId = String(invite.connectionId);
    await assertActiveConnection(connection, userId, connectionId);

    if (action === 'decline') {
      await connection.execute(`UPDATE near_invites SET status = 'declined', responded_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [inviteId]);
      await connection.commit();
      committed = true;
      return { inviteId, connectionId, accepted: false, session: null };
    }

    const level = String(invite.level) as NearLevel;
    const inviteePermissions = await getPermissions(connection, userId, connectionId);
    const inviterPermissions = await getPermissions(connection, String(invite.inviterUserId), connectionId);
    const permission = permissionForNearLevel(level);
    if (!inviteePermissions.sharePresence || !inviterPermissions.sharePresence || !inviteePermissions[permission] || !inviterPermissions[permission]) {
      throw new Error('near_permission_denied');
    }

    await connection.execute(`UPDATE near_invites SET status = 'accepted', responded_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [inviteId]);
    const sessionId = randomUUID();
    await connection.execute(
      `INSERT INTO near_sessions (id, connection_id, invite_id, level, status) VALUES (?, ?, ?, ?, 'authorized')`,
      [sessionId, connectionId, inviteId, level]
    );
    const presenceExpiry = new Date(Date.now() + 10 * 60_000);
    for (const participantUserId of [String(invite.inviterUserId), userId]) {
      await connection.execute(
        `UPDATE connection_presence SET state = 'present', representation = 'signal', expires_at = ?
         WHERE connection_id = ? AND user_id = ?`,
        [presenceExpiry, connectionId, participantUserId]
      );
    }
    await connection.commit();
    committed = true;
    return { inviteId, connectionId, accepted: true, session: { id: sessionId, level, status: 'authorized' as const } };
  } catch (error) {
    if (!committed) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getNearSession(userId: string, sessionId: string) {
  const rows = await executeRows(
    pool,
    `SELECT ns.id, ns.connection_id AS connectionId, ns.level, ns.status, ns.created_at AS createdAt,
            ns.connected_at AS connectedAt, ns.ended_at AS endedAt
     FROM near_sessions ns
     JOIN connection_participants cp ON cp.connection_id = ns.connection_id AND cp.user_id = ? AND cp.membership_status = 'active'
     WHERE ns.id = ? LIMIT 1`,
    [userId, sessionId]
  );
  const row = rows[0];
  if (!row) throw new Error('near_session_not_found');
  return {
    id: String(row.id), connectionId: String(row.connectionId), level: String(row.level) as NearLevel,
    status: String(row.status), createdAt: iso(row.createdAt), connectedAt: iso(row.connectedAt), endedAt: iso(row.endedAt)
  };
}
