@AGENTS.md

## Git Workflow
- All changes go through a feature branch named `feat/<short-slug>`.
- Workflow is always: `feat/<short-slug>` → Vercel preview deploy → PR → `main` → production.
- Never push directly to `main`.
- Verify the preview deploy URL before merging.
- Delete the feature branch immediately after merge.
