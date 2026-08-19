# Authorization

Layered on top of authentication (see `authentication.md`). Three independent gates, matching
legacy's three independent middleware families in `controllers/auth/authorize.js`:

| Gate | Guard | Mirrors | Applies to |
| --- | --- | --- | --- |
| Staff role/permission | `StaffPermissionsGuard` + `@StaffPermission('X')` | `authorizeStaff(permission)` | Admin routes |
| Vendor role/permission | (vendor equivalent, see `modules/auth/src/guards`) | `authorizeVendor(permission)` | Vendor routes |
| Tenant feature flag | `ClientFeaturesGuard` + `@ClientFeatureRequired('X')` | `authorizeClientFeatures(feature)` | Any tenant route gated by a purchased/enabled feature |
| Vendor feature flag | `VendorFeaturesGuard` + `@VendorFeatureRequired('X')` | `authorizeFeature(feature)` | Vendor routes gated by a parent-vendor feature |

`StaffPermissionsGuard` has one addition beyond legacy's `authorizeStaff`: a `dbStaff.superAdminId`
bypass, letting platform-level staff skip the permission check entirely. Not present in legacy —
flagged during the auth audit, not yet reconciled.

## Tenant identity — see `authentication.md`

`ClientFeaturesGuard` and every `currentClientId(req)` helper across the app now benefit
transitively from `ClientTokenGuard` populating a verified `req.client.clientId` — before that
guard existed, these all silently fell back to trusting a raw `x-client-id` header.

## OCPI authorization

Fully independent of the JWT strategies above, per CLAUDE.md ("Never reuse JWT guards for OCPI").
`OcpiCpoAuthGuard` / `OcpiEmspAuthGuard` decode a `Scheme <base64(token)>` Authorization header and
match it against `OcpiCpo.token_a` / `OcpiEmsp.token_a`.

## Internal service-to-service

Not an actor-facing gate. `apps/ocpp-gateway`'s `internal/ocpp-command` endpoint (the Redis-outage
fallback path for OCPP commands — see `architecture.md`) is guarded by a shared secret
(`INTERNAL_COMMAND_SECRET`) rather than any JWT strategy, since it's called by `apps/api`'s own
backend code, not by any user-facing client.
