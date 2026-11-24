import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MCP_URL = 'http://127.0.0.1:8787/mcp';
const HEALTH_URL = 'http://127.0.0.1:8787/health';
const VBS_PATH = path.join(__dirname, 'start-hidden.vbs');

async function ensureDaemon() {
  try {
    const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1200) });
    if (r.ok) return;
  } catch {}

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
    try {
      const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return;
    } catch {}
  }
}

function parseArgs(argv) {
  const mode = argv[2] || 'team';
  const opts = {
    mode,
    model: 'auto',
    prompt: '',
    system: '',
    effort: '',
    files: []
  };

  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model' || a === '-m') opts.model = argv[++i] || opts.model;
    else if (a === '--prompt' || a === '-p') opts.prompt = argv[++i] || '';
    else if (a === '--system' || a === '-s') opts.system = argv[++i] || '';
    else if (a === '--effort' || a === '-e') opts.effort = argv[++i] || '';
    else if (a === '--file' || a === '-f') {
      const fp = argv[++i];
      if (fp) opts.files.push(fp);
    } else if (!opts.prompt) {
      opts.prompt = a;
    } else {
      opts.prompt += ' ' + a;
    }
  }
  return opts;
}

async function callMcpTool(name, args) {
  await ensureDaemon();
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result?.content?.[0]?.text || JSON.stringify(json.result, null, 2);
}

const opts = parseArgs(process.argv);

if (opts.mode === 'list') {
  console.log(await callMcpTool('list_free_models', {}));
} else if (opts.mode === 'run') {
  console.log(
    await callMcpTool('run_subagent', {
      model: opts.model,
      prompt: opts.prompt || 'Hello',
      ...(opts.system ? { system_prompt: opts.system } : {}),
      ...(opts.effort ? { reasoning_effort: opts.effort } : {}),
      ...(opts.files.length > 0 ? { file_paths: opts.files } : {})
    })
  );
} else {
  // Default 'team' mode: backend dynamically selects the active 3-model consensus lineup
  const taskPrompt = opts.prompt || '请自我介绍并确认就绪。';
  console.log(
    await callMcpTool('parallel_subagents', {
      prompt: taskPrompt,
      ...(opts.effort ? { reasoning_effort: opts.effort } : {}),
      ...(opts.files.length > 0 ? { file_paths: opts.files } : {})
    })
  );
}
