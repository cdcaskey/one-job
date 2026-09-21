// The only module (besides index.ts's own CONFIG_DIR/PORT — read
// before dotenv.config() can even locate a .env file to load) that
// reads process.env. See CLAUDE.md's §3.1-derived note on the
// dynamic-import invariant this depends on.
export const DATA_DIR = process.env.DATA_DIR ?? '/data';
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
