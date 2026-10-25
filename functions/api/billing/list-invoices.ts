import { jsonResponse, errorResponse } from '../../lib/response';
import { listFirestoreDocsRest } from '../../lib/firebaseAdmin';

export async function onRequestGet(context: any) {
  try {
    const invoices = await listFirestoreDocsRest('invoices', context.env || {});
    return jsonResponse({ success: true, data: invoices });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to fetch invoices', 500);
  }
}
