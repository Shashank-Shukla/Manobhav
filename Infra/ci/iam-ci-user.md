# IAM CI User

The repository currently deploys through a dedicated IAM user for GitHub Actions. The user's access key and secret access key are stored as GitHub Actions repository secrets.

## Required GitHub Secrets

Shared AWS credentials and region:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Frontend deployment:

- `S3_BUCKET`
- `CF_DISTRIBUTION_ID`

Backend deployment:

- `EB_APP_NAME`
- `EB_ENV_NAME`

## Current Permission Model

The current CI user has broad permissions for the services used by deployment. That is practical for initial setup, but wider than ideal for long-term production use because the same static key can perform more actions than the workflows need.

## Future Least-Privilege Direction

Replace broad managed policies with a focused policy that allows only the deployment actions required by these workflows.

Frontend permissions:

- Upload objects to the configured S3 bucket.
- Read bucket location and list the configured bucket when needed by AWS CLI operations.
- Create invalidations for the configured CloudFront distribution.

Backend permissions:

- Create or read the Elastic Beanstalk storage location.
- Upload deployment bundles to the EB artifact bucket.
- Create Elastic Beanstalk application versions for the configured app.
- Update the configured Elastic Beanstalk environment.
- Describe EB applications, versions, environments, events, and health.

Logging and diagnostics:

- Read CloudWatch logs for the configured EB environment if CI-based diagnostics are added later.

## Longer-Term Recommendation: OIDC

Static IAM user keys work, but GitHub Actions OIDC with an assumable IAM role is safer. With OIDC, AWS issues short-lived credentials to GitHub Actions and there is no long-lived access key stored in GitHub.

Recommended future setup:

1. Create an IAM OIDC provider for GitHub Actions.
2. Create an IAM role trusted only by this repository and the `master` branch.
3. Attach the least-privilege deployment policy to that role.
4. Update workflows to use `role-to-assume` in `aws-actions/configure-aws-credentials`.
5. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from repository secrets.

Keep `AWS_REGION`, `S3_BUCKET`, `CF_DISTRIBUTION_ID`, `EB_APP_NAME`, and `EB_ENV_NAME` as repository secrets or variables.
