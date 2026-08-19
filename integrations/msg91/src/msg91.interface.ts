/** Per-client override for MSG91/WhatsApp credentials, mirroring `CredentialConfig.authKey`/`.template`. */
export interface Msg91CredentialOverride {
  authKey?: string | null;
  template?: string | null;
}
