# Legacy code move plan (brie-mvp)

**Update:** Legacy is no longer kept in a folder; it's removed from the tree so the remote stays lean. The code is still in git history (pre-move commit). See **`docs/LEGACY_OFF_REMOTE.md`** for why and how to restore.

---

This document originally described moving unused AI/insights code into `src/legacy/`. The approach was changed to remove that code from the tree entirely so clones don't include it; the content remains in history for restoration.

## Branch and pre-conditions

- **Branch:** `brie-mvp` (client-mobile)
- **Before moving:** Ensure working tree is clean or changes are committed so you can revert if needed.
- **Verification:** Run the following before and after the move to confirm nothing regresses.

### Pre-move verification (run from `client-mobile/`)

```bash
# 1. Ensure you're on brie-mvp and (optionally) commit or stash local changes
git status
git branch --show-current   # should be brie-mvp

# 2. Lint
npm run lint

# 3. One-off test run (no watch)
npm run test:once

# 4. Optional: start app and smoke-test (login, dashboard, transaction, settings)
# npm start
```

### Post-move verification

```bash
# Same as above
npm run lint
npm run test:once
# Optional: smoke-test the app
```

If anything fails after the move, fix the introduced issues or revert the move and re-evaluate.

## What is being moved

Code that is **not** referenced by any app screen, context, or hook used in `app/` or by the kept parts of `src/` is moved under `src/legacy/` with the same relative structure so that:

- The MVP codebase stays minimal and easy to reason about.
- The moved code remains in the repo for reference or future re-integration.
- No runtime behavior of the app changes; only dead code is relocated.

### Moves (summary)

| From | To |
|------|----|
| `src/services/assistant/` | `src/legacy/services/assistant/` |
| `src/services/ml/` | `src/legacy/services/ml/` |
| `src/services/resilience/` | `src/legacy/services/resilience/` |
| `src/services/utility/` (smartCache, cacheInvalidation, actionQueue) | `src/legacy/services/utility/` |
| `src/services/groundedAIService.ts`, `streaming.ts`, `streamManager.ts`, `sseClient.ts` | `src/legacy/services/` |
| `src/services/security/secureCacheService.ts` | `src/legacy/services/security/` |
| Unused files in `src/services/feature/` (see below) | `src/legacy/services/feature/` |
| `src/services/feature/analytics/` | `src/legacy/services/feature/analytics/` |
| `src/components/assistant/` | `src/legacy/components/assistant/` |
| Orphan services: `authService.ts`, `errorService.ts`, `ConversationState.ts` | `src/legacy/services/` |

### Kept in place (not moved)

- `src/services/core/` (ApiService, UserService, OnboardingService)
- `src/services/notifications/` (backgroundTaskService, etc.)
- `src/services/feature/featureFlags.ts`, `feature/crashReporting.ts`, `feature/notificationService.ts`, `feature/billService.ts`
- `src/services/notificationMapping.ts`
- `src/services/security/cacheMigration.ts`
- All contexts, hooks, components, and app code that are used by the app

### Barrel updates

- `src/services/index.ts`: Remove exports for moved modules (e.g. TieredAIService, HybridAIService, LocalMLService, SmartCacheService).

## Commit strategy

1. **Optional:** Commit or stash any current changes (e.g. `app/(tabs)/settings/index.tsx`).
2. Create `src/legacy/` and add `README.md` there.
3. Move directories and files in logical groups; run `npm run lint` and `npm run test:once` after each group if you want to catch issues early.
4. Update `src/services/index.ts` to drop moved exports.
5. Run full verification again; then commit with a clear message, e.g.:  
   `chore(client-mobile): move unused AI/insights code to src/legacy`

## Rollback

If something breaks and you need to undo:

```bash
git checkout -- src/
git clean -fd src/legacy/
```

Or revert the commit that performed the move.
