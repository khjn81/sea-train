import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const run = '.improvement-runs/20261105-github-release';
const spec = JSON.parse(fs.readFileSync(path.join(run, 'current-experiment.json')));
const id = String(spec.round).padStart(3, '0');
const folder = path.join(run, 'rounds', id);
fs.mkdirSync(folder, { recursive: true });
let attempt = 1;
while (fs.existsSync(path.join(folder, `evaluation-${attempt}.json`))) attempt++;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const seal = JSON.parse(fs.readFileSync(path.join(run, 'evaluator-seal.json')));
for (const [file, expected] of Object.entries(seal)) {
  if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Frozen evaluator changed: ${file}`);
}
const files = [];
for (const root of ['src', 'scripts', 'tests', 'e2e', 'server.js', 'package.json', 'package-lock.json', 'vite.config.js', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', '.github']) {
  function visit(file) {
    if (!fs.existsSync(file)) return;
    if (fs.statSync(file).isDirectory()) for (const entry of fs.readdirSync(file).sort()) visit(path.join(file, entry));
    else files.push([file, hash(fs.readFileSync(file))]);
  }
  visit(root);
}
const result = { ...spec, attempt, timestamp: new Date().toISOString(), rubric: 'rubric-v1', sourceHash: hash(JSON.stringify(files)), files, measurements: {} };
const checks = [
  ['unit', ['node', '--test', 'tests/*.test.mjs']],
  ['build', ['npm', 'run', 'build']],
  ['e2e', ['npx', 'playwright', 'test', '--project=desktop', '--reporter=json', '--grep', spec.grep]],
];
for (const [name, args] of checks) {
  const start = Date.now();
  const actual = name === 'unit' ? { shell: true } : {};
  const execution = spawnSync(args[0], args.slice(1), { encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024, ...actual });
  fs.writeFileSync(path.join(folder, `${attempt}-${name}.stdout`), execution.stdout || '');
  fs.writeFileSync(path.join(folder, `${attempt}-${name}.stderr`), execution.stderr || '');
  result.measurements[name] = { exit: execution.status, durationMs: Date.now() - start, error: execution.error?.message };
  if (name === 'e2e') {
    try {
      const report = JSON.parse(execution.stdout);
      result.measurements[name].stats = report.stats;
    } catch { /* Preserve malformed or interrupted output as failure evidence. */ }
  }
  console.log(`${id}/${attempt} ${name}: ${execution.status} (${Date.now() - start} ms)`);
}
const valid = Object.values(result.measurements).every(check => check.exit === 0);
result.decision = valid ? 'keep' : 'needs_retest';
result.score = valid ? spec.ratings.reduce((sum, value) => sum + value, 0) : null;
result.scoreMeaning = 'Evidence-based implementation-agent rubric judgment; selected development regressions, not a full fresh independent test of all 20 criteria.';
fs.writeFileSync(path.join(folder, `evaluation-${attempt}.json`), JSON.stringify(result, null, 2) + '\n');
const diff = spawnSync('git', ['diff', '--no-ext-diff'], { encoding: 'utf8' });
fs.writeFileSync(path.join(folder, `candidate-${attempt}.patch`), diff.stdout || '');
console.log(JSON.stringify({ round: spec.round, attempt, decision: result.decision, score: result.score, stats: result.measurements.e2e.stats }));
process.exitCode = valid ? 0 : 1;
