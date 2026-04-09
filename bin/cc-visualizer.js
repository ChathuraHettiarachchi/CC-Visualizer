#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// ── Argument parsing ─────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

function flag(name) { return rawArgs.includes(name); }
function option(name, def) {
  const arg = rawArgs.find(a => a.startsWith(name + '='));
  return arg ? arg.split('=').slice(1).join('=') : def;
}

const PORT    = parseInt(option('--port', process.env.PORT ?? '3000'), 10);
const NO_OPEN = flag('--no-open');
const NO_HOOKS= flag('--no-hooks');
const UNINSTALL = flag('--uninstall') || flag('--uninstall-hooks');
const HELP    = flag('--help') || flag('-h');

// ── Help ─────────────────────────────────────────────────────────────────────

if (HELP) {
  console.log(`
  cc-visualizer — real-time Claude Code session visualizer

  Usage:
    npx cc-visualizer [options]

  Options:
    --port=<n>         Port to run on (default: 3000)
    --no-open          Don't open the browser automatically
    --no-hooks         Skip Claude hook installation
    --uninstall        Remove cc-visualizer hooks from Claude settings and exit

  Examples:
    npx cc-visualizer                 # Install hooks, start server, open browser
    npx cc-visualizer --port=4000     # Use a different port
    npx cc-visualizer --no-hooks      # Start without touching Claude settings
    npx cc-visualizer --uninstall     # Remove hooks only
`);
  process.exit(0);
}

// ── Hook management ──────────────────────────────────────────────────────────

const HOOK_EVENTS  = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];
const HOOK_MARKER  = '/api/hooks';  // identifies our hooks

function hookCommand(port) {
  return `curl -sf -X POST http://localhost:${port}/api/hooks -H 'Content-Type: application/json' --data-binary @- --max-time 2 2>/dev/null || true`;
}

function settingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function readSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return {}; }
}

function writeSettings(s) {
  const p = settingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n', 'utf8');
}

function isOurHook(cmd) { return typeof cmd === 'string' && cmd.includes(HOOK_MARKER); }

function installHooks(port) {
  const settings = readSettings();
  settings.hooks = settings.hooks ?? {};
  const cmd = hookCommand(port);

  for (const event of HOOK_EVENTS) {
    const entries = settings.hooks[event] ?? [];

    // Find existing cc-visualizer entry (any port)
    const existing = entries.find(e =>
      Array.isArray(e.hooks) && e.hooks.some(h => isOurHook(h.command))
    );

    if (existing) {
      // Update port in-place
      existing.hooks = existing.hooks.map(h =>
        isOurHook(h.command) ? { ...h, command: cmd } : h
      );
    } else {
      // Append a new entry so we don't displace existing hooks
      entries.push({ matcher: '', hooks: [{ type: 'command', command: cmd }] });
      settings.hooks[event] = entries;
    }
  }

  writeSettings(settings);
}

function uninstallHooks() {
  const settings = readSettings();
  if (!settings.hooks) { console.log('  No Claude hooks found.'); return; }

  for (const event of HOOK_EVENTS) {
    if (!settings.hooks[event]) continue;
    settings.hooks[event] = settings.hooks[event]
      .map(e => ({ ...e, hooks: (e.hooks ?? []).filter(h => !isOurHook(h.command ?? '')) }))
      .filter(e => e.hooks.length > 0);
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }

  writeSettings(settings);
  console.log('  ✓ cc-visualizer hooks removed from ~/.claude/settings.json');
}

// ── Server start ─────────────────────────────────────────────────────────────

const PKG_DIR = path.resolve(__dirname, '..');

function startServer(port) {
  const standaloneServer = path.join(PKG_DIR, '.next', 'standalone', 'server.js');
  const nextBin = path.join(PKG_DIR, 'node_modules', '.bin', 'next');

  const env = { ...process.env, PORT: String(port), HOSTNAME: '0.0.0.0' };

  let child;

  if (fs.existsSync(standaloneServer)) {
    // Installed via npm — run the pre-built standalone server
    child = spawn(process.execPath, [standaloneServer], { stdio: 'inherit', env });
  } else if (fs.existsSync(nextBin)) {
    // Running from source — use next dev
    console.log('  Running in development mode (source detected)\n');
    child = spawn(nextBin, ['dev', '--port', String(port)], { cwd: PKG_DIR, stdio: 'inherit', env });
  } else {
    console.error('\n  Error: Next.js not found. Run `npm install` first.\n');
    process.exit(1);
  }

  return child;
}

// ── Browser open ─────────────────────────────────────────────────────────────

function openBrowser(port) {
  // Wait for server to be ready, then open
  const url = `http://localhost:${port}`;
  const maxAttempts = 30;
  let attempt = 0;

  function tryOpen() {
    attempt++;
    const http = require('http');
    const req = http.get(url, (res) => {
      res.resume();
      // Server is up
      const cmd =
        process.platform === 'win32' ? 'cmd' :
        process.platform === 'darwin' ? 'open' : 'xdg-open';
      const cmdArgs =
        process.platform === 'win32' ? ['/c', 'start', url] : [url];
      spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).unref();
      console.log(`  ✓ Opened ${url}`);
    });
    req.on('error', () => {
      if (attempt < maxAttempts) setTimeout(tryOpen, 500);
    });
    req.setTimeout(800, () => req.destroy());
  }

  setTimeout(tryOpen, 800);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n  ╔═══════════════════════════════════════╗');
console.log('  ║   cc-visualizer  ·  Claude sessions   ║');
console.log('  ╚═══════════════════════════════════════╝\n');

if (UNINSTALL) {
  uninstallHooks();
  process.exit(0);
}

if (!NO_HOOKS) {
  installHooks(PORT);
  console.log(`  ✓ Claude hooks installed → http://localhost:${PORT}/api/hooks`);
  console.log(`    (PreToolUse, PostToolUse, Notification, Stop, SubagentStop)\n`);
}

console.log(`  Starting server on port ${PORT}…\n`);

const child = startServer(PORT);

if (!NO_OPEN) openBrowser(PORT);

process.on('SIGINT',  () => { child.kill('SIGINT');  process.exit(0); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0); });
