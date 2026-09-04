import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import {
  deriveNearSessionStatus,
  type NearParticipantTransportState,
  type NearSessionStatus
} from '@form/domain';
import { pool } from './index.js';

type Row = RowDataPacket & Record<string, unknown>;

function iso(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapSession(row: Row) {
  return {
    id: String(row.id),
    connectionId: String(row.connectionId),
    level: String(row.level) as 'voice' | 'camera' | 'shared_reality',
    status: String(row.status) as NearSessionStatus,
    createdAt: iso(row.createdAt),
    connectedAt: iso(row.connectedAt),
    endedAt: iso(row.endedAt)
  };
}

async function loadSessionParticipant(connection: PoolConnection, userId: string, sessionId: string, lock = false) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT ns.id, ns.connection_id AS connectionId, ns.level, ns.status,
            ns.created_at AS createdAt, ns.connected_at AS connectedAt, ns.ended_at AS endedAt
     FROM near_sessions ns
     JOIN connection_participants cp ON cp.connection_id = ns.connection_id
       AND cp.user_id = ? AND cp.membership_status = 'active'
     WHERE ns.id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [userId, sessionId]
  );
  const row = rows[0] as Row | undefined;
  if (!row) throw new Error('near_session_not_found');
  return mapSession(row);
}

async function ensureTransportParticipants(connection: PoolConnection, sessionId: string, connectionId: string) {
  await connection.execute(
    `INSERT IGNORE INTO near_session_transport_participants (session_id, user_id, state)
     SELECT ?, cp.user_id, 'idle'
     FROM connection_participants cp
     WHERE cp.connection_id = ? AND cp.membership_status = 'active'`,
    [sessionId, connectionId]
  );
}

function canMoveSession(from: NearSessionStatus, to: NearSessionStatus) {
  if (from === to) return true;
  if (from === 'ended' || from === 'failed') return false;
  if (from === 'authorized') return to === 'connecting' || to === 'ended' || to === 'failed';
  if (from === 'connecting') return to === 'connected' || to === 'ended' || to === 'failed';
  if (from === 'connected') return to === 'ended' || to === 'failed';
  return false;
}

async function applySessionPresence(
  connection: PoolConnection,
  connectionId: string,
  level: 'voice' | 'camera' | 'shared_reality',
  status: NearSessionStatus
) {
  if (status === 'connected') {
    const state = level === 'shared_reality' ? 'together' : 'near';
    await connection.execute(
      `UPDATE connection_presence cp
       JOIN connection_participants member ON member.connection_id = cp.connection_id AND member.user_id = cp.user_id
       SET cp.state = ?, cp.representation = ?, cp.expires_at = NULL
       WHERE cp.connection_id = ? AND member.membership_status = 'active'`,
      [state, level, connectionId]
    );
    return;
  }

  if (status === 'ended' || status === 'failed') {
    await connection.execute(
      `UPDATE connection_presence cp
       JOIN connection_participants member ON member.connection_id = cp.connection_id AND member.user_id = cp.user_id
       SET cp.state = 'away', cp.representation = 'signal', cp.expires_at = NULL
       WHERE cp.connection_id = ? AND member.membership_status = 'active'
         AND cp.state IN ('near','together')`,
      [connectionId]
    );
  }
}

export async function reportNearTransportState(input: {
  userId: string;
  sessionId: string;
  state: NearParticipantTransportState;
  observedAt?: string;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const session = await loadSessionParticipant(connection, input.userId, input.sessionId, true);
    await ensureTransportParticipants(connection, input.sessionId, session.connectionId);

    if (session.status === 'ended' || session.status === 'failed') {
      const [terminalRows] = await connection.execute<RowDataPacket[]>(
        `SELECT user_id AS userId, state FROM near_session_transport_participants WHERE session_id = ? ORDER BY user_id ASC`,
        [input.sessionId]
      );
      await connection.commit();
      return {
        session,
        changed: false,
        participantStates: terminalRows.map(raw => {
          const row = raw as Row;
          return { userId: String(row.userId), state: String(row.state) as NearParticipantTransportState };
        })
      };
    }

    await connection.execute(
      `UPDATE near_session_transport_participants
       SET state = ?, observed_at = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE session_id = ? AND user_id = ?`,
      [input.state, input.observedAt ? new Date(input.observedAt) : new Date(), input.sessionId, input.userId]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id AS userId, state
       FROM near_session_transport_participants
       WHERE session_id = ? ORDER BY user_id ASC FOR UPDATE`,
      [input.sessionId]
    );
    const participantStates = rows.map(raw => {
      const row = raw as Row;
      return { userId: String(row.userId), state: String(row.state) as NearParticipantTransportState };
    });
    const derived = deriveNearSessionStatus(participantStates.map(item => item.state));
    const nextStatus = canMoveSession(session.status, derived) ? derived : session.status;
    const changed = nextStatus !== session.status;

    if (changed) {
      await connection.execute(
        `UPDATE near_sessions
         SET status = ?,
             connected_at = CASE WHEN ? = 'connected' THEN COALESCE(connected_at, CURRENT_TIMESTAMP(3)) ELSE connected_at END,
             ended_at = CASE WHEN ? IN ('ended','failed') THEN COALESCE(ended_at, CURRENT_TIMESTAMP(3)) ELSE ended_at END
         WHERE id = ?`,
        [nextStatus, nextStatus, nextStatus, input.sessionId]
      );
      await applySessionPresence(connection, session.connectionId, session.level, nextStatus);
    }

    await connection.commit();
    return {
      session: {
        ...session,
        status: nextStatus,
        connectedAt: nextStatus === 'connected' ? (session.connectedAt ?? new Date().toISOString()) : session.connectedAt,
        endedAt: nextStatus === 'ended' || nextStatus === 'failed' ? (session.endedAt ?? new Date().toISOString()) : session.endedAt
      },
      changed,
      previousStatus: session.status,
      participantStates
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getNearTransportState(userId: string, sessionId: string) {
  const connection = await pool.getConnection();
  try {
    const session = await loadSessionParticipant(connection, userId, sessionId);
    await ensureTransportParticipants(connection, sessionId, session.connectionId);
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id AS userId, state, observed_at AS observedAt, updated_at AS updatedAt
       FROM near_session_transport_participants WHERE session_id = ? ORDER BY user_id ASC`,
      [sessionId]
    );
    return {
      session,
      participants: rows.map(raw => {
        const row = raw as Row;
        return {
          userId: String(row.userId),
          state: String(row.state) as NearParticipantTransportState,
          observedAt: iso(row.observedAt),
          updatedAt: iso(row.updatedAt)
        };
      })
    };
  } finally {
    connection.release();
  }
}

export async function listActiveNearSessions(userId: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ns.id, ns.connection_id AS connectionId, ns.level, ns.status,
            ns.created_at AS createdAt, ns.connected_at AS connectedAt, ns.ended_at AS endedAt
     FROM near_sessions ns
     JOIN connection_participants cp ON cp.connection_id = ns.connection_id
       AND cp.user_id = ? AND cp.membership_status = 'active'
     WHERE ns.status IN ('authorized','connecting','connected')
     ORDER BY ns.created_at DESC
     LIMIT 20`,
    [userId]
  );
  return rows.map(raw => mapSession(raw as Row));
}
