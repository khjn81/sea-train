import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

test('capacity rejects overflow and heartbeat releases a silent client for a replacement', { timeout: 8_000 }, async t => {
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', MAX_CLIENTS: '2', HEARTBEAT_MS: '100' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => server.kill());
  const [chunk] = await once(server.stdout, 'data');
  const port = Number(String(chunk).trim().split(' ').at(-1));
  const url = `ws://127.0.0.1:${port}/realtime`;
  const healthy = new WebSocket(url);
  const silent = new WebSocket(url, { autoPong: false });
  for (const ws of [healthy, silent]) { ws.on('error', () => {}); t.after(() => ws.close()); }
  await Promise.all([once(healthy, 'open'), once(silent, 'open')]);
  const dropped = once(silent, 'close');
  const overflow = new WebSocket(url);
  overflow.on('error', () => {});
  await assert.rejects(once(overflow, 'open'), /401|403/);
  await dropped;
  assert.equal(healthy.readyState, WebSocket.OPEN);
  const replacement = new WebSocket(url);
  replacement.on('error', () => {});
  t.after(() => replacement.close());
  await once(replacement, 'open');
  assert.equal((await (await fetch(`http://127.0.0.1:${port}/healthz`)).json()).clients, 2);
});
