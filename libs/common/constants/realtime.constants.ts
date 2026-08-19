/** Redis pub/sub channel: apps/ocpp-gateway publishes realtime events (StartTransaction, StopTransaction,
 *  meterValue, status) so apps/api — the only process hosting the socket.io server — can re-emit them to
 *  the client rooms. Mirrors legacy `src/utils/socketIo.js` + the OCPP handlers' `io.to(room).emit(...)`
 *  call sites, which all ran in the single legacy process. */
export const REALTIME_EVENT_CHANNEL = 'nexin:realtime:event';

/** One-way message: gateway asks the API app to emit `event` with `data` to the socket.io `room`. */
export interface RealtimeEventPayload {
  room: string;
  event: string;
  data?: unknown;
}
