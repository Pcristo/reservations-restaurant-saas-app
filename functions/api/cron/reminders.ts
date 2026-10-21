import { jsonResponse, errorResponse } from '../../lib/response';
import { buildReminderEmail } from '../../lib/emailTemplates';
import { sendEmailViaResend } from '../../lib/resend';
import { sendSmsViaTwilio } from '../../lib/twilio';
import {
  getFirestoreSettings,
  getPlatformSettings,
  getPlatformFeatureFlags,
} from '../../lib/firebaseAdmin';
import {
  resolveBackendRestaurantEntitlements,
  isPackageFeatureEnabled,
} from '../../lib/plans';

export async function onRequest(context: any) {
  try {
    const env = context.env || {};
    const body =
      context.request.method === 'POST'
        ? await context.request.json().catch(() => ({}))
        : {};

    const flags = await getPlatformFeatureFlags(env);
    const smsFlag = flags.find((f) => f && f.id === 'sms_notifications');
    const globalSmsEnabled = !smsFlag || smsFlag.enabled !== false;

    const restaurantId = body.restaurantId || '';
    if (restaurantId && body.sendSms) {
      const { entitlements, plan } = await resolveBackendRestaurantEntitlements(
        restaurantId,
        env
      );
      if (!isPackageFeatureEnabled(entitlements, 'sms')) {
        return errorResponse(
          `SMS Reminders are not included in the ${plan.name} package.`,
          403
        );
      }
    }

    if (body.email) {
      const platformSettings = await getPlatformSettings(env);
      const settings = await getFirestoreSettings(env, restaurantId);
      const restaurantName =
        body.restaurantName || settings?.name || settings?.restaurantName || 'DineMaster Bistro';

      const { subject, html, text } = buildReminderEmail({
        ...body,
        restaurantName,
        logoUrl: body.logoUrl || settings?.logoUrl || '',
        primaryColor: body.primaryColor || settings?.primaryColor || '',
        restaurantEmail: body.restaurantEmail || settings?.email || '',
        restaurantPhone: body.restaurantPhone || settings?.phone || '',
        restaurantAddress: body.restaurantAddress || settings?.address || '',
      });

      const emailRes = await sendEmailViaResend(
        {
          to: body.email,
          subject,
          html,
          text,
          apiKey: settings?.resendApiKey || platformSettings?.resendApiKey,
          fromEmail: settings?.resendFromEmail || platformSettings?.senderEmail,
          restaurantName,
        },
        env
      );

      let smsSent = false;
      if (body.phoneNumber && body.code && globalSmsEnabled) {
        let smsAllowed = true;
        if (restaurantId) {
          const { entitlements } = await resolveBackendRestaurantEntitlements(restaurantId, env);
          smsAllowed = isPackageFeatureEnabled(entitlements, 'sms');
        }
        if (smsAllowed) {
          const smsRes = await sendSmsViaTwilio(
            {
              phoneNumber: body.phoneNumber,
              code: body.code,
              restaurantName,
            },
            env
          );
          smsSent = smsRes.success;
        }
      }

      return jsonResponse({
        success: emailRes.success,
        messageId: emailRes.messageId,
        smsSent,
        error: emailRes.error,
      });
    }

    return jsonResponse({
      success: true,
      status: 'ok',
      globalSmsEnabled,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Cron reminders execution failed', 500);
  }
}

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
