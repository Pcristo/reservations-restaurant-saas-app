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
  index?: number,
  appName?: string
): string {
  const rawAppName = appName || APP_CONFIG.appName || 'DineMaster Pro';
  const appSlug = rawAppName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'dinemaster_pro';

  const d = date ? new Date(date) : new Date();
  const validD = isNaN(d.getTime()) ? new Date() : d;
  const month = String(validD.getMonth() + 1).padStart(2, '0');
  const year2 = String(validD.getFullYear()).slice(-2);
  const docWord = language === 'en' ? 'invoice' : 'factura';
  const uniqueNum = typeof index === 'number' && index > 0 ? String(index) : String(Math.floor(10 + Math.random() * 90));
  return `${appSlug}_${docWord}${uniqueNum}_${month}_${year2}`;
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
  preferredLang?: 'en' | 'pt',
  appName?: string
): string {
  const raw = String(invoiceNumber || id || '').trim();
  const rawAppName = appName || APP_CONFIG.appName || 'DineMaster Pro';
  const appSlug = rawAppName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'dinemaster_pro';

  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultYear2 = String(now.getFullYear()).slice(-2);

  const isEn = preferredLang === 'en';
  const docWord = isEn ? 'invoice' : 'factura';

  if (!raw) {
    return `${appSlug}_${docWord}42_${defaultMonth}_${defaultYear2}`;
  }

  // If already matches appSlug_docWord...
  const lower = raw.toLowerCase();
  if (lower.startsWith(`${appSlug}_`)) {
    return raw;
  }

  // If matches docWord or invoice/factura with unique number
  const matchNum = lower.match(/(?:invoice|factura)(\d*)[_\-](\d{2})[_\-](\d{2})/i);
  if (matchNum) {
    const num = matchNum[1] || '42';
    const month = matchNum[2];
    const year = matchNum[3];
    return `${appSlug}_${docWord}${num}_${month}_${year}`;
  }

  const matchSimple = lower.match(/(?:invoice|factura)[_\-](\d{2})[_\-](\d{2})/i);
  if (matchSimple) {
    const month = matchSimple[1];
    const year = matchSimple[2];
    return `${appSlug}_${docWord}42_${month}_${year}`;
  }

  return `${appSlug}_${docWord}42_${defaultMonth}_${defaultYear2}`;
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
