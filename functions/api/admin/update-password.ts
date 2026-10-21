import { jsonResponse, errorResponse } from '../../lib/response';
import {
  updateUserPasswordInAuth,
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

    const { uid, newPassword, restaurantId } = body;

    if (!uid || !newPassword) {
      return errorResponse('Missing uid or newPassword', 400);
    }

    if (String(newPassword).length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    if (callerUid !== uid) {
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
        return errorResponse('Forbidden: Only administrators can update staff passwords.', 403);
      }

      if (!isSuperAdmin) {
        const callerRestId = normalizeTenantId(
          callerData?.restaurantId || (Array.isArray(callerData?.restaurantIds) ? callerData.restaurantIds[0] : '')
        );
        const targetData = await getFirestoreDocRest('users', uid, env, token);
        if (!targetData) {
          return errorResponse('Target user not found.', 404);
        }
        if (targetData.role === 'super_admin' || targetData.role === 'superadmin') {
          return errorResponse('Forbidden: Cannot modify Super Admin credentials.', 403);
        }
        const targetRestId = normalizeTenantId(
          targetData.restaurantId || (Array.isArray(targetData.restaurantIds) ? targetData.restaurantIds[0] : '')
        );
        const requestedRestId = normalizeTenantId(restaurantId) || callerRestId;

        if (!targetRestId || targetRestId !== callerRestId || requestedRestId !== callerRestId) {
          return errorResponse('Forbidden: Cannot update password for a user from another restaurant.', 403);
        }
      }
    }

    const res = await updateUserPasswordInAuth(uid, newPassword, env);
    if (!res.success) {
      return errorResponse(res.error || 'Failed to update password', 400);
    }

    return jsonResponse({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error', 500);
  }
}
