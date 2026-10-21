import { jsonResponse, errorResponse } from '../lib/response';
import { sendSmsViaTwilio } from '../lib/twilio';
import { resolveBackendRestaurantEntitlements, isPackageFeatureEnabled } from '../lib/plans';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};

    // Enforce Restaurant Package Entitlement: SMS Reminders / Verification
    if (body.restaurantId) {
      const { entitlements, plan } = await resolveBackendRestaurantEntitlements(
        String(body.restaurantId),
        env
      );
      if (!isPackageFeatureEnabled(entitlements, 'sms')) {
        return errorResponse(
          `SMS Reminders are not included in the ${plan.name} package. Please upgrade your subscription package to enable SMS functionality.`,
          403,
          { code: 'FEATURE_NOT_ENTITLED', feature: 'sms' }
        );
      }
    }

    const result = await sendSmsViaTwilio(body, env);
    if (!result.success) {
      return errorResponse(result.error || 'Failed to send SMS', result.status || 400);
    }

    return jsonResponse({
      success: true,
      sid: result.sid,
      simulated: result.simulated,
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error sending SMS', 500);
  }
}
