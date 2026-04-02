import { createDb, createLogger, getJobState, upsertJobState } from "@melody/shared";
import { fetchRecentScrobbles } from "../lastfm/client";
import { resolveCanonicalArtist } from "../lib/identity";

interface LastfmCheckpoint {
  lastSuccessfulScrobbleUnix?: number;
}

export async function ingestLastfmScrobbles() {
  const db = createDb();
  const logger = createLogger("worker");
  const checkpoint = await getJobState<LastfmCheckpoint>("ingest-lastfm");
  const tracks = await fetchRecentScrobbles(checkpoint?.lastSuccessfulScrobbleUnix);

  let newestUnix = checkpoint?.lastSuccessfulScrobbleUnix ?? 0;

  for (const rawTrack of tracks) {
    const track = rawTrack as {
      artist?: { "#text"?: string; mbid?: string };
      name?: string;
      album?: { "#text"?: string };
      mbid?: string;
      date?: { uts?: string };
    };

    if (!track.date?.uts || !track.artist?.["#text"] || !track.name) {
      continue;
    }

    const scrobbleUnix = Number(track.date.uts);
    newestUnix = Math.max(newestUnix, scrobbleUnix);
    const canonicalArtistId = await resolveCanonicalArtist(
      track.artist["#text"],
      "lastfm",
      track.artist.mbid ?? null
    );

    await db
      .insertInto("lastfm_scrobbles")
      .values({
        lastfm_track_mbid: track.mbid ?? null,
        artist_name: track.artist["#text"],
        track_name: track.name,
        album_name: track.album?.["#text"] ?? null,
        scrobbled_at: new Date(scrobbleUnix * 1000).toISOString(),
        raw_payload: JSON.stringify(track),
        canonical_artist_id: canonicalArtistId
      })
      .onConflict((oc: any) => oc.columns(["artist_name", "track_name", "scrobbled_at"]).doNothing())
      .execute();
  }

  await upsertJobState("ingest-lastfm", {
    lastSuccessfulScrobbleUnix: newestUnix
  });

  logger.info({
    job: "ingest-lastfm",
    event: "ingest_completed",
    count: tracks.length
  });
}
