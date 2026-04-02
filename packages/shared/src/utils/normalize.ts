export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[‐‑–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s\-.'&/]/gu, " ")
    .replace(/\s+/g, " ");
}

export function inferAlbumTypeFromPath(filePath: string): string {
  const segments = filePath.split("/").map((segment) => segment.toLowerCase());
  const albumType = segments.at(-2) ?? "";

  if (["album", "ep", "single", "soundtrack", "compilation", "mixtape"].includes(albumType)) {
    return albumType;
  }

  return "other";
}

