import { jsonResponse, errorResponse } from '../../lib/response';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { restaurantId, restaurantName, customerEmail, amount, currency = 'EUR', items, issueDate, dueDate, status = 'unpaid', notes } = body;

    if (!restaurantId || !amount) {
      return errorResponse('restaurantId and amount are required', 400);
    }

    const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = Number(amount);
    const tax = Math.round(subtotal * 0.23 * 100) / 100; // 23% VAT default
    const total = Math.round((subtotal + tax) * 100) / 100;

    const newInvoice = {
      id: invoiceId,
      restaurantId,
      restaurantName: restaurantName || restaurantId,
      customerEmail: customerEmail || 'billing@restaurant.com',
      subtotal,
      tax,
      total,
      currency,
      status,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: items || [{ description: 'Manual Service / Subscription Invoice', quantity: 1, unitPrice: subtotal, total: subtotal }],
      notes: notes || 'Manual invoice created by Super Admin',
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
