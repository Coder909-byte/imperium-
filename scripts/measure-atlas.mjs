// Real production HTTP transfers; no per-module compression estimates.
// node scripts/measure-atlas.mjs http://localhost:3004 /tmp/atlas-transfers.json
import http from 'node:http';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const [base = 'http://localhost:3004', output = '/tmp/atlas-transfers.json'] = process.argv.slice(2);
function request(path) {
  return new Promise((resolve, reject) => {
    http.get(new URL(path, base), { headers: { 'Accept-Encoding': 'gzip' } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}
const document = await request('/atlas');
if (document.status !== 200) throw new Error(`Atlas returned HTTP ${document.status}`);
const html = (document.headers['content-encoding'] === 'gzip' ? gunzipSync(document.bytes) : document.bytes).toString();
const sources = [...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)]
  .filter(match => !/nomodule/i.test(match[0])).map(match => match[1]))];
if (!sources.length) throw new Error('Atlas HTML contains no scripts');
const scripts = [];
for (const src of sources) {
  const response = await request(src);
  if (response.status !== 200 || response.headers['content-encoding'] !== 'gzip') throw new Error(`Expected a gzipped production script: ${src}`);
  const contentLength = response.headers['content-length'] === undefined ? null : Number(response.headers['content-length']);
  if (contentLength !== null && contentLength !== response.bytes.length) throw new Error(`Transferred body differs from Content-Length: ${src}`);
  scripts.push({ src, encoding: 'gzip', contentLength, transferredBytes: response.bytes.length });
}
const relief = await request('/assets/atlas/natural-earth-relief.webp');
const initialScriptBytes = scripts.reduce((sum, file) => sum + file.transferredBytes, 0);
const result = {
  base, measuredAt: new Date().toISOString(),
  method: 'next build + next start; actual served atlas script tags, deduplicated, noModule excluded; HTTP Accept-Encoding gzip, measured response bodies and verified Content-Length when supplied. This server streams gzip with chunked transfer encoding. Relief bytes are separate from JavaScript. No TTI or physical-device claim.',
  initialScriptBytes, scripts,
  relief: { status: relief.status, bytes: relief.bytes.length },
};
await fs.writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ initialScriptBytes, relief: result.relief }));
if (initialScriptBytes >= 180000 || relief.status !== 200) process.exitCode = 1;
