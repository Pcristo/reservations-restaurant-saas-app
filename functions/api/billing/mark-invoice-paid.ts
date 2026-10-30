import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';
import { Invoice } from '../../../src/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../src/firebase';

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

    const now = new Date().toISOString();

    // 1. Try updating directly via client Firestore SDK (bypasses REST endpoint credential issues in preview)
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'paid',
        paidAt: now,
        updatedAt: now,
      });
      return jsonResponse({ success: true, message: 'Invoice marked as paid via client SDK' });
    } catch (clientErr) {
      console.warn('[mark-invoice-paid] Client SDK update failed, trying REST fallback:', clientErr);
    }

    // 2. REST fallback
    const invoice: Invoice = await getDocById('invoices', invoiceId, env);
    if (!invoice) {
      return errorResponse('Invoice not found', 404);
    }

    const updatedInvoice = {
      ...invoice,
      status: 'paid',
      paidAt: now,
      updatedAt: now,
    };

    await saveFirestoreDocRest('invoices', invoiceId, updatedInvoice, env);

    return jsonResponse({ success: true, message: 'Invoice marked as paid' });
  } catch (err: any) {
    console.error('[mark-invoice-paid] Error:', err);
    return errorResponse(err?.message || 'Failed to mark invoice as paid', 500);
  }
}
