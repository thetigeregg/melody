CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  files_seen INTEGER NOT NULL DEFAULT 0,
  files_scanned INTEGER NOT NULL DEFAULT 0,
  files_skipped INTEGER NOT NULL DEFAULT 0,
  files_deleted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS library_files (
  id BIGSERIAL PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  file_mtime_ms BIGINT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  exists_in_library BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scanned_at TIMESTAMPTZ,
  content_type TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending',
  parse_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_library_files_exists ON library_files(exists_in_library);

CREATE TABLE IF NOT EXISTS canonical_artists (
  id BIGSERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  musicbrainz_artist_id UUID,
  normalized_name TEXT NOT NULL UNIQUE,
  source_priority TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canonical_artists_musicbrainz ON canonical_artists(musicbrainz_artist_id);

CREATE TABLE IF NOT EXISTS artist_aliases (
  id BIGSERIAL PRIMARY KEY,
  canonical_artist_id BIGINT NOT NULL REFERENCES canonical_artists(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  normalized_alias_name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_artist_aliases_canonical ON artist_aliases(canonical_artist_id);

CREATE TABLE IF NOT EXISTS albums (
  id BIGSERIAL PRIMARY KEY,
  canonical_artist_id BIGINT REFERENCES canonical_artists(id),
  album_title TEXT NOT NULL,
  normalized_album_title TEXT NOT NULL,
  album_type TEXT,
  year INTEGER,
  musicbrainz_release_group_id UUID,
  musicbrainz_release_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_identity
  ON albums (canonical_artist_id, normalized_album_title, COALESCE(year, -1));

CREATE TABLE IF NOT EXISTS tracks (
  id BIGSERIAL PRIMARY KEY,
  library_file_id BIGINT NOT NULL UNIQUE REFERENCES library_files(id) ON DELETE CASCADE,
  canonical_album_artist_id BIGINT REFERENCES canonical_artists(id),
  album_id BIGINT REFERENCES albums(id),
  track_title TEXT NOT NULL,
  normalized_track_title TEXT NOT NULL,
  track_artist_raw TEXT,
  album_artist_raw TEXT,
  album_title_raw TEXT,
  genre TEXT,
  year INTEGER,
  disc_number INTEGER,
  track_number INTEGER,
  duration_seconds INTEGER,
  musicbrainz_recording_id UUID,
  musicbrainz_track_id UUID,
  musicbrainz_release_id UUID,
  musicbrainz_artist_id UUID,
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracks_album_artist ON tracks(canonical_album_artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);

CREATE TABLE IF NOT EXISTS lastfm_scrobbles (
  id BIGSERIAL PRIMARY KEY,
  lastfm_track_mbid UUID,
  artist_name TEXT NOT NULL,
  track_name TEXT NOT NULL,
  album_name TEXT,
  scrobbled_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB,
  canonical_artist_id BIGINT REFERENCES canonical_artists(id),
  matched_track_id BIGINT REFERENCES tracks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (artist_name, track_name, scrobbled_at)
);
CREATE INDEX IF NOT EXISTS idx_lastfm_scrobbles_scrobbled_at ON lastfm_scrobbles(scrobbled_at DESC);
CREATE INDEX IF NOT EXISTS idx_lastfm_scrobbles_artist ON lastfm_scrobbles(canonical_artist_id);

CREATE TABLE IF NOT EXISTS artist_similarity (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  from_canonical_artist_id BIGINT NOT NULL REFERENCES canonical_artists(id) ON DELETE CASCADE,
  to_canonical_artist_id BIGINT REFERENCES canonical_artists(id) ON DELETE SET NULL,
  to_artist_name_raw TEXT NOT NULL,
  similarity_score NUMERIC(8,6),
  raw_payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_artist_similarity_from ON artist_similarity(from_canonical_artist_id);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  query_text TEXT,
  config JSONB NOT NULL,
  cache_key TEXT,
  finished_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_recommendation_runs_created_at ON recommendation_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_items (
  id BIGSERIAL PRIMARY KEY,
  recommendation_run_id BIGINT NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  recommendation_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  source_bucket TEXT NOT NULL,
  canonical_artist_id BIGINT REFERENCES canonical_artists(id),
  track_id BIGINT REFERENCES tracks(id),
  display_name TEXT NOT NULL,
  explanation TEXT,
  score NUMERIC(12,6),
  raw_payload JSONB
);
CREATE INDEX IF NOT EXISTS idx_recommendation_items_run ON recommendation_items(recommendation_run_id);

CREATE TABLE IF NOT EXISTS notification_schedules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  channel_type TEXT NOT NULL,
  channel_config JSONB NOT NULL,
  schedule_config JSONB NOT NULL,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_enabled ON notification_schedules(enabled);

CREATE TABLE IF NOT EXISTS job_state (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL UNIQUE,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notification_schedules (
  name,
  enabled,
  cron_expression,
  timezone,
  channel_type,
  channel_config,
  schedule_config
)
SELECT
  'Weekly Friday Recommendations',
  TRUE,
  '0 9 * * 5',
  'Europe/Zurich',
  'discord_webhook',
  '{"webhookUrl":""}'::jsonb,
  '{"mode":"scheduled_default","limit":10,"includeExplanations":true,"externalRatio":0.7,"localRatio":0.3}'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM notification_schedules
  WHERE name = 'Weekly Friday Recommendations'
);

