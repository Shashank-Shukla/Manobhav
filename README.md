# Manobhav

This repository hosts the Advent Health project MVP.

> Note: Content will evolve as the project matures.

## Structure
- Frontend/
- Backend/
- Infra/
- docs/
- skills/

## Production Setup

Required verification before deploy:

```powershell
cd Backend/manobhav-api
dotnet restore ManobhavAPI.slnx
dotnet build ManobhavAPI.slnx -c Release --no-restore
dotnet test ManobhavAPI.slnx -c Release --no-build
dotnet list ManobhavAPI.slnx package --vulnerable --include-transitive

cd ../../Frontend/manobhav-ui
npm ci
npm run lint
npm run test:run
npm run build
npm audit --audit-level=high
```

Configuration:
- Keep real secrets out of Git.
- Use `.env.example` as the local template only.
- Use AWS SSM Parameter Store for production database credentials and private API settings.
- Set `Cors:AllowedOrigins` to the deployed frontend origin before running the API outside Development.
- Configure Cognito User Pool Managed Login with Google IdP, email OTP/passwordless, Authorization Code + PKCE, and an `Admin` group before exposing admin routes. Admin MFA is deferred but should be added later.
- Configure ACM certificates explicitly: CloudFront certificate in `us-east-1`; API ALB/Elastic Beanstalk certificate in the API region.
- The backend exposes `/health/live` for liveness, `/health/ready` for readiness, and `/health` for compatibility.
- Full visitor analytics capture must remain disabled until legal/privacy approval covers consent/disclosure, retention, deletion/export, admin access controls, and audit logging.

Release blockers:
- Do not deploy `/dashboard/admin` publicly unless Cognito server-side API authorization and Admin group boundaries are configured.
- Do not ship with committed credentials, high/critical dependency audit findings, or an unreproducible frontend build.
- Do not enable full visitor capture or precise location without `VisitorAnalytics:FullCaptureLegalApproved=true` and matching frontend public flags.
- Do not enable HSTS until DNS, TLS, ACM, and HTTP-to-HTTPS redirect behavior are verified end to end.

See:
- `PRODUCTION_AUDIT.md`
- `PRODUCTION_REMEDIATION_SUMMARY.md`
- `IMPLEMENTATION_PLAN.md`
- `AUTH_RESEARCH_AND_DECISION.md`
- `FRONTEND_BACKEND_DATA_PLAN.md`
- `BACKEND_HARDENING_PLAN.md`
