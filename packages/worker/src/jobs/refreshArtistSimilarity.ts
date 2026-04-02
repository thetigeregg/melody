import { createDb, createLogger } from "@melody/shared";
import { fetchSimilarArtists } from "../lastfm/client";
import { resolveCanonicalArtist } from "../lib/identity";

export async function refreshArtistSimilarity() {
  const db = createDb();
  const logger = createLogger("worker");
  const seedArtists = await db
    .selectFrom("canonical_artists")
    .select(["id", "canonical_name"])
    .orderBy("updated_at", "desc")
    .limit(10)
    .execute();

  for (const artist of seedArtists) {
    const similarArtists = await fetchSimilarArtists(artist.canonical_name);
    for (const raw of similarArtists) {
      const candidate = raw as { name?: string; match?: string; mbid?: string };
      if (!candidate.name) {
        continue;
      }

      const canonicalArtistId = candidate.mbid
        ? await resolveCanonicalArtist(candidate.name, "lastfm", candidate.mbid)
        : null;

      await db
        .insertInto("artist_similarity")
        .values({
          source: "lastfm",
          from_canonical_artist_id: artist.id,
          to_canonical_artist_id: canonicalArtistId,
          to_artist_name_raw: candidate.name,
          similarity_score: candidate.match ?? null,
          raw_payload: JSON.stringify(candidate)
        })
        .execute();
    }
  }

  logger.info({
    job: "refresh-artist-similarity",
    event: "similarity_refresh_completed",
    seed_count: seedArtists.length
  });
}

