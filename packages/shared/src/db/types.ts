import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface ScanRunsTable {
  id: Generated<string>;
  started_at: ColumnType<Date, string | undefined, never>;
  finished_at: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  status: string;
  files_seen: ColumnType<number, number | undefined, number>;
  files_scanned: ColumnType<number, number | undefined, number>;
  files_skipped: ColumnType<number, number | undefined, number>;
  files_deleted: ColumnType<number, number | undefined, number>;
  error_message: string | null;
}

export interface LibraryFilesTable {
  id: Generated<string>;
  file_path: string;
  file_mtime_ms: string;
  file_size_bytes: string;
  exists_in_library: boolean;
  first_seen_at: ColumnType<Date, string | undefined, never>;
  last_seen_at: ColumnType<Date, string | undefined, string | undefined>;
  last_scanned_at: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  content_type: string | null;
  parse_status: ColumnType<string, string | undefined, string>;
  parse_error: string | null;
}

export interface CanonicalArtistsTable {
  id: Generated<string>;
  canonical_name: string;
  musicbrainz_artist_id: string | null;
  normalized_name: string;
  source_priority: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ArtistAliasesTable {
  id: Generated<string>;
  canonical_artist_id: string;
  alias_name: string;
  normalized_alias_name: string;
  source: string;
  confidence: ColumnType<string, string | undefined, string>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface AlbumsTable {
  id: Generated<string>;
  canonical_artist_id: string | null;
  album_title: string;
  normalized_album_title: string;
  album_type: string | null;
  year: number | null;
  musicbrainz_release_group_id: string | null;
  musicbrainz_release_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface TracksTable {
  id: Generated<string>;
  library_file_id: string;
  canonical_album_artist_id: string | null;
  album_id: string | null;
  track_title: string;
  normalized_track_title: string;
  track_artist_raw: string | null;
  album_artist_raw: string | null;
  album_title_raw: string | null;
  genre: string | null;
  year: number | null;
  disc_number: number | null;
  track_number: number | null;
  duration_seconds: number | null;
  musicbrainz_recording_id: string | null;
  musicbrainz_track_id: string | null;
  musicbrainz_release_id: string | null;
  musicbrainz_artist_id: string | null;
  parsed_at: ColumnType<Date, string | undefined, never>;
}

export interface LastfmScrobblesTable {
  id: Generated<string>;
  lastfm_track_mbid: string | null;
  artist_name: string;
  track_name: string;
  album_name: string | null;
  scrobbled_at: ColumnType<Date, string, never>;
  raw_payload: unknown | null;
  canonical_artist_id: string | null;
  matched_track_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ArtistSimilarityTable {
  id: Generated<string>;
  source: string;
  from_canonical_artist_id: string;
  to_canonical_artist_id: string | null;
  to_artist_name_raw: string;
  similarity_score: string | null;
  raw_payload: unknown | null;
  fetched_at: ColumnType<Date, string | undefined, never>;
}

export interface RecommendationRunsTable {
  id: Generated<string>;
  created_at: ColumnType<Date, string | undefined, never>;
  trigger_type: string;
  status: string;
  query_text: string | null;
  config: unknown;
  cache_key: string | null;
  finished_at: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  error_message: string | null;
}

export interface RecommendationItemsTable {
  id: Generated<string>;
  recommendation_run_id: string;
  rank: number;
  recommendation_type: string;
  tier: string;
  source_bucket: string;
  canonical_artist_id: string | null;
  track_id: string | null;
  display_name: string;
  explanation: string | null;
  score: string | null;
  raw_payload: unknown | null;
}

export interface NotificationSchedulesTable {
  id: Generated<string>;
  name: string;
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  channel_type: string;
  channel_config: unknown;
  schedule_config: unknown;
  last_triggered_at: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface JobStateTable {
  id: Generated<string>;
  job_name: string;
  state: unknown;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface MelodyDatabase {
  scan_runs: ScanRunsTable;
  library_files: LibraryFilesTable;
  canonical_artists: CanonicalArtistsTable;
  artist_aliases: ArtistAliasesTable;
  albums: AlbumsTable;
  tracks: TracksTable;
  lastfm_scrobbles: LastfmScrobblesTable;
  artist_similarity: ArtistSimilarityTable;
  recommendation_runs: RecommendationRunsTable;
  recommendation_items: RecommendationItemsTable;
  notification_schedules: NotificationSchedulesTable;
  job_state: JobStateTable;
}

export type ScanRun = Selectable<ScanRunsTable>;
export type LibraryFile = Selectable<LibraryFilesTable>;
export type CanonicalArtist = Selectable<CanonicalArtistsTable>;
export type Album = Selectable<AlbumsTable>;
export type Track = Selectable<TracksTable>;
export type RecommendationRun = Selectable<RecommendationRunsTable>;
export type NotificationSchedule = Selectable<NotificationSchedulesTable>;

export type NewJobState = Insertable<JobStateTable>;
export type JobStateUpdate = Updateable<JobStateTable>;
