# Backend Deploy Workflow

The backend workflow lives at `.github/workflows/backend-deploy.yml`. It builds and tests the ASP.NET Core API in `Backend/manobhav-api`, creates an Elastic Beanstalk deployment bundle, and updates the configured EB environment.

## Triggers

- Runs on pushes to `master` when files under `Backend/manobhav-api/**` or `.github/workflows/backend-deploy.yml` change.
- Runs manually through `workflow_dispatch`.
- Documentation-only changes under `Infra/ci/**` do not trigger a backend deploy.

## Build, Test, and Publish

The workflow uses `.NET SDK 10.0.x` and runs:

```bash
dotnet restore Backend/manobhav-api/ManobhavAPI.slnx
dotnet build Backend/manobhav-api/ManobhavAPI.slnx --configuration Release --no-restore
dotnet test Backend/manobhav-api/ManobhavAPI.slnx --configuration Release --no-build
rm -rf Backend/manobhav-api/.publish
dotnet publish Backend/manobhav-api/src/WebApi/WebApi.csproj --configuration Release --output Backend/manobhav-api/.publish
```

Elastic Beanstalk must use a platform that supports .NET 10. If the EB platform is downgraded or replaced, deployment may succeed but startup can fail.
The Web API project explicitly excludes generated deployment artifacts such as `*.deps.json`, `*.runtimeconfig.json`, `Procfile`, and `web.config` from project inputs so stale local deployment files do not break publish.

## Procfile Decision

The workflow always creates `Procfile` inside the publish output:

```bash
printf 'web: dotnet WebApi.dll\n' > "$PUBLISH_DIR/Procfile"
```

This is intentional. The deployed bundle should not depend on a tracked or copied local `Procfile`; the CI output is the source of truth for the EB process command.

Before zipping, the workflow verifies:

- `WebApi.dll` exists in publish output.
- `Procfile` exists in publish output.
- `Procfile` contains exactly `web: dotnet WebApi.dll`.

## Zip Structure

The workflow zips the contents of the publish directory, not the directory itself. `WebApi.dll` and `Procfile` must be at the zip root. A nested publish folder is a common EB deployment failure because the platform cannot find the process entrypoint.

## Elastic Beanstalk Deployment

The workflow:

1. Gets the EB-managed artifact bucket with `aws elasticbeanstalk create-storage-location`.
2. Uploads the zip bundle to that bucket.
3. Creates an application version using `backend-${{ github.sha }}-${{ github.run_attempt }}`.
4. Reuses the version if a manual rerun already created it.
5. Updates `${{ secrets.EB_ENV_NAME }}` to that version.
6. Waits for the environment update to finish.
7. Prints status, health, health status, version label, and endpoint URL.

## Required Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EB_APP_NAME`
- `EB_ENV_NAME`

## Health Verification

After GitHub Actions completes, verify the API health endpoint:

```bash
curl https://<elastic-beanstalk-endpoint>/api/health
```

Expected response:

```text
OK
```

## Edge Cases

- Manual reruns use `github.run_attempt` in the version label to avoid most duplicate version collisions.
- If an application version already exists, the workflow reuses it instead of failing.
- If `Procfile` is missing or wrong, the workflow fails before uploading.
- If the zip root is wrong, the workflow fails before deploying.
- If EB health does not recover, inspect EB events and CloudWatch logs for startup errors.
