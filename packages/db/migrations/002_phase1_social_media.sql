-- Phase 1 social/media/auth expansion for MySQL 8.4

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX auth_sessions_user_idx (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS crew_invites (
  id CHAR(36) PRIMARY KEY,
  crew_id CHAR(36) NOT NULL,
  inviter_user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  accepted_by_user_id CHAR(36) NULL,
  accepted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_crew_invites_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_crew_invites_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_crew_invites_acceptor FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX crew_invites_crew_idx (crew_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS status ENUM('pending','ready','failed') NOT NULL DEFAULT 'pending' AFTER consent_scope,
  ADD COLUMN IF NOT EXISTS byte_size BIGINT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(128) NULL AFTER byte_size;

CREATE TABLE IF NOT EXISTS reveal_jobs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  source_media_id CHAR(36) NOT NULL,
  archetype VARCHAR(32) NULL,
  status ENUM('queued','processing','ready','failed') NOT NULL DEFAULT 'queued',
  output_media_id CHAR(36) NULL,
  error_code VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reveal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reveal_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  CONSTRAINT fk_reveal_source FOREIGN KEY (source_media_id) REFERENCES media_assets(id),
  CONSTRAINT fk_reveal_output FOREIGN KEY (output_media_id) REFERENCES media_assets(id),
  INDEX reveal_jobs_user_idx (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS domain_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  event_type VARCHAR(80) NOT NULL,
  aggregate_type VARCHAR(40) NOT NULL,
  aggregate_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_domain_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX domain_events_aggregate_idx (aggregate_type, aggregate_id, occurred_at),
  INDEX domain_events_user_idx (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  event_name VARCHAR(100) NOT NULL,
  properties JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX analytics_name_time_idx (event_name, created_at),
  INDEX analytics_user_time_idx (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notification_outbox (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(60) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX notification_outbox_idx (status, available_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS entitlements (
  user_id CHAR(36) NOT NULL,
  entitlement_key VARCHAR(64) NOT NULL,
  source VARCHAR(32) NOT NULL,
  valid_until DATETIME(3) NULL,
  metadata JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, entitlement_key),
  CONSTRAINT fk_entitlement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
