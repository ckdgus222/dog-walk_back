# Repository Guidelines

## Project Structure & Module Organization

- `src/`: NestJS app code.
- `src/common/`: shared constants/utilities.
- `src/prisma/`: Prisma integration (infrastructure).
- Feature modules (target): `src/modules/<feature>/{http,application,domain,infrastructure}`.
- `prisma/`: `schema.prisma` + `migrations/` (commit migrations).
- `test/`: e2e tests.
- Docs: `PLAN_BACKEND.md` (scope/contracts), `.opencode/plans/BACKEND_PROGRESS.md` (progress log).

## Build, Test, and Development Commands

- `npm install`: install deps
- `docker compose up -d`: start Postgres
- `npx prisma migrate dev`: migrate + generate client
- `npm run start:dev`: run API (watch)
- `npm run lint` / `npm run format`
- `npm run test` / `npm run test:e2e`

## Work Tracking (Required)

- Before coding, split work into small tasks (3–7) with acceptance criteria.
- Track progress in `.opencode/plans/BACKEND_PROGRESS.md` (checkboxes, dates, decisions, blockers).
- Keep `PLAN_BACKEND.md` as the source of truth; the progress log is only a log.
- End each task with: changed files, verification commands, next step.

## Frontend Handoff Docs (Required)

- Canonical API contract lives in backend `docs/` only (frontend should not re-write/copy contracts).
- When a backend task is “ready for frontend”, update the relevant backend doc(s) under `docs/`.
  - Prefer feature docs (optional): `docs/<feature>/` (e.g. `docs/auth/`, `docs/map/`)
  - Cross-cutting docs stay at `docs/` root (e.g. global response format)
- Frontend repo docs should be **binding notes/checklists only** (e.g. “this screen calls `POST /auth/login`, then stores tokens”).
- If you must share docs into the frontend repo, use a scripted sync (no manual copy/paste) to avoid drift.

## API Contract & Frontend Sync (Source of Truth)

- Wire format is enforced by code:
  - success wrapper: `src/common/interceptors/response.interceptor.ts` → `{ data: payload }`
  - error wrapper: `src/common/filters/http-exception.filter.ts` → `{ error: { code, message, details? } }`
  - global install: `src/main.ts` (ValidationPipe + interceptor + filter)
- Any API change requires (same PR/task):
  - backend docs update (`docs/`)
  - e2e “contract test” update (response shape + required fields)
  - coordinate frontend parsing only in frontend `src/lib/api.ts` (unwrap `{ data }`, parse `{ error }`)

## Architecture Rules (No Overengineering + Clean Architecture)

- Absolute rule: **do not add abstractions "just in case."** Add layers/interfaces only for 2+ implementations or a clear test seam.
- Dependency rule: `domain` → (no imports) ← `application` ← `http` / `infrastructure`.
- Controllers are thin: map HTTP ↔ DTOs, call application use-cases, return response. No Prisma in controllers.
- Prisma is infrastructure: access via repository/adapters; keep DB models separate from domain objects when they diverge.
- Prefer “vertical slice” commits (one feature end-to-end) over horizontal refactors.

## Testing Guidelines

- Unit: `src/**/*.spec.ts` (Jest). E2E: `test/*.e2e-spec.ts`.
- If a test uses DB, use a dedicated test DB and deterministic cleanup.

## Commit & Pull Request Guidelines

- No established history yet: use Conventional Commits (`feat:`, `fix:`, `chore:`).
- PR checklist: summary + how to test, API changes, and Prisma notes (`prisma/schema.prisma`, `prisma/migrations/*`).

## Security & Configuration Tips

- Never commit secrets: `.env` is ignored; keep `DATABASE_URL`/`JWT_SECRET` local.
- When changing schema, update `prisma/schema.prisma` and commit generated migrations.
