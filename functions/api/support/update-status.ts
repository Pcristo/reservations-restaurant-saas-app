import { jsonResponse, errorResponse } from '../../lib/response';
import { saveFirestoreDocRest, getFirestoreDocRest } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { requestId, status, resolutionSummary } = body;

    if (!requestId || !status) {
      return errorResponse('requestId and status are required', 400);
    }

    const request = await getFirestoreDocRest('assistance_requests', requestId, env);
    if (!request) {
      return errorResponse('Request not found', 404);
    }

    const updatedRequest = {
      ...request,
      status,
      resolutionSummary: resolutionSummary || request.resolutionSummary,
      updatedAt: new Date().toISOString(),
    };

    await saveFirestoreDocRest('assistance_requests', requestId, updatedRequest, env);

    return jsonResponse({ success: true, data: updatedRequest });
  } catch (err: any) {
    console.error('[API /api/support/update-status Error]:', err);
    return errorResponse(err?.message || 'Failed to update support request', 500);
  }
}
