// Mutating production-browser audit, restricted to the disposable test DB.
// node --import tsx scripts/audit-quiz.mjs http://127.0.0.1:3006 /tmp/imperium-m9-final
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderedTextContrast } from './rendered-text-contrast.mjs';
import { assertIsolatedTestDatabase } from '../lib/testDatabase.ts';

assertIsolatedTestDatabase(process.env.DATABASE_URL);
const [base = 'http://127.0.0.1:3006', output = '/tmp/imperium-m9-final'] = process.argv.slice(2);
const origin = new URL(base).origin;
if (origin !== new URL(process.env.BETTER_AUTH_URL).origin) throw new Error('Audit origin must match the isolated server origin');
await fs.mkdir(output, { recursive: true });
const bank = await Promise.all((await fs.readdir('content/questions')).filter(file => file.endsWith('.json')).sort().map(async file => JSON.parse(await fs.readFile(`content/questions/${file}`, 'utf8'))));
const privateText = bank.flatMap(question => [question.explanation, ...Object.values(question.feedbackByOptionId)]);
const chunks = [];
async function inspectChunks(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await inspectChunks(file);
    else if (entry.name.endsWith('.js')) {
      const text = await fs.readFile(file, 'utf8');
      const leaks = privateText.filter(value => text.includes(value) || text.includes(JSON.stringify(value).slice(1, -1)));
      if (leaks.length) throw new Error(`Private quiz content in browser bundle ${file}`);
      chunks.push(file);
    }
  }
}
await inspectChunks('.next/static');
if (!chunks.length) throw new Error('No production browser chunks found');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pages = [];

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const errors = [], failedResponses = [];
  let syntheticError = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !(syntheticError && response.status() === 503 && response.url().endsWith('/api/quiz/answer'))) failedResponses.push({ url: response.url(), status: response.status() });
  });
  async function capture(state) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${state}-${width}.png`, fullPage: true });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('.atlas-shell'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), incomplete: result.incomplete.map(v => ({ id: v.id, count: v.nodes.length })) };
    });
    const contrast = await renderedTextContrast(page);
    const item = { width, state, contrast, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), axe, errors: [...errors], failedResponses: [...failedResponses] };
    pages.push(item); console.log(JSON.stringify(item));
  }
  await page.goto(`${base}/quiz/gallia`);
  await page.getByRole('button', { name: 'Start quiz', exact: true }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === 'Start quiz')?.disabled);
  await capture('intro');
  const startedResponse = page.waitForResponse(response => response.url().endsWith('/api/quiz/session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Start quiz', exact: true }).click();
  const initial = await (await startedResponse).json();
  const serialized = JSON.stringify(initial);
  for (const key of ['correctOptionId', 'correct', 'feedback', 'feedbackByOptionId', 'explanation', 'rightQuip', 'wrongQuips']) if (serialized.includes(`"${key}"`)) throw new Error(`Pre-submission key: ${key}`);
  await page.getByRole('radio').first().waitFor();
  await capture('question');
  for (let index = 0; index < bank.length; index++) {
    const question = bank[index];
    const id = index === 0 ? question.options[0].id : question.correctOptionId;
    await page.getByRole('radio', { name: question.options.find(option => option.id === id).text, exact: true }).check();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await page.getByRole('region', { name: 'Answer feedback' }).waitFor();
    if (index < 2) await capture(index === 0 ? 'incorrect-feedback' : 'correct-feedback');
    await page.getByRole('button', { name: index === 4 ? 'View results' : 'Next question', exact: true }).click();
  }
  await page.getByRole('heading', { name: '4 out of 5', exact: true }).waitFor();
  await capture('results');
  const signup = await page.request.post(`${base}/api/auth/sign-up/email`, { headers: { Origin: origin }, data: { email: `audit-${crypto.randomUUID()}@example.com`, password: 'LocalQuizPass23', name: 'Local audit reader' } });
  if (signup.status() !== 200) throw new Error(`Local audit signup failed: ${signup.status()}`);
  await page.goto(`${base}/profile`);
  await page.getByText('Saved progress verified. 80 new XP imported.', { exact: true }).waitFor();
  await page.getByRole('definition').filter({ hasText: /^80 XP$/ }).waitFor();
  await capture('profile');
  await page.goto(`${base}/quiz/gallia`);
  await page.getByRole('button', { name: 'Retry quiz', exact: true }).click();
  await page.getByRole('radio').first().check();
  syntheticError = true;
  await page.route('**/api/quiz/answer', route => route.fulfill({ status: 503, json: { error: 'Progress could not be saved. Check your connection and try again.' } }), { times: 1 });
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Progress could not be saved' }).waitFor();
  await capture('submission-error');
  await page.close();
}
const report = { base, measuredAt: new Date().toISOString(), environment: { node: process.version, chrome: browser.version(), host: 'macOS desktop, headless Chrome, responsive 1440/390 widths, reduced motion, dark system preference, isolated test Postgres; not physical-device/Safari acceptance' }, clientChunksScanned: chunks.length, privateContentLeaks: 0, preSubmissionFieldsAllowlisted: true, pages };
await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
if (pages.some(page => page.overflow || page.errors.length || page.failedResponses.length || page.axe.violations.length || page.contrast.failures.length)) process.exitCode = 1;
