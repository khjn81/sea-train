import { spawn } from "node:child_process";

const host = process.env.HOST || "127.0.0.1";
const realtimePort = process.env.REALTIME_PORT || "3001";
const webPort = process.env.DEV_PORT || "5173";
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  const deadline = setTimeout(() => {
    for (const child of children)
      if (child.exitCode === null) child.kill("SIGKILL");
  }, 4_000);
  deadline.unref();
  Promise.all(
    children.map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => child.once("exit", resolve)),
    ),
  ).then(() => {
    clearTimeout(deadline);
    process.exitCode = code;
  });
}

function run(args, env) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env });
  children.push(child);
  child.once("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
}

process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
run(["server.js"], { ...process.env, HOST: host, PORT: realtimePort });
run(
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    host,
    "--port",
    webPort,
    "--strictPort",
    ...process.argv.slice(2),
  ],
  {
    ...process.env,
    REALTIME_PORT: realtimePort,
  },
);
