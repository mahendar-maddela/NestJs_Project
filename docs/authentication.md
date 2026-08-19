# Authentication

Six actor types, each with its own JWT strategy/guard and its own controller/service. No actor
type shares a guard with another (`modules/auth/src/strategies/jwt.strategies.ts`,
`modules/auth/src/guards/actor.guards.ts`).

| Actor | Mechanism | Guard | Strategy | Access token lifetime |
| --- | --- | --- | --- | --- |
| Super Admin | OTP (6-digit, email) | `SuperAdminAuthGuard` | `super-admin-jwt` | 1h |
| Staff/Admin | Password | `AdminAuthGuard` (Passport default) | `admin-jwt` | 30m |
| Vendor | Password | `VendorAuthGuard` | `vendor-jwt` | 1h |
| Fleet manager | Password | `FleetAuthGuard` | `fleet-jwt` | 1h |
| Fleet driver (in-app) | OTP (4-digit, phone) | `FleetAuthGuard` (same as manager — both are `FleetUser` rows) | `fleet-jwt` | 180d |
| User (mobile app / web) | OTP (4-digit, email or phone) or password | `UserAuthGuard` | `user-jwt` | 90d–180d depending on flow |

Web (`/v1/web/auth/*`) is not a separate actor — it reuses `UserAuthController`/`UserAuthService`
verbatim, matching legacy's `routes/Web/authRoutes.js` (byte-identical to `routes/app/authRoutes.js`).

## JWT payload

Every token carries an `actorType` claim (`'superAdmin' | 'staff' | 'vendor' | 'user' | 'fleetuser'`),
checked in each strategy's `validate()`. Legacy's JWTs carry only `{ id }` with no actor-type claim —
this is an intentional improvement, closing a theoretical cross-actor token replay gap that existed
in legacy (a same-shaped `{id}` token could authenticate as any actor whose table happened to have a
matching row id).

## Tenant resolution — `ClientTokenGuard`

Legacy verifies a real secret before resolving `req.client`: `clientUserAuthenticate`
(`controllers/auth/authenticateToken.js`) looks up a `Staff` row by its `clientToken` column,
matched against the `x-client-token` request header, and is mounted globally ahead of every
admin/vendor/fleet/web/app route (`server.js:159-164`). Super-admin, OCPI, and the two public
Razorpay webhooks are excluded.

`ClientTokenGuard` (`modules/auth/src/guards/client-token.guard.ts`) mirrors this exactly, as a
global guard (`APP_GUARD` in `apps/api/src/app.module.ts`) rather than Express-style middleware —
under the Fastify adapter, `NestMiddleware` only sees the raw Node request/response via
`@fastify/middie`, not the real `FastifyRequest` object `@Req()` returns downstream, so a guard is
required to make `req.client` actually visible to controllers. The guard excludes the same routes
legacy does, matched by URL pattern rather than Nest's per-route middleware exclusion.

**Deployment note:** every `Staff` row needs a non-null `clientToken` for its client's routes to
work under this guard — a client without one will get `400 { message: "Invalid or inactive client
token" }` on every request. Verified against the dev database: 3 of 4 `Staff` rows have one set.

## OTP delivery

Three real channels, one dead one:

- **Email, single-tenant flow** (`requestOtpLogin`/`signUp`) — nodemailer/SMTP
  (`integrations/smtp`), mirrors legacy `utils/mailService.js`. Requires `EMAIL_HOST`, `MAIL_USER`,
  `MAIL_PASSKEY`.
- **Email, multi-tenant flow** (`tenantLogin`/`tenantVerifyOtp`, plus SuperAdmin) — AWS SES with
  per-client branding (logo, brand color, brand name) via `AwsService.sendClientOtpEmail`, mirrors
  legacy `utils/awsEmailService.js:sendOTPEmail`. Requires `AWS_SES_ACCESS_KEY_ID`,
  `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_FROM_EMAIL`.
- **SMS / WhatsApp** — MSG91 Flow API / WhatsApp Business API (`integrations/msg91`), mirrors
  legacy `utils/globalOtpService.js` + `utils/whatsAppOtp.js`. Supports per-client credential
  override via `CredentialConfig.authKey`/`.template`, falling back to `MSG91_AUTH_KEY`/
  `MSG91_TEMPLATE_ID`/`WHATSAPP_API_URL`/`WHATSAPP_API_TOKEN`. WhatsApp is unconfigured in both
  legacy and here (blank URL/token) — the code path exists but has never been exercised in
  production.
- **Twilio** — imported in legacy's `mailService.js` but never actually called anywhere (every
  call site uses `whatsAppOtp.js`'s MSG91-backed `sendOtpSMS`, a different function with a similar
  name). Not ported; genuinely dead code on the legacy side.

All three real channels fail gracefully (log-and-continue) if their credentials are unconfigured,
rather than crashing — this is new behavior, not present in legacy, matching the same
graceful-degradation convention already used by `AwsService`'s S3/SES clients.

## Known, deliberately-preserved legacy quirks

- **OTP lookup is not scoped by clientId anywhere** — `AuthRepository.findOtpRecord(otp, type)` has
  no `clientId` parameter, matching legacy's `OTP.findOne({where:{otp[,type]}})` exactly. A 4-digit
  OTP collision between two different clients' pending logins could theoretically let one client's
  OTP verify against another's pending record. This is a pre-existing legacy design gap, faithfully
  replicated rather than fixed — closing it needs a schema change (`Otp.clientId`), which was
  explicitly deferred.
- **`registerVerifyOtp`'s single-tenant flow has no clientId concept at all**, matching legacy's
  `/register-verify` route.
- **`UserAuthService.verifySimpleOtp` exists but is never wired to a route** — mirrors legacy's own
  `userVerifyOtp`, whose route (`/verify-otp`) is commented out in `routes/app/authRoutes.js`.
  Harmless (the fallback path in `registerVerifyOtp` covers the same OTPs), but a landmine if ever
  wired up expecting parity with `registerVerifyOtp` (different token lifetime, no `unuser`-creation
  branch).
