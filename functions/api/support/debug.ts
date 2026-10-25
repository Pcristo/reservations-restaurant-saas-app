import { jsonResponse, errorResponse } from '../../lib/response';
import { listFirestoreDocsRest } from '../../lib/firebaseAdmin';

export async function onRequestGet(context: any) {
  try {
    const env = context.env || {};
    const [assistance, support] = await Promise.all([
      listFirestoreDocsRest('assistance_requests', env),
      listFirestoreDocsRest('support_requests', env)
    ]);
    return jsonResponse({ success: true, data: { assistance, support } });
  } catch (err: any) {
    return errorResponse(err?.message, 500);
  }
}
