# Approval Questions

## Must Answer Before More Feature Implementation

1. Is the visitor/appointment flow creating a lead, an appointment request, or a confirmed booking?
2. Which visitor fields can be collected before login, and which require account creation?
3. Has legal/privacy approved full visitor capture and linking anonymous sessions to known users?
4. What is the approved analytics retention period, export path, and deletion path?
5. Which provider fields are production-public versus admin-only?
6. Who assigns Cognito `Admin` group membership and how is that audited?
7. Which admin MFA method is required: TOTP, SMS, or both?
8. Which AWS region hosts the API/ALB/Elastic Beanstalk, and what are the final frontend/API domains?
9. Will production config be sourced from Secrets Manager, SSM Parameter Store, or a combination?
10. What database backup/RPO/RTO is required?

## Can Assume If User Approves Defaults

1. Visitor core browse/journey remains anonymous until submit.
2. Full capture stays disabled until legal approval is documented.
3. Cognito Managed Login handles both Google and email/password.
4. Admin group name is `Admin`.
5. Admin MFA is required from day one in Cognito.
6. Use Secrets Manager for database credentials and SSM Parameter Store for non-secret runtime config.
7. Use CloudFront ACM certificate in `us-east-1`; use ALB/EB certificate in the API region.
8. Use native ASP.NET Core middleware and `ILogger` first.
9. Use native `fetch` and local hooks before adding client data libraries.
10. Use GitHub OIDC for AWS deployments instead of long-lived keys.

## Recommended Defaults

- Cognito User Pool + Managed Login + Google + email/password + Authorization Code + PKCE.
- Keep visitor full capture disabled until legal/privacy signoff.
- Remove sensitive admin/static data from production bundle.
- Server-side API authorization is authoritative; React route guards are only UX.
- CloudWatch-compatible console logging first.

