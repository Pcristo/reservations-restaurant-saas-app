import { jsonResponse, errorResponse } from '../../lib/response';
import {
  deleteUserFromAuth,
  lookupUserByEmail,
  verifyAuthToken,
  getFirestoreDocRest,
  queryFirestoreDocsRest,
} from '../../lib/firebaseAdmin';

const normalizeTenantId = (val?: string | null): string => {
  if (!val || typeof val !== 'string') return '';
  const clean = val.trim().toLowerCase();
  if (clean === 'bella-italia') return 'bela-italia';
  return clean;
};

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return errorResponse('Unauthorized: Missing authentication token.', 401);
    }

    const authCheck = await verifyAuthToken(token, env);
    if (!authCheck.success || !authCheck.uid) {
      return errorResponse(authCheck.error || 'Unauthorized', 401);
    }

    const callerUid = authCheck.uid;
    const callerEmail = (authCheck.email || '').trim().toLowerCase();

    let callerData = await getFirestoreDocRest('users', callerUid, env, token);
    if (!callerData && callerEmail) {
      const byEmail = await queryFirestoreDocsRest('users', 'email', callerEmail, env, token);
      callerData = byEmail.find((d) => d.role && d.role !== 'customer') || byEmail[0] || null;
    }

    const isSuperAdmin =
      callerEmail === 'pcristo35@gmail.com' ||
      (callerData &&
        (callerData.role === 'super_admin' || callerData.role === 'superadmin') &&
        !callerData.restaurantId);

    const isRestaurantAdmin =
      callerData &&
      ['admin', 'restaurant_owner', 'restaurant_manager'].includes(callerData.role) &&
      callerData.status !== 'inactive' &&
      callerData.status !== 'suspended' &&
      Boolean(callerData.restaurantId || (Array.isArray(callerData.restaurantIds) && callerData.restaurantIds.length > 0));

    if (!isSuperAdmin && !isRestaurantAdmin) {
      return errorResponse('Forbidden: Insufficient permissions to delete user.', 403);
    }

    const { uid, email, restaurantId, isCustomerDelete } = body;

    if (!uid && !email) {
      return errorResponse('Missing uid or email', 400);
    }

    const callerRestId = normalizeTenantId(
      callerData?.restaurantId || (Array.isArray(callerData?.restaurantIds) ? callerData.restaurantIds[0] : '')
    );
    const requestedRestId = normalizeTenantId(restaurantId) || callerRestId;

    if (!isSuperAdmin && callerRestId !== requestedRestId) {
      return errorResponse('Forbidden: Cannot delete users belonging to another restaurant.', 403);
    }

    let targetUid = uid || '';
    if (!targetUid && email) {
      const lookup = await lookupUserByEmail(String(email).trim().toLowerCase(), env);
      if (lookup.success && lookup.user?.localId) {
        targetUid = lookup.user.localId;
      } else {
        return jsonResponse({ success: true, message: 'User already not in Auth' });
      }
    }

    if (targetUid) {
      const targetData = await getFirestoreDocRest('users', targetUid, env, token);
      if (targetData) {
        if (targetData.role === 'super_admin' || targetData.role === 'superadmin') {
          return errorResponse('Forbidden: Cannot delete Super Admin account.', 403);
        }
        if (isCustomerDelete && targetData.role && targetData.role !== 'customer') {
          return errorResponse('Forbidden: Target user is a staff/admin account, not a customer.', 403);
        }
        if (!isSuperAdmin) {
          const targetRestId = normalizeTenantId(
            targetData.restaurantId || (Array.isArray(targetData.restaurantIds) ? targetData.restaurantIds[0] : '')
          );
          if (targetData.role !== 'customer' && targetRestId !== callerRestId) {
            return errorResponse('Forbidden: Target user belongs to a different restaurant.', 403);
          }
        }
      }

      const delRes = await deleteUserFromAuth(targetUid, env);
      if (!delRes.success) {
        return errorResponse(delRes.error || 'Failed to delete user from Auth', 400);
      }
    }

    return jsonResponse({ success: true, message: 'User deleted from Firebase Auth' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error', 500);
  }
}
