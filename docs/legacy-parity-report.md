# Legacy Parity Report — Phase 3

Date: 2026-08-13. Scope: post-Phase-2 legacy-parity audit and correction pass. This report covers
what was actually verified and fixed in this pass — it does not re-derive Phase 1/2's route-count
baseline (the Phase-1 artifact's "256/697 routes, 37%" snapshot is now stale after all Phase 2 work
and is not restated here as current; it was retired along with the other Phase-1 documents in this
same pass — see "Documentation cleanup" below).

## Summary

| Area | Status |
| --- | --- |
| Authentication (6 actor types) | **Audited in full**, 3 regressions fixed, 1 architectural gap fixed |
| OTP delivery (email/SMS/WhatsApp) | **Audited in full**, was non-functional, now real |
| Client-based (tenant) authorization | **Audited, fixed** (`ClientTokenGuard`) |
| Redis fallback for OCPP charging control | **Implemented** (HTTP fallback path) |
| Scheduler / cron jobs | **All 8 legacy jobs ported and verified booting** |
| Vehicles module | **Verified** — 10/10 routes match legacy |
| Coupons module | **Verified** — 5/5 routes + permissions match legacy |
| Documentation | **Cleaned up** — 7 stale Phase-1 snapshots removed, 4 accurate docs added |
| Build | **Clean** — `nest build` passes for all 4 apps (api, ocpp-gateway, scheduler, workers) |
| API-by-API business logic audit (all routes) | **Not exhaustively completed** — see "Not covered" |
| Full OCPP/OCPI protocol-level verification | **Not exhaustively completed** — see "Not covered" |
| Database/entity full audit (101 entities) | **Not exhaustively completed** — see "Not covered" |
| Payment/webhook deep verification beyond what Phase 2 built | **Not separately re-audited this pass** |
| Automated tests | **None exist** — zero `.spec.ts` files anywhere in the project, no `test` npm script |

## Fixes applied this pass

### 1. Tenant verification was completely unauthenticated (highest-priority finding)

Legacy verifies a real secret (`x-client-token` checked against `Staff.clientToken` in the DB)
before setting `req.client` on every admin/vendor/fleet/web/app request
(`clientUserAuthenticate`, mounted globally in `server.js:159-164`). The NestJS port had **no
equivalent at all** — every `currentClientId(req)` helper and `ClientFeaturesGuard` just trusted a
raw, unauthenticated `x-client-id` header, silently defaulting to `clientId=1` if absent.

**Fix:** `ClientTokenGuard` (`modules/auth/src/guards/client-token.guard.ts`), registered globally
via `APP_GUARD`. Implemented as a Nest guard rather than Express-style middleware — under the
Fastify adapter, `NestMiddleware` only receives the raw Node request via `@fastify/middie`, not the
real `FastifyRequest` object controllers see through `@Req()`, so middleware-set properties would
never have been visible downstream. Verified live: missing token → 400, invalid token → 400, valid
token → passes through to normal business logic, super-admin/OCPI/webhook routes correctly
bypassed. **Deployment note:** 1 of 4 `Staff` rows in the dev DB has no `clientToken` set and will
be locked out of its routes until one is assigned.

### 2. OTP/SMS/email delivery was mostly non-functional

- `SmtpService.sendMail()` was a complete no-op stub (`{success:true}` with no actual send).
- SMS/WhatsApp OTP delivery threw an unconditional `503` — entirely unimplemented.
- The multi-tenant, client-branded OTP email (legacy's `sendOTPEmail`) had no NestJS equivalent.

**Fix:** real nodemailer transport in `SmtpService`; new `integrations/msg91` (MSG91 Flow API +
WhatsApp Business API, matching legacy's exact payload/headers/per-client-credential-override
logic); `AwsService.sendClientOtpEmail()` (ported from `sendOTPEmail`); `OtpChannelService` rewired
to route correctly per `CredentialConfig.userLoginType`. See `docs/authentication.md` for detail.
Missing env vars (`MAIL_USER`, `MAIL_PASSKEY`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`,
`WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`) added, mirrored from legacy's own already-configured
`.env` (same organization's credentials). Verified: app boots, AWS SES client initializes
successfully with the real credentials. **Not verified: an actual live OTP send** — would consume
real MSG91 credits / send a real email — deferred pending explicit request.

### 3. Three auth regressions (current behavior diverged from legacy, not a shared bug)

| Bug | Legacy behavior | Port behavior (before fix) | Fix |
| --- | --- | --- | --- |
| SuperAdmin OTP leak | Never echoes OTP in the login response | Unconditionally returned `debugOtp` in every environment | Removed the field |
| Vendor active-status check | `if (vendor.status !== 'Active') return 403` | Missing — blocked vendors could still log in | Added the check |
| Fleet-manager token lifetime | `expiresIn: '1h'` | `'30d'` (30x longer exposure window) | Reverted to `'1h'` |

### 4. Redis is no longer a hard dependency for OCPP charging control

Found: `apps/api` ↔ `apps/ocpp-gateway` command dispatch (RemoteStart/RemoteStop/Reset/etc.) is
Redis-pub/sub-only. A Redis outage would time out every remote command, even though the charger's
live WebSocket connection to the gateway (already correctly in-memory, gateway-process-local) is
completely unaffected by Redis. Per CLAUDE.md, a Redis outage must not stop charging control.

**Fix:** `ChargerCommandService.dispatch()` now checks `RedisService.publish()`'s return value
(`0` when disconnected, a fast, non-throwing signal) and falls back to a direct HTTP call to a new
`internal/ocpp-command` endpoint on the gateway (`InternalOcppCommandController`), guarded by a
shared secret. Both paths funnel into the same `OcppCommandBridgeService.processCommand()`. See
`docs/architecture.md`. Verified: both apps type-check and boot cleanly with the new wiring.

### 5. Scheduler — all 8 legacy cron jobs ported (previously 0 ported)

Legacy's `src/utils/cronJob.js` (required directly from the project-root `server.js` — genuinely
live, not dead code despite looking unreferenced from within `src/` alone) had 8 jobs; none existed
in `apps/scheduler` before this pass (`@nestjs/schedule` wasn't even installed). All 8 are now
implemented, using `@Cron()` for the 8 fixed-schedule jobs (a more direct match for legacy's
`node-cron` usage than forcing them into BullMQ, which stays reserved for the one job that
genuinely needs retry semantics — the QR Pay & Charge sweeper, already built in an earlier pass).
See `docs/scheduler.md` for the full list and two deliberately-preserved legacy bugs (an OCPI log
retention window that isn't actually 40 days, and an OTP cleanup that has never once executed in
legacy due to an undefined-variable bug).

Verified: all four apps (`api`, `ocpp-gateway`, `scheduler`, `workers`) pass `nest build` cleanly;
`apps/scheduler` boots with no DI/entity-resolution errors and all `@Cron` providers instantiate.

### 6. Fixed a `DatabaseModule` entity-discovery gap (surfaced while building the scheduler)

`apps/scheduler` had never imported a real business module before this pass. Doing so surfaced
that `autoLoadEntities: true` alone only registers entities explicitly `forFeature()`'d somewhere
in an app's *actual* import graph — a relation to an entity nobody happened to `forFeature()` in
that specific app fails at boot with an "Entity metadata... not found" error. Fixed by adding the
same directory-glob entity discovery `database/src/data-source.ts` (the migration CLI's DataSource)
already used, to `database/src/database.module.ts` (the runtime one) — a pre-existing project
pattern being completed, not a new invention. Affects every app, verified none regressed.

## Phase 3b — OCPP 1.6 handler audit (2026-08-13, same day)

Follow-up pass specifically on `apps/ocpp-gateway/src/v16/handlers/*` and their supporting
infrastructure, prompted by the gateway appearing non-functional against real chargers.

### Root cause: first charger message silently dropped

`OcppGateway.handleConnection()` (`apps/ocpp-gateway/src/gateway.ts`) attached `ws.on('message', ...)`
**after** several `await`ed DB calls (stale-connection check, inactive-charger reconciliation,
connector-status restore). Legacy's equivalent (`ocppRouter.js`) registers `ws.on("message", ...)`
synchronously, immediately, with no `await` before it — chargers routinely send `BootNotification`
the instant the WebSocket handshake completes, and Node's `EventEmitter` drops events fired before a
listener exists. Confirmed live: a test client's `BootNotification` was silently lost, no response
ever sent, connection just idled until the client's own timeout. **This was very likely the actual
cause of "the gateway isn't working."** Fixed by moving all `ws.on(...)` registrations to happen
synchronously before any `await`, with the DB reconciliation moved after. Re-tested live: clean
`BootNotification` → `Accepted` round-trip, correctly logged.

### Fixes applied to the handlers themselves

| Handler | Gap found | Fix |
| --- | --- | --- |
| `start-transaction.handler.ts` | Auto Charge feature check only verified the feature existed *anywhere*, not that the charger's own vendor had it enabled (`FeaturePermissions` join was missing) — an authorization bypass | Added the `featurepermissions` join, scoped to `charger.vendorId` |
| `start-transaction.handler.ts` | OCPI-initiated sessions never told the roaming eMSP that charging actually started (`handleStartResult` never ported) | Added `notifyOcpiStartResult()` — posts the ACCEPTED result to `session.msp_res_url` |
| `start-transaction.handler.ts` | Session-flow branch sent its response but never logged it to the `Logs` table (early `return` skipped the router's automatic log) | Added the missing `ocppLogger.logData()` call |
| `start-transaction.handler.ts` / `meter-values.handler.ts` | Push notifications were fake — logged to console instead of actually sending | See FirebaseService fix below |
| `stop-transaction.handler.ts` | **Not wrapped in a DB transaction at all** — every write committed independently; a mid-handler failure (e.g. after wallet deduction) would leave a corrupted partial state with no rollback. Violates CLAUDE.md's "Always Use Transactions" | Wrapped the whole handler in `dataSource.transaction()`, threaded through the 3 private helpers |
| `stop-transaction.handler.ts` | OCPI stop-accepted callback to the eMSP was fake (logged only) | Implemented the real `postMethodOcpi` call |
| `stop-transaction.handler.ts` / `meter-values.handler.ts` | OCPI session PATCH (`patchSession`) and CDR generation/send (`createCDRFromSession`/`sendCdrResponse`) were faked (log-only) | Implemented in a new `OcpiIntegrationService` (`apps/ocpp-gateway/src/common/services/ocpi-integration.service.ts`, registered on the app's global `OcppCommonModule` — kept out of `modules/ocpi` deliberately, since importing that feature module here would also register its REST controllers on the gateway app's HTTP server). Mirrors `commandsModule.js:patchSession` (STOP on transaction stop, UPDATE on meter values) and `CDRsModule.js:toOcpiCdr`/`createCDRFromSession`/`sendCdrResponse` (full OCPI 2.2.1 CDR schema mapping: location/EVSE/connector resolution, roaming tariff lookup, `total_time` calculation) |
| `status-notification.handler.ts` | OCPI status push to connected eMSPs (`patchStatusToConnectedEmsps`) was faked (log-only) | Implemented: resolves each `CONNECTED` eMSP with a pushed-station record for the charger, looks up their `locations` receiver endpoint via `OcpiVersion`/`OcpiVersionEndpoint`, PATCHes the mapped status, and logs the call to `OcpiLogs` (mirrors `locationModule.js:patchStatusToConnectedEmsps`) |
| `authorize.handler.ts` | VID branch had **no** vendor Auto Charge feature check at all (legacy's vendor/feature check was dropped entirely during the port) | Added the same scoped feature check as StartTransaction |
| `meter-values.handler.ts` / `data-transfer.handler.ts` | RemoteStop dispatch frames (max-energy-reached, max-percentage-reached, vehicle-mismatch) sent to the charger but never written to the `Logs` table | Added the missing `ocppLogger.logData()` calls |
| `ocpi.service.ts` (`handleStartCommand`) | `findChargerWithConnectorAndTariff` never actually joined connectors or roaming tariffs — returned a flat charger row, so `charger.connectors?.length` was always `undefined` and **every single OCPI-initiated remote start was unconditionally rejected** | Rewrote the repository method to properly resolve the connector and roaming tariff |
| `ocpi.service.ts` (`handleStartCommand`) | `response_url` (the eMSP's async-result callback URL) was received but never persisted as `msp_res_url`; `maxAmount`/`maxEnergy` cap and `tariffName` were never set on the session | Added all three, plus the DC-connector-status validation legacy performs |
| `integrations/firebase/src/firebase.service.ts` | Entire push-notification integration was a stub (`{success:true}` with no real send) — `firebase-admin` wasn't even installed | Installed `firebase-admin`; rebuilt as a real multi-tenant service (each client has its own Firebase project, resolved via a `Media` row, matching legacy's `globalSinglePushNotification`/`globalMultiplePushNotification`). Updated all 3 real call sites (StartTransaction, MeterValues SOC alerts, StopTransaction, notification broadcast, coupon bonus-credit push) |

Verified: `nest build` passes clean for all 4 apps; `tsc --noEmit` clean; live WebSocket smoke test
(BootNotification → Accepted, correct DB writes, correct `Logs` entry, clean disconnect reconciliation)
against the dev database.

## Explicit rejections (things considered and correctly NOT done)

- **OTP.clientId schema addition** — initially implemented (closing a cross-tenant OTP-collision
  window shared by legacy and the port), then **explicitly reverted per direct instruction**: do
  not change the `Otp` entity. The underlying gap is real and documented in `authentication.md`,
  but intentionally left unaddressed.

## Not covered in this pass (honest scope gaps)

The following items from the Phase 3 request were not exhaustively completed, given the scale
involved (697+ legacy routes, 101 TypeORM entities, full OCPP 1.6J + OCPI 2.2.1 protocol surfaces).
Attempting a shallow pass across all of them would have produced unreliable, unverified claims
rather than real coverage — flagging honestly instead:

- **API-by-API business logic audit** — not done route-by-route across the full surface. Vehicles
  and Coupons were spot-verified (route + permission match). POST/PUT endpoints were not
  systematically prioritized beyond what auth/OTP/scheduler work touched directly.
- **Database/entity/repository comparison** — no systematic pass against all 101 entities. Only
  the entities directly touched by this pass's work (auth, billing/AMC, OCPI health, sessions) were
  read and cross-checked against legacy models.
- **Payment/webhook verification** — not re-audited in this pass; reflects whatever state Phase 2
  left it in (Razorpay order-creation + webhook settlement were built in an earlier pass, not
  re-verified here).
- **OCPP/OCPI deep protocol verification** — the command-dispatch *infrastructure* was hardened
  (Redis fallback), but individual OCPP message handlers and OCPI endpoint-by-endpoint behavior
  were not re-audited against the spec or against legacy line-by-line in this pass.
- **Automated tests** — none exist. CLAUDE.md mandates unit/integration test coverage for wallet,
  payments, tariffs, sessions, transactions, OCPP, and OCPI; none of that exists anywhere in the
  project as of this report. Writing a meaningful suite for a codebase this size is a substantial
  separate effort, not attempted here.

## Recommended next steps, in priority order

1. Populate the missing `Staff.clientToken` for the 1 client currently lacking one (`ClientTokenGuard` will otherwise lock it out).
2. Decide whether to fire a live test OTP through each channel (email/SMS/WhatsApp) to confirm end-to-end delivery, not just successful client initialization.
3. Pick up the API-by-API audit, prioritizing POST/PUT endpoints and OCPP/OCPI as originally requested — this needs to be its own dedicated pass given the route count involved.
4. Decide on the `Otp.clientId` gap (fix now that entities are off the table for this pass, accept the risk, or find a non-schema mitigation).
5. Stand up a real test suite, starting with the flows CLAUDE.md flags as critical (wallet, payments, sessions, OCPP, OCPI).
6. All three OCPI CPO-export gaps from "Phase 3b" are now implemented: connector-status push (`patchStatusToConnectedEmsps`), OCPI session PATCH on stop/meter-value (`patchSession`), and CDR generation/send (`createCDRFromSession`/`sendCdrResponse`). None have been exercised against a real or sandbox eMSP yet — verify against an actual OCPI partner (or a mocked receiver) before relying on this in production, since CDR schema mapping in particular is easy to get subtly wrong in ways `tsc` can't catch.
7. Confirm real charger hardware (not just the WebSocket smoke test used in Phase 3b) can complete a full Boot → Authorize → StartTransaction → MeterValues → StopTransaction cycle end-to-end against the gateway now that the message-listener race is fixed.
