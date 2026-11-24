import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '..');
const HOME = os.homedir();

function copyDirWithSubst(srcDir, dstDir, replacements) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirWithSubst(srcPath, dstPath, replacements);
    } else if (/\.(md|json|toml|yml|yaml|mjs)$/i.test(entry.name)) {
      let text = fs.readFileSync(srcPath, 'utf8');
      for (const [k, v] of Object.entries(replacements)) {
        text = text.split(k).join(v);
      }
      fs.writeFileSync(dstPath, text, 'utf8');
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

const args = new Set(process.argv.slice(2));
const installAll = args.size === 0 || args.has('--all');
const repoFwd = REPO_DIR.replace(/\\/g, '/');

if (installAll || args.has('--antigravity')) {
  const agyPluginDst = path.join(HOME, '.gemini', 'config', 'plugins', 'opencode-subagents');
  copyDirWithSubst(path.join(REPO_DIR, 'adapters', 'antigravity', 'opencode-subagents'), agyPluginDst, {
    '<OPENCODE_PROXY_DIR>': REPO_DIR
  });

  for (const mcpCfgPath of [
    path.join(HOME, '.gemini', 'config', 'mcp_config.json'),
    path.join(HOME, '.gemini', 'antigravity', 'mcp_config.json')
  ]) {
    if (!fs.existsSync(path.dirname(mcpCfgPath))) continue;
    let cfg = { mcpServers: {} };
    if (fs.existsSync(mcpCfgPath)) {
      try { cfg = JSON.parse(fs.readFileSync(mcpCfgPath, 'utf8')); } catch {}
    }
    cfg.mcpServers = cfg.mcpServers || {};
    cfg.mcpServers['opencode-subagents'] = {
      command: process.execPath,
      args: [path.join(REPO_DIR, 'mcp-server.mjs')]
    };
    fs.writeFileSync(mcpCfgPath, JSON.stringify(cfg, null, 2), 'utf8');
  }
  console.log('[Antigravity] Installed thin plugin & MCP entry ->', agyPluginDst);
}

if (installAll || args.has('--codex')) {
  const codexSkillDst = path.join(HOME, '.codex', 'skills', 'free-subagents');
  copyDirWithSubst(path.join(REPO_DIR, 'adapters', 'codex', 'skills', 'free-subagents'), codexSkillDst, {
    '<OPENCODE_PROXY_DIR>': repoFwd
  });
  try {
    execFileSync('codex', ['mcp', 'add', 'opencode_subagents', '--', process.execPath, `${repoFwd}/mcp-server.mjs`], {
      stdio: 'inherit'
    });
  } catch {
    console.log('[Codex] Skill copied. Add MCP manually from adapters/codex/config.snippet.toml if codex CLI is not on PATH.');
  }
}

if (installAll || args.has('--kimi')) {
  const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
  const shareDir = process.env.KIMI_SHARE_DIR || path.join(appData, 'kimi-desktop', 'daimon-share');
  const kimiDst = path.join(shareDir, 'plugin-sources', 'personal', 'opencode-subagents');
  copyDirWithSubst(path.join(REPO_DIR, 'adapters', 'kimi-desktop', 'opencode-subagents'), kimiDst, {
    '<OPENCODE_PROXY_DIR>': repoFwd
  });
  console.log('[Kimi Desktop] Copied plugin source ->', kimiDst);
  console.log('[Kimi Desktop] Run Kimi plugin-builder register_personal.py or open Personal tab to install.');
}

if (args.has('--print-dsh')) {
  const tpl = fs.readFileSync(path.join(REPO_DIR, 'adapters', 'deepseek-harness', 'cordis.patch.snippet.yml'), 'utf8');
  console.log('\n' + tpl.split('<OPENCODE_PROXY_DIR>').join(REPO_DIR));
}
