-- Slice 002: durable per-participant transport observations for NEAR sessions.
-- Signaling payloads remain transient in Redis; canonical session truth remains in MySQL.

CREATE TABLE IF NOT EXISTS near_session_transport_participants (
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  state ENUM('idle','connecting','connected','ended','failed') NOT NULL DEFAULT 'idle',
  observed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id, user_id),
  CONSTRAINT fk_near_transport_session FOREIGN KEY (session_id) REFERENCES near_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_near_transport_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX near_transport_state_idx (session_id, state, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
