import { jsonResponse, errorResponse } from '../../lib/response';
import { deleteFirestoreDocRest, queryFirestoreDocsRest } from '../../lib/firebaseAdmin';

export async function handleDelete(context: any) {
  try {
    const url = new URL(context.request.url);
    let invoiceId = url.searchParams.get('id') || url.searchParams.get('invoiceId');
    let restaurantId = url.searchParams.get('restaurantId');

    // Also check JSON body if not present in searchParams
    if (!invoiceId && (context.request.method === 'DELETE' || context.request.method === 'POST')) {
      const body = await context.request.json().catch(() => ({}));
      invoiceId = body.id || body.invoiceId;
      if (!restaurantId) restaurantId = body.restaurantId;
    }

    if (!invoiceId) {
      return errorResponse('Invoice ID (id or invoiceId) is required to delete an invoice', 400);
    }

    const cleanInvoiceId = invoiceId.trim();
    const env = context.env || {};

    // 1. Direct delete by document ID
    await deleteFirestoreDocRest('invoices', cleanInvoiceId, env);

    // 2. Also check if the document ID was stored under the invoiceNumber or vice-versa
    try {
      const byNumber = await queryFirestoreDocsRest('invoices', 'invoiceNumber', cleanInvoiceId, env);
      for (const doc of byNumber) {
        if (doc.id && doc.id !== cleanInvoiceId) {
          await deleteFirestoreDocRest('invoices', doc.id, env);
        }
      }
    } catch (queryErr) {
      console.warn('[delete-invoice] Query by invoiceNumber error:', queryErr);
    }

    return jsonResponse({
      success: true,
      message: `Invoice ${cleanInvoiceId} deleted successfully`,
      id: cleanInvoiceId,
      restaurantId: restaurantId || null
    });
  } catch (err: any) {
    console.error('[API /api/billing/delete-invoice Error]:', err);
    return errorResponse(err?.message || 'Failed to delete invoice', 500);
  }
}

export async function onRequestDelete(context: any) {
  return handleDelete(context);
}

export async function onRequestPost(context: any) {
  return handleDelete(context);
}
