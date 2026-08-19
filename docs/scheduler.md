# Scheduler

All recurring background jobs live in `apps/scheduler`, mirroring legacy's single
`src/utils/cronJob.js` (required directly from `server.js`, genuinely live in production —
verify before assuming any cron file is dead, `cronJob.js` looked unreferenced from within `src/`
alone but is required from the project root).

## Jobs

| Job | Schedule | File | Mirrors |
| --- | --- | --- | --- |
| Delete old `Logs` / `OcpiLog` | Daily 01:00 | `cron/cleanup.cron.ts` | `deleteTime` → `logsDeleteAndBackUp.js:deleteLogs` |
| Delete expired `RefreshToken` | Daily 23:00 | `cron/cleanup.cron.ts` | `deleteExpiredData` → `logsDeleteAndBackUp.js:deleteRefreshAndExpiredData` |
| Expire `CpoAmc` | Daily 00:00 | `cron/amc-expiry.cron.ts` | `ExpiredAmcs` → `cpoAmcController.js:markExpiredAmcs` |
| Expire `ClientAmc` + monthly hours-deduction cycle | Daily 00:00 | `cron/amc-expiry.cron.ts` | `ExpiredClientAmc` → `clientAmcController.js:generateExpiredClientAmc` |
| Expire `ClientChargerAmc` | Daily 00:00 | `cron/amc-expiry.cron.ts` | `ExpiredCharegrAmc` → `chargerClientAmcController.js:generateExpiredChargerAmc` |
| Delete old `Notification` (>10 days) | Daily 00:10 | `cron/cleanup.cron.ts` | inline job body in `cronJob.js` |
| Generate CPO settlements | Daily 00:05 (Asia/Kolkata) | `cron/cpo-settlement.cron.ts` | `settlements` → `cpoSettlementController.js:generateCpoSettlement` |
| OCPI CPO connectivity health-check | Every 5 minutes | `cron/ocpi-health.cron.ts` | `connectedCposCheck` → `ImportEmsp/sessionHandler.js:requestSessions` |
| QR Pay & Charge RemoteStart retry sweeper | Every 20s | `queue/qr-sweep.service.ts` (BullMQ repeatable job) | `OCPP/payAndChargeFeature/remoteStartManager.js` |

Built with `@nestjs/schedule`'s `@Cron()` decorator for the 8 fixed-time/fixed-interval jobs above —
these are simple calendar-time triggers, not retry-with-backoff work, so `@Cron` (backed by
`node-cron`, the same underlying scheduling primitive legacy used directly) is the more idiomatic
fit than forcing them into a BullMQ queue. The QR sweeper is the one job that genuinely needs
BullMQ's retry semantics (5 attempts before giving up), so it stays on the repeatable-job pattern
it already used.

Each job's repository lives in `apps/scheduler/src/repositories/`, self-contained rather than
importing the owning business module (`BillingModule`, `OcpiModule`, etc.) wholesale — importing a
full business module here pulls in every controller/guard it declares too, which cascades into
DI-resolution errors for providers that have no reason to exist in a non-HTTP scheduler process
(discovered while building the QR sweeper). Each repository registers only the specific entities it
touches via a local `TypeOrmModule.forFeature([...])` in `scheduler.module.ts`.

## Known, deliberately-preserved legacy quirks

- **`deleteLogs`'s `OcpiLog` retention window is not a clean 40 days.** Legacy computes it by
  mutating a `new Date()` with `.setDate(dateThreshold.getDate() - 40)`, where `dateThreshold` is
  *already* `today - 10 days` — reusing its day-of-month against *today's* month/year rather than
  continuing to subtract from `dateThreshold`. The actual cutoff varies between roughly 19 and 50
  days ago depending on today's day-of-month. Faithfully replicated in
  `CleanupRepository.deleteOldLogs()` rather than corrected to the evident 40-day intent.
- **`deleteRefreshAndExpiredData`'s OTP cleanup never ran in legacy** — it references an undefined
  `OTP` variable (only `RefreshToken` is imported in that file), throwing a `ReferenceError` on
  every invocation, silently swallowed by the surrounding `try/catch`. Only `RefreshToken` cleanup
  is real; `deleteExpiredRefreshTokens()` here does only that, matching actual (not apparent)
  legacy behavior.
