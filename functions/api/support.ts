import { verifyIdToken, firestoreGet, firestoreSet, firestorePatch, firestoreDelete, firestoreQuery, FirebaseEnv } from '../lib/firebaseAdmin';

interface Env extends FirebaseEnv {}

const ALLOWED_DURATIONS = [15, 30, 60, 120];
const DEFAULT_SCOPES = [
  'settings',
  'floor_plan',
  'reservations_config',
  'email_notifications',
  'booking_page',
  'domains',
];

async function writeSupportAuditLog(
  env: Env,
  entry: {
    restaurantId: string;
    restaurantName?: string;
    restaurantSlug?: string;
    requestId?: string;
    sessionId?: string;
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    resource: string;
    reason?: string;
    details?: Record<string, unknown>;
    result: 'success' | 'failure';
  }
) {
  const id = `saudit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  await firestoreSet(env, 'support_audit_logs', id, {
    id,
    ...entry,
    timestamp,
  });
  await firestoreSet(env, 'audit_logs', id, {
    id,
    actorId: entry.actorId,
    actorEmail: entry.actorEmail,
    action: entry.action,
    targetType: 'support',
    targetId: entry.sessionId || entry.requestId || entry.restaurantId,
    restaurantId: entry.restaurantId,
    details: {
      ...entry.details,
      resource: entry.resource,
      reason: entry.reason,
      result: entry.result,
      restaurantName: entry.restaurantName,
    },
    timestamp,
  });
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let callerUid: string;
    let callerEmail = '';
    try {
      const decoded = await verifyIdToken(idToken, env);
      callerUid = decoded.localId;
      callerEmail = decoded.email || '';
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token', details: err.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const callerDoc = await firestoreGet(env, 'users', callerUid);
    if (!callerDoc) {
      return new Response(JSON.stringify({ error: 'Forbidden: User profile not found' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const callerRole = String(callerDoc.role || '');
    const callerName = String(callerDoc.displayName || callerDoc.name || callerEmail || 'User');
    const callerRestaurantId = String(callerDoc.restaurantId || '');
    const isSuperAdmin = callerRole === 'super_admin';
    const isRestaurantAdmin = ['admin', 'restaurant_owner', 'restaurant_manager'].includes(callerRole);

    const body = (await request.json()) as Record<string, any>;
    const action = String(body.action || '');

    // 1. TOGGLE SUPPORT ACCESS PERMISSION (Restaurant Admin only)
    if (action === 'toggle_permission') {
      const requestedRestaurantId = String(body.restaurantId || callerRestaurantId);
      const allow = Boolean(body.allow);

      if (!isRestaurantAdmin || !callerRestaurantId || callerRestaurantId !== requestedRestaurantId) {
        await writeSupportAuditLog(env, {
          restaurantId: requestedRestaurantId || 'unknown',
          actorId: callerUid,
          actorName: callerName,
          actorEmail: callerEmail,
          actorRole: callerRole,
          action: 'SUPPORT_PERMISSION_CHANGE_DENIED',
          resource: 'restaurant_settings',
          reason: 'Cross-tenant or insufficient role attempt to toggle support permission',
          result: 'failure',
        });
        return new Response(
          JSON.stringify({ error: 'Forbidden: Only authorised administrators of this restaurant may change support permissions.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const restaurant = await firestoreGet(env, 'restaurants', callerRestaurantId);
      if (!restaurant) {
        return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const now = new Date().toISOString();
      const updatedSettings = {
        ...(restaurant.settings || {}),
        supportAccessAllowed: allow,
        supportAccessUpdatedAt: now,
        supportAccessUpdatedBy: callerName,
      };

      const patchData: Record<string, any> = {
        supportAccessAllowed: allow,
        supportAccessUpdatedAt: now,
        supportAccessUpdatedBy: callerName,
        settings: updatedSettings,
      };

      // If turning OFF, immediately revoke any active support session
      let revokedSessionId: string | null = null;
      if (!allow) {
        patchData.activeSupportSessionId = null;
        const activeSession = await firestoreGet(env, 'active_support_sessions', callerRestaurantId);
        if (activeSession) {
          revokedSessionId = String(activeSession.sessionId || activeSession.id || '');
          await firestoreDelete(env, 'active_support_sessions', callerRestaurantId);
          if (revokedSessionId) {
            await firestorePatch(env, 'support_sessions', revokedSessionId, {
              status: 'revoked',
              endedAt: now,
              endedReason: 'revoked_by_restaurant',
              updatedAt: now,
            });
          }
          if (activeSession.requestId) {
            await firestorePatch(env, 'support_requests', String(activeSession.requestId), {
              status: 'Completed'.toLowerCase() === 'completed' ? 'expired' : 'expired',
              activeSessionId: null,
              expiredAt: now,
              updatedAt: now,
            });
          }
          await writeSupportAuditLog(env, {
            restaurantId: callerRestaurantId,
            restaurantName: restaurant.name,
            restaurantSlug: restaurant.slug,
            requestId: activeSession.requestId,
            sessionId: revokedSessionId || undefined,
            actorId: callerUid,
            actorName: callerName,
            actorEmail: callerEmail,
            actorRole: callerRole,
            action: 'SUPPORT_SESSION_REVOKED_BY_RESTAURANT',
            resource: 'support_session',
            reason: 'Restaurant administrator disabled Support Access toggle',
            result: 'success',
          });
        }
      }

      await firestorePatch(env, 'restaurants', callerRestaurantId, patchData);

      await writeSupportAuditLog(env, {
        restaurantId: callerRestaurantId,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: allow ? 'SUPPORT_ACCESS_ENABLED' : 'SUPPORT_ACCESS_DISABLED',
        resource: 'restaurant_settings',
        details: { supportAccessAllowed: allow, revokedSessionId },
        result: 'success',
      });

      return new Response(
        JSON.stringify({
          success: true,
          supportAccessAllowed: allow,
          updatedAt: now,
          revokedSessionId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. CREATE SUPPORT REQUEST (Restaurant Admin only, strictly bound to verified membership)
    if (action === 'create_request') {
      const requestedRestaurantId = String(body.restaurantId || callerRestaurantId);
      if (!isRestaurantAdmin || !callerRestaurantId || callerRestaurantId !== requestedRestaurantId) {
        await writeSupportAuditLog(env, {
          restaurantId: requestedRestaurantId || 'unknown',
          actorId: callerUid,
          actorName: callerName,
          actorEmail: callerEmail,
          actorRole: callerRole,
          action: 'SUPPORT_REQUEST_CREATE_DENIED',
          resource: 'support_request',
          reason: 'Unauthorised role or cross-tenant attempt to submit support request',
          result: 'failure',
        });
        return new Response(
          JSON.stringify({ error: 'Forbidden: You may only submit support requests for your own verified restaurant as an administrator.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const description = String(body.description || '').trim();
      const subject = String(body.subject || '').trim() || 'Configuration & Troubleshooting Assistance';
      const category = String(body.category || 'settings');

      if (description.length < 10) {
        return new Response(
          JSON.stringify({ error: 'Please provide a clear description of the issue (at least 10 characters).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const restaurant = await firestoreGet(env, 'restaurants', callerRestaurantId);
      if (!restaurant) {
        return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check for duplicate open requests for this restaurant
      const existingRequests = await firestoreQuery(env, 'support_requests', [
        { field: 'restaurantId', op: 'EQUAL', value: callerRestaurantId },
      ]);
      const openRequest = existingRequests.find((r: any) =>
        ['pending', 'approved', 'active'].includes(String(r.status))
      );
      if (openRequest) {
        return new Response(
          JSON.stringify({
            error: 'An open support request already exists for your restaurant.',
            existingRequest: openRequest,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const now = new Date().toISOString();
      const requestId = `sreq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const supportPermissionAtRequest = Boolean(
        restaurant.supportAccessAllowed ?? restaurant.settings?.supportAccessAllowed ?? false
      );

      const newRequest = {
        id: requestId,
        restaurantId: callerRestaurantId,
        restaurantName: String(restaurant.name || 'Restaurant'),
        restaurantSlug: String(restaurant.slug || ''),
        requestedByUserId: callerUid,
        requestedByName: callerName,
        requestedByEmail: callerEmail,
        requestedByRole: callerRole,
        category,
        subject: subject.slice(0, 160),
        description: description.slice(0, 2000),
        status: 'pending',
        supportPermissionAtRequest,
        activeSessionId: null,
        createdAt: now,
        updatedAt: now,
      };

      await firestoreSet(env, 'support_requests', requestId, newRequest);

      // Notify Super Admin dashboard
      const notifId = `pnotif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await firestoreSet(env, 'platform_notifications', notifId, {
        id: notifId,
        type: 'support_request',
        title: `Support Request: ${restaurant.name}`,
        message: `${callerName} (${callerRole}) requested assistance: "${subject.slice(0, 80)}"`,
        restaurantId: callerRestaurantId,
        read: false,
        createdAt: now,
        link: '/superadmin/support',
      });

      await writeSupportAuditLog(env, {
        restaurantId: callerRestaurantId,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        requestId,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: 'SUPPORT_REQUEST_CREATED',
        resource: 'support_request',
        reason: subject,
        details: {
          category,
          supportPermissionAtRequest,
        },
        result: 'success',
      });

      return new Response(JSON.stringify({ success: true, request: newRequest }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. REVIEW SUPPORT REQUEST (Approve / Reject - Super Admin only)
    if (action === 'review_request') {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Only Super Admin can review support requests.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const requestId = String(body.requestId || '');
      const decision = String(body.decision || ''); // 'approved' | 'rejected'
      const decisionNote = String(body.decisionNote || '').trim();

      if (!requestId || !['approved', 'rejected'].includes(decision)) {
        return new Response(JSON.stringify({ error: 'Invalid request ID or decision' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const supportReq = await firestoreGet(env, 'support_requests', requestId);
      if (!supportReq) {
        return new Response(JSON.stringify({ error: 'Support request not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const now = new Date().toISOString();
      const patch: Record<string, any> = {
        status: decision,
        decisionNote,
        assignedSuperAdminId: callerUid,
        assignedSuperAdminName: callerName,
        assignedSuperAdminEmail: callerEmail,
        updatedAt: now,
      };
      if (decision === 'approved') patch.approvedAt = now;
      if (decision === 'rejected') patch.rejectedAt = now;

      await firestorePatch(env, 'support_requests', requestId, patch);

      await writeSupportAuditLog(env, {
        restaurantId: supportReq.restaurantId,
        restaurantName: supportReq.restaurantName,
        restaurantSlug: supportReq.restaurantSlug,
        requestId,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: decision === 'approved' ? 'SUPPORT_REQUEST_APPROVED' : 'SUPPORT_REQUEST_REJECTED',
        resource: 'support_request',
        reason: decisionNote || supportReq.subject,
        result: 'success',
      });

      return new Response(JSON.stringify({ success: true, status: decision, updatedAt: now }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. START TEMPORARY SUPPORT SESSION (Super Admin only, requires restaurant permission ON + approved/active request)
    if (action === 'start_session') {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Only Super Admin can start a support session.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const requestId = String(body.requestId || '');
      const durationMinutesRaw = Number(body.durationMinutes || 30);
      const durationMinutes = ALLOWED_DURATIONS.includes(durationMinutesRaw) ? durationMinutesRaw : 30;
      const scopes = Array.isArray(body.scopes) && body.scopes.length > 0 ? body.scopes : DEFAULT_SCOPES;
      const reason = String(body.reason || '').trim();

      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Support request ID is required to start a session.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const supportReq = await firestoreGet(env, 'support_requests', requestId);
      if (!supportReq) {
        return new Response(JSON.stringify({ error: 'Support request not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const restaurantId = String(supportReq.restaurantId);
      const restaurant = await firestoreGet(env, 'restaurants', restaurantId);
      if (!restaurant) {
        return new Response(JSON.stringify({ error: 'Target restaurant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isSupportAllowed = Boolean(
        restaurant.supportAccessAllowed === true || restaurant.settings?.supportAccessAllowed === true
      );

      if (!isSupportAllowed) {
        await writeSupportAuditLog(env, {
          restaurantId,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          requestId,
          actorId: callerUid,
          actorName: callerName,
          actorEmail: callerEmail,
          actorRole: callerRole,
          action: 'SUPPORT_SESSION_START_DENIED',
          resource: 'support_session',
          reason: 'Restaurant support access permission is OFF',
          result: 'failure',
        });
        return new Response(
          JSON.stringify({
            error: 'Support Access is currently OFF for this restaurant. The restaurant administrator must enable "Allow Super Admin Support Access" before a session can be started.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!['approved', 'active'].includes(String(supportReq.status))) {
        await writeSupportAuditLog(env, {
          restaurantId,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          requestId,
          actorId: callerUid,
          actorName: callerName,
          actorEmail: callerEmail,
          actorRole: callerRole,
          action: 'SUPPORT_SESSION_START_DENIED',
          resource: 'support_session',
          reason: `Support request status is '${supportReq.status}', must be approved first`,
          result: 'failure',
        });
        return new Response(
          JSON.stringify({ error: 'Support request must be approved before starting a support session.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const nowMs = Date.now();
      const expiresAtMs = nowMs + durationMinutes * 60 * 1000;
      const startedAt = new Date(nowMs).toISOString();
      const expiresAt = new Date(expiresAtMs).toISOString();
      const sessionId = `ssess_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;

      const sessionData = {
        id: sessionId,
        sessionId,
        requestId,
        restaurantId,
        restaurantName: String(restaurant.name || supportReq.restaurantName || 'Restaurant'),
        restaurantSlug: String(restaurant.slug || supportReq.restaurantSlug || ''),
        superAdminId: callerUid,
        superAdminName: callerName,
        superAdminEmail: callerEmail,
        status: 'active',
        reason: reason || String(supportReq.subject || 'Approved support troubleshooting session'),
        scopes,
        durationMinutes,
        startedAt,
        expiresAt,
        expiresAtMs,
        createdAt: startedAt,
        updatedAt: startedAt,
      };

      await firestoreSet(env, 'support_sessions', sessionId, sessionData);
      await firestoreSet(env, 'active_support_sessions', restaurantId, sessionData);

      await firestorePatch(env, 'support_requests', requestId, {
        status: 'active',
        activeSessionId: sessionId,
        assignedSuperAdminId: callerUid,
        assignedSuperAdminName: callerName,
        assignedSuperAdminEmail: callerEmail,
        updatedAt: startedAt,
      });

      await firestorePatch(env, 'restaurants', restaurantId, {
        activeSupportSessionId: sessionId,
      });

      await writeSupportAuditLog(env, {
        restaurantId,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        requestId,
        sessionId,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: 'SUPPORT_SESSION_STARTED',
        resource: 'support_session',
        reason: sessionData.reason,
        details: {
          durationMinutes,
          expiresAt,
          scopes,
        },
        result: 'success',
      });

      return new Response(JSON.stringify({ success: true, session: sessionData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. VALIDATE SUPPORT SESSION ON BACKEND (Revalidates expiry, tenant isolation, and restaurant permission)
    if (action === 'validate_session') {
      const restaurantId = String(body.restaurantId || '');
      const sessionId = String(body.sessionId || '');

      if (!isSuperAdmin || !restaurantId) {
        return new Response(JSON.stringify({ valid: false, reason: 'Unauthorised caller or missing restaurantId' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const [restaurant, activeSession] = await Promise.all([
        firestoreGet(env, 'restaurants', restaurantId),
        firestoreGet(env, 'active_support_sessions', restaurantId),
      ]);

      if (!restaurant || !activeSession) {
        return new Response(JSON.stringify({ valid: false, reason: 'No active support session found for this restaurant' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isSupportAllowed = Boolean(
        restaurant.supportAccessAllowed === true || restaurant.settings?.supportAccessAllowed === true
      );

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      if (!isSupportAllowed) {
        await firestoreDelete(env, 'active_support_sessions', restaurantId);
        await firestorePatch(env, 'support_sessions', String(activeSession.id || sessionId), {
          status: 'revoked',
          endedAt: nowIso,
          endedReason: 'revoked_by_restaurant',
          updatedAt: nowIso,
        });
        return new Response(JSON.stringify({ valid: false, reason: 'Support access was disabled by the restaurant' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (Number(activeSession.expiresAtMs || 0) <= nowMs) {
        await firestoreDelete(env, 'active_support_sessions', restaurantId);
        await firestorePatch(env, 'support_sessions', String(activeSession.id || sessionId), {
          status: 'expired',
          endedAt: nowIso,
          endedReason: 'expired',
          updatedAt: nowIso,
        });
        if (activeSession.requestId) {
          await firestorePatch(env, 'support_requests', String(activeSession.requestId), {
            status: 'expired',
            activeSessionId: null,
            expiredAt: nowIso,
            updatedAt: nowIso,
          });
        }
        await firestorePatch(env, 'restaurants', restaurantId, {
          activeSupportSessionId: null,
        });
        await writeSupportAuditLog(env, {
          restaurantId,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          requestId: activeSession.requestId,
          sessionId: String(activeSession.id || sessionId),
          actorId: callerUid,
          actorName: callerName,
          actorEmail: callerEmail,
          actorRole: callerRole,
          action: 'SUPPORT_SESSION_EXPIRED',
          resource: 'support_session',
          reason: 'Session TTL elapsed during backend validation',
          result: 'success',
        });
        return new Response(JSON.stringify({ valid: false, reason: 'Support session has expired' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (activeSession.superAdminId !== callerUid || (sessionId && activeSession.id !== sessionId)) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'Session belongs to a different administrator or session ID mismatch' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ valid: true, session: activeSession }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. END SUPPORT SESSION / COMPLETE REQUEST
    if (action === 'end_session' || action === 'complete_request') {
      const restaurantId = String(body.restaurantId || '');
      const sessionId = String(body.sessionId || '');
      const requestId = String(body.requestId || '');
      const markCompleted = Boolean(body.markCompleted || action === 'complete_request');
      const resolutionSummary = String(body.resolutionSummary || '').trim();

      const canManage =
        isSuperAdmin || (isRestaurantAdmin && callerRestaurantId && callerRestaurantId === restaurantId);

      if (!canManage) {
        return new Response(JSON.stringify({ error: 'Forbidden: Not authorised to end this session.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const nowIso = new Date().toISOString();

      if (restaurantId) {
        await firestoreDelete(env, 'active_support_sessions', restaurantId);
        await firestorePatch(env, 'restaurants', restaurantId, {
          activeSupportSessionId: null,
        });
      }

      if (sessionId) {
        await firestorePatch(env, 'support_sessions', sessionId, {
          status: isSuperAdmin ? 'ended' : 'revoked',
          endedAt: nowIso,
          endedReason: markCompleted ? 'completed' : isSuperAdmin ? 'manual_end' : 'revoked_by_restaurant',
          updatedAt: nowIso,
        });
      }

      if (requestId) {
        const nextStatus = markCompleted ? 'completed' : 'approved';
        const reqPatch: Record<string, any> = {
          status: nextStatus,
          activeSessionId: null,
          updatedAt: nowIso,
        };
        if (markCompleted) {
          reqPatch.completedAt = nowIso;
          if (resolutionSummary) reqPatch.resolutionSummary = resolutionSummary;
        }
        await firestorePatch(env, 'support_requests', requestId, reqPatch);
      }

      await writeSupportAuditLog(env, {
        restaurantId: restaurantId || 'unknown',
        requestId: requestId || undefined,
        sessionId: sessionId || undefined,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: markCompleted ? 'SUPPORT_REQUEST_COMPLETED' : 'SUPPORT_SESSION_ENDED',
        resource: 'support_session',
        reason: resolutionSummary || (markCompleted ? 'Support request marked completed' : 'Support session ended manually'),
        result: 'success',
      });

      return new Response(JSON.stringify({ success: true, endedAt: nowIso }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. LOG SUPPORT ACTION (Server-verified audit log for changes made during active support session)
    if (action === 'log_support_action') {
      const restaurantId = String(body.restaurantId || '');
      const resource = String(body.resource || 'restaurant_settings');
      const operation = String(body.operation || 'SUPPORT_SETTINGS_UPDATED');
      const details = (body.details && typeof body.details === 'object') ? body.details : {};

      if (!isSuperAdmin || !restaurantId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const activeSession = await firestoreGet(env, 'active_support_sessions', restaurantId);
      const isValidSession =
        activeSession &&
        activeSession.superAdminId === callerUid &&
        activeSession.status === 'active' &&
        Number(activeSession.expiresAtMs || 0) > Date.now();

      await writeSupportAuditLog(env, {
        restaurantId,
        restaurantName: activeSession?.restaurantName,
        restaurantSlug: activeSession?.restaurantSlug,
        requestId: activeSession?.requestId,
        sessionId: activeSession?.id,
        actorId: callerUid,
        actorName: callerName,
        actorEmail: callerEmail,
        actorRole: callerRole,
        action: operation,
        resource,
        reason: activeSession?.reason || 'Support mode configuration change',
        details,
        result: isValidSession ? 'success' : 'failure',
      });

      if (!isValidSession) {
        return new Response(JSON.stringify({ error: 'Active support session expired or invalid' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[API /api/support] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
