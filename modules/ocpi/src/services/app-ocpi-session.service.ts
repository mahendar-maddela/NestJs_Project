import { Injectable, NotFoundException } from '@nestjs/common';
import { OcpiCpoPartnerRepository } from '../repositories/ocpi-cpo-partner.repository';
import { mapStandardToConnector } from '../../../stations/src/services/ocpi-connector.util';
import { InvoiceRepository } from '../../../sessions/src/repositories/invoice.repository';
import { InvoicePdfService } from '../../../sessions/src/services/invoice-pdf.service';

function parseJsonArray(raw: unknown): any[] {
  try {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim().length) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

/** Mirrors `controllers/APP/OCPI/sessionController.js`. */
@Injectable()
export class AppOcpiSessionService {
  constructor(
    private readonly repo: OcpiCpoPartnerRepository,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  async getOcpiRunningSessionBySessionId(sessionId: string, userId: number) {
    const ocpiTransaction: any = await this.repo.findTransactionByAuthRefAndUser(sessionId, userId);
    if (!ocpiTransaction) {
      throw new NotFoundException({ success: false, message: 'Session or transaction not found' });
    }

    const evse: any = ocpiTransaction.evse_id ? await this.repo.findEvseById(ocpiTransaction.evse_id) : null;

    const connector = await this.repo.findConnectorByConnectorIdAndEvse(ocpiTransaction.connector_id, ocpiTransaction.evse_id);
    const tariffIds = parseJsonArray(connector?.tariff_ids);
    const tariffId = tariffIds[0];

    const tariff = tariffId ? await this.repo.findTariffByPartyCpoTariffId(ocpiTransaction.party_id, ocpiTransaction.cpo_id, tariffId) : null;
    const elements = parseJsonArray(tariff?.elements);
    const priceComponents = elements[0]?.price_components || [];

    const combinedData = {
      sessionId: ocpiTransaction.sessions?.[0]?.sessionId,
      id: ocpiTransaction.sessions?.[0]?.id,
      transaction: {
        id: ocpiTransaction.id,
        transactionId: ocpiTransaction.session_id,
        startDate: ocpiTransaction.start_date_time || null,
        status: ocpiTransaction.status === 'ACTIVE' ? 0 : 1,
        chargerId: ocpiTransaction.evse_uid || null,
        chargerRef: ocpiTransaction.evse_id || null,
        totalWh: (ocpiTransaction.kwh || 0) * 1000,
        connectorId: ocpiTransaction.connector_id || null,
        startSoc: ocpiTransaction.startSoc || null,
        stopSoc: ocpiTransaction.stopSoc || null,
        createdAt: ocpiTransaction.createdAt,
        updatedAt: ocpiTransaction.updatedAt,
        macId: null,
        vehicleId: null,
        price: ocpiTransaction.price || 0,
        gst: ocpiTransaction.tax || 0,
        amount: ocpiTransaction.total_price || 0,
        calcPrice: priceComponents[0]?.price || 0,
        calcTaxPercent: priceComponents[0]?.tax || 0,
        charger: {
          id: null,
          chargerId: ocpiTransaction.evse_uid || null,
          capacity: null,
          powerType: evse?.connectors?.[0]?.power_type || null,
        },
      },
      connectorDetails: [
        {
          id: evse?.connectors?.[0]?.id,
          portType: mapStandardToConnector(evse?.connectors?.[0]?.standard) || evse?.connectors?.[0]?.standard,
        },
      ],
      latestTransactionDetail: null,
      type: 'OCPI',
    };

    return { success: true, message: 'Running transaction data fetched successfully', data: combinedData };
  }

  async getOcpiInvoiceSummary(sessionId: number, userId: number) {
    const ocpiTransaction: any = await this.repo.findTransactionByIdAndUser(sessionId, userId);
    if (!ocpiTransaction) {
      throw new NotFoundException({ success: false, message: 'Session not found' });
    }

    const evse: any = ocpiTransaction.evse_id ? await this.repo.findEvseByUidGlobal(ocpiTransaction.evse_uid) : null;
    const charginDuration = ocpiTransaction.updatedAt ? new Date(ocpiTransaction.updatedAt).getTime() - new Date(ocpiTransaction.createdAt).getTime() : null;

    const mappedTransaction = {
      id: ocpiTransaction.id,
      transactionId: ocpiTransaction.session_id,
      chargerId: ocpiTransaction.evse_uid || 'N/A',
      connectorId: ocpiTransaction.connector_id || 'N/A',
      charginDuration,
      startSoc: ocpiTransaction.startSoc || 0,
      stopSoc: ocpiTransaction.stopSoc || 0,
      totalWh: (ocpiTransaction.kwh || 0) * 1000,
      amount: ocpiTransaction.price || 0,
      gst: ocpiTransaction.tax || 0,
      price: ocpiTransaction.total_price || 0,
      createdAt: ocpiTransaction.createdAt,
      startDate: ocpiTransaction.createdAt,
      stopDate: ocpiTransaction.end_date_time,
      updatedAt: ocpiTransaction.updatedAt || null,
      user: null,
      macId: null,
      walletTransaction: null,
      charger: {
        id: null,
        chargerId: ocpiTransaction.evse_uid || null,
        capacity: null,
        powerType: evse?.connectors?.[0]?.power_type || null,
        status: null,
        station: {
          id: null,
          name: evse?.location?.name || null,
          stationUniqueId: null,
          stationLocation: { address: evse?.location?.address || null, city: evse?.location?.city || null, State: null, country: null, pincode: null },
        },
      },
      connectorDetails: {
        id: evse?.connectors?.[0]?.id,
        portType: mapStandardToConnector(evse?.connectors?.[0]?.standard) || evse?.connectors?.[0]?.standard,
      },
      type: 'OCPI',
    };

    return { success: true, message: 'Invoice Summary Fetched Successfully', data: mappedTransaction };
  }

  /** Mirrors `controllers/APP/OCPI/sessionController.js:getOcpiInvoice`. */
  async getOcpiInvoice(sessionId: number, userId: number, clientId: number) {
    const ocpiTransaction: any = await this.repo.findTransactionByIdAndUserWithUser(sessionId, userId);
    if (!ocpiTransaction) {
      throw new NotFoundException({ success: false, message: 'Session not found' });
    }

    const charginDuration = ocpiTransaction.updatedAt ? new Date(ocpiTransaction.updatedAt).getTime() - new Date(ocpiTransaction.createdAt).getTime() : null;

    const mappedTransaction = {
      transactionId: ocpiTransaction.session_id,
      chargerId: ocpiTransaction.evse_uid || 'N/A',
      connectorId: ocpiTransaction.connector_id || 'N/A',
      charginDuration,
      startSoc: ocpiTransaction.startSoc || 0,
      stopSoc: ocpiTransaction.stopSoc || 0,
      totalWh: (ocpiTransaction.kwh || 0) * 1000,
      amount: ocpiTransaction.price || 0,
      gst: ocpiTransaction.tax || 0,
      price: ocpiTransaction.total_price || 0,
      updatedAt: ocpiTransaction.updatedAt,
      user: ocpiTransaction.user || null,
      macId: null,
      walletTransaction: null,
    };

    const clientDetails = await this.invoiceRepo.findClientDetails(clientId);
    const buffer = await this.invoicePdfService.generateInvoicePdf(mappedTransaction, clientDetails);

    return { buffer, transactionId: mappedTransaction.transactionId };
  }
}
