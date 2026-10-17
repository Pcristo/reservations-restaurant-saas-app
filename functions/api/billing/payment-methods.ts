import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocsByRestaurantId, getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest, deleteFirestoreDocRest } from '../../lib/firebaseAdmin';
import { SavedPaymentMethod, CardBrand } from '../../../src/types';

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const restaurantId = url.searchParams.get('restaurantId');
    if (!restaurantId) {
      return errorResponse('restaurantId is required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const methods = await getDocsByRestaurantId('payment_methods', cleanRestaurantId, context.env || {});
    return jsonResponse({ success: true, paymentMethods: methods });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to list payment methods', 500);
  }
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { 
      restaurantId, 
      cardNumber, 
      cardholderName, 
      expMonth, 
      expYear, 
      brand: providedBrand,
      isDefault = false,
      actor 
    } = body;

    if (!restaurantId) {
      return errorResponse('restaurantId is required', 400);
    }
    if (!cardholderName || !cardholderName.trim()) {
      return errorResponse('Cardholder name is required', 400);
    }

    const cleanNumber = (cardNumber || '').replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return errorResponse('Invalid card number length', 400);
    }

    // Determine brand
    let brand: CardBrand = 'generic';
    if (providedBrand) {
      brand = providedBrand;
    } else if (/^4/.test(cleanNumber)) {
      brand = 'visa';
    } else if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) {
      brand = 'mastercard';
    } else if (/^3[47]/.test(cleanNumber)) {
      brand = 'amex';
    } else if (/^6(?:011|5)/.test(cleanNumber)) {
      brand = 'discover';
    }

    const last4 = cleanNumber.slice(-4);
    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const now = new Date().toISOString();

    const id = `pm-${cleanRestaurantId}-${Date.now()}`;

    // If setting as default, clear other defaults
    if (isDefault) {
      const existing = await getDocsByRestaurantId('payment_methods', cleanRestaurantId, env);
      for (const m of existing) {
        if (m.isDefault) {
          await saveFirestoreDocRest('payment_methods', m.id, { ...m, isDefault: false }, env);
        }
      }
    }

    const newMethod: SavedPaymentMethod = {
      id,
      restaurantId: cleanRestaurantId,
      brand,
      last4,
      expMonth: Number(expMonth || 12),
      expYear: Number(expYear || 2028),
      cardholderName: cardholderName.trim(),
      isDefault: Boolean(isDefault),
      createdAt: now,
    };

    // Note: NEVER store cleanNumber or CVV in Firestore!
    await saveFirestoreDocRest('payment_methods', id, newMethod, env);

    // Audit log
    await saveFirestoreDocRest('audit_logs', `log-pm-${Date.now()}`, {
      restaurantId: cleanRestaurantId,
      action: 'billing.payment_method_added',
      userId: actor?.id || 'admin',
      userName: actor?.name || 'Restaurant Manager',
      userEmail: actor?.email || 'manager@restaurant.com',
      details: {
        brand,
        last4,
      },
      createdAt: now,
    }, env);

    return jsonResponse({
      success: true,
      paymentMethod: newMethod,
      message: 'Payment method added securely!',
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to add payment method', 500);
  }
}

export async function onRequestDelete(context: any) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const restaurantId = url.searchParams.get('restaurantId');

    if (!id || !restaurantId) {
      return errorResponse('id and restaurantId are required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const pm = await getDocById('payment_methods', id, context.env || {});

    if (pm && pm.restaurantId !== cleanRestaurantId) {
      return errorResponse('Unauthorized: Card does not belong to this restaurant', 403);
    }

    await deleteFirestoreDocRest('payment_methods', id, context.env || {});

    return jsonResponse({
      success: true,
      message: 'Payment method removed.',
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to delete payment method', 500);
  }
}
