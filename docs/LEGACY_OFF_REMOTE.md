# Keeping legacy off the remote

**Where is the legacy code?** It lives in git history at the commit *before* the move (the one that still had `src/services/assistant`, `src/services/ml`, etc.). To restore files, use that commit hash with `git show <commit>:path` or `git checkout <commit> -- path` (see "Restoring from history" below).

---

## Why keep legacy off the remote?

- **Smaller clones** – New clones and CI only get the MVP code (~22k lines of active `src/`), not the ~58k lines in legacy.
- **Less confusion** – Contributors see one clear codebase; they're not tempted to touch or depend on unused AI/insights code.
- **Faster CI** – No need to lint or build legacy; the repo is clearly "MVP-only" on the default branch.
- **You still have the code** – The pre-move commit in history has the full tree. Restore from it when needed.

## How it's set up

- **Branch you push (e.g. `brie-mvp`)** – No `src/legacy/`; the old AI/insights code is removed from the tree. Clone/pull = MVP only.
- **Pre-move commit** – The commit before the "move to legacy" / "remove legacy" still has `src/services/assistant`, `src/services/ml`, unused feature services, etc. Use it to restore anything.

## Restoring from history

Find the commit that still has the old tree:

```bash
git log --oneline -5   # find the commit before the "remove legacy" commit
```

Restore what you need (replace `PRE_MOVE` with that hash, e.g. `759bf38`):

```bash
# Restore one file
git show PRE_MOVE:src/services/feature/chatController.ts > src/services/feature/chatController.ts

# Restore a whole directory
git checkout PRE_MOVE -- src/services/assistant
# Then fix imports and add barrel exports as needed.
```
