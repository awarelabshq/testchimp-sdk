export interface ReleaseMetadata {
  releaseId: string;
  versionMetaTag?: string;
  webpackHash?: string;
  etag?: string;
  lastModified?: string;
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
  const versionMeta = extractVersionMetaTag();
  if (versionMeta) {
    const releaseId = await sha256(`meta:${versionMeta}`);
    return {
      releaseId,
      versionMetaTag: versionMeta,
      ...(await fetchPageHeaders()),
      detectedTimestamp: new Date().toISOString(),
    };
  }

  const webpackHash = extractWebpackHash();
  if (webpackHash) {
    const releaseId = await sha256(`webpack:${webpackHash}`);
    return {
      releaseId,
      webpackHash,
      ...(await fetchPageHeaders()),
      detectedTimestamp: new Date().toISOString(),
    };
  }

  const assetUrls = extractAssetUrls();
  if (assetUrls.length > 0) {
    const joinedAssets = assetUrls.join(',');
    const releaseId = await sha256(`assets:${joinedAssets}`);
    return {
      releaseId,
      ...(await fetchPageHeaders()),
      detectedTimestamp: new Date().toISOString(),
    };
  }

  const domFingerprint = computeDomFingerprint();
  const releaseId = await sha256(`dom:${domFingerprint}`);
  return {
    releaseId,
    ...(await fetchPageHeaders()),
    detectedTimestamp: new Date().toISOString(),
  };
}

// 1. Meta Tag Extraction
function extractVersionMetaTag(): string | undefined {
  const metaTagNames = ['build-id', 'version', 'build', 'release'];
  for (const name of metaTagNames) {
    const content = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    if (content) return content;
  }
  return undefined;
}

// 2. Webpack Hash Detection
function extractWebpackHash(): string | undefined {
  const globalCandidates = [
    (window as any).__webpack_hash__,
    (window as any).__webpack_require__?.h,
  ];
  return globalCandidates.find((val) => typeof val === 'string');
}

// 3. Asset Hashing
function extractAssetUrls(): string[] {
  const scriptSrcs = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map((s) => s.src);
  const styleHrefs = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((l) => l.href);
  return [...scriptSrcs, ...styleHrefs]
    .map((url) => new URL(url, location.href).toString())
    .sort();
}

// 4. DOM Fingerprint
function computeDomFingerprint(): string {
  const bodyDescendants = Array.from(document.body.querySelectorAll('*')).slice(0, 100);
  return bodyDescendants
    .map((el) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).sort().join('.')}`)
    .join('|');
}

// Shared Headers
async function fetchPageHeaders(): Promise<Partial<ReleaseMetadata>> {
  try {
    const response = await fetch(location.origin + '/', { method: 'HEAD' });
    const etag = response.headers.get('etag') || undefined;
    const lastModified = response.headers.get('last-modified') || undefined;
    return { etag, lastModified };
  } catch {
    return {};
  }
}

// Hash Helper
async function sha256(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}