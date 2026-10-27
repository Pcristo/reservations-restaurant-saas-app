import { jsonResponse, errorResponse } from '../../lib/response';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { 
      restaurantId, 
      restaurantName, 
      restaurantLegalName,
      restaurantAddress,
      restaurantCity,
      restaurantCountry,
      restaurantPostalCode,
      restaurantVatNumber,
      customerEmail, 
      amount, 
      taxRate = 23,
      taxAmount: customTaxAmount,
      total: customTotal,
      currency = 'EUR', 
      items, 
      lineItems,
      issueDate, 
      dueDate, 
      status = 'unpaid', 
      notes,
      planId = 'professional',
      planName = 'Professional',
      billingPeriod,
      language = 'pt',
      invoiceNumber: customInvoiceNumber
    } = body;

    if (!restaurantId || amount === undefined || amount === null) {
      return errorResponse('restaurantId and amount are required', 400);
    }

    const cleanRestId = String(restaurantId).toLowerCase().trim();
    const rawRest = restaurantName || cleanRestId;
    const cleanRest = String(rawRest)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const dateVal = issueDate ? new Date(issueDate) : new Date();
    const validDate = isNaN(dateVal.getTime()) ? new Date() : dateVal;
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const year2 = String(validDate.getFullYear()).slice(-2);

    const docWord = language === 'pt' ? 'factura' : 'invoice';
    const defaultInvoiceNumber = `${docWord}_${month}_${year2}`;
    const invoiceId = customInvoiceNumber || defaultInvoiceNumber;
    const subtotal = Number(amount) || 0;
    const rate = typeof taxRate === 'number' ? taxRate : 23;
    const tax = customTaxAmount !== undefined ? Number(customTaxAmount) : Math.round(subtotal * (rate / 100) * 100) / 100;
    const total = customTotal !== undefined ? Number(customTotal) : Math.round((subtotal + tax) * 100) / 100;

    const resolvedLineItems = lineItems && lineItems.length > 0 ? lineItems : [
      {
        id: `li-${Date.now()}`,
        description: notes || `${planName} Subscription Package`,
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal,
        periodStart: billingPeriod,
      }
    ];

    const newInvoice = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      restaurantId: cleanRestId,
      restaurantName: restaurantName || cleanRestId,
      restaurantLegalName: restaurantLegalName || restaurantName || cleanRestId,
      restaurantAddress: restaurantAddress || '',
      restaurantCity: restaurantCity || '',
      restaurantCountry: restaurantCountry || 'Portugal',
      restaurantPostalCode: restaurantPostalCode || '',
      restaurantVatNumber: restaurantVatNumber || '',
      customerEmail: customerEmail || 'billing@restaurant.com',
      planId,
      planName,
      billingPeriod: billingPeriod || `${new Date().toLocaleDateString('pt-PT')} – ${dueDate || new Date().toLocaleDateString('pt-PT')}`,
      subtotal,
      taxRate: rate,
      taxAmount: tax,
      tax, // backwards compat
      total,
      currency,
      status,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lineItems: resolvedLineItems,
      items: items || resolvedLineItems, // backwards compat
      notes: notes || '',
      language: language === 'en' ? 'en' : 'pt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveFirestoreDocRest('invoices', invoiceId, newInvoice, env);

    return jsonResponse({
      success: true,
      message: 'Invoice created successfully',
      invoice: newInvoice
    });
  } catch (err: any) {
    console.error('[create-invoice] Error:', err);
    return errorResponse(err?.message || 'Failed to create invoice', 500);
  }
}
