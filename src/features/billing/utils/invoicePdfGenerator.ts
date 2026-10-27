import { jsPDF } from 'jspdf';
import { Invoice } from '../../../types';
import { APP_CONFIG } from '../../../data/appConfig';
import { getInvoicePdfFilename, formatInvoiceName, getDisplayInvoiceNumber, generateCleanInvoiceNumber } from './invoiceNaming';

export { getInvoicePdfFilename, formatInvoiceName, getDisplayInvoiceNumber, generateCleanInvoiceNumber };

export interface GenerateInvoicePdfOptions {
  autoDownload?: boolean;
  language?: 'en' | 'pt';
}

/**
 * Generates a high-quality, print-ready vector PDF for a DineMaster Pro invoice in English or Portuguese (PT/PT).
 */
export function generateInvoicePdf(
  invoice: Invoice,
  options: GenerateInvoicePdfOptions = { autoDownload: true }
): jsPDF {
  const lang: 'en' | 'pt' = options.language || invoice.language || 'pt';
  const isPt = lang === 'pt';

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

  // Status colors & localized labels
  const statusConfigs: Record<string, { bg: number[]; text: number[]; labelEn: string; labelPt: string }> = {
    paid: { bg: [236, 253, 245], text: [5, 150, 105], labelEn: 'PAID', labelPt: 'LIQUIDADO' },
    unpaid: { bg: [254, 243, 199], text: [217, 119, 6], labelEn: 'PAYMENT DUE', labelPt: 'A PAGAR' },
    pending: { bg: [238, 242, 255], text: [79, 70, 229], labelEn: 'PENDING', labelPt: 'A PROCESSAR' },
    overdue: { bg: [254, 226, 226], text: [220, 38, 38], labelEn: 'OVERDUE', labelPt: 'VENCIDO' },
    void: { bg: [241, 245, 249], text: [100, 116, 139], labelEn: 'VOID', labelPt: 'ANULADO' },
  };

  const statusConfig = statusConfigs[invoice.status] || statusConfigs.unpaid;
  const statusLabel = isPt ? statusConfig.labelPt : statusConfig.labelEn;

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
  doc.text(
    isPt ? 'Plataforma de Gestao & Reservas de Restauracao' : 'Restaurant Reservation & Management Platform',
    margin + 15,
    y + 9
  );

  // Right-aligned Invoice Title & Number
  const documentTitle = isPt 
    ? (invoice.status === 'paid' ? 'FATURA-RECIBO' : 'FATURA')
    : (invoice.status === 'paid' ? 'RECEIPT' : 'INVOICE');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(documentTitle, pageWidth - margin, y + 3, { align: 'right' });

  const displayNum = getDisplayInvoiceNumber(invoice.invoiceNumber, invoice.id, lang);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(displayNum, pageWidth - margin, y + 9, { align: 'right' });

  // Status Badge
  const badgeWidth = isPt ? 36 : 32;
  const badgeHeight = 7;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = y + 12;

  doc.setFillColor(statusConfig.bg[0], statusConfig.bg[1], statusConfig.bg[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(statusConfig.text[0], statusConfig.text[1], statusConfig.text[2]);
  doc.text(statusLabel, badgeX + badgeWidth / 2, badgeY + 4.8, { align: 'center' });

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
  doc.text(isPt ? 'EMITIDO POR' : 'ISSUED BY', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`${APP_CONFIG.companyName} Hospitality Solutions Ltd`, margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(APP_CONFIG.address, margin, y + 9.5);
  doc.text('Dublin 2, D02 CH66, Ireland', margin, y + 14);
  doc.text(`${isPt ? 'NIF / VAT ID' : 'VAT ID'}: IE 3849120H | Reg: #682910`, margin, y + 18.5);
  doc.text(`${isPt ? 'Faturacao' : 'Billing'}: billing@wordwide.pro`, margin, y + 23);

  // Customer / Restaurant Details
  const customerColX = margin + colWidth + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text(isPt ? 'FATURADO A' : 'BILLED TO', customerColX, y);

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
    doc.text(`${isPt ? 'NIF' : 'VAT ID'}: ${invoice.restaurantVatNumber}`, customerColX, custY);
    custY += 4.5;
  }
  doc.text(`${isPt ? 'Contacto' : 'Contact'}: ${invoice.customerEmail}`, customerColX, custY);

  // 4. Meta Details Box (Dates, Terms, Period)
  y = 78;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S');

  const metaCols = [
    { label: isPt ? 'DATA DE EMISSAO' : 'INVOICE DATE', value: formatDate(invoice.issueDate, lang) },
    { label: isPt ? 'VENCIMENTO' : 'PAYMENT DUE', value: formatDate(invoice.dueDate, lang) },
    { label: isPt ? 'PERIODO' : 'BILLING PERIOD', value: invoice.billingPeriod || (isPt ? 'Mes Corrente' : 'Current Month') },
    { label: isPt ? 'PLANO' : 'PLAN', value: getLocalizedPlanLabel(invoice.planName || 'Professional', isPt) },
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
  doc.text(isPt ? 'DESCRICAO & PERIODO' : 'DESCRIPTION & PERIOD', colDesc, y + 5.5);
  doc.text(isPt ? 'QTD' : 'QTY', colQty, y + 5.5, { align: 'center' });
  doc.text(isPt ? 'PRECO UNIT.' : 'UNIT PRICE', colPrice, y + 5.5, { align: 'right' });
  doc.text(isPt ? 'IVA' : 'VAT', colTax, y + 5.5, { align: 'right' });
  doc.text(isPt ? 'TOTAL' : 'AMOUNT', colTotal, y + 5.5, { align: 'right' });

  // Rows
  y += 8;
  const defaultLineDesc = isPt
    ? `Subscricao Plano ${getLocalizedPlanLabel(invoice.planName, true)} - ${APP_CONFIG.appName}`
    : `${APP_CONFIG.appName} ${invoice.planName} Subscription`;

  const items = invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [
    {
      id: 'default-line',
      description: defaultLineDesc,
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
      doc.text(`${isPt ? 'Periodo' : 'Period'}: ${item.periodStart || invoice.billingPeriod}`, colDesc, y + 9.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(String(item.quantity || 1), colQty, y + 6, { align: 'center' });
    doc.text(formatMoney(item.unitPrice, invoice.currency, isPt), colPrice, y + 6, { align: 'right' });
    doc.text(`${invoice.taxRate || 23}%`, colTax, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(item.amount, invoice.currency, isPt), colTotal, y + 6, { align: 'right' });

    y += 12;
  });

  // Table bottom border
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // 6. Summary Totals Box (Right aligned)
  y += 6;
  const totalsWidth = 76;
  const totalsX = pageWidth - margin - totalsWidth;

  const summaryRows = [
    { 
      label: isPt ? 'Incidencia / Subtotal (s/ IVA)' : 'Subtotal (excl. VAT)', 
      value: formatMoney(invoice.subtotal, invoice.currency, isPt), 
      bold: false 
    },
    { 
      label: isPt ? `IVA (${invoice.taxRate || 23}%)` : `VAT / Tax (${invoice.taxRate || 23}%)`, 
      value: formatMoney(invoice.taxAmount, invoice.currency, isPt), 
      bold: false 
    },
    { 
      label: isPt ? (invoice.status === 'paid' ? 'Total Liquidado' : 'Total a Pagar') : (invoice.status === 'paid' ? 'Total Paid' : 'Total Payable'), 
      value: formatMoney(invoice.total, invoice.currency, isPt), 
      bold: true 
    },
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
    doc.text(isPt ? 'COMPROVATIVO DE LIQUIDACAO' : 'PAYMENT CONFIRMATION', margin + 4, infoBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    const paidDate = invoice.paidAt ? formatDate(invoice.paidAt, lang) : formatDate(invoice.issueDate, lang);
    doc.text(isPt ? `Liquidado na totalidade em: ${paidDate}` : `Paid in full on: ${paidDate}`, margin + 4, infoBoxY + 11);
    if (invoice.paymentMethodDescription) {
      doc.text(`${isPt ? 'Metodo' : 'Method'}: ${invoice.paymentMethodDescription}`, margin + 4, infoBoxY + 15.5);
    }
    if (invoice.transactionReference) {
      doc.text(`${isPt ? 'Referencia' : 'Reference'}: ${invoice.transactionReference}`, margin + 4, infoBoxY + 20);
    }
  } else {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 28, 2, 2, 'F');
    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.roundedRect(margin, infoBoxY, infoBoxWidth, 28, 2, 2, 'S');

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(isPt ? 'DADOS DE PAGAMENTO & TRANSFERENCIA BANCARIA' : 'BANK TRANSFER & PAYMENT INSTRUCTIONS', margin + 4, infoBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(isPt ? 'Banco: Millennium BCP / Bank of Ireland' : 'Bank: Bank of Ireland (College Green, Dublin)', margin + 4, infoBoxY + 10.5);
    doc.text(isPt ? 'Titular: Worldwide Pro Hospitality Solutions Ltd' : 'Account Name: Worldwide Pro Hospitality Solutions Ltd', margin + 4, infoBoxY + 14.5);
    doc.text(isPt ? 'IBAN: PT50 0033 0000 1712 3456 7890 1  |  BIC: BCPTPTLX' : 'IBAN: IE29 BOFI 9000 1712 3456 78  |  BIC: BOFIIE2D', margin + 4, infoBoxY + 18.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${isPt ? 'Referencia de Pagamento' : 'Payment Reference'}: ${displayNum}`, margin + 4, infoBoxY + 23);
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
    isPt 
      ? `Agradecemos a preferencia na gestao do seu restaurante com o ${APP_CONFIG.appName}. Fatura processada por computador nos termos legais.`
      : `Thank you for managing your restaurant with ${APP_CONFIG.appName}. This invoice was electronically generated and is legally binding.`,
    margin,
    footerY + 5
  );
  doc.text(
    isPt 
      ? `${APP_CONFIG.companyName} Hospitality Solutions Ltd. NIF/VAT: IE 3849120H. Duvidas? Contacte billing@wordwide.pro.`
      : `${APP_CONFIG.companyName} Hospitality Solutions Ltd. Registered in Ireland #682910. Questions? Contact billing@wordwide.pro.`,
    margin,
    footerY + 9
  );

  doc.text(isPt ? 'Pagina 1 de 1' : 'Page 1 of 1', pageWidth - margin, footerY + 9, { align: 'right' });

  // Download if requested following format: {app_name}_factura_{restaurant_name}_{month}_{year2}_pt.pdf or {app_name}_invoice_{restaurant_name}_{month}_{year2}_en.pdf
  if (options.autoDownload && typeof window !== 'undefined') {
    const filename = getInvoicePdfFilename(invoice, undefined, lang);
    doc.save(filename);
  }

  return doc;
}

function formatDate(isoStr?: string, lang: 'en' | 'pt' = 'pt'): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (lang === 'pt') {
      return d.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatMoney(amount: number, currency = 'EUR', isPt = false): string {
  const formattedNumber = (amount || 0).toFixed(2);
  if (currency === 'EUR') {
    return isPt ? `${formattedNumber.replace('.', ',')} €` : `€${formattedNumber}`;
  }
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${formattedNumber}`;
}

function getLocalizedPlanLabel(planName?: string, isPt = false): string {
  if (!planName) return isPt ? 'Profissional' : 'Professional';
  const lower = planName.toLowerCase();
  if (isPt) {
    if (lower.includes('starter') || lower.includes('iniciante')) return 'Iniciante';
    if (lower.includes('pro')) return 'Profissional';
    if (lower.includes('business') || lower.includes('empresarial')) return 'Empresarial';
    if (lower.includes('enterprise')) return 'Enterprise';
    if (lower.includes('trial') || lower.includes('experimental')) return 'Experimental';
  } else {
    if (lower.includes('iniciante')) return 'Starter';
    if (lower.includes('profissional')) return 'Professional';
    if (lower.includes('empresarial')) return 'Business';
  }
  return planName;
}
