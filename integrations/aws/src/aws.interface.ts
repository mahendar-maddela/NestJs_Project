export interface AwsConfigOptions {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sesEmailFrom?: string;
}

/** Plain-object subset of `ClientDetails` needed for client-branded emails — kept decoupled from
 *  the TypeORM entity so this integration doesn't depend on the domain layer. */
export interface ClientBrandingDetails {
  companyName?: string | null;
  brandName?: string | null;
  contactEmail?: string | null;
  businessUrl?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  address?: string | null;
  cpoUrl?: string | null;
  fleetUrl?: string | null;
  csmsUrl?: string | null;
}
