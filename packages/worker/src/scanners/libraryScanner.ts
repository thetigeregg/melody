import fs from "node:fs/promises";
import path from "node:path";
import { parseFile } from "music-metadata";
import { createDb, createLogger, getEnv, inferAlbumTypeFromPath, normalizeName, type LibraryFile } from "@melody/shared";
import { resolveCanonicalArtist } from "../lib/identity";
import type { ScanSummary } from "../types";

const SUPPORTED_EXTENSIONS = new Set([".flac", ".mp3", ".m4a"]);

interface DiscoveredFile {
  relativePath: string;
  absolutePath: string;
  size: bigint;
  mtimeMs: number;
}

async function walkMusicTree(rootDir: string): Promise<DiscoveredFile[]> {
  const results: DiscoveredFile[] = [];

  async function visit(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        continue;
      }

      const stat = await fs.stat(absolutePath, { bigint: true });
      results.push({
        absolutePath,
        relativePath: path.relative(rootDir, absolutePath).split(path.sep).join("/"),
        size: stat.size,
        mtimeMs: Number(stat.mtimeMs)
      });
    }
  }

  await visit(rootDir);

  return results;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let current = 0;

  async function worker() {
    while (current < items.length) {
      const index = current;
      current += 1;
      await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
}

function getFirstString(value: string | string[] | null | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export async function runIncrementalScan(): Promise<ScanSummary> {
  const env = getEnv();
  const db = createDb();
  const logger = createLogger("worker");

  const scanRun = await db
    .insertInto("scan_runs")
    .values({
      status: "running"
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  let filesSeen = 0;
  let filesScanned = 0;
  let filesSkipped = 0;
  let filesDeleted = 0;

  try {
    const discoveredFiles = await walkMusicTree(env.MUSIC_DIR);
    filesSeen = discoveredFiles.length;
    const nowIso = new Date().toISOString();
    const seenPaths = new Set(discoveredFiles.map((file) => file.relativePath));

    for (const file of discoveredFiles) {
      const existing = await db
        .selectFrom("library_files")
        .select(["id", "file_mtime_ms", "file_size_bytes"])
        .where("file_path", "=", file.relativePath)
        .executeTakeFirst();

      const unchanged =
        existing &&
        existing.file_mtime_ms === file.mtimeMs.toString() &&
        existing.file_size_bytes === file.size.toString();

      if (!existing) {
        await db
          .insertInto("library_files")
          .values({
            file_path: file.relativePath,
            file_mtime_ms: file.mtimeMs.toString(),
            file_size_bytes: file.size.toString(),
            exists_in_library: true,
            last_seen_at: nowIso,
            content_type: path.extname(file.relativePath).slice(1)
          })
          .execute();
      } else {
        await db
          .updateTable("library_files")
          .set({
            file_mtime_ms: file.mtimeMs.toString(),
            file_size_bytes: file.size.toString(),
            exists_in_library: true,
            last_seen_at: nowIso,
            content_type: path.extname(file.relativePath).slice(1),
            parse_status: unchanged ? "parsed" : "pending",
            parse_error: null
          })
          .where("id", "=", existing.id)
          .execute();
      }

      if (unchanged) {
        filesSkipped += 1;
      }
    }

    const toParse: LibraryFile[] = await db
      .selectFrom("library_files")
      .selectAll()
      .where("exists_in_library", "=", true)
      .where((eb: any) =>
        eb.or([
          eb("last_scanned_at", "is", null),
          eb("parse_status", "=", "pending"),
          eb("parse_status", "=", "failed")
        ])
      )
      .execute();

    await runWithConcurrency(toParse, env.TAG_SCAN_CONCURRENCY, async (libraryFile) => {
      const absolutePath = path.join(env.MUSIC_DIR, libraryFile.file_path);

      try {
        const metadata = await parseFile(absolutePath);
        const common = metadata.common;
        const albumArtist = common.albumartist ?? common.artist ?? "Unknown Artist";
        const canonicalArtistId = await resolveCanonicalArtist(
          albumArtist,
          "local_tag",
          getFirstString(common.musicbrainz_artistid)
        );
        const albumTitle = common.album ?? "Unknown Album";
        const normalizedAlbumTitle = normalizeName(albumTitle);
        const year = common.year ?? null;

        let album = await db
          .selectFrom("albums")
          .select(["id"])
          .where("canonical_artist_id", "=", canonicalArtistId)
          .where("normalized_album_title", "=", normalizedAlbumTitle)
          .where("year", year === null ? "is" : "=", year as never)
          .executeTakeFirst();

        if (!album) {
          album = await db
            .insertInto("albums")
            .values({
              canonical_artist_id: canonicalArtistId,
              album_title: albumTitle,
              normalized_album_title: normalizedAlbumTitle,
              album_type: inferAlbumTypeFromPath(libraryFile.file_path),
              year,
              musicbrainz_release_group_id: getFirstString(common.musicbrainz_releasegroupid),
              musicbrainz_release_id: getFirstString(common.musicbrainz_albumid),
              updated_at: new Date().toISOString()
            })
            .returning(["id"])
            .executeTakeFirstOrThrow();
        }

        await db
          .insertInto("tracks")
          .values({
            library_file_id: libraryFile.id,
            canonical_album_artist_id: canonicalArtistId,
            album_id: album.id,
            track_title: common.title ?? path.basename(libraryFile.file_path),
            normalized_track_title: normalizeName(common.title ?? path.basename(libraryFile.file_path)),
            track_artist_raw: common.artist ?? null,
            album_artist_raw: common.albumartist ?? null,
            album_title_raw: common.album ?? null,
            genre: common.genre?.[0] ?? null,
            year,
            disc_number: common.disk?.no ?? null,
            track_number: common.track?.no ?? null,
            duration_seconds: metadata.format.duration ? Math.round(metadata.format.duration) : null,
            musicbrainz_recording_id: getFirstString(common.musicbrainz_recordingid),
            musicbrainz_track_id: getFirstString(common.musicbrainz_trackid),
            musicbrainz_release_id: getFirstString(common.musicbrainz_albumid),
            musicbrainz_artist_id: getFirstString(common.musicbrainz_artistid)
          })
          .onConflict((oc: any) =>
            oc.column("library_file_id").doUpdateSet({
              canonical_album_artist_id: canonicalArtistId,
              album_id: album.id,
              track_title: common.title ?? path.basename(libraryFile.file_path),
              normalized_track_title: normalizeName(common.title ?? path.basename(libraryFile.file_path)),
              track_artist_raw: common.artist ?? null,
              album_artist_raw: common.albumartist ?? null,
              album_title_raw: common.album ?? null,
              genre: common.genre?.[0] ?? null,
              year,
              disc_number: common.disk?.no ?? null,
              track_number: common.track?.no ?? null,
              duration_seconds: metadata.format.duration ? Math.round(metadata.format.duration) : null,
              musicbrainz_recording_id: getFirstString(common.musicbrainz_recordingid),
              musicbrainz_track_id: getFirstString(common.musicbrainz_trackid),
              musicbrainz_release_id: getFirstString(common.musicbrainz_albumid),
              musicbrainz_artist_id: getFirstString(common.musicbrainz_artistid),
              parsed_at: new Date().toISOString()
            })
          )
          .execute();

        await db
          .updateTable("library_files")
          .set({
            parse_status: "parsed",
            parse_error: null,
            last_scanned_at: new Date().toISOString()
          })
          .where("id", "=", libraryFile.id)
          .execute();

        filesScanned += 1;
      } catch (error) {
        await db
          .updateTable("library_files")
          .set({
            parse_status: "failed",
            parse_error: error instanceof Error ? error.message : "Unknown parsing error",
            last_scanned_at: new Date().toISOString()
          })
          .where("id", "=", libraryFile.id)
          .execute();
      }
    });

    const knownFiles = await db
      .selectFrom("library_files")
      .select(["id", "file_path"])
      .where("exists_in_library", "=", true)
      .execute();

    for (const known of knownFiles) {
      if (!seenPaths.has(known.file_path)) {
        await db
          .updateTable("library_files")
          .set({
            exists_in_library: false
          })
          .where("id", "=", known.id)
          .execute();
        filesDeleted += 1;
      }
    }

    await db
      .updateTable("scan_runs")
      .set({
        status: "completed",
        files_seen: filesSeen,
        files_scanned: filesScanned,
        files_skipped: filesSkipped,
        files_deleted: filesDeleted,
        finished_at: new Date().toISOString()
      })
      .where("id", "=", scanRun.id)
      .execute();

    logger.info({
      job: "scan-library",
      event: "scan_completed",
      files_seen: filesSeen,
      files_scanned: filesScanned,
      files_skipped: filesSkipped,
      files_deleted: filesDeleted
    });

    return {
      scanRunId: scanRun.id,
      filesSeen,
      filesScanned,
      filesSkipped,
      filesDeleted
    };
  } catch (error) {
    await db
      .updateTable("scan_runs")
      .set({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown scan error",
        finished_at: new Date().toISOString()
      })
      .where("id", "=", scanRun.id)
      .execute();

    logger.error({
      job: "scan-library",
      event: "scan_failed",
      error: error instanceof Error ? error.message : "Unknown scan error"
    });

    throw error;
  }
}
