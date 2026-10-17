import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';
import { RestaurantSubscription } from '../../../src/types';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { restaurantId, actor } = body;

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
      status: 'active',
      cancelAtPeriodEnd: false,
      cancelledAt: undefined,
      cancellationReason: undefined,
      updatedAt: now,
    };

    await saveFirestoreDocRest('subscriptions', subId, updatedSub, env);

    // Audit log
    await saveFirestoreDocRest('audit_logs', `log-reactivate-${Date.now()}`, {
      restaurantId: cleanRestaurantId,
      action: 'billing.subscription_reactivated',
      userId: actor?.id || 'admin',
      userName: actor?.name || 'Restaurant Manager',
      userEmail: actor?.email || 'manager@restaurant.com',
      details: {
        planId: sub.planId,
      },
      createdAt: now,
    }, env);

    return jsonResponse({
      success: true,
      subscription: updatedSub,
      message: 'Subscription has been successfully reactivated! Automatic renewal is restored.',
    });
  } catch (err: any) {
    console.error('[API /api/billing/reactivate-subscription Error]:', err);
    return errorResponse(err?.message || 'Failed to reactivate subscription', 500);
  }
}
