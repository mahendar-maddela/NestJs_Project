import { formatDuration } from './format.util';

export interface InvoiceClientDetails {
  primaryColor?: string | null;
  companyName?: string | null;
  brandName?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  businessUrl?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  gst?: string | null;
}

export interface InvoiceTransactionData {
  transactionId?: string | number | null;
  updatedAt?: string | Date | null;
  user?: { first_name?: string | null; last_name?: string | null; userId?: string | null; email?: string | null; phone?: string | null; gst?: string | null } | null;
  fleetUser?: { cName?: string | null; fleetUId?: string | null; gst?: string | null; fleetUsers?: { name?: string | null; email?: string | null; phone?: string | null }[] } | null;
  macId?: string | null;
  chargerId?: string | number | null;
  connectorId?: string | number | null;
  charginDuration?: number | null;
  startSoc?: number | null;
  stopSoc?: number | null;
  totalWh?: number | null;
  amount?: number | string | null;
  gst?: number | null;
  price?: number | string | null;
}

/** Mirrors `utils/globalInvoicePdf.js:generateDeviceTransactionPdf`. */
export function buildDeviceTransactionInvoiceHtml(transaction: InvoiceTransactionData, clientDetails: InvoiceClientDetails | null | undefined): string {
  const primaryColor = clientDetails?.primaryColor || '#4f46e5';
  const companyName = clientDetails?.companyName || 'Your Company';
  const brandName = clientDetails?.brandName || companyName;
  const supportEmail = clientDetails?.contactEmail || 'N/A';
  const logoUrl = clientDetails?.logoUrl || '';
  const website = clientDetails?.businessUrl || '';
  const contactPhone = clientDetails?.contactPhone || '';
  const address = clientDetails?.address || 'N/A';
  const gst = clientDetails?.gst || 'N/A';

  const updatedAt = transaction?.updatedAt ? new Date(transaction.updatedAt) : new Date(NaN);
  const totalWh = transaction?.totalWh ?? 0;
  const amount = parseFloat(String(transaction?.amount ?? 0));
  const price = parseFloat(String(transaction?.price ?? 0));
  const txGst = transaction?.gst ?? 0;
  const name = transaction?.user?.first_name || transaction?.fleetUser?.cName || transaction?.fleetUser?.fleetUsers?.[0]?.name || 'Walk-in';
  const lastName = transaction?.user?.last_name || '';
  const userId = transaction?.user?.userId || transaction?.fleetUser?.fleetUId || 'N/A';
  const email = transaction?.user?.email || transaction?.fleetUser?.fleetUsers?.[0]?.email || 'N/A';
  const phone = transaction?.user?.phone || transaction?.fleetUser?.fleetUsers?.[0]?.phone || 'N/A';
  const custGst = transaction?.user?.gst || transaction?.fleetUser?.gst || 'N/A';

  return `
 <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>EV Charging Invoice</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      background: #fff;
      color: #1e293b;
      line-height: 1.6;
    }

    .header {
      background: ${primaryColor};
      color: white;
      padding: 25px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      height: 65px;
      background: white;
      padding: 8px;
      border-radius: 10px;
    }

    .invoice-id {
      font-size: 22px;
      font-weight: 700;
    }

    .invoice-date {
      font-size: 14px;
      opacity: 0.9;
    }

    .body {
      padding: 10px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 15px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      position: relative;
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 50px;
      height: 2px;
      background-color: ${primaryColor};
    }

    .info-block {
      background-color: #e2e8f0;
      padding: 18px;
      border-radius: 10px;
      margin-bottom: 25px;
      border-left: 4px solid;
    }

    .company-block {
      background-color: #e0f2fe;
      border-left-color: #0072BC;
    }

    .user-block {
      background-color: #f0fdf4;
      border-left-color: ${primaryColor};
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 14px;
    }

    .label {
      color: #6f88aaff;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .value {
      font-weight: 600;
      color: #1e293b;
    }

    .session {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin: 30px 0;
    }

    .session-header {
      background-color: ${primaryColor};
      color: white;
      padding: 14px 20px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }

    .session-body {
      padding: 20px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .card {
      text-align: center;
      background-color: #e2e8f0;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .card-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      background-color: #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .table th {
      background: #f1f5f9;
      padding: 12px 15px;
      font-weight: 600;
      color: #475569;
      font-size: 13px;
    }

    .table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
    }

    .table tr:last-child td {
      font-weight: 600;
      font-size: 15px;
      color: ${primaryColor};
      border: none;
    }

    .text-right { text-align: right; }

    .summary {
      background-color: #e3f9ee;
      padding: 25px;
      border-radius: 12px;
      border: 1px solid ${primaryColor};
      margin: 25px 0;
    }

    .summary-title {
      text-align: center;
      font-size: 19px;
      font-weight: 600;
      color: #0072BC;
      margin-bottom: 10px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }

    .summary-row.total {
      font-weight: 700;
      font-size: 19px;
      color: #0072BC;
      border-top: 2px solid ${primaryColor};
      padding-top: 10px;
      margin-top: 5px;
    }

    .status {
      text-align: center;
      margin: 0px 0;
    }

    .badge {
      display: inline-block;
      background-color: ${primaryColor};
      color: white;
      padding: 10px 24px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 15px;
    }

    .footer {
      background-color: #0f172a;
      color: white;
      text-align: center;
      padding: 20px 20px;
      font-size: 14px;
    }

    .footer-contact {
      color: ${primaryColor};
      font-weight: 600;
      margin: 5px 0;
    }

    .footer-powered {
      font-size: 12px;
      opacity: 0.6;
      margin-top:5px;
    }

    @media (max-width: 600px) {
      .header { flex-direction: column; text-align: center; gap: 15px; }
      .grid, .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="invoice">

    <header class="header">
      <img src="${logoUrl}" alt="${brandName}" class="logo" />
      <div>
        <div class="invoice-id">Invoice #${transaction?.transactionId}</div>
        <div class="invoice-date">${updatedAt.toLocaleDateString('en-IN')} | ${updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </header>

    <section class="body">

      <div class="info-block user-block">
        <h3 class="section-title">Customer Details</h3>
        <div class="grid">
          <div><div class="label">Name</div><div class="value">${name} ${lastName}</div></div>
          <div><div class="label">User ID</div><div class="value">${userId}</div></div>
          <div><div class="label">Email</div><div class="value">${email}</div></div>
          <div><div class="label">Phone</div><div class="value">${phone}</div></div>
          <div><div class="label">GSTIN</div><div class="value">${custGst}</div></div>
          <div><div class="label">Vehicle MAC</div><div class="value">${transaction?.macId || 'N/A'}</div></div>
        </div>
      </div>

      <div class="info-block company-block">
        <h3 class="section-title">Billing Entity</h3>
        <div class="grid">
          <div><div class="label">Company</div><div class="value">${companyName}</div></div>
          <div><div class="label">Address</div><div class="value">${address || 'N/A'}</div></div>
          <div><div class="label">GSTIN</div><div class="value">${gst || 'N/A'}</div></div>
          <div><div class="label">Contact</div><div class="value">${contactPhone || 'N/A'} | ${supportEmail || 'N/A'}</div></div>
        </div>
      </div>

      <h2 class="section-title" style="text-align:center; margin:30px 0 20px;">Charging Session</h2>
      <div class="session">
        <div class="session-header">
          <span>${updatedAt.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>${updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="session-body">
          <div class="info-grid">
            <div class="card"><div class="card-label">Charger ID</div><div class="card-value">${transaction?.chargerId}</div></div>
            <div class="card"><div class="card-label">Connector</div><div class="card-value">${transaction?.connectorId}</div></div>
            <div class="card"><div class="card-label">Duration</div><div class="card-value">${formatDuration(transaction?.charginDuration)}</div></div>
            <div class="card"><div class="card-label">SoC</div><div class="card-value">${transaction?.startSoc}% → ${transaction?.stopSoc}%</div></div>
            <div class="card"><div class="card-label">Energy</div><div class="card-value">${(totalWh / 1000).toFixed(2)} kWh</div></div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Energy Consumed (${(totalWh / 1000).toFixed(2)} kWh)</td>
                <td class="text-right">₹${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>CGST @ 9%</td>
                <td class="text-right">₹${(txGst / 2).toFixed(2)}</td>
              </tr>
              <tr>
                <td>SGST @ 9%</td>
                <td class="text-right">₹${(txGst / 2).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Total Amount</strong></td>
                <td class="text-right"><strong>₹${price.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="summary">
        <div class="summary-title">Payment Summary</div>
        <div class="summary-row"><div>Subtotal</div><div>₹${amount.toFixed(2)}</div></div>
        <div class="summary-row"><div>CGST (9%)</div><div>₹${(txGst / 2).toFixed(2)}</div></div>
        <div class="summary-row"><div>SGST (9%)</div><div>₹${(txGst / 2).toFixed(2)}</div></div>
        <div class="summary-row total"><div>Total Paid</div><div>₹${price.toFixed(2)}</div></div>
      </div>

      <div class="status">
        <div class="badge">Payment Successful</div>
      </div>

    </section>

    <footer class="footer">
      <div>Thank you for choosing <strong>${companyName}</strong></div>
      <div class="footer-contact">${supportEmail} | ${website} | ${contactPhone || 'N/A'}</div>
      <div class="footer-powered">Powered by <strong>Nexin</strong></div>
    </footer>
  </div>
</body>
</html>`;
}
