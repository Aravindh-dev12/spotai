SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  handle VARCHAR(64) UNIQUE,
  birth_date DATE NULL,
  is_adult_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX auth_sessions_user_idx (user_id, expires_at),
  INDEX auth_sessions_active_idx (token_hash, revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS seasons (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(64) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_seasons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX seasons_user_status_idx (user_id, status, starts_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS life_modes (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  label VARCHAR(64) NOT NULL,
  wants_more JSON NOT NULL,
  wants_less JSON NOT NULL,
  desired_feeling VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_life_modes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_life_modes_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  UNIQUE KEY life_modes_user_season_uq (user_id, season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS life_signals (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL,
  evidence_level ENUM('self','friend','media','system') NOT NULL,
  visibility ENUM('private','crew') NOT NULL DEFAULT 'private',
  occurred_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_life_signals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_life_signals_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  INDEX life_signals_user_season_idx (user_id, season_id, occurred_at DESC),
  INDEX life_signals_active_idx (user_id, season_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS signal_classifications (
  signal_id CHAR(36) PRIMARY KEY,
  weights JSON NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  rationale VARCHAR(300) NOT NULL,
  model_metadata JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_classification_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT fk_classification_signal FOREIGN KEY (signal_id) REFERENCES life_signals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS form_states (
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  traits JSON NOT NULL,
  awakening_progress INT NOT NULL,
  archetype VARCHAR(32) NULL,
  level INT NOT NULL DEFAULT 1,
  rules_version VARCHAR(32) NOT NULL DEFAULT 'traits-v1',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, season_id),
  CONSTRAINT chk_awakening_progress CHECK (awakening_progress BETWEEN 0 AND 100),
  CONSTRAINT fk_form_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_states_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS form_history (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  trigger_signal_id CHAR(36) NULL,
  change_type ENUM('signal_added','signal_removed','recomputed','awakened','evolved') NOT NULL,
  rules_version VARCHAR(32) NOT NULL,
  previous_traits JSON NOT NULL,
  delta_traits JSON NOT NULL,
  resulting_traits JSON NOT NULL,
  awakening_progress INT NOT NULL,
  archetype VARCHAR(32) NULL,
  reason VARCHAR(300) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_form_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_history_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_history_signal FOREIGN KEY (trigger_signal_id) REFERENCES life_signals(id) ON DELETE SET NULL,
  INDEX form_history_user_season_idx (user_id, season_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS crews (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(64) NULL,
  owner_user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_crews_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','member') NOT NULL DEFAULT 'member',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (crew_id, user_id),
  CONSTRAINT fk_crew_members_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_crew_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX crew_members_user_idx (user_id)
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
  INDEX crew_invites_lookup_idx (token_hash, expires_at, accepted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL,
  object_key VARCHAR(512) NOT NULL UNIQUE,
  media_type VARCHAR(64) NOT NULL,
  purpose ENUM('life_signal','form_reveal','memory','crew') NOT NULL,
  consent_scope JSON NOT NULL,
  status ENUM('pending','ready','blocked','deleted') NOT NULL DEFAULT 'pending',
  byte_size BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_media_assets_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX media_assets_owner_status_idx (owner_user_id, status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS media_participant_consents (
  media_id CHAR(36) NOT NULL,
  participant_user_id CHAR(36) NOT NULL,
  status ENUM('pending','approved','revoked') NOT NULL DEFAULT 'pending',
  decided_at DATETIME(3) NULL,
  PRIMARY KEY (media_id, participant_user_id),
  CONSTRAINT fk_media_consents_media FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_consents_user FOREIGN KEY (participant_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX media_consents_user_status_idx (participant_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reveal_jobs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NOT NULL,
  source_media_id CHAR(36) NOT NULL,
  archetype VARCHAR(32) NOT NULL,
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

CREATE TABLE IF NOT EXISTS memories (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL,
  season_id CHAR(36) NULL,
  crew_id CHAR(36) NULL,
  source_signal_ids JSON NOT NULL,
  rendered_asset_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_memories_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_memories_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_memories_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL,
  CONSTRAINT fk_memories_asset FOREIGN KEY (rendered_asset_id) REFERENCES media_assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS domain_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  event_type VARCHAR(80) NOT NULL,
  aggregate_type VARCHAR(40) NOT NULL,
  aggregate_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_domain_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX domain_events_aggregate_idx (aggregate_type, aggregate_id, created_at),
  INDEX domain_events_user_idx (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  event_name VARCHAR(80) NOT NULL,
  properties JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_analytics_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX analytics_events_name_idx (event_name, created_at DESC),
  INDEX analytics_events_user_idx (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
