-- NEAR foundation: durable pair relationships, consent, presence and mutual near handshakes.
-- This migration intentionally does not add WebRTC/media transport. It creates the trusted state
-- that realtime media will bind to in the next slice.

CREATE TABLE IF NOT EXISTS connections (
  id CHAR(36) PRIMARY KEY,
  kind ENUM('us') NOT NULL DEFAULT 'us',
  pair_key VARCHAR(73) NOT NULL UNIQUE,
  status ENUM('pending','active','blocked','ended') NOT NULL DEFAULT 'pending',
  created_by_user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  activated_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  CONSTRAINT fk_connections_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX connections_status_idx (status, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS connection_participants (
  connection_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('initiator','invitee') NOT NULL,
  membership_status ENUM('active','invited','left') NOT NULL,
  joined_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (connection_id, user_id),
  CONSTRAINT fk_connection_participants_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  CONSTRAINT fk_connection_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX connection_participants_user_idx (user_id, membership_status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS connection_permissions (
  connection_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  share_presence BOOLEAN NOT NULL DEFAULT TRUE,
  voice BOOLEAN NOT NULL DEFAULT TRUE,
  camera BOOLEAN NOT NULL DEFAULT TRUE,
  shared_reality BOOLEAN NOT NULL DEFAULT TRUE,
  ai_memory BOOLEAN NOT NULL DEFAULT FALSE,
  private_moments BOOLEAN NOT NULL DEFAULT TRUE,
  mature_themes BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive_media BOOLEAN NOT NULL DEFAULT FALSE,
  recording_policy ENUM('never','ask_every_time') NOT NULL DEFAULT 'ask_every_time',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (connection_id, user_id),
  CONSTRAINT fk_connection_permissions_participant FOREIGN KEY (connection_id, user_id)
    REFERENCES connection_participants(connection_id, user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS connection_presence (
  connection_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  state ENUM('away','around','present','near','together') NOT NULL DEFAULT 'away',
  representation ENUM('signal','voice','camera','shared_reality') NOT NULL DEFAULT 'signal',
  expires_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (connection_id, user_id),
  CONSTRAINT fk_connection_presence_participant FOREIGN KEY (connection_id, user_id)
    REFERENCES connection_participants(connection_id, user_id) ON DELETE CASCADE,
  INDEX connection_presence_expiry_idx (expires_at, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS near_invites (
  id CHAR(36) PRIMARY KEY,
  connection_id CHAR(36) NOT NULL,
  inviter_user_id CHAR(36) NOT NULL,
  invitee_user_id CHAR(36) NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  requested_level ENUM('voice','camera','shared_reality') NOT NULL,
  status ENUM('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME(3) NOT NULL,
  responded_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_near_invite_users CHECK (inviter_user_id <> invitee_user_id),
  CONSTRAINT fk_near_invites_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  CONSTRAINT fk_near_invites_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_near_invites_invitee FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY near_invites_idempotency_uq (connection_id, inviter_user_id, client_request_id),
  INDEX near_invites_inbox_idx (invitee_user_id, status, expires_at, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS near_sessions (
  id CHAR(36) PRIMARY KEY,
  connection_id CHAR(36) NOT NULL,
  invite_id CHAR(36) NOT NULL UNIQUE,
  level ENUM('voice','camera','shared_reality') NOT NULL,
  status ENUM('authorized','connecting','connected','ended','failed') NOT NULL DEFAULT 'authorized',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  connected_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  CONSTRAINT fk_near_sessions_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  CONSTRAINT fk_near_sessions_invite FOREIGN KEY (invite_id) REFERENCES near_invites(id) ON DELETE CASCADE,
  INDEX near_sessions_connection_idx (connection_id, status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
