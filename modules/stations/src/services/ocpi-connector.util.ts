/** Mirrors legacy `src/OCPI/convertions/connectorStandard.js`. */
const STANDARD_TO_CONNECTOR: Record<string, string> = {
  IEC_62196_T2_COMBO: 'CCS2',
  CHADEMO: 'CHAdeMO',
  IEC_62196_T1: 'Type1',
  IEC_62196_T2: 'Type2',
  IEC_62196_T3A: 'Type3',
  GBT: 'GB/T',
  TESLA_R: 'Tesla',
};

export function mapStandardToConnector(standard?: string | null): string {
  if (!standard) return 'CCS2';
  return STANDARD_TO_CONNECTOR[standard] || 'CCS2';
}

const CONNECTOR_TO_STANDARD: Record<string, string> = {
  CCS1: 'IEC_62196_T2_COMBO',
  CCS2: 'IEC_62196_T2_COMBO',
  CCS: 'IEC_62196_T2_COMBO',
  CHAdeMO: 'CHADEMO',
  Type1: 'IEC_62196_T1',
  Type2: 'IEC_62196_T2',
  Type3: 'IEC_62196_T3A',
  'GB/T': 'GBT',
  Tesla: 'TESLA_R',
  'Tesla Supercharger': 'TESLA_S',
};

export function mapConnectorStandard(connectorStandard?: string | null): string {
  if (!connectorStandard) return 'IEC_62196_T2';
  return CONNECTOR_TO_STANDARD[connectorStandard] || 'IEC_62196_T2';
}
