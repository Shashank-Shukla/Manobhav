# Frontend Deploy Workflow

The frontend workflow lives at `.github/workflows/frontend-deploy.yml`. It deploys the Vite React app in `Frontend/manobhav-ui` to S3 and invalidates CloudFront.

## Triggers

- Runs on pushes to `master` when files under `Frontend/manobhav-ui/**` or `.github/workflows/frontend-deploy.yml` change.
- Runs manually through `workflow_dispatch`.
- Documentation-only changes under `Infra/ci/**` do not trigger a frontend deploy.

## Build and Verification

The workflow uses Node 22 and runs:

```bash
npm ci
npm run lint
npm run test:run
npm run build
```

The production files are generated in `Frontend/manobhav-ui/dist`.

## S3 Upload Order and Cache Headers

Uploads are split by object type so cache metadata is set explicitly on every upload command:

1. `dist/assets/` is uploaded recursively with:
   - `Cache-Control: public,max-age=31536000,immutable`
2. Public/root files other than `index.html` and `assets/*` are uploaded with:
   - `Cache-Control: public,max-age=300,must-revalidate`
3. `dist/index.html` is uploaded last with:
   - `Cache-Control: no-cache,no-store,must-revalidate`
   - `Content-Type: text/html`

`index.html` is no-cache because it points browsers to the current hashed JavaScript and CSS bundles. Hashed files under `assets/` are long-cache because their filenames change when their content changes.

The workflow does not use `aws s3 sync --delete`. Keeping old hashed assets avoids 404s for users who still have an older `index.html` open during or shortly after a deployment. Old asset cleanup should be handled later with an S3 lifecycle rule.

## CloudFront

After S3 upload, the workflow creates a CloudFront invalidation for `/*`. This is intentionally broad for the first CI/CD version so stale HTML and SPA routes are refreshed consistently.

## Required Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `CF_DISTRIBUTION_ID`

## Rollback

Rollback is done by redeploying a known-good commit through manual `workflow_dispatch` or by reverting/merging a fix to `master`. Because old hashed assets are retained, rollback HTML can still reference older asset files if they have not been removed by lifecycle cleanup.

## Edge Cases

- If `index.html` is cached by CloudFront, the invalidation refreshes it.
- If a browser has an older `index.html`, retained hashed assets prevent missing bundle files.
- If cache headers change later, `aws s3 cp` applies metadata during upload instead of assuming prior object metadata is correct.
- If old assets grow too large, add an S3 lifecycle expiration rule rather than deleting during deployment.
