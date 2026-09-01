CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text UNIQUE,
  birth_date date,
  is_adult_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active','completed','cancelled')) DEFAULT 'active'
);

CREATE TABLE life_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  label text NOT NULL,
  wants_more jsonb NOT NULL,
  wants_less jsonb NOT NULL DEFAULT '[]',
  desired_feeling text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE life_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  description text NOT NULL,
  evidence_level text NOT NULL CHECK (evidence_level IN ('self','friend','media','system')),
  visibility text NOT NULL CHECK (visibility IN ('private','crew')) DEFAULT 'private',
  occurred_at timestamptz NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signal_classifications (
  signal_id uuid PRIMARY KEY REFERENCES life_signals(id) ON DELETE CASCADE,
  weights jsonb NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  rationale text NOT NULL,
  model_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE form_states (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  traits jsonb NOT NULL,
  awakening_progress integer NOT NULL CHECK (awakening_progress BETWEEN 0 AND 100),
  archetype text,
  level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crew_members (
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','member')) DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  media_type text NOT NULL,
  consent_scope jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id uuid REFERENCES seasons(id) ON DELETE SET NULL,
  crew_id uuid REFERENCES crews(id) ON DELETE SET NULL,
  source_signal_ids jsonb NOT NULL DEFAULT '[]',
  rendered_asset_id uuid REFERENCES media_assets(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX life_signals_user_season_idx ON life_signals(user_id, season_id, occurred_at DESC);
CREATE INDEX crew_members_user_idx ON crew_members(user_id);
