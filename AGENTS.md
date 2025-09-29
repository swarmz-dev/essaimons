# Repository Guidelines

## Project Structure & Module Organization
The workspace roots `back/` and `front/` are independent npm projects managed from the monorepo root. The AdonisJS backend keeps HTTP logic in `back/app`, migration files in `back/database`, and service bootstrap in `back/start`. API tests live under `back/tests`. The SvelteKit frontend stores routes and UI in `front/src`, reusable assets in `front/static`, translation packs in `front/messages`, and Playwright specs in `front/e2e`. Additional references sit in `doc/development/` and automation helpers in `Makefile`, `format/`, and `compose-env.sh`.

## Build, Test, and Development Commands
Run `npm install` once at the root to hydrate all workspaces. Start services with `npm run dev --workspace back` and `npm run dev --workspace front` (or use `docker-compose.yml` via `make up` when full stack infrastructure is needed). Build bundles with `npm run build --workspace back` and `npm run build --workspace front`. Execute backend tests through `npm test --workspace back` and frontend checks with `npm run test --workspace front`; `npm run check --workspace front` performs Svelte type checks, while `npm run test:e2e --workspace front` runs Playwright suites.

## Coding Style & Naming Conventions
TypeScript is the default language, formatted by Prettier (`make format` or `make format-check`). Keep two-space indentation, semicolons suppressed, and imports alphabetized when possible. Backend modules should use the Adonis import aliases (e.g., `import User from '#models/user'`). Frontend components follow Svelte’s PascalCase file names in `src/lib` and route-level `+page.svelte` conventions. Environment templates live in `back/.env.example` and `front/.env.example`; update them whenever a new variable is introduced.

## Testing Guidelines
Backend tests use Japa (`node ace test`) and expect fixtures under `back/database` when required; mirror feature files with `*.spec.ts` names inside `back/tests`. Frontend unit tests rely on Vitest with colocated `*.test.ts` files, while end-to-end coverage sits in `front/e2e`. Aim to extend or update tests alongside every feature change, and ensure Playwright recordings target stable selectors.

## Validation Guidelines
- Ensure organization settings forms validate user input on both tiers. The `sourceCodeUrl` field must be checked with Zod on the SvelteKit frontend and mirrored with Vine validators on the Adonis backend so only well-formed URLs are persisted.

## Commit & Pull Request Guidelines
History favors short, imperative summaries (e.g., `Imp form submit button`, `fix/create-account-zod`). Keep the first line under 75 characters and add detail in the body when needed. For pull requests, include context, link the relevant issue, describe setup steps, and attach screenshots or terminal output when UI or CLI behavior changes. Verify `make format-check` and the relevant test commands before requesting review, and call out any known gaps or follow-up tasks in the PR description.
