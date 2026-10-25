import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';
import { Invoice } from '../../../src/types';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { invoiceId } = body;
    console.log('[mark-invoice-paid] invoiceId:', invoiceId);

    if (!invoiceId) {
      console.error('[mark-invoice-paid] Missing invoiceId');
      return errorResponse('invoiceId is required', 400);
    }

    const invoice: Invoice = await getDocById('invoices', invoiceId, env);
    console.log('[mark-invoice-paid] fetched invoice:', invoice);
    if (!invoice) {
      console.error('[mark-invoice-paid] Invoice not found:', invoiceId);
      return errorResponse('Invoice not found', 404);
    }

    const updatedInvoice = {
      ...invoice,
      status: 'paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveFirestoreDocRest('invoices', invoiceId, updatedInvoice, env);

    return jsonResponse({ success: true, message: 'Invoice marked as paid' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to mark invoice as paid', 500);
  }
}
