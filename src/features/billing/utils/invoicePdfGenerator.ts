import { jsPDF } from 'jspdf';
import { Invoice } from '../../../types';
import { APP_CONFIG } from '../../../data/appConfig';

export interface GenerateInvoicePdfOptions {
  autoDownload?: boolean;
}

/**
 * Generates a high-quality, print-ready vector PDF for a DineMaster Pro invoice.
 */
export function generateInvoicePdf(
  invoice: Invoice,
  options: GenerateInvoicePdfOptions = { autoDownload: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  // Colors
  const primaryColor = [245, 158, 11]; // Amber 500
  const darkNavy = [15, 23, 42];        // Slate 900
  const slate600 = [71, 85, 105];       // Slate 600
  const slate400 = [148, 163, 184];     // Slate 400
  const lightBg = [248, 250, 252];      // Slate 50
  const borderLine = [226, 232, 240];   // Slate 200

  // Status colors
  const statusColors: Record<string, { bg: number[]; text: number[]; label: string }> = {
    paid: { bg: [236, 253, 245], text: [5, 150, 105], label: 'PAID' },
    unpaid: { bg: [254, 243, 199], text: [217, 119, 6], label: 'PAYMENT DUE' },
    pending: { bg: [238, 242, 255], text: [79, 70, 229], label: 'PENDING' },
    overdue: { bg: [254, 226, 226], text: [220, 38, 38], label: 'OVERDUE' },
    void: { bg: [241, 245, 249], text: [100, 116, 139], label: 'VOID' },
  };

  const statusConfig = statusColors[invoice.status] || statusColors.unpaid;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header: Logo & Title
  let y = 18;

  // DineMaster Pro Badge Icon
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.roundedRect(margin, y - 2, 12, 12, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('D', margin + 3.8, y + 6.8);

  // DineMaster Pro Brand Name
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(APP_CONFIG.appName, margin + 15, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Restaurant Reservation & Management Platform', margin + 15, y + 9);

  // Right-aligned Invoice Title & Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('INVOICE', pageWidth - margin, y + 3, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice.invoiceNumber, pageWidth - margin, y + 9, { align: 'right' });

  // Status Badge
  const badgeWidth = 32;
  const badgeHeight = 7;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = y + 12;

  doc.setFillColor(statusConfig.bg[0], statusConfig.bg[1], statusConfig.bg[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(statusConfig.text[0], statusConfig.text[1], statusConfig.text[2]);
  doc.text(statusConfig.label, badgeX + badgeWidth / 2, badgeY + 4.8, { align: 'center' });

  // Divider
  y = 38;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Addresses Section: Supplier (Left) & Customer (Right)
  y = 45;
  const colWidth = (contentWidth - 10) / 2;

  // Supplier Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text('ISSUED BY', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`${APP_CONFIG.companyName} Hospitality Solutions Ltd`, margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(APP_CONFIG.address, margin, y + 9.5);
  doc.text('Dublin 2, D02 CH66, Ireland', margin, y + 14);
  doc.text(`VAT ID: IE 3849120H | Reg: #682910`, margin, y + 18.5);
  doc.text(`Billing: billing@wordwide.pro`, margin, y + 23);

  // Customer / Restaurant Details
  const customerColX = margin + colWidth + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text('BILLED TO', customerColX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(invoice.restaurantLegalName || invoice.restaurantName, customerColX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  let custY = y + 9.5;
  if (invoice.restaurantAddress) {
    doc.text(invoice.restaurantAddress, customerColX, custY);
    custY += 4.5;
  }
  const cityLine = [invoice.restaurantCity, invoice.restaurantPostalCode, invoice.restaurantCountry]
    .filter(Boolean)
    .join(', ');
  if (cityLine) {
    doc.text(cityLine, customerColX, custY);
    custY += 4.5;
  }
  if (invoice.restaurantVatNumber) {
    doc.text(`VAT ID: ${invoice.restaurantVatNumber}`, customerColX, custY);
    custY += 4.5;
  }
  doc.text(`Contact: ${invoice.customerEmail}`, customerColX, custY);

  // 4. Meta Details Box (Dates, Terms, Period)
  y = 78;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S');

  const metaCols = [
    { label: 'INVOICE DATE', value: formatDate(invoice.issueDate) },
    { label: 'PAYMENT DUE', value: formatDate(invoice.dueDate) },
    { label: 'BILLING PERIOD', value: invoice.billingPeriod || 'Current Month' },
    { label: 'PLAN', value: invoice.planName || 'Professional' },
  ];

  const metaColWidth = contentWidth / metaCols.length;
  metaCols.forEach((col, i) => {
    const x = margin + i * metaColWidth + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(slate400[0], slate400[1], slate400[2]);
    doc.text(col.label, x, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(col.value, x, y + 11.5);
  });

  // 5. Line Items Table
  y = 102;
  const colDesc = margin + 4;
  const colQty = margin + 105;
  const colPrice = margin + 125;
  const colTax = margin + 148;
  const colTotal = pageWidth - margin - 4;

  // Table Header
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION & PERIOD', colDesc, y + 5.5);
  doc.text('QTY', colQty, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', colPrice, y + 5.5, { align: 'right' });
  doc.text('VAT', colTax, y + 5.5, { align: 'right' });
  doc.text('AMOUNT', colTotal, y + 5.5, { align: 'right' });

  // Rows
  y += 8;
  const items = invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [
    {
      id: 'default-line',
      description: `${APP_CONFIG.appName} ${invoice.planName} Subscription`,
      periodStart: invoice.billingPeriod,
      quantity: 1,
      unitPrice: invoice.subtotal,
      amount: invoice.subtotal,
    }
  ];

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(margin, y, contentWidth, 12, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(item.description, colDesc, y + 5);

    if (item.periodStart || invoice.billingPeriod) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(slate400[0], slate400[1], slate400[2]);
      doc.text(`Period: ${item.periodStart || invoice.billingPeriod}`, colDesc, y + 9.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(String(item.quantity || 1), colQty, y + 6, { align: 'center' });
    doc.text(formatMoney(item.unitPrice, invoice.currency), colPrice, y + 6, { align: 'right' });
    doc.text(`${invoice.taxRate || 23}%`, colTax, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(item.amount, invoice.currency), colTotal, y + 6, { align: 'right' });

    y += 12;
  });

  // Table bottom border
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // 6. Summary Totals Box (Right aligned)
  y += 6;
  const totalsWidth = 72;
  const totalsX = pageWidth - margin - totalsWidth;

  const summaryRows = [
    { label: 'Subtotal (excl. VAT)', value: formatMoney(invoice.subtotal, invoice.currency), bold: false },
    { label: `VAT / Tax (${invoice.taxRate || 23}%)`, value: formatMoney(invoice.taxAmount, invoice.currency), bold: false },
    { label: 'Total Payable', value: formatMoney(invoice.total, invoice.currency), bold: true },
  ];

  summaryRows.forEach((row, i) => {
    const isTotal = row.bold;
    const rowY = y + i * 7.5;

    if (isTotal) {
      doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.roundedRect(totalsX - 4, rowY - 4.5, totalsWidth + 4, 9, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
    } else {
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
    }

    doc.text(row.label, totalsX, rowY + 1);
    doc.text(row.value, pageWidth - margin, rowY + 1, { align: 'right' });
  });

  // 7. Payment Info / Status Box (Left aligned, same row height as totals)
  const infoBoxWidth = contentWidth - totalsWidth - 8;
  const infoBoxY = y - 2;

  if (invoice.status === 'paid') {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 25, 2, 2, 'F');
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 25, 2, 2, 'S');

    doc.setTextColor(5, 150, 105); // emerald-600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENT CONFIRMATION', margin + 4, infoBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    const paidDate = invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.issueDate);
    doc.text(`Paid in full on: ${paidDate}`, margin + 4, infoBoxY + 11);
    if (invoice.paymentMethodDescription) {
      doc.text(`Method: ${invoice.paymentMethodDescription}`, margin + 4, infoBoxY + 15.5);
    }
    if (invoice.transactionReference) {
      doc.text(`Reference: ${invoice.transactionReference}`, margin + 4, infoBoxY + 20);
    }
  } else {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 28, 2, 2, 'F');
    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 28, 2, 2, 'S');

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BANK TRANSFER & PAYMENT INSTRUCTIONS', margin + 4, infoBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text('Bank: Bank of Ireland (College Green, Dublin)', margin + 4, infoBoxY + 10.5);
    doc.text('Account Name: Worldwide Pro Hospitality Solutions Ltd', margin + 4, infoBoxY + 14.5);
    doc.text('IBAN: IE29 BOFI 9000 1712 3456 78  |  BIC: BOFIIE2D', margin + 4, infoBoxY + 18.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Payment Reference: ${invoice.invoiceNumber}`, margin + 4, infoBoxY + 23);
  }

  // 8. Footer Legal & Support
  const footerY = 270;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text(
    `Thank you for managing your restaurant with ${APP_CONFIG.appName}. This invoice was electronically generated and is legally binding.`,
    margin,
    footerY + 5
  );
  doc.text(
    `${APP_CONFIG.companyName} Hospitality Solutions Ltd. Registered in Ireland #682910. Questions? Contact billing@wordwide.pro.`,
    margin,
    footerY + 9
  );

  doc.text(`Page 1 of 1`, pageWidth - margin, footerY + 9, { align: 'right' });

  // Download if requested
  if (options.autoDownload && typeof window !== 'undefined') {
    const filename = `DineMaster-Pro-Invoice-${invoice.invoiceNumber}.pdf`;
    doc.save(filename);
  }

  return doc;
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatMoney(amount: number, currency = 'EUR'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${(amount || 0).toFixed(2)}`;
}
