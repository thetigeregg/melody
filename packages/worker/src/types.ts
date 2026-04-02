export interface ScanSummary {
  scanRunId: string;
  filesSeen: number;
  filesScanned: number;
  filesSkipped: number;
  filesDeleted: number;
}

export interface RecommendationConfig {
  externalRatio: number;
  localRatio: number;
  limit: number;
  includeExplanations?: boolean;
}

export interface RecommendationItemResult {
  rank: number;
  recommendationType: "artist" | "track";
  tier: "new" | "rediscovery" | "frequent";
  sourceBucket: "external" | "local";
  canonicalArtistId?: string;
  trackId?: string;
  displayName: string;
  explanation?: string;
  score: number;
}

