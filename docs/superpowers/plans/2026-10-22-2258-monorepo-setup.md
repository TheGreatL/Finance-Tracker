# Monorepo Setup & Mobile App Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-22 22:58 (Local Time)

**Goal:** Transform the project into a Turborepo monorepo with `apps/mobile` (Expo React Native), `apps/web` (Next.js placeholder), `apps/api` (FastAPI placeholder), `packages/shared`, and a Dockerized MySQL setup on port `3307` to avoid host port 3306 conflicts.

**Architecture:** Monorepo using npm/Turborepo workspaces (`apps/*`, `packages/*`). Mobile app is restored from commit `e7c816c` directly into `apps/mobile/`. Root orchestration includes `docker-compose.yml` with MySQL exposed on host port `3307` (mapping to internal `3306`) and `.env.example`.

**Tech Stack:** Turborepo, npm workspaces, React Native (Expo SDK 57), PanelUI, Docker Compose, MySQL 8.x, FastAPI, Next.js.

**Spec:** User request to setup basic monorepo configuration with `apps/mobile`, `apps/web`, `apps/api`, focus on mobile React Native, and avoid port 3306 conflict for MySQL in Docker.

## Global Constraints

- MySQL Docker host port must be `3307` (or configurable via `.env`) to avoid collision with the user's host MySQL on 3306.
- Mobile application files from commit `e7c816c` must be restored cleanly into `apps/mobile/` without regression on safe-area insets, auto-versioning, or database schema fixes.
- Root workspace must manage `apps/*` and `packages/*`.
- All tests in `apps/mobile` (`node --test tests/*.test.ts`) and TypeScript typecheck must pass.

---

### Task 1: Scaffolding Root Monorepo Configuration & Docker Setup

**Files:**
- Create: `package.json` (root workspace)
- Create: `turbo.json`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `docker/mysql/init.sql`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: User specification for MySQL host port `3307`.
- Produces: Root npm scripts (`npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`) and container orchestration.

- [ ] **Step 1: Create root `package.json` with npm workspaces and Turborepo**
- [ ] **Step 2: Create root `turbo.json` with pipeline definitions (`build`, `test`, `typecheck`, `dev`, `lint`)**
- [ ] **Step 3: Create `docker-compose.yml` with MySQL 8.x mapped to `3307:3306`**
- [ ] **Step 4: Create `.env.example` and `docker/mysql/init.sql` with ledger table schemas**
- [ ] **Step 5: Update `.gitignore` for monorepo roots (`.turbo`, `apps/api/__pycache__`, etc.)**

---

### Task 2: Restore and Configure `apps/mobile`

**Files:**
- Create/Restore: `apps/mobile/**` from git commit `e7c816c`
- Modify: `apps/mobile/package.json` (set name to `@finance-tracker/mobile`)
- Verify: `apps/mobile/tsconfig.json`, `apps/mobile/metro.config.js`, `apps/mobile/global.css`

**Interfaces:**
- Consumes: Git tree from `e7c816c`.
- Produces: Fully functional Expo mobile client inside `apps/mobile/`.

- [ ] **Step 1: Restore files from `e7c816c` into `apps/mobile/`**
- [ ] **Step 2: Adjust `apps/mobile/package.json` name to `@finance-tracker/mobile` and update paths if needed**
- [ ] **Step 3: Run `npm install` from root to install monorepo dependencies and link workspaces**
- [ ] **Step 4: Run `node --test tests/*.test.ts` inside `apps/mobile` to verify all 26 unit tests pass**
- [ ] **Step 5: Run `npm run typecheck` inside `apps/mobile` to verify TypeScript compile pass**

---

### Task 3: Scaffold Stubs for `apps/web`, `apps/api`, and `packages/shared`

**Files:**
- Create: `apps/web/package.json`, `apps/web/README.md`
- Create: `apps/api/requirements.txt`, `apps/api/app/main.py`, `apps/api/Dockerfile`, `apps/api/README.md`
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`, `packages/shared/tsconfig.json`

**Interfaces:**
- Consumes: Monorepo workspace conventions.
- Produces: Minimal working stubs so Turborepo tasks and Docker Compose can discover and validate all services.

- [ ] **Step 1: Create `apps/web` stub package.json**
- [ ] **Step 2: Create `apps/api` stub requirements.txt, main.py, and Dockerfile**
- [ ] **Step 3: Create `packages/shared` stub package.json and exports**
- [ ] **Step 4: Verify root turbo execution (`npm run test` or `npx turbo run typecheck`)**

---

### Task 4: Final Verification and Documentation

**Files:**
- Modify: `README.md` (ensure port 3307 note is clearly mentioned in Docker section)

- [ ] **Step 1: Check `docker-compose config` or validate compose syntax**
- [ ] **Step 2: Verify all mobile test suites pass from root workspace runner**
- [ ] **Step 3: Provide walkthrough for running mobile and Docker with port 3307**
