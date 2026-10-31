# Hybrid Navigation: Bottom Nav & Sidebar Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-31 17:24 (Local Time)  
**Spec Reference:** [`docs/superpowers/specs/2026-10-31-1723-hybrid-navigation-sidebar-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-31-1723-hybrid-navigation-sidebar-design.md)  
**Target Package:** `@finance-tracker/mobile`

---

## Proposed File Map

- **`apps/mobile/src/context/SidebarContext.tsx`**: React Context and hook (`useSidebar`) providing `isOpen`, `openSidebar()`, `closeSidebar()`, `toggleSidebar()`.
- **`apps/mobile/tests/sidebar_context.test.ts`**: Unit test suite verifying sidebar state management, transitions, and idempotent callbacks.
- **`apps/mobile/src/components/navigation/SidebarItem.tsx`**: Individual sidebar navigation and action row with icon, title, optional badge, and active state indicator.
- **`apps/mobile/src/components/navigation/SidebarDrawer.tsx`**: Slide-over drawer with backdrop dimming, safe area padding, brand header, navigation sections, utilities, and dismiss gesture.
- **`apps/mobile/src/components/dashboard/DashboardHeader.tsx`**: Updated with top-left hamburger menu button (`onMenuPress`).
- **`apps/mobile/app/(tabs)/_layout.tsx`**: Integrates `SidebarProvider` and mounts `SidebarDrawer` at the root layout so it overlays cleanly across all tabs.
- **`apps/mobile/app/(tabs)/index.tsx`**: Wires `onMenuPress` on the Dashboard to open the sidebar.

---

## Tasks

### Task 1: Sidebar Context & Hook with TDD

- [ ] **Step 1.1**: Write failing unit tests in `apps/mobile/tests/sidebar_context.test.ts` testing state transitions of `SidebarContext` (`openSidebar`, `closeSidebar`, `toggleSidebar`).
- [ ] **Step 1.2**: Run `npm run test --workspace=@finance-tracker/mobile -- tests/sidebar_context.test.ts` and confirm test fails before implementation.
- [ ] **Step 1.3**: Implement `SidebarProvider` and `useSidebar` hook in `apps/mobile/src/context/SidebarContext.tsx`.
- [ ] **Step 1.4**: Run unit tests and confirm passing.
- [ ] **Step 1.5**: Commit Task 1: `feat(mobile): add SidebarContext and useSidebar hook`.

---

### Task 2: Sidebar Item & Slide-Over Drawer Components

- [ ] **Step 2.1**: Create `apps/mobile/src/components/navigation/SidebarItem.tsx` for consistent, accessible navigation links and utility action buttons.
- [ ] **Step 2.2**: Create `apps/mobile/src/components/navigation/SidebarDrawer.tsx`:
    - Animated slide transition from left (`translateX`).
    - Animated semi-transparent backdrop overlay with tap-to-dismiss.
    - Brand header: App avatar, "Pocket Tracker", and live SQLite health badge.
    - Section 1: Core Navigation shortcuts (Dashboard, Accounts, Multi-Job Salary, Advisor, Ledger, Analytics).
    - Section 2: Management & Utilities (Backup Database, Restore Database, Notification Center).
    - Section 3: Preferences & System Info (12-Hour format indicator, Engine default, App version `v1.2.0`).
- [ ] **Step 2.3**: Run `npm run typecheck` to verify component props and typings.
- [ ] **Step 2.4**: Commit Task 2: `feat(mobile): create SidebarItem and animated SidebarDrawer components`.

---

### Task 3: Top-Left Hamburger Trigger in DashboardHeader & Tab Integration

- [ ] **Step 3.1**: Update `apps/mobile/src/components/dashboard/DashboardHeader.tsx` to add `onMenuPress?: () => void` and render a top-left hamburger button (`Menu` icon from `lucide-react-native`).
- [ ] **Step 3.2**: In `apps/mobile/app/(tabs)/_layout.tsx`:
    - Wrap the tabs inside `SidebarProvider`.
    - Render `<SidebarDrawer />` at the root layout level so it overlays all tabs smoothly.
- [ ] **Step 3.3**: In `apps/mobile/app/(tabs)/index.tsx`:
    - Wire `onMenuPress` in `DashboardHeader` to call `openSidebar()` from `useSidebar()`.
- [ ] **Step 3.4**: Commit Task 3: `feat(mobile): integrate hamburger button into DashboardHeader and mount SidebarDrawer in TabLayout`.

---

### Task 4: Drawer Utility Actions (Backup, Restore, Notifications & Navigation)

- [ ] **Step 4.1**: Connect drawer actions to direct workflows:
    - Backup Database: Invokes `databaseBackupService.exportDatabaseToJson()` and native share.
    - Restore Database: Invokes `databaseBackupService.importDatabaseFromJson()`.
    - Notification Center: Navigates or triggers `NotificationCenterModal`.
    - Salary Directory: Navigates to `/accounts` with the `'income'` filter pre-selected.
- [ ] **Step 4.2**: Verify hardware back button handling on Android dismisses open drawer first.
- [ ] **Step 4.3**: Commit Task 4: `feat(mobile): wire drawer utility actions for database backup, restore, and fast shortcuts`.

---

### Task 5: End-to-End Verification & Quality Gate

- [ ] **Step 5.1**: Run monorepo typecheck: `npm run typecheck`.
- [ ] **Step 5.2**: Run full unit test suite: `npm run test --workspace=@finance-tracker/mobile`.
- [ ] **Step 5.3**: Format codebase with prettier: `npx prettier --write .`.
- [ ] **Step 5.4**: Commit Task 5: `chore(mobile): complete quality gate for hybrid navigation sidebar`.
