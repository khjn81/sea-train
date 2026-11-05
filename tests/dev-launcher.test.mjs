import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('one dev command serves the page and proxied realtime, then closes both children', { timeout: 20_000 }, async t => {
  const [webPort, realtimePort] = await Promise.all([freePort(), freePort()]);
  const child = spawn(process.execPath, ['scripts/dev.mjs'], {
    env: { ...process.env, DEV_PORT: String(webPort), REALTIME_PORT: String(realtimePort) },
    stdio: 'ignore',
  });
  t.after(() => child.kill('SIGTERM'));
  const origin = `http://127.0.0.1:${webPort}`;
  let ready = false;
  for (let i = 0; i < 120 && child.exitCode === null; i++) {
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'the single command must start the web server');
  const ws = new WebSocket(`ws://127.0.0.1:${webPort}/realtime`);
  t.after(() => ws.close());
  const [message] = await once(ws, 'message');
  assert.equal(JSON.parse(message).type, 'welcome');
  ws.close();
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
  await assert.rejects(fetch(origin));
  await assert.rejects(fetch(`http://127.0.0.1:${realtimePort}`));
});
