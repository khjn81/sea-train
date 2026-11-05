import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

test('same-origin and configured browsers can join while unrelated and null origins cannot', async t => {
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', ALLOWED_ORIGINS: 'https://train.example' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());
  const [chunk] = await once(server.stdout, 'data');
  const port = Number(String(chunk).trim().split(' ').at(-1));
  for (const origin of [undefined, `http://127.0.0.1:${port}`, 'https://train.example', 'https://unrelated.example', 'null']) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/realtime`, origin ? { origin } : {});
    ws.on('error', () => {});
    const allowed = origin === undefined || origin === `http://127.0.0.1:${port}` || origin === 'https://train.example';
    if (allowed) { await once(ws, 'open'); ws.close(); }
    else await assert.rejects(once(ws, 'open'), /401|403/);
  }
});
