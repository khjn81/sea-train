import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

async function room(t) {
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const [chunk] = await once(server.stdout, 'data');
  const port = Number(String(chunk).trim().split(' ').at(-1));
  const ws = new WebSocket(`ws://127.0.0.1:${port}/realtime`);
  ws.on('error', () => {});
  t.after(() => ws.close());
  await once(ws, 'open');
  return ws;
}

test('coalesces a burst of state changes while retaining the final room state', async t => {
  const ws = await room(t);
  let count = 0;
  ws.on('message', bytes => { if (JSON.parse(bytes).type === 'state') count++; });
  await new Promise(resolve => setTimeout(resolve, 35));
  count = 0;
  for (let i = 0; i < 20; i++) ws.send(JSON.stringify({ type: 'stop' }));
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(count > 0 && count <= 4, `expected a bounded state burst, received ${count}`);
});

test('excessive application messages close only the flooding participant', { timeout: 5_000 }, async t => {
  const ws = await room(t);
  const closed = once(ws, 'close');
  for (let i = 0; i < 70; i++) ws.send(JSON.stringify({ type: 'unknown' }));
  const [code] = await closed;
  assert.equal(code, 1008);
});
