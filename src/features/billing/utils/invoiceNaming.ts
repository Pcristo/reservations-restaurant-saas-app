import { APP_CONFIG } from '../../../data/appConfig';

export interface InvoiceNamingOptions {
  appName?: string;
  restaurantName?: string;
  restaurantId?: string;
  date?: string | Date;
  language?: 'en' | 'pt';
  index?: number;
}

/**
 * Normalizes text for clean slug/identifier usage:
 * - strips accents (á -> a, ã -> a, etc.)
 * - converts spaces & dashes to underscores
 * - strips non-alphanumeric chars
 * - removes duplicate underscores and trims underscores
 */
export function sanitizeIdentifier(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generates an invoice number in the format:
 * - If English (en): invoice_{month}_{2 digits for year} (e.g. invoice_10_26)
 * - Otherwise: factura_{month}_{2 digits for year} (e.g. factura_10_26)
 */
export function generateCleanInvoiceNumber(
  date?: string | Date,
  language?: 'en' | 'pt',
  index?: number
): string {
  const d = date ? new Date(date) : new Date();
  const validD = isNaN(d.getTime()) ? new Date() : d;
  const month = String(validD.getMonth() + 1).padStart(2, '0');
  const year2 = String(validD.getFullYear()).slice(-2);
  const docWord = language === 'en' ? 'invoice' : 'factura';
  let num = `${docWord}_${month}_${year2}`;
  if (typeof index === 'number' && index > 1) {
    num += `_${String(index).padStart(2, '0')}`;
  }
  return num;
}

/**
 * Ensures display invoice number is a clean invoice number in the format:
 * - If English (en): invoice_{month}_{year2} (e.g. invoice_10_26)
 * - Otherwise: factura_{month}_{year2} (e.g. factura_10_26)
 * rather than a long filename.
 */
export function getDisplayInvoiceNumber(
  invoiceNumber?: string,
  id?: string,
  preferredLang?: 'en' | 'pt'
): string {
  const raw = String(invoiceNumber || id || '').trim();
  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultYear2 = String(now.getFullYear()).slice(-2);

  const isEn = preferredLang === 'en';

  if (!raw) {
    return isEn ? `invoice_${defaultMonth}_${defaultYear2}` : `factura_${defaultMonth}_${defaultYear2}`;
  }

  const lower = raw.toLowerCase();

  // If preferredLang is explicitly provided, adhere to: if 'en' then invoice, otherwise factura
  if (preferredLang) {
    const docWord = isEn ? 'invoice' : 'factura';
    const exactMatch = lower.match(/^(?:invoice|factura)_(\d{2})_(\d{2})(_\d+)?$/i);
    if (exactMatch) {
      return `${docWord}_${exactMatch[1]}_${exactMatch[2]}${exactMatch[3] || ''}`;
    }
  } else {
    // If no preferredLang given:
    // If string is already invoice_MM_YY, return it; if factura_MM_YY, return it
    if (/^invoice_\d{2}_\d{2}(_\d+)?$/i.test(lower)) {
      return lower;
    }
    if (/^factura_\d{2}_\d{2}(_\d+)?$/i.test(lower)) {
      return lower;
    }
  }

  // Determine doc word: if en -> invoice, otherwise -> factura
  let docWord = 'factura';
  if (preferredLang) {
    docWord = preferredLang === 'en' ? 'invoice' : 'factura';
  } else if (lower.endsWith('_en') || lower.includes('_en_') || (lower.includes('_invoice_') && !lower.includes('_pt'))) {
    docWord = 'invoice';
  } else {
    docWord = 'factura';
  }

  // If it's a long filename string like dinemaster_pro_invoice_bela_italia_10_26_en or dinemaster_pro_factura_bela_italia_10_26_pt
  if (lower.includes('_invoice_') || lower.includes('_factura_')) {
    const parts = lower.split('_');
    const digits = parts.filter(p => /^\d{2,4}$/.test(p));
    if (digits.length >= 2) {
      const rawYear = digits[digits.length - 1];
      const rawMonth = digits[digits.length - 2];
      const year2 = rawYear.length === 4 ? rawYear.slice(-2) : rawYear.padStart(2, '0');
      const month = String(parseInt(rawMonth, 10)).padStart(2, '0');
      return `${docWord}_${month}_${year2}`;
    }
  }

  // If it's INV-2026-001 or INV-2026-10 or similar
  if (lower.startsWith('inv-')) {
    const parts = lower.split('-');
    const yearPart = parts[1];
    const monthPart = parts[2];
    const year2 = yearPart && yearPart.length >= 2 ? yearPart.slice(-2) : defaultYear2;
    let month = defaultMonth;
    if (monthPart && /^\d{1,2}$/.test(monthPart)) {
      const parsedMonth = parseInt(monthPart, 10);
      if (parsedMonth >= 1 && parsedMonth <= 12) {
        month = String(parsedMonth).padStart(2, '0');
      }
    }
    return `${docWord}_${month}_${year2}`;
  }

  // If it has digits matching MM_YY or MM-YY
  const match = lower.match(/(\d{2})[_\-](\d{2})/);
  if (match) {
    return `${docWord}_${match[1]}_${match[2]}`;
  }

  return `${docWord}_${defaultMonth}_${defaultYear2}`;
}

/**
 * Formats invoice filename following the rule:
 * - If pt: {app_name}_factura_{restaurant_name}_{month}_{year2}_pt
 * - If en: {app_name}_invoice_{restaurant_name}_{month}_{year2}_en
 *
 * Example (Portuguese): dinemaster_pro_factura_bela_italia_10_26_pt
 * Example (English):    dinemaster_pro_invoice_bela_italia_10_26_en
 */
export function formatInvoiceName(options: InvoiceNamingOptions = {}): string {
  const rawAppName = options.appName || APP_CONFIG.appName || 'DineMaster Pro';
  const appSlug = sanitizeIdentifier(rawAppName) || 'dinemaster_pro';

  const rawRest = options.restaurantName || options.restaurantId || 'restaurant';
  const restSlug = sanitizeIdentifier(rawRest) || 'restaurant';

  const dateVal = options.date ? new Date(options.date) : new Date();
  const validDate = isNaN(dateVal.getTime()) ? new Date() : dateVal;

  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const year2 = String(validDate.getFullYear()).slice(-2);

  const lang = options.language === 'en' ? 'en' : 'pt';
  const documentWord = lang === 'pt' ? 'factura' : 'invoice';
  const langSuffix = lang === 'pt' ? 'pt' : 'en';

  let name = `${appSlug}_${documentWord}_${restSlug}_${month}_${year2}_${langSuffix}`;

  if (typeof options.index === 'number' && options.index > 0) {
    name += `_${String(options.index).padStart(2, '0')}`;
  }

  return name;
}

/**
 * Returns the PDF download filename for an invoice:
 * - PT: {app_name}_factura_{restaurant_name}_{month}_{year2}_pt.pdf
 * - EN: {app_name}_invoice_{restaurant_name}_{month}_{year2}_en.pdf
 */
export function getInvoicePdfFilename(
  invoice: {
    invoiceNumber?: string;
    restaurantName?: string;
    restaurantLegalName?: string;
    restaurantId?: string;
    issueDate?: string;
    createdAt?: string;
    language?: 'en' | 'pt';
  },
  customDate?: string | Date,
  language?: 'en' | 'pt'
): string {
  const chosenLang: 'en' | 'pt' = language || invoice.language || 'pt';
  const rawRest = invoice.restaurantName || invoice.restaurantLegalName || invoice.restaurantId;
  const dateToUse = customDate || invoice.issueDate || invoice.createdAt;

  const formatted = formatInvoiceName({
    restaurantName: rawRest,
    restaurantId: invoice.restaurantId,
    date: dateToUse,
    language: chosenLang,
  });

  return `${formatted}.pdf`;
}
