# Auth Research And Decision

## Requirements Interpreted

- Anonymous visitor flow remains allowed until an approved submit/account point.
- Google signup/login and email/password signup/login are required through Amazon Cognito.
- Admin access requires Cognito `Admin` group and MFA from day one.
- Backend API authorization is authoritative; React route guards are UX only.
- Tokens, cookies, auth headers, passwords, payment data, and clinical notes must not be logged or sent to analytics.

## Options Compared

| Option | How it works | Frontend changes | Backend changes | AWS changes | Security strengths | Edge cases | Complexity | Cost/ops | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cognito User Pool + Managed Login | Redirect Authorization Code + PKCE to Cognito Hosted UI | Small redirect/callback helpers | Validate Cognito access JWTs | User Pool, app client, Google IdP, groups, MFA | No custom password handling, OAuth state/PKCE, managed reset/verification | Callback mismatch, group claim, duplicate emails | Low/medium | Low | Primary |
| Cognito + Amplify Auth | SDK manages sessions | Add Amplify runtime | Same JWT validation | Same Cognito setup | Mature client support | Larger dependency/bundle, config surface | Medium | Low | Defer |
| Cognito custom UI SDK flows | App renders password form | Larger auth UI and edge cases | Same JWT validation | Same Cognito setup | Brand control | Password UX/security mistakes | Medium/high | Low | Not now |
| ALB auth with Cognito | ALB protects routes | Less client code | API still needs auth context decisions | ALB listener auth | Coarse route protection | Static SPA/admin route mismatch | Medium | Medium | Optional admin edge layer later |
| Custom .NET auth | Build password/session system | Custom login forms | Password storage, refresh, reset, MFA | Secrets/email infra | Full control | High security burden | High | Medium | Not recommended |

## Recommended Solution

Use Amazon Cognito User Pool with Managed Login/Hosted UI, Google IdP, email/password local users, Authorization Code + PKCE, Cognito groups for roles, and .NET JWT bearer validation of Cognito access tokens.

Fallback: Cognito + Amplify Auth only if the hand-rolled PKCE helper becomes insufficient for refresh/session edge cases and the added bundle/dependency is accepted.

## Implemented Boundaries

- Frontend starts Cognito PKCE login for Google or email/password Managed Login.
- Callback validates OAuth `state`, exchanges the code at Cognito, stores session in `sessionStorage`, and links the anonymous visitor ID to the authenticated user when available.
- API validates Cognito access tokens when `Auth:Enabled=true`.
- `AdminOnly` policy requires configured Cognito group, default `Admin`.
- `/api/admin/session` requires `AdminOnly`.
- `UsersController` now requires authentication.

## Edge Cases And Boundaries

- Duplicate Google/local accounts with same email need an account-linking policy before launch.
- Admin MFA must be enforced in Cognito configuration, not just application code.
- Callback/logout URLs must include localhost and HTTPS production URLs exactly.
- API must receive access tokens, not ID tokens; backend rejects tokens without Cognito access-token shape.
- Browser token storage remains an XSS-sensitive static-SPA tradeoff; no `localStorage` token storage was added. A future BFF/HttpOnly cookie model would reduce token exposure but adds infrastructure.
- Unsupported domains, disabled users, Google outage, refresh token rotation, global sign-out, and email verification are Cognito configuration/runbook items.
- Claims containing PII/PHI must not be overexposed to frontend code or analytics.

## Questions For User

1. Are email/password users required on day one, or can Google-only launch first?
2. Who assigns users to the `Admin` group, and what approval trail is required?
3. Should admin MFA use TOTP only, SMS, or both?
4. Is there an existing user database to migrate/link?
5. Are there clinical/privacy compliance requirements beyond general consent, export, deletion, and retention?

## Recommendation

Best option: Cognito User Pool + Managed Login + Google + email/password + Authorization Code + PKCE.

Do not implement custom password auth in this app now.

