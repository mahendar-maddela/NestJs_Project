# Architecture notes

High-level structure is documented in the repo's `CLAUDE.md`. This file covers a few
cross-cutting mechanisms that aren't obvious from the folder layout alone.

## OCPP command dispatch — Redis pub/sub, with an HTTP fallback

`apps/api` has no WebSocket connection to any charger; `apps/ocpp-gateway` does. Commands cross
that process boundary via Redis pub/sub by default:

```
apps/api                                    apps/ocpp-gateway
ChargerCommandService.dispatch()  ──publish──▶  ocpp:command:request
                                                        │
                                              OcppCommandBridgeService
                                              (talks to the charger's live WS)
                                                        │
ChargerCommandService (pending map) ◀──publish── ocpp:command:response
```

The live WebSocket connection registry (`ConnectionRegistry`) is already correctly in-memory and
gateway-process-local — a Redis outage does **not** disconnect chargers or stop inbound OCPP
processing (BootNotification, StatusNotification, StartTransaction, StopTransaction, MeterValues
all run entirely inside the gateway process against MySQL directly). But outbound commands
(RemoteStart, RemoteStop, Reset, etc., triggered from the REST API) do cross that Redis-mediated
boundary — if Redis is down, the request would previously just time out.

**Fallback:** `RedisService.publish()` returns `0` (not a thrown error) when the connection isn't
up, so `ChargerCommandService.dispatch()` checks that return value and, when it's `0`, immediately
falls back to a direct HTTP call to `apps/ocpp-gateway`'s `internal/ocpp-command` endpoint
(`InternalOcppCommandController`) instead of waiting out a timeout that can only fail. Both paths
funnel into the same `OcppCommandBridgeService.processCommand()` — the transport that carried the
request doesn't matter to the command-handling logic itself.

Configured via `OCPP_GATEWAY_INTERNAL_URL` (default `http://localhost:8000`) and
`INTERNAL_COMMAND_SECRET` (shared secret, checked by the internal controller — this is
service-to-service, not user-facing, so it doesn't go through any JWT strategy).

Redis pub/sub stays the default path (neither app needs to know the other's network address), but
a Redis outage can no longer take down RemoteStart/RemoteStop/Reset — see `CLAUDE.md`'s OCPP Rules
("must be asynchronous... retry failed commands") and the Redis Rules section for the underlying
requirement this satisfies.

## Scheduler infrastructure

See `scheduler.md`.

## Authentication / authorization

See `authentication.md` and `authorization.md`.
