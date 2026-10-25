import { jsonResponse, errorResponse } from '../../lib/response';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { restaurantId, restaurantName, description, subject, userEmail, userName } = body;

    const effectiveRestaurantId = restaurantId || 'default-restaurant';
    const requestId = `req-${Date.now()}`;
    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRequest = {
      id: requestId,
      ticketNumber,
      restaurantId: effectiveRestaurantId,
      restaurantName: restaurantName || effectiveRestaurantId,
      userEmail,
      userName,
      description,
      subject: subject || 'Support Request',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveFirestoreDocRest('assistance_requests', requestId, newRequest, env);
    if (!result.success) {
      return errorResponse(result.error || 'Failed to save to Firestore', 500);
    }

    return jsonResponse({ success: true, data: newRequest });
  } catch (err: any) {
    console.error('[API /api/support/create Error]:', err);
    return errorResponse(err?.message || 'Failed to create support request', 500);
  }
}
