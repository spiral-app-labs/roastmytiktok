This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## QA Happy Path

Run the install once, then use the same commands locally and in CI:

```bash
npm ci
npm run lint
npm test
```

`npm test` is intentionally pinned to the deterministic Node test runner with explicit files. That keeps boot clean in local/CI, avoids `npx` bootstrap noise, and guarantees at least one analysis-pipeline smoke path via `tests/hook-analysis-pipeline.test.mjs`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Localhost-only safety

This repo is intentionally locked to localhost-only for now.

- `npm run build` now runs `scripts/block-deploy.mjs` first and exits non-zero on Vercel or CI-style environments.
- `vercel.json` now explicitly sets `git.deploymentEnabled` to `false`, so Git pushes do not auto-deploy from this repo.
- if Ethan later wants to allow remote builds again, he should first intentionally loosen the Vercel Git deploy guard for this project and only then use `ALLOW_NONLOCAL_BUILD=1 npm run build` intentionally.

### Manual Vercel/GitHub checks Ethan still needs to do

These cannot be fully verified from local repo state alone:

1. In Vercel project settings, open **Settings → Git** and confirm the project still reflects the intended production branch settings, that **Auto Expose System Environment Variables** is off if that is desired, and that no dashboard-level override has reopened automatic deployments.
2. In the same Vercel project, open **Settings → Functions → Cron Jobs** and confirm there are no remaining cron jobs configured in the dashboard.
3. In GitHub, open **repo → Settings → Webhooks** and **Actions** and confirm there is no non-Vercel deployment automation targeting this repo.

From repo/local context: there are no checked-in GitHub Actions workflows driving deploys, but whether pushes to `main` auto-deploy in Vercel itself is not knowable without the Vercel dashboard.
