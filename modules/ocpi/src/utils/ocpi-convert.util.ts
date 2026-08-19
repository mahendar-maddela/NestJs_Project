import { OCPI_CAPABILITIES, OCPI_CONFIG } from '../constants/ocpi.constants';

const CONNECTOR_STANDARD_MAP: Record<string, string> = {
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
  return CONNECTOR_STANDARD_MAP[connectorStandard] || 'IEC_62196_T2';
}

const CHARGER_STATUS_MAP: Record<string, string> = {
  Available: 'AVAILABLE',
  Preparing: 'BLOCKED',
  Charging: 'CHARGING',
  SuspendedEVSE: 'INOPERATIVE',
  SuspendedEV: 'INOPERATIVE',
  Finishing: 'AVAILABLE',
  Reserved: 'BLOCKED',
  Unavailable: 'OUTOFORDER',
  Faulted: 'OUTOFORDER',
  PowerFailure: 'OUTOFORDER',
};

export function mapChargerStatus(internalStatus?: string | null): string {
  if (!internalStatus) return 'AVAILABLE';
  return CHARGER_STATUS_MAP[internalStatus] || 'AVAILABLE';
}

interface ConnectorForOcpi {
  connectorId: string;
  portType?: string | null;
  max_power?: number | string | null;
  status?: string | null;
  updatedAt: Date;
}

interface ChargerForOcpi {
  chargerId: string;
  powerType?: string | null;
  capacity?: number | string | null;
  connectors: ConnectorForOcpi[];
  roamingTariffs?: { id: number }[];
}

interface StationForOcpi {
  id: number;
  stationUniqueId: string;
  name?: string | null;
  chargers: ChargerForOcpi[];
}

interface LocationForOcpi {
  address?: string | null;
  city?: string | null;
  pincode?: string | number | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  updatedAt: Date;
}

export function formatLocationForOcpi(location: LocationForOcpi, station: StationForOcpi, party_id: string) {
  const connectorUpdatedDates = station.chargers.flatMap((charger) =>
    charger.connectors.map((connector) => new Date(connector.updatedAt)),
  );

  const latestConnectorUpdatedAt =
    connectorUpdatedDates.length > 0 ? new Date(Math.max(...connectorUpdatedDates.map((d) => d.getTime()))) : null;

  const latestLocationUpdatedAt = new Date(location.updatedAt);

  const locationLastUpdated =
    latestConnectorUpdatedAt && latestConnectorUpdatedAt > latestLocationUpdatedAt
      ? latestConnectorUpdatedAt
      : latestLocationUpdatedAt;

  const evses = station.chargers.flatMap((charger) =>
    charger.connectors.map((connector) => {
      const evseUid = `${charger.chargerId}_${connector.connectorId}`;
      const connectorUpdatedAt = new Date(connector.updatedAt);

      return {
        uid: evseUid,
        evse_id: charger.chargerId,
        status: mapChargerStatus(connector.status),
        capabilities: [OCPI_CAPABILITIES.remote_start_stop],
        connectors: [
          {
            id: evseUid,
            standard: mapConnectorStandard(connector.portType),
            format: 'CABLE',
            power_type: charger.powerType?.toUpperCase() === 'AC' ? 'AC_1_PHASE' : 'DC',
            max_voltage: 500,
            max_amperage: 300,
            max_electric_power: parseInt(String(charger.capacity)) * 1000 || (parseInt(String(connector.max_power)) || 50) * 1000,
            tariff_ids: [charger.roamingTariffs?.[0]?.id?.toString()],
            last_updated: connectorUpdatedAt.toISOString(),
          },
        ],
        last_updated: connectorUpdatedAt.toISOString(),
      };
    }),
  );

  return {
    id: `${station.id}_${station.stationUniqueId}`,
    country_code: OCPI_CONFIG.country_code,
    party_id,
    publish: true,
    name: station.name || 'Unnamed',
    address: location.address || location.city,
    city: location.city || 'Unknown',
    postal_code: location.pincode?.toString() || null,
    state: location.state || null,
    country: OCPI_CONFIG.country,
    coordinates: {
      latitude: location.latitude?.toString(),
      longitude: location.longitude?.toString(),
    },
    parking_type: 'ON_STREET',
    evses,
    time_zone: 'Asia/Kolkata',
    last_updated: locationLastUpdated.toISOString(),
  };
}

interface TariffForOcpi {
  id: number;
  price: number | string | null;
  gst?: number | string | null;
  updatedAt: Date;
}

export function formatTariffForOcpi(tariff: TariffForOcpi, party_id: string) {
  return {
    country_code: OCPI_CONFIG.country_code,
    party_id,
    id: `${tariff.id}`,
    currency: process.env.OCPI_SESSION_CURRENCY || 'INR',
    type: 'REGULAR',
    elements: [
      {
        price_components: [
          {
            type: 'ENERGY',
            price: parseFloat(String(tariff.price)),
            vat: parseFloat(String(tariff.gst)) || 0,
            step_size: 1,
          },
        ],
      },
    ],
    tariff_alt_text: [
      {
        language: 'en',
        text: `₹${tariff.price} per kWh${tariff.gst ? ` + ${tariff.gst}% GST` : ''}`,
      },
    ],
    last_updated: new Date(tariff.updatedAt).toISOString(),
  };
}
