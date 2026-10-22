import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const manifestPath = 'content/assets/manifest.json';
const allRows = JSON.parse(readFileSync(manifestPath));
const manifest = allRows.filter((row, index) => !/public\/assets\/gallia\/(roman-infantry|gallic-infantry)/.test(row.file) || !allRows.slice(index + 1).some(later => later.file === row.file));
const owner = manifest.find(row => row.file.endsWith('infantry-reference-pair.png')).approval;
const track = (values) => values.map(([t, rot]) => ({ t, rot, ease: 'sine.inOut' }));
for (const [id, folder] of [['roman_infantry', 'roman-infantry'], ['gaul_warrior', 'gallic-infantry'], ['gaul_warrior_blue', 'gallic-infantry-blue']]) {
  const roman = id === 'roman_infantry';
  const parts = [];
  for (const name of ['body', 'head', 'weapon', 'shield', 'leg_near', 'leg_far']) {
    const asset = `gallia/${folder}/${name}.webp`;
    const file = `public/assets/${asset}`;
    const { width, height } = await sharp(file).metadata();
    const geometry = {
      body: { pivot: [width / 2, height], parent: null, rest: { x: 0, y: -180 }, zOrder: 3 },
      head: { pivot: [width * 0.48, height - 5], parent: 'body', rest: { x: 8, y: -166 }, zOrder: 4 },
      weapon: { pivot: roman ? [width * 0.8, 14] : id === 'gaul_warrior' ? [24, 135] : [12, 110], parent: 'body', rest: { x: -56, y: -150 }, zOrder: 5 },
      shield: { pivot: roman ? [20, 25] : [14, 50], parent: 'body', rest: { x: 48, y: -150 }, zOrder: 6 },
      leg_near: { pivot: [width * 0.46, 5], parent: 'body', rest: { x: 24, y: -5 }, zOrder: 2 },
      leg_far: { pivot: [width * 0.36, 5], parent: 'body', rest: { x: -46, y: -5 }, zOrder: 1 },
    }[name];
    parts.push({ id: name, texture: asset, size: [width, height], ...geometry });
    const row = manifest.find(row => row.file === file);
    if (!row) throw new Error(`Forge provenance missing: ${file}`);
    row.approval = owner;
    row.derivation = { kind: 'ai-assisted-character-draft', sourceFile: 'content/assets/staging/gallia/met-montefortino-source.jpg', modifications: `Provisional ${id} painted part. AI sheet → alpha-bounded proportional crop → full-colour forge WebP; no luminance matte. See docs/m8-personnel-review.md for source limits and crop geometry.` };
  }
  const common = { loop: true, midlineExemptParts: ['weapon', 'shield'] };
  const clips = [
    { id: 'idle', durationMs: roman ? 3100 : 3470, ...common, tracks: { body: track([[0, 0], [0.5, 0.18], [1, 0]]), head: track([[0, -0.3], [0.6, 0.8], [1, -0.3]]), weapon: track([[0, -0.4], [0.45, 0.4], [1, -0.4]]) } },
    { id: 'brace', durationMs: roman ? 2770 : 2930, ...common, tracks: { body: track([[0, 0], [0.4, -0.25], [1, 0]]), weapon: track([[0, 0], [0.55, -2.2], [1, 0]]), shield: track([[0, 0], [0.45, 0.7], [1, 0]]), head: track([[0, 0], [0.7, 0.8], [1, 0]]) } },
    { id: 'thrust', durationMs: roman ? 2130 : 2390, ...common, tracks: { weapon: track([[0, 0], [0.3, -7], [0.55, -1], [1, 0]]), body: track([[0, 0], [0.3, -0.45], [1, 0]]), shield: track([[0, 0], [0.4, -0.5], [1, 0]]) } },
    { id: 'march', durationMs: roman ? 1570 : 1730, ...common, locomotion: true, symmetricPairs: [['leg_near', 'leg_far']], tracks: { leg_near: track([[0, -1.5], [0.5, 1.5], [1, -1.5]]), leg_far: track([[0, 1.5], [0.5, -1.5], [1, 1.5]]), weapon: track([[0, -0.4], [0.5, 0.8], [1, -0.4]]) } },
    { id: 'raise', durationMs: 3300, ...common, tracks: { weapon: track([[0, 0], [0.5, -5], [1, 0]]) } },
    { id: 'fall', durationMs: 1200, loop: false, midlineExemptParts: ['weapon', 'shield', 'head', 'leg_near', 'leg_far'], tracks: { body: [{ t: 0, rot: 0 }, { t: 1, rot: 82, dx: 40, dy: 170, ease: 'power2.in' }] } },
  ];
  writeFileSync(`content/rigs/${id}.json`, JSON.stringify({ id, draft: true, parts, clips }, null, 2) + '\n');
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
