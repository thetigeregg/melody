import { createDb, normalizeName } from "@melody/shared";

export async function resolveCanonicalArtist(
  observedName: string,
  source: "local_tag" | "lastfm" | "musicbrainz",
  musicbrainzArtistId?: string | null
): Promise<string> {
  const db = createDb();
  const normalized = normalizeName(observedName);

  if (musicbrainzArtistId) {
    const mbidMatch = await db
      .selectFrom("canonical_artists")
      .select(["id"])
      .where("musicbrainz_artist_id", "=", musicbrainzArtistId)
      .executeTakeFirst();

    if (mbidMatch) {
      return mbidMatch.id;
    }
  }

  const aliasMatch = await db
    .selectFrom("artist_aliases")
    .select(["canonical_artist_id"])
    .where("normalized_alias_name", "=", normalized)
    .executeTakeFirst();

  if (aliasMatch) {
    return aliasMatch.canonical_artist_id;
  }

  const created = await db
    .insertInto("canonical_artists")
    .values({
      canonical_name: observedName,
      normalized_name: normalized,
      musicbrainz_artist_id: musicbrainzArtistId ?? null,
      source_priority: source === "local_tag" ? "local" : source,
      updated_at: new Date().toISOString()
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("artist_aliases")
    .values({
      canonical_artist_id: created.id,
      alias_name: observedName,
      normalized_alias_name: normalized,
      source,
      confidence: "1.0"
    })
    .execute();

  return created.id;
}
