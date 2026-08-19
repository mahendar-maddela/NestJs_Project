export const OCPI_CONFIG = {
  country_code: 'IN',
  country: 'IND',
};

export const OCPI_ROLES = {
  sender: 'SENDER',
  receiver: 'RECEIVER',
};

export const OCPI_IDENTIFIERS = {
  locations: 'locations',
  cdrs: 'cdrs',
  versions: 'versions',
  credentials: 'credentials',
  sessions: 'sessions',
  tariffs: 'tariffs',
  commands: 'commands',
};

export const OCPI_CAPABILITIES = {
  remote_start_stop: 'REMOTE_START_STOP_CAPABLE',
};

export const OCPI_CURR_VERSION = process.env.CURR_OCPI_VERSION || '2.2.1';
export const OCPI_SERVER = process.env.OCPI_SERVER || 'http://localhost:8080';
export const OCPI_SESSION_CURRENCY = process.env.OCPI_SESSION_CURRENCY || 'INR';
export const EMSP_MAX_AMOUNT = Number(process.env.EMSP_MAX_AMOUNT || 0);
