import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidates = [
  process.env.OPENCODE_MCP_BRIDGE,
  path.resolve(__dirname, '..', '..', '..', 'mcp-server.mjs'),
  path.join(os.homedir(), '.opencode-free-subagents-mcp', 'mcp-server.mjs'),
  path.join(os.homedir(), 'Documents', 'GitHub', 'opencode-free-subagents-mcp', 'mcp-server.mjs'),
  path.join(os.homedir(), '.gemini', 'antigravity', 'scratch', 'opencode-api-proxy', 'mcp-server.mjs')
].filter(Boolean);

const bridgePath = candidates.find(p => fs.existsSync(p));

if (bridgePath) {
  await import(pathToFileURL(bridgePath).href);
} else {
  // Pure-HTTP stdio fallback if running standalone when backend daemon is already active
  const mcpUrl = process.env.OPENCODE_PROXY_MCP_URL || 'http://127.0.0.1:8787/mcp';
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

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
      const res = await fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (res.status === 202 || msg.id === undefined || msg.id === null) return;
      const data = await res.json();
      process.stdout.write(JSON.stringify(data) + '\n');
    } catch (err) {
      if (msg?.id !== undefined && msg?.id !== null) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: {
              code: -32603,
              message: `OpenCode MCP relay error (${mcpUrl}): ${err.message}`
            }
          }) + '\n'
        );
      }
    }
  });
}
