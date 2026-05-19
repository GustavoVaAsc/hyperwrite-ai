# Hyperwrite AI - Agent Instructions

## Project Structure

```
backend/          # FastAPI + Docker (Postgres + pgvector)
frontend/         # React + Vite + Tanstack Router + pnpm
```

## Developer Commands

**Backend:**
```bash
cd backend
docker-compose up -d          # Start API + db containers
uvicorn main:app --reload      # Local dev without Docker
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
pnpm install                  # NOT npm install
pnpm run dev                  # Dev server on :5173
pnpm run build                # Production build
pnpm run lint                 # Lint
```

## Important Conventions

- **Package manager:** Frontend uses `pnpm`, NOT npm or yarn
- **Docker context:** `docker-compose.yml` lives in `backend/`. Always run `docker-compose` from there.
- **Tanstack Router:** Routes defined in `src/routes.ts`, components in `src/components/`. Route files must NOT contain JSX (use separate `.tsx` files for components with JSX).
- **Env files:** `.env` is gitignored; `.env.example` is committed. Copy `.env.example` to `.env` and update credentials before running Docker.
- **CORS config:** Loaded from env vars (`CORS_ORIGINS`, `CORS_CREDENTIALS`, etc.) via `python-dotenv`.

## Architecture Notes

- Backend exposes API on port 8000; frontend expects `VITE_API_URL` env var (default: `http://localhost:8000`)
- DB uses `pgvector/pgvector:pg16` image with healthcheck; backend waits for `db:5432`
- Database URL format: `postgresql+asyncpg://user:pass@db:5432/dbname`

## Contributing Workflow

1. Branch: `type/part-of-project/what-you-are-doing` (e.g., `feat/backend/user-auth`)
2. Commit: [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `docs:`, etc.)
3. PR: Submit to `main`, require approval from another contributor

## Gotchas

- On Linux, if Docker permission error occurs, ask user to run commands with `sudo` rather than modifying docker group permissions
- React 19 + React Compiler (babel-plugin-react-compiler) is enabled in frontend
- Frontend uses TypeScript ~6.0.2 (not ^6.0.0), which triggers a peer dep warning with `vite-tsconfig-paths` - harmless

## Commit and Pull Request Protocol

**Before committing or creating a PR, ask the user for authorization.**

If the user approves:
- For new features or fixes, create a new branch following the `type/part-of-project/what-you-are-doing` convention
- Follow [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages
- Submit PR to `main` branch after commit

If working on an existing feature branch with approved changes, you may commit and create the PR without asking again.