import { jsonResponse, errorResponse } from '../../lib/response';
import {
  lookupUserByEmail,
  deleteUserFromAuth,
  queryFirestoreDocsRest,
  getFirestoreDocRest,
} from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { email } = body;

    if (!email) {
      return errorResponse('Missing email', 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Security check: NEVER delete an Auth user if they have an active staff/admin/owner record in Firestore
    const existingUsers = await queryFirestoreDocsRest('users', 'email', cleanEmail, env);
    const hasActiveUser = existingUsers.some((d) => d.role !== 'customer' || d.status === 'active');
    if (hasActiveUser) {
      return errorResponse('Forbidden: This email belongs to an active account and cannot be reset.', 403);
    }

    const existingRestaurants = await queryFirestoreDocsRest('restaurants', 'ownerEmail', cleanEmail, env);
    if (existingRestaurants.length > 0) {
      return errorResponse('Forbidden: This email belongs to a restaurant owner account.', 403);
    }

    const lookup = await lookupUserByEmail(cleanEmail, env);
    if (lookup.success && lookup.user?.localId) {
      const uidDoc = await getFirestoreDocRest('users', lookup.user.localId, env);
      if (uidDoc && uidDoc.role && uidDoc.role !== 'customer') {
        return errorResponse('Forbidden: Cannot delete active staff or admin account.', 403);
      }

      const delRes = await deleteUserFromAuth(lookup.user.localId, env);
      if (!delRes.success) {
        return errorResponse(delRes.error || 'Failed to delete user by email', 400);
      }
    }

    return jsonResponse({ success: true, message: 'Orphaned user checked/deleted' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error', 500);
  }
}
