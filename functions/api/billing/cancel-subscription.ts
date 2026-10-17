import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';
import { RestaurantSubscription } from '../../../src/types';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { restaurantId, reason, actor } = body;

    if (!restaurantId) {
      return errorResponse('restaurantId is required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const subId = `sub-${cleanRestaurantId}`;
    const sub: RestaurantSubscription = await getDocById('subscriptions', subId, env);

    if (!sub) {
      return errorResponse('Subscription not found', 404);
    }

    const now = new Date().toISOString();
    const updatedSub: RestaurantSubscription = {
      ...sub,
      cancelAtPeriodEnd: true,
      cancelledAt: now,
      cancellationReason: reason || 'Requested by restaurant manager',
      updatedAt: now,
    };

    await saveFirestoreDocRest('subscriptions', subId, updatedSub, env);

    // Audit log
    await saveFirestoreDocRest('audit_logs', `log-cancel-${Date.now()}`, {
      restaurantId: cleanRestaurantId,
      action: 'billing.subscription_cancelled',
      userId: actor?.id || 'admin',
      userName: actor?.name || 'Restaurant Manager',
      userEmail: actor?.email || 'manager@restaurant.com',
      details: {
        effectiveDate: sub.currentPeriodEnd,
        reason: reason || 'Not provided',
      },
      createdAt: now,
    }, env);

    return jsonResponse({
      success: true,
      subscription: updatedSub,
      message: `Your subscription has been scheduled for cancellation. You will retain full access until ${new Date(sub.currentPeriodEnd).toLocaleDateString('en-GB')}.`,
    });
  } catch (err: any) {
    console.error('[API /api/billing/cancel-subscription Error]:', err);
    return errorResponse(err?.message || 'Failed to cancel subscription', 500);
  }
}
