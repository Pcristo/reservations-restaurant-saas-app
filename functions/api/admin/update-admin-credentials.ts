import { jsonResponse, errorResponse } from '../../lib/response';
import { 
  saveFirestoreDocRest, 
  verifyAuthToken, 
  createUserInAuth, 
  lookupUserByEmail, 
  updateUserInAuth,
  getFirestoreDocRest,
  queryFirestoreDocsRest
} from '../../lib/firebaseAdmin';

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

    const { 
      restaurantId, 
      ownerEmail, 
      ownerName, 
      password, 
      ownerUid: providedUid 
    } = body;

    if (!restaurantId || !restaurantId.trim()) {
      return errorResponse('Restaurant ID is required', 400);
    }
    if (!ownerEmail || !ownerEmail.trim()) {
      return errorResponse('Admin / Owner email is required', 400);
    }

    const callerEmail = (authCheck.email || '').trim().toLowerCase();
    const callerData = await getFirestoreDocRest('users', authCheck.uid, env, token);
    const isSuperAdmin =
      callerEmail === 'pcristo35@gmail.com' ||
      (callerData && (callerData.role === 'super_admin' || callerData.role === 'superadmin') && !callerData.restaurantId);
    const isThisTenantAdmin =
      callerData &&
      ['admin', 'restaurant_owner', 'restaurant_manager'].includes(callerData.role) &&
      String(callerData.restaurantId || '').toLowerCase() === String(restaurantId).trim().toLowerCase();

    if (!isSuperAdmin && !isThisTenantAdmin) {
      return errorResponse('Forbidden: You do not have permission to update credentials for this restaurant.', 403);
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();
    const cleanName = (ownerName || '').trim() || 'Restaurant Admin';
    let finalUid = (providedUid || '').trim();

    // Prevent cross-restaurant account sharing: check if email already belongs to another restaurant's staff/admin
    if (cleanEmail !== 'pcristo35@gmail.com') {
      const existingUsers = await queryFirestoreDocsRest('users', 'email', cleanEmail, env, token);
      const conflictingDoc = existingUsers.find((uData) => {
        const uRest = String(uData.restaurantId || (Array.isArray(uData.restaurantIds) && uData.restaurantIds[0]) || '').toLowerCase();
        return uData.role && uData.role !== 'customer' && uRest && uRest !== String(restaurantId).trim().toLowerCase();
      });
      if (conflictingDoc) {
        return errorResponse('This email is already assigned to a staff or administrator account in another restaurant.', 409);
      }
    }

    // 1. Look up existing user in Firebase Auth
    const lookup = await lookupUserByEmail(cleanEmail, env);
    const authUser = lookup.success ? lookup.user : null;

    if (authUser?.localId) {
      finalUid = authUser.localId;
      const updates: { password?: string; displayName?: string } = {};
      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return errorResponse('Password must be at least 6 characters long', 400);
        }
        updates.password = password.trim();
      }
      if (cleanName) {
        updates.displayName = cleanName;
      }

      if (Object.keys(updates).length > 0) {
        const updateRes = await updateUserInAuth(finalUid, updates, env);
        if (!updateRes.success) {
          return errorResponse(updateRes.error || 'Failed to update credentials in Auth', 400);
        }
      }
    } else {
      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return errorResponse('Password must be at least 6 characters long', 400);
        }
        const createRes = await createUserInAuth(cleanEmail, password.trim(), cleanName, env);
        if (!createRes.success || !createRes.uid) {
          return errorResponse(createRes.error || 'Failed to create user account in Firebase Auth', 400);
        }
        finalUid = createRes.uid;
      } else {
        finalUid = finalUid || `admin-${Date.now()}`;
      }
    }

    const now = new Date().toISOString();

    // 2. Update or create user document in Firestore `users` collection
    if (finalUid) {
      try {
        await saveFirestoreDocRest('users', finalUid, {
          id: finalUid,
          authUid: finalUid,
          email: cleanEmail,
          name: cleanName,
          role: 'restaurant_owner',
          restaurantId: restaurantId,
          restaurantIds: [restaurantId],
          status: 'active',
          updatedAt: now
        }, env, token);
      } catch (uErr) {
        console.warn('[UpdateAdminCredentials] Warning saving users doc:', uErr);
      }
    }

    // 3. Update restaurant document in Firestore `restaurants` collection
    try {
      await saveFirestoreDocRest('restaurants', restaurantId, {
        ownerEmail: cleanEmail,
        ownerName: cleanName,
        ownerId: finalUid || 'owner',
        updatedAt: now
      }, env, token);
    } catch (rErr) {
      console.warn('[UpdateAdminCredentials] Warning saving restaurant doc:', rErr);
    }

    return jsonResponse({
      success: true,
      ownerUid: finalUid,
      ownerEmail: cleanEmail,
      ownerName: cleanName,
      message: password ? 'Password and credentials updated successfully!' : 'Admin credentials updated successfully!'
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error updating admin credentials', 500);
  }
}
