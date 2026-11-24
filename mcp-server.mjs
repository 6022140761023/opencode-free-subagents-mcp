import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXY_MCP_URL = process.env.OPENCODE_PROXY_MCP_URL || 'http://127.0.0.1:8787/mcp';
const PROXY_HEALTH_URL = process.env.OPENCODE_PROXY_HEALTH_URL || 'http://127.0.0.1:8787/health';
const VBS_PATH = path.join(__dirname, 'start-hidden.vbs');

let ensuringPromise = null;

async function isProxyHealthy() {
  try {
    const res = await fetch(PROXY_HEALTH_URL, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureProxyRunning() {
  if (await isProxyHealthy()) return true;
  if (ensuringPromise) return ensuringPromise;

  ensuringPromise = (async () => {
    try {
      const child = spawn('wscript.exe', [VBS_PATH], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    } catch {}

    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (await isProxyHealthy()) return true;
    }
    return false;
  })();

  try {
    return await ensuringPromise;
  } finally {
    ensuringPromise = null;
  }
}

async function forwardRpcToDaemon(msg) {
  await ensureProxyRunning();
  const res = await fetch(PROXY_MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });

  if (res.status === 202 || msg.id === undefined || msg.id === null) {
    return null;
  }
  return await res.json();
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', async line => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }

  try {
    // Fast-path initialize & ping even while background daemon warms up
    if (msg.method === 'initialize' && msg.id !== undefined) {
      ensureProxyRunning().catch(() => {});
      const resp = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: msg.params?.protocolVersion || '2024-11-05',
          capabilities: {
            tools: { listChanged: false }
          },
          serverInfo: {
            name: 'opencode-free-subagents',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (msg.method === 'ping' && msg.id !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }) + '\n');
      return;
    }

    const resp = await forwardRpcToDaemon(msg);
    if (resp) {
      process.stdout.write(JSON.stringify(resp) + '\n');
    }
  } catch (err) {
    if (msg?.id !== undefined && msg?.id !== null) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: {
            code: -32603,
            message: `OpenCode MCP bridge error: ${err.message}`
          }
        }) + '\n'
      );
    }
  }
});
