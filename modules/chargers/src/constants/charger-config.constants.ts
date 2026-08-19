export const logConfigurationKey = [
  'Heartbeat',
  'StatusNotification',
  'BootNotification',
  'MeterValues',
  'FirmwareStatusNotification',
  'DiagnosticsStatusNotification',
];

export const configureData = [
  {
    key: 'WebSocketPingInterval',
    readOnly: false,
    value: 10,
    description:
      'Only relevant for websocket implementations. 0 disables client side websocket Ping/Pong. In this case there is either no ping/pong or the server initiates the ping and client responds with Pong. Positive values are interpreted as number of seconds between pings. Negative values are not allowed. ChangeConfiguration is expected to return a REJECTED result.',
    id: 0,
  },
  {
    key: 'UnlockConnectorOnEVSideDisconnect',
    readOnly: false,
    value: true,
    description:
      'When set to true, the Charge Point SHALL unlock the cable on Charge Point side when the cable is unplugged at the EV.',
    id: 1,
  },
  {
    key: 'TransactionMessageRetryInterval',
    readOnly: false,
    value: 60,
    description:
      'How long the Charge Point should wait before resubmitting a transaction-related message that the Central System failed to process.',
    id: 2,
  },
  {
    key: 'TransactionMessageAttempts',
    readOnly: false,
    value: 5,
    description:
      'How often the Charge Point should try to submit a transaction-related message when the Central System fails to process it.',
    id: 3,
  },
  {
    key: 'SupportedFeatureProfiles',
    readOnly: true,
    value: [
      'Core',
      'FirmwareManagement',
      'LocalAuthListManagement',
      'Reservation',
      'RemoteTrigger',
      'SmartCharging',
    ],
    description:
      'A list of supported Feature Profiles. Possible profile identifiers: Core, FirmwareManagement, LocalAuthListManagement, Reservation, SmartCharging and RemoteTrigger.',
    id: 4,
  },
  {
    key: 'superFastMode',
    readOnly: false,
    value: false,
    description: 'undefined',
    id: 5,
  },
  {
    key: 'StopTxnSampledData',
    readOnly: false,
    value: ['Energy.Active.Import.Register', 'SoC'],
    description:
      'Sampled measurands to be included in the TransactionData element of StopTransaction.req PDU, every MeterValueSampleInterval seconds from the start of the charging session.',
    id: 6,
  },
  {
    key: 'StopTxnAlignedData',
    readOnly: false,
    value: ['Energy.Active.Import.Register', 'SoC'],
    description:
      'Clock-aligned periodic measurand(s) to be included in the TransactionData element of StopTransaction.req MeterValues.req PDU for every ClockAlignedDataInterval of the Transaction.',
    id: 7,
  },
  {
    key: 'StopTransactionOnInvalidId',
    readOnly: false,
    value: true,
    description:
      'Whether the Charge Point will stop an ongoing transaction when it receives a non- Accepted authorization status in a StartTransaction.conf for this transaction.',
    id: 8,
  },
  {
    key: 'StopTransactionOnEVSideDisconnect',
    readOnly: false,
    value: true,
    description:
      'When set to true, the Charge Point SHALL administratively stop the transaction when the cable is unplugged from the EV.',
    id: 9,
  },
  {
    key: 'stackSelectionEnabled',
    readOnly: false,
    value: false,
    description: 'undefined',
    id: 10,
  },
  {
    key: 'SendLocalListMaxLength',
    readOnly: true,
    value: 100,
    description:
      'Maximum number of identifications that can be send in a single SendLocalList.req.',
    id: 11,
  },
  {
    key: 'RFIDEnabled',
    readOnly: false,
    value: true,
    description: 'undefined',
    id: 12,
  },
  {
    key: 'ResetRetries',
    readOnly: false,
    value: 0,
    description:
      'Number of times to retry an unsuccessful reset of the Charge Point.',
    id: 13,
  },
  {
    key: 'ReserveConnectorZeroSupported',
    readOnly: true,
    value: false,
    description:
      'If this configuration key is present and set to true: Charge Point support reservations on connector 0.',
    id: 14,
  },
  {
    key: 'OCPPEndpointToBackend',
    readOnly: false,
    value: 'wss://api.evechos.com/:name/ocpp/chargerId',
    description: 'undefined',
    id: 15,
  },
  {
    key: 'NumberOfConnectors',
    readOnly: true,
    value: '',
    description:
      'The number of physical charging connectors of this Charge Point.',
    id: 16,
  },
  {
    key: 'MinimumStatusDuration',
    readOnly: false,
    value: 1,
    description:
      'The minimum durationthat a Charge Point or Connector status is stable before a StatusNotification.req PDU is sent to the Central System.',
    id: 17,
  },
  {
    key: 'MeterValuesSampledData',
    readOnly: false,
    value: [
      'Energy.Active.Import.Register',
      'Power.Active.Import',
      'SoC',
      'Current.Import',
      'Voltage',
      'Current.Offered',
      'Power.Active.Import',
      'Temperature',
      'Power.Offered',
    ],
    description:
      "Sampled measurands to be included in a MeterValues.req PDU, every MeterValueSampleInterval seconds. Where applicable, the Measurand is combined with the optional phase; for instance: Voltage.L1 Default: 'Energy.Active.Import.Register'",
    id: 18,
  },
  {
    key: 'MeterValueSampleInterval',
    readOnly: false,
    value: 30,
    description:
      "Interval between sampling of metering (or other) data, intended to be transmitted by 'MeterValues' PDUs. For charging session data (ConnectorId>0), samples are acquired and transmitted periodically at this interval from the start of the charging transaction. A value of '0' (numeric zero), by convention, is to be interpreted to mean that no sampled data should be transmitted.",
    id: 19,
  },
  {
    key: 'MeterValuesAlignedData',
    readOnly: false,
    value: ['Energy.Active.Import.Interval'],
    description:
      'Clock-aligned measurand(s) to be included in a MeterValues.req PDU, every ClockAlignedDataInterval seconds.',
    id: 20,
  },
  {
    key: 'maxPowerLimitInkW',
    readOnly: false,
    value: 180,
    description: 'undefined',
    id: 21,
  },
  {
    key: 'MaxPowerLimit',
    readOnly: false,
    value: 3300,
    description: 'Number of power limit configurations supported by the Charge Point.',
    id: 54,
  },
  {
    key: 'PowerLimitConfigurations',
    readOnly: false,
    value: 20,
    description: 'Number of power limit configurations supported by the Charge Point.',
    id: 53,
  },
  {
    key: 'maxCurrentLimitInAmps',
    readOnly: false,
    value: 200,
    description: 'undefined',
    id: 22,
  },
  {
    key: 'MaxChargingProfilesInstalled',
    readOnly: true,
    value: 10,
    description: 'Maximum number of Charging profiles installed at a time.',
    id: 23,
  },
  {
    key: 'LocalPreAuthorize',
    readOnly: false,
    value: true,
    description:
      'Whether the Charge Point, when online, will start a transaction for locally-authorized identifiers without waiting for or requesting an Authorize.conf from the Central System.',
    id: 24,
  },
  {
    key: 'LocalAuthorizeOffline',
    readOnly: false,
    value: true,
    description:
      'Whether the Charge Point, when offline, will start a transaction for locally-authorized identifiers.',
    id: 25,
  },
  {
    key: 'LocalAuthListMaxLength',
    readOnly: true,
    value: 1000,
    description:
      'Maximum number of identifications that can be stored in the Local Authorization List.',
    id: 26,
  },
  {
    key: 'LocalAuthListEnabled',
    readOnly: false,
    value: true,
    description: 'Whether the Local Authorization List is enabled.',
    id: 27,
  },
  {
    key: 'Identity',
    readOnly: true,
    value: 'user',
    description: 'undefined',
    id: 28,
  },
  {
    key: 'HeartbeatInterval',
    readOnly: false,
    value: 60,
    description: 'undefined',
    id: 29,
  },
  {
    key: 'gracefulStopOnHardReset',
    readOnly: false,
    value: true,
    description: 'undefined',
    id: 30,
  },
  {
    key: 'GetConfigurationMaxKeys',
    readOnly: true,
    value: 100,
    description:
      'Maximum number of requested configuration keys in a GetConfiguration.req PDU.',
    id: 31,
  },
  {
    key: 'forceOfflineMode',
    readOnly: false,
    value: false,
    description: 'undefined',
    id: 32,
  },
  {
    key: 'ConnectorSwitch3to1PhaseSupported',
    readOnly: true,
    value: false,
    description:
      'If defined and true, this Charge Point support switching from 3 to 1 phase during a Transaction.',
    id: 33,
  },
  {
    key: 'ConnectorPhaseRotation',
    readOnly: false,
    value: 'NotApplicable',
    description:
      'The phase rotation per connector in respect to the connector’s electrical meter (or if absent, the grid connection).',
    id: 34,
  },
  {
    key: 'ConnectionTimeOut',
    readOnly: false,
    value: 120,
    description:
      "Interval *from beginning of status: 'Preparing' until incipient Transaction is automatically canceled, due to failure of EV driver to (correctly) insert the charging cable connector(s) into the appropriate socket(s). The Charge Point SHALL go back to the original state, probably: 'Available'.",
    id: 35,
  },
  {
    key: 'ClockAlignedDataInterval',
    readOnly: false,
    value: 0,
    description:
      "Size (in seconds) of the clock-aligned data interval. This is the size (in seconds) of the set of evenly spaced aggregation intervals per day, starting at 00:00:00 (midnight). For example, a value of 900 (15 minutes) indicates that every day should be broken into 96 15-minute intervals. When clock aligned data is being transmitted, the interval in question is identified by the start time and (optional) duration interval value, represented according to the ISO8601 standard. All 'per-period' data (e.g. energy readings) should be accumulated (for 'flow' type measurands such as energy), or averaged (for other values) across the entire interval (or partial interval, at the beginning or end of a Transaction), and transmitted (if so enabled) at the end of each interval, bearing the interval start time timestamp. A value of '0' (numeric zero), by convention, is to be interpreted to mean that no clock-aligned data should be transmitted.",
    id: 36,
  },
  {
    key: 'ChargingScheduleMaxPeriods',
    readOnly: true,
    value: 10,
    description:
      'Maximum number of periods that may be defined per ChargingSchedule.',
    id: 37,
  },
  {
    key: 'ChargingScheduleAllowedChargingRateUnit',
    readOnly: true,
    value: ['Power'],
    description:
      "A list of supported quantities for use in a ChargingSchedule. Allowed values: 'Current' and 'Power'.",
    id: 38,
  },
  {
    key: 'chargingPointVendor',
    readOnly: false,
    value: '',
    description: 'undefined',
    id: 39,
  },
  {
    key: 'chargingPointModel',
    readOnly: false,
    value: '',
    description: 'undefined',
    id: 40,
  },
  {
    key: 'chargerName',
    readOnly: false,
    value: '',
    description: 'undefined',
    id: 41,
  },
  {
    key: 'ChargeProfileMaxStackLevel',
    readOnly: true,
    value: 20,
    description:
      'Max StackLevel of a ChargingProfile. The number defined also indicates the max allowed number of installed charging schedules per Charging Profile Purposes.',
    id: 42,
  },
  {
    key: 'chargePointSerialNumber',
    readOnly: false,
    value: 60,
    description: 'undefined',
    id: 43,
  },
  {
    key: 'basicAuthentication',
    readOnly: false,
    value: false,
    description: 'undefined',
    id: 44,
  },
  {
    key: 'AuthorizeRemoteTxRequests',
    readOnly: false,
    value: false,
    description:
      'Whether a remote request to start a transaction in the form of a RemoteStartTransaction.req message should be authorized beforehand like a local action to start a transaction.',
    id: 45,
  },
  {
    key: 'AuthorizationCacheEnabled',
    readOnly: false,
    value: false,
    description:
      'If this key exists, the Charge Point supports an Authorization Cache. If this key reports a value of true, the Authorization Cache is enabled.',
    id: 46,
  },
  {
    key: 'BlinkRepeat',
    readOnly: false,
    value: 5,
    description:
      'Number of times to blink Charge Point lighting when signalling',
  },
  {
    key: 'authAllOutlet',
    readOnly: false,
    value: false,
    description: 'undefined',
    id: 47,
  },
  {
    key: 'AllowOfflineTxForUnknownId',
    readOnly: false,
    value: true,
    description:
      'If this key exists, the Charge Point supports Unknown Offline Authorization. If this key reports a value of true, Unknown Offline Authorization is enabled.',
    id: 48,
  },
  {
    key: 'ConnectorPhaseRotationMaxLength',
    readOnly: true,
    value: 3,
    description:
      'Maximum number of items in a ConnectorPhaseRotation Configuration Key.',
    id: 49,
  },
  {
    key: 'LightIntensity',
    readOnly: false,
    value: 75,
    description:
      'Percentage of maximum intensity at which to illuminate Charge Point lighting.',
    id: 50,
  },
  {
    key: 'MaxEnergyOnInvalidId',
    readOnly: false,
    value: 100,
    description:
      'Maximum energy in Wh delivered when an identifier is invalidated by the Central System after start of a transaction.',
    id: 51,
  },
  {
    key: 'MeterValuesAlignedDataMaxLength',
    readOnly: true,
    value: 100,
    description:
      'Maximum number of items in a MeterValuesAlignedData Configuration Key.',
    id: 52,
  },
];
