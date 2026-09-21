import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression test for the §3.1 dotenv/import-hoisting trap: index.ts
// must reach db.ts (and anything else that reads process.env at
// module scope) through the *dynamic* imports below dotenv.config(),
// not a static import at the top of the file — a static import would
// be hoisted above dotenv.config() and silently see the pre-.env
// environment. This spawns the real entrypoint as a child process
// with DATA_DIR set only via $CONFIG_DIR/.env (never as a real env
// var) and asserts app.db lands where the file says, not at the
// default /data.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 100,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  if (!predicate()) throw new Error(`timed out after ${timeoutMs}ms`);
}

describe('$CONFIG_DIR/.env load order (server/index.ts entrypoint)', () => {
  let child: ChildProcessWithoutNullStreams | undefined;
  let configDir: string | undefined;
  let dataDir: string | undefined;
  let stderr = '';

  afterEach(() => {
    child?.kill();
    if (configDir) rmSync(configDir, { recursive: true, force: true });
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
    child = undefined;
    configDir = undefined;
    dataDir = undefined;
    stderr = '';
  });

  it('creates app.db under the DATA_DIR named by $CONFIG_DIR/.env, not the default', async () => {
    configDir = mkdtempSync(path.join(tmpdir(), 'one-job-config-'));
    dataDir = mkdtempSync(path.join(tmpdir(), 'one-job-data-'));
    writeFileSync(path.join(configDir, '.env'), `DATA_DIR=${dataDir}\nPORT=0\n`);

    // DATA_DIR must reach the child only through the .env file above,
    // never as a real env var, or the test would pass for the wrong
    // reason (real env vars take precedence over the file regardless
    // of the hoisting bug this test guards against).
    const { DATA_DIR: _ignored, ...envWithoutDataDir } = process.env;

    child = spawn(
      process.execPath,
      [
        path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
        path.join(REPO_ROOT, 'server', 'index.ts'),
      ],
      { cwd: REPO_ROOT, env: { ...envWithoutDataDir, CONFIG_DIR: configDir } },
    );
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const dbPath = path.join(dataDir, 'app.db');
    try {
      await waitFor(() => existsSync(dbPath), 10_000);
    } catch (err) {
      throw new Error(
        `app.db never appeared under $DATA_DIR (${dataDir}): ${(err as Error).message}\nstderr:\n${stderr}`,
        { cause: err },
      );
    }

    expect(existsSync(dbPath)).toBe(true);
  }, 15_000);
});
