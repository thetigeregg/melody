import { getEnv } from "@melody/shared";

const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export async function fetchRecentScrobbles(fromUnixTs?: number): Promise<unknown[]> {
  const env = getEnv();
  if (!env.LASTFM_API_KEY || !env.LASTFM_USERNAME) {
    return [];
  }

  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "user.getrecenttracks");
  url.searchParams.set("user", env.LASTFM_USERNAME);
  url.searchParams.set("api_key", env.LASTFM_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "200");
  if (fromUnixTs) {
    url.searchParams.set("from", String(fromUnixTs));
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Last.fm recent tracks failed with ${response.status}`);
  }

  const payload = await response.json() as { recenttracks?: { track?: unknown[] | unknown } };
  const tracks = payload.recenttracks?.track ?? [];
  return Array.isArray(tracks) ? tracks : [tracks];
}

export async function fetchSimilarArtists(artistName: string): Promise<unknown[]> {
  const env = getEnv();
  if (!env.LASTFM_API_KEY) {
    return [];
  }

  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "artist.getsimilar");
  url.searchParams.set("artist", artistName);
  url.searchParams.set("api_key", env.LASTFM_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "25");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Last.fm similar artists failed with ${response.status}`);
  }

  const payload = await response.json() as { similarartists?: { artist?: unknown[] | unknown } };
  const artists = payload.similarartists?.artist ?? [];
  return Array.isArray(artists) ? artists : [artists];
}

