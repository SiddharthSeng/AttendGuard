# AttendGuard Agent Rules

## Standing Auto-Push Rule (applies to ALL future sessions on this project)

At the end of every work session on AttendGuard, automatically:

1. **Run `npm run test`** — if ANY test fails, STOP and report the failure to the user instead of pushing. Do not push broken code.
2. **Run `npm run typecheck`** — if TypeScript errors exist, STOP and fix them before pushing.
3. **Stage and commit** all changes with a descriptive commit message summarizing what was done (not a generic "update"). Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
4. **Push to `main`** directly for routine work. Open a PR instead if the change is large (>200 lines), risky (breaking schema changes, IPC contract changes), or explicitly flagged by the user.
5. **Report back** in chat: confirm the push succeeded, give the commit hash (first 7 chars), and link to the commit on GitHub.

This rule is implicit — do not wait for the user to ask "push my work" each time.

## Project-Specific Rules

- The local SQLite file (`attendguard.db`) must NEVER be committed — it may contain real attendance data.
- `src/shared/holidayEngine.ts` is imported by both the main process and renderer. Keep it free of browser-specific APIs.
- Run `npx @electron/rebuild` after any native dependency changes (especially `better-sqlite3`).
- The `@shared` path alias resolves to `src/shared/` in both Vite config and `tsconfig.web.json`.
