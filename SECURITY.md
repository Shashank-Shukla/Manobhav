# Security Policy

## Reporting

Report vulnerabilities privately to the project maintainers. Do not include secrets, credentials, tokens, PHI, patient data, or private infrastructure details in public issues or pull requests.

## Secret Handling

Real secrets must not be committed to this repository. Use local-only environment files or .NET user-secrets for development, and AWS SSM Parameter Store for production.

If a secret is committed, rotate it immediately and remove it from Git history with an approved history-rewrite process before broad distribution.
