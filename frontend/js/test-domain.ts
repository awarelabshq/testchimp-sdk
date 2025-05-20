import { parse } from 'tldts';

function getSafeCookieDomain(hostname) {
  const parsed = parse(hostname, { allowPrivateDomains: true });

  console.log('Parsed:', parsed);

  if (parsed.isIp || !parsed.domain || parsed.domain === parsed.publicSuffix) {
    // Either it's an IP or a public suffix with no registrable domain
    return null;
  }

  return `.${parsed.domain}`;
}

function testCookieDomainFor(hostname) {
  const safeDomain = getSafeCookieDomain(hostname);

  if (safeDomain) {
    console.log(`✅ Safe cookie domain: ${safeDomain}`);
  } else {
    // Fallback to full hostname
    console.log(`⚠️ No safe base domain found. Fallback to full hostname: ${hostname}`);
  }
}

// === Try with real examples ===
const testHostnames = [
  'studio--cafetime-afg2v.us-central1.hosted.app',
  'my-project.firebaseapp.com',
  'app.example.com',
  'localhost',
  '127.0.0.1',
  'foo.vercel.app',
  'sub.domain.co.uk'
];

for (const hostname of testHostnames) {
  console.log(`\n🧪 Testing: ${hostname}`);
  testCookieDomainFor(hostname);
}