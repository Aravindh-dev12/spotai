SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  handle VARCHAR(64) UNIQUE,
  birth_date DATE NULL,
  is_adult_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS seasons (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(64) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_seasons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX seasons_user_status_idx (user_id, status)
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
  CONSTRAINT fk_life_modes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_life_modes_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  INDEX life_modes_user_season_idx (user_id, season_id)
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
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, season_id),
  CONSTRAINT chk_awakening_progress CHECK (awakening_progress BETWEEN 0 AND 100),
  CONSTRAINT fk_form_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_states_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  media_type VARCHAR(64) NOT NULL,
  consent_scope JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_media_assets_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
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
