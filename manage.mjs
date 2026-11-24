import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync, spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOME_DIR = os.homedir();
const LOCAL_APPDATA = process.env.LOCALAPPDATA || path.join(HOME_DIR, 'AppData', 'Local');

const action = process.argv[2] || 'status';
const vbsPath = path.join(__dirname, 'start-hidden.vbs');
const serverPath = path.join(__dirname, 'server.mjs');
const configPath = path.join(__dirname, 'config.json');
const port = Number(process.env.PORT || 8787);
const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const appName = 'OpenCodeApiProxy';
const startupFolder = path.join(
  process.env.APPDATA || path.join(HOME_DIR, 'AppData', 'Roaming'),
  'Microsoft\\Windows\\Start Menu\\Programs\\Startup'
);
const startupVbsPath = path.join(startupFolder, 'OpenCodeApiProxy.vbs');

function resolveOpencodeCliPath() {
  if (process.env.OPENCODE_CLI_PATH && fs.existsSync(process.env.OPENCODE_CLI_PATH)) {
    return process.env.OPENCODE_CLI_PATH;
  }
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg?.opencodeCliPath && fs.existsSync(cfg.opencodeCliPath)) {
        return cfg.opencodeCliPath;
      }
    }
  } catch {}
  return path.join(LOCAL_APPDATA, 'Programs', 'ai.opencode.desktop', 'resources', 'opencode-cli.exe');
}

function getListeningPid() {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out ? Number(out) : null;
  } catch {
    return null;
  }
}

function isAutostartRegistered() {
  if (fs.existsSync(startupVbsPath)) return true;
  try {
    const out = execSync(`reg query "${regKey}" /v "${appName}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.includes(appName);
  } catch {
    return false;
  }
}

function installAutostart() {
  const cmdValue = `wscript.exe "${vbsPath}"`;
  try {
    execSync(`reg add "${regKey}" /v "${appName}" /t REG_SZ /d "${cmdValue.replace(/"/g, '\\"')}" /f`, {
      stdio: 'ignore'
    });
  } catch {}
  try {
    if (fs.existsSync(startupFolder)) {
      fs.copyFileSync(vbsPath, startupVbsPath);
    }
  } catch {}
}

function spawnDetachedViaWmi() {
  const ocExe = resolveOpencodeCliPath();
  const serverUrl = pathToFileURL(serverPath).href;
  const cmdLine = fs.existsSync(ocExe)
    ? `cmd.exe /c "set BUN_BE_BUN=1&& "${ocExe}" -e "import('${serverUrl}')""`
    : `cmd.exe /c ""${process.execPath}" "${serverPath}""`;
  const ps = [
    `$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }`,
    `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${cmdLine.replace(/'/g, "''")}'; CurrentDirectory = '${__dirname.replace(/'/g, "''")}'; ProcessStartupInformation = $si } | Out-Null`
  ].join('; ');
  const encoded = Buffer.from(ps, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { stdio: 'ignore' });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main(act = action) {
  if (act === 'start') {
    let pid = getListeningPid();
    if (pid) {
      console.log(`[OpenCode API Proxy] 已在运行中 (PID: ${pid}) -> http://127.0.0.1:${port}/v1`);
      return;
    }

    try {
      spawnDetachedViaWmi();
    } catch {
      const child = spawn('wscript.exe', [vbsPath], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    }

    for (let i = 0; i < 25; i++) {
      await sleep(200);
      pid = getListeningPid();
      if (pid) {
        console.log(`[OpenCode API Proxy] 后台常驻服务已启动 (PID: ${pid}) -> http://127.0.0.1:${port}/v1`);
        return;
      }
    }
    console.error('[OpenCode API Proxy] 启动超时，请检查 proxy.log');
    process.exit(1);
  } else if (act === 'stop') {
    const pid = getListeningPid();
    if (!pid) {
      console.log('[OpenCode API Proxy] 当前未运行。');
      return;
    }
    try {
      process.kill(pid);
      console.log(`[OpenCode API Proxy] 已停止后台服务 (PID: ${pid})`);
    } catch (err) {
      console.error(`停止失败: ${err.message}`);
    }
  } else if (act === 'restart') {
    const pid = getListeningPid();
    if (pid) {
      try { process.kill(pid); } catch {}
      await sleep(400);
    }
    await main('start');
  } else if (act === 'install-autostart') {
    installAutostart();
    console.log(`[OpenCode API Proxy] 已注册开机后台静默自启动 (Startup 目录 + 注册表 Run)`);
  } else if (act === 'uninstall-autostart') {
    try { execSync(`reg delete "${regKey}" /v "${appName}" /f`, { stdio: 'ignore' }); } catch {}
    try { if (fs.existsSync(startupVbsPath)) fs.unlinkSync(startupVbsPath); } catch {}
    console.log('[OpenCode API Proxy] 已移除开机自启动项');
  } else {
    const pid = getListeningPid();
    const auto = isAutostartRegistered() ? '已开启开机自启' : '未开启开机自启';
    if (!pid) {
      console.log(`[未运行] OpenCode API Proxy 当前未在端口 ${port} 监听 (${auto})`);
      return;
    }
    console.log(`[运行中] PID: ${pid} | Base URL: http://127.0.0.1:${port}/v1 | ${auto}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const h = await res.json();
        console.log(`已加载模型总数: ${h.total_models} | 默认模型: ${h.default_model}`);
        console.log(`提供商分布: ${JSON.stringify(h.providers)}`);
      }
    } catch {}
  }
}

main();
