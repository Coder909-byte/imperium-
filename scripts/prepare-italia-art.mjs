// Deterministic export only; image creation/alpha work uses built-in imagegen.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const [input, name, sourceName, scope, widthText = '1600', qualityText = '78'] = process.argv.slice(2);
if (!input || !/^[a-z-]+$/.test(name ?? '') || !['atmospheric-derivative', 'structural-draft', 'character-draft'].includes(scope)) throw new Error('Expected input, name, source basename, scope, width, quality');
const manifestPath = 'content/assets/manifest.json';
const rows = JSON.parse(readFileSync(manifestPath, 'utf8'));
const sourceFile = `content/assets/staging/italia/${sourceName}`;
const source = rows.find(row => row.file === sourceFile && !row.derivation);
if (!source?.approval || !/public domain|CC0/i.test(source.licence)) throw new Error('Verified original source required');
const staging = `content/assets/staging/italia/${name}.png`;
const output = `public/assets/italia/${name}.webp`;
const kind = { 'atmospheric-derivative': 'ai-assisted-atmosphere', 'structural-draft': 'ai-assisted-structure-draft', 'character-draft': 'ai-assisted-character-draft' }[scope];
const width = Number(widthText), quality = Number(qualityText);
const buffer = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
const hash = data => createHash('sha256').update(data).digest('hex');
for (const [file, data] of [[staging, readFileSync(input)], [output, buffer]]) {
  const row = { file, source: source.source, licence: 'Owner-approved AI-assisted derivative; not public domain', retrieved: '2026-10-25', artist: 'AI-assisted interpretation, owner-authorized Italia batch', institution: 'Imperium', notes: `Italia only. Interpreted/provisional, not a surveyed setting, certain likeness or verified costume reconstruction. Built-in image_gen; prompt/output lineage: docs/reviews/italia-art-prompts.json. Input ${input.split('/').pop()}; SHA-256 ${hash(data)}. Original reference limits remain in source row.`, approval: { scope, by: 'Project owner (Italia batch approval, chat 2026-10-25)', at: '2026-10-25', rightsUrl: source.source, rightsStatement: 'Source file rights verified separately. Owner authorizes this generated Italia interpretation; generated output is not PD/CC0.' }, derivation: { kind, sourceFile, modifications: 'Built-in imagegen painted interpretation; deterministic full-colour resize/WebP export only. See prompt ledger for reference roles and exclusions.' } };
  const index = rows.findIndex(existing => existing.file === file);
  if (index >= 0) rows[index] = row; else rows.push(row);
}
writeFileSync(manifestPath, JSON.stringify(rows, null, 2) + '\n');
mkdirSync(dirname(output), { recursive: true });
if (input !== staging) copyFileSync(input, staging);
writeFileSync(output, buffer);
console.log(JSON.stringify({ output, bytes: buffer.length, metadata: await sharp(buffer).metadata() }));
