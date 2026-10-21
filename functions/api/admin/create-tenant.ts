import { jsonResponse, errorResponse } from '../../lib/response';
import {
  saveFirestoreDocRest,
  verifyAuthToken,
  createUserInAuth,
  lookupUserByEmail,
  updateUserPasswordInAuth,
  getFirestoreDocRest,
  queryFirestoreDocsRest,
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

    const callerEmail = (authCheck.email || '').trim().toLowerCase();
    const callerData = await getFirestoreDocRest('users', authCheck.uid, env, token);
    const isSuperAdmin =
      callerEmail === 'pcristo35@gmail.com' ||
      (callerData && (callerData.role === 'super_admin' || callerData.role === 'superadmin') && !callerData.restaurantId);

    if (!isSuperAdmin) {
      return errorResponse('Forbidden: Only Super Administrators can create restaurant tenants.', 403);
    }

    const { 
      name, 
      ownerEmail, 
      ownerName, 
      ownerPassword,
      ownerUid: providedOwnerUid,
      onlyLookupAuth,
      country, 
      currency, 
      timezone, 
      language, 
      planId, 
      status, 
      slug 
    } = body;

    if (onlyLookupAuth && ownerEmail) {
      const cleanEmail = ownerEmail.trim().toLowerCase();
      const lookup = await lookupUserByEmail(cleanEmail, env);
      if (lookup.success && lookup.user) {
        if (ownerPassword) {
          await updateUserPasswordInAuth(lookup.user.localId, ownerPassword, env);
        }
        return jsonResponse({ success: true, ownerUid: lookup.user.localId });
      }
      return errorResponse('User not found', 404);
    }

    if (!name || !name.trim()) {
      return errorResponse('Restaurant name is required', 400);
    }
    if (!ownerEmail || !ownerEmail.trim()) {
      return errorResponse('Owner email is required', 400);
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) || `rest-${Date.now()}`;
    const id = cleanSlug;
    const now = new Date().toISOString();
    const cleanOwnerEmail = ownerEmail.trim().toLowerCase();

    // Prevent cross-restaurant account sharing: check if cleanOwnerEmail already belongs to another restaurant's staff/admin
    if (cleanOwnerEmail !== 'pcristo35@gmail.com') {
      const existingUsers = await queryFirestoreDocsRest('users', 'email', cleanOwnerEmail, env, token);
      const conflictingDoc = existingUsers.find((uData) => {
        const uRest = String(uData.restaurantId || (Array.isArray(uData.restaurantIds) && uData.restaurantIds[0]) || '').toLowerCase();
        return uData.role && uData.role !== 'customer' && uRest && uRest !== id.toLowerCase();
      });
      if (conflictingDoc) {
        return errorResponse('This email is already assigned to a staff or administrator account in another restaurant.', 409);
      }
    }

    let ownerUid = providedOwnerUid || '';

    // Create or link Firebase Auth user for the tenant owner if password is provided
    if (ownerPassword && ownerPassword.trim()) {
      try {
        const authRes = await createUserInAuth(
          cleanOwnerEmail, 
          ownerPassword.trim(), 
          (ownerName || name).trim(), 
          env
        );
        if (authRes.success && authRes.uid) {
          ownerUid = authRes.uid;
        } else {
          console.warn('[CreateTenant] Auth user creation warning:', authRes.error);
        }
      } catch (authErr: any) {
        console.warn('[CreateTenant] Error creating auth user:', authErr?.message);
      }
    } else if (!ownerUid) {
      try {
        const lookup = await lookupUserByEmail(cleanOwnerEmail, env);
        if (lookup.success && lookup.user?.localId) {
          ownerUid = lookup.user.localId;
        }
      } catch (lookupErr) {
        console.warn('[CreateTenant] Lookup by email notice:', lookupErr);
      }
    }

    const newRestaurant = {
      id,
      name: name.trim(),
      slug: cleanSlug,
      ownerId: ownerUid || 'owner',
      ownerEmail: cleanOwnerEmail,
      ownerName: (ownerName || 'Owner').trim(),
      country: country || 'ireland',
      currency: currency || 'EUR',
      timezone: timezone || 'Europe/Dublin',
      language: language || 'en',
      planId: planId || 'professional',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
      branding: {
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
        displayName: name.trim(),
        theme: 'light',
        buttonStyle: 'rounded'
      }
    };

    // 1. If ownerUid exists, save/update the user profile in Firestore
    if (ownerUid) {
      try {
        await saveFirestoreDocRest('users', ownerUid, {
          id: ownerUid,
          authUid: ownerUid,
          email: cleanOwnerEmail,
          name: (ownerName || 'Owner').trim(),
          role: 'restaurant_owner',
          restaurantId: id,
          restaurantIds: [id],
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }, env, token);
      } catch (uErr) {
        console.warn('[CreateTenant] Notice saving user doc in Firestore:', uErr);
      }
    }

    // 2. Save restaurant doc
    const restRes = await saveFirestoreDocRest('restaurants', id, newRestaurant, env, token);
    if (!restRes.success) {
      return errorResponse(restRes.error || 'Failed to create restaurant document', 500);
    }

    // 3. Save main area doc
    const mainAreaId = `area-${id}-main`;
    await saveFirestoreDocRest('areas', mainAreaId, {
      id: mainAreaId,
      restaurantId: id,
      name: 'Main Dining Room',
      order: 1,
      allowOnlineReservations: true,
      bookingMode: 'online'
    }, env, token);

    // 4. Save initial settings doc
    await saveFirestoreDocRest('settings', id, {
      id,
      restaurantId: id,
      name: name.trim(),
      email: cleanOwnerEmail,
      timezone: timezone || 'Europe/Dublin',
      description: `${name.trim()} is pleased to welcome you for an exceptional dining experience.`,
      descriptionEn: `${name.trim()} is pleased to welcome you for an exceptional dining experience.`,
      branding: {
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
        displayName: name.trim(),
        theme: 'light',
        buttonStyle: 'rounded'
      }
    }, env, token);

    return jsonResponse({
      success: true,
      restaurant: newRestaurant,
      ownerUid: ownerUid || undefined,
      message: 'Restaurant tenant and owner account created successfully'
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error creating restaurant', 500);
  }
}
