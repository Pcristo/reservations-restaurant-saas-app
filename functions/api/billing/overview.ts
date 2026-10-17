import { jsonResponse, errorResponse } from '../../lib/response';
import { getOrInitializeBilling } from '../../lib/billingServiceBackend';

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const restaurantId = url.searchParams.get('restaurantId') || url.searchParams.get('slug') || 'dinemaster-bistro';

    if (!restaurantId) {
      return errorResponse('Restaurant ID is required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const overview = await getOrInitializeBilling(cleanRestaurantId, context.env || {});

    return jsonResponse({
      success: true,
      data: overview,
    });
  } catch (err: any) {
    console.error('[API /api/billing/overview Error]:', err);
    return errorResponse(err?.message || 'Failed to fetch billing overview', 500);
  }
}
