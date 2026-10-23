# Project Agent Guidelines

## Monorepo Architecture
- **Structure:**
  - `apps/mobile`: React Native / Expo application
  - `apps/web`: Next.js web application
  - `apps/api`: FastAPI backend for OCR & AI computations
  - `packages/shared`: Shared TypeScript types and business logic
- **Database & Docker:**
  - MySQL is configured via Docker with host port mapped to **3307** (`3307:3306`) to prevent port collisions with any local MySQL server installed on port 3306.

## Planning & Spec Conventions
- **Chronological Ordering Required:**
  - When creating implementation plans, always include the 24-hour timestamp in the filename:
    `docs/superpowers/plans/YYYY-MM-DD-HHmm-<feature-name>.md` (e.g., `2026-10-24-0630-my-feature.md`).
  - When creating design specifications, always include the 24-hour timestamp in the filename:
    `docs/superpowers/specs/YYYY-MM-DD-HHmm-<topic>-design.md`.
  - In the document header, include the creation timestamp:
    `**Created:** YYYY-MM-DD HH:mm (Local Time)`
  - This ensures all plans and specs sort chronologically in file trees and listings.

