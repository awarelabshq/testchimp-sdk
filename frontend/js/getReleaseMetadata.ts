export interface ReleaseMetadata {
  releaseId: string;
  versionMetaTag?: string;
  webpackHash?: string;
  detectedTimestamp: string;
}

let cachedReleaseMetadata: ReleaseMetadata | null = null;
let cacheExpiry: number | null = null;

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function getReleaseMetadata(): Promise<ReleaseMetadata> {
  const now = Date.now();
  if (cachedReleaseMetadata && cacheExpiry && now < cacheExpiry) {
    return cachedReleaseMetadata;
  }

  const metadata = await computeReleaseMetadata();
  cachedReleaseMetadata = metadata;
  cacheExpiry = now + CACHE_DURATION_MS;

  return metadata;
}

async function computeReleaseMetadata(): Promise<ReleaseMetadata> {
  const detectedTimestamp = new Date().toISOString();

  const versionMeta = extractVersionMetaTag();
  if (versionMeta) {
    const releaseId = await sha256(`meta:${versionMeta}`);
    return {
      releaseId,
      versionMetaTag: versionMeta,
      detectedTimestamp,
    };
  }

  const webpackHash = extractWebpackHash();
  if (webpackHash) {
    const releaseId = await sha256(`webpack:${webpackHash}`);
    return {
      releaseId,
      webpackHash,
      detectedTimestamp,
    };
  }

  return {
    releaseId: 'default',
    detectedTimestamp,
  };
}

// Extract version info from <meta name="version" content="...">
function extractVersionMetaTag(): string | undefined {
  const metaTagNames = ['build-id', 'version', 'build', 'release'];
  for (const name of metaTagNames) {
    const content = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    if (content) return content;
  }
  return undefined;
}

// Detect webpack hash from known globals
function extractWebpackHash(): string | undefined {
  const globalCandidates = [
    (window as any).__webpack_hash__,
    (window as any).__webpack_require__?.h,
  ];
  return globalCandidates.find((val) => typeof val === 'string');
}

// Hash helper
async function sha256(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}