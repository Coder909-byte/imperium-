// Offline preparation only. Requires the Apache-2.0 kokoro-js 1.2.1 npm
// archive extracted outside the repo. No TTS code/weights ship to users.
// Run only after voice/sample approval:
// node scripts/generate-gallia-narration.mjs <package-dir> <temporary-output-dir> [approved-region-id]
import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';

const packageDirectory = resolve(process.argv[2]);
const outputDirectory = resolve(process.argv[3]);
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const model = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const voice = 'bm_george';
const speed = 0.92;
const hash = value => createHash('sha256').update(value).digest('hex');
const pkg = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
if (pkg.name !== 'kokoro-js' || pkg.version !== '1.2.1' || pkg.license !== 'Apache-2.0') throw new Error('Use the reviewed kokoro-js 1.2.1 package');
const voiceBytes = readFileSync(join(packageDirectory, 'voices', `${voice}.bin`));
const voiceHash = hash(voiceBytes);
if (voiceHash !== 'c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc') throw new Error('Stock voice differs from the reviewed sample');
const regionId = process.argv[4] ?? 'gallia';
if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(regionId)) throw new Error('Use a safe approved region ID');
const region = JSON.parse(readFileSync(`content/regions/${regionId}.json`, 'utf8'));
mkdirSync(outputDirectory, { recursive: true });

const server = http.createServer((request, response) => {
  if (request.url === '/kokoro.web.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(readFileSync(join(packageDirectory, 'dist/kokoro.web.js')));
  } else {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Local narration preparation</title>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.route(`https://huggingface.co/${model}/resolve/main/**`, route => route.continue({
    url: route.request().url().replace('/resolve/main/', `/resolve/${revision}/`),
  }));
  await page.route('**/voices/bm_george.bin', route => route.fulfill({ body: voiceBytes, contentType: 'application/octet-stream' }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  console.log(`Loading pinned ${model} ${revision}, local WASM q8`);
  await page.evaluate(async model => {
    const { KokoroTTS, TextSplitterStream } = await import('/kokoro.web.js');
    window.NarrationSplitter = TextSplitterStream;
    window.narrator = await KokoroTTS.from_pretrained(model, { dtype: 'q8', device: 'wasm' });
  }, model);
  const recordings = [];
  for (const beat of region.beats) {
    console.log(`Generating ${beat.id}`);
    const result = await page.evaluate(async ({ text, voice, speed }) => {
      const pieces = [];
      const chunks = [];
      // Close the finite stream explicitly; this release's string helper
      // leaves its final sentence waiting for more input indefinitely.
      const splitter = new window.NarrationSplitter();
      splitter.push(text);
      splitter.close();
      for await (const chunk of window.narrator.stream(splitter, { voice, speed })) {
        const tokens = window.narrator.tokenizer(chunk.phonemes, { truncation: false }).input_ids.dims.at(-1);
        if (tokens > 510) throw new Error('Sentence exceeds the untruncated model context');
        pieces.push(chunk.audio.audio);
        chunks.push({ text: chunk.text, tokens });
      }
      if (chunks.map(chunk => chunk.text).join(' ') !== text) throw new Error('Sentence assembly differs from verbatim source');
      const pause = 3600; // 150ms between sentences, at the model's 24kHz.
      const sampleCount = pieces.reduce((count, part) => count + part.length, 0) + pause * (pieces.length - 1);
      const buffer = new ArrayBuffer(44 + sampleCount * 2);
      const view = new DataView(buffer);
      const tag = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
      tag(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVEfmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      tag(36, 'data'); view.setUint32(40, sampleCount * 2, true);
      let sampleIndex = 0;
      for (const part of pieces) {
        for (const value of part) { view.setInt16(44 + sampleIndex * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true); sampleIndex++; }
        sampleIndex += pause;
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { base64: btoa(binary), durationMs: Math.round(sampleCount / 24), chunks };
    }, { text: beat.body, voice, speed });
    const wav = Buffer.from(result.base64, 'base64');
    writeFileSync(join(outputDirectory, `${beat.id}.wav`), wav);
    recordings.push({ id: beat.id, transcript: beat.body, transcriptSha256: hash(beat.body), durationMs: result.durationMs, chunks: result.chunks, wavSha256: hash(wav) });
    writeFileSync(join(outputDirectory, 'recordings.json'), JSON.stringify({ tool: pkg.version, model, revision, dtype: 'q8', voice, voiceHash, speed, recordings }, null, 2) + '\n');
    console.log(`${beat.id}: ${result.durationMs}ms, ${result.chunks.length} complete sentences`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
