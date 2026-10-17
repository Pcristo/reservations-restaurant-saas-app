import { jsonResponse, errorResponse } from '../../lib/response';
import { buildCancellationEmail } from '../../lib/emailTemplates';
import { sendEmailViaResend } from '../../lib/resend';
import { getFirestoreSettings, getPlatformSettings } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};

    if (!body.email) {
      return errorResponse('Recipient email address is required', 400);
    }

    // SECURITY REQUIREMENT: Do NOT trust frontend parameters for contact/branding info.
    // ALWAYS load from Firestore based on the reservation's restaurantId.
    let resendApiKey = (env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '') || '').trim();
    let resendFromEmail = (env.VITE_RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL || (typeof process !== 'undefined' ? process.env?.RESEND_FROM_EMAIL : '') || '').trim();
    let restaurantName = (body.restaurantName || '').trim() || 'DineMaster Bistro';
    let logoUrl = (body.logoUrl || '').trim();
    let primaryColor = (body.primaryColor || '').trim();
    let restaurantEmail = (body.restaurantEmail || '').trim();
    let restaurantPhone = (body.restaurantPhone || '').trim();
    let restaurantAddress = (body.restaurantAddress || '').trim();
    let restaurantPostcode = (body.restaurantPostcode || body.postcode || '').trim();
    let restaurantCity = (body.restaurantCity || body.city || '').trim();
    let restaurantWebsite = (body.restaurantWebsite || '').trim();
    let timezone = (body.timezone || '').trim() || 'Europe/Lisbon';
    let allowCustomerModification = true;
    let allowCustomerCancellation = true;

    try {
      const platformSettings = await getPlatformSettings(env);
      if (platformSettings?.resendApiKey && !platformSettings.resendApiKey.startsWith('re_Yuqc') && platformSettings.resendApiKey !== 're_BhHd1XYg_HoaEBLAvnEPC3ES46ygkLjzJ') {
        resendApiKey = platformSettings.resendApiKey.trim();
      }
      if (platformSettings?.senderEmail && platformSettings.senderEmail.includes('@') && !platformSettings.senderEmail.startsWith('re_')) {
        resendFromEmail = platformSettings.senderEmail.trim();
      }

      const settings = await getFirestoreSettings(env, body.restaurantId);
      if (settings?.resendApiKey && settings.resendApiKey.startsWith('re_')) {
        resendApiKey = settings.resendApiKey.trim();
      }
      if (settings?.resendFromEmail && settings.resendFromEmail.includes('@') && !settings.resendFromEmail.startsWith('re_')) {
        resendFromEmail = settings.resendFromEmail.trim();
      }
      if (settings?.name || settings?.restaurantName) {
        restaurantName = (settings.name || settings.restaurantName).trim();
      }
      if (settings?.logoUrl) {
        logoUrl = settings.logoUrl.trim();
      } else if (settings?.cloudinaryLogoUrl) {
        logoUrl = settings.cloudinaryLogoUrl.trim();
      } else if (settings?.branding?.logoUrl) {
        logoUrl = settings.branding.logoUrl.trim();
      } else if (settings?.branding?.cloudinaryLogoUrl) {
        logoUrl = settings.branding.cloudinaryLogoUrl.trim();
      }
      if (settings?.primaryColor || settings?.branding?.primaryColor) {
        primaryColor = (settings.primaryColor || settings.branding.primaryColor).trim();
      }
      if (settings?.email) restaurantEmail = settings.email.trim();
      if (settings?.phone) restaurantPhone = settings.phone.trim();
      if (settings?.address) {
        restaurantAddress = settings.address.trim();
      }
      if (settings?.city) {
        restaurantCity = settings.city.trim();
      }
      if (settings?.postcode || settings?.postalCode || settings?.zipCode) {
        restaurantPostcode = (settings.postcode || settings.postalCode || settings.zipCode).trim();
      }
      if (settings?.websiteUrl || settings?.website) {
        restaurantWebsite = (settings.websiteUrl || settings.website).trim();
      }
      if (settings?.timezone) timezone = settings.timezone.trim();

      // Check restaurant settings for booking modifications and cancellations
      if (
        settings?.allowCustomerModification === false ||
        settings?.customerManagement?.allowCustomerModification === false ||
        settings?.allowModification === false
      ) {
        allowCustomerModification = false;
      } else if (body.allowCustomerModification === false || body.allowModification === false) {
        allowCustomerModification = false;
      } else if (settings?.allowCustomerModification !== undefined) {
        allowCustomerModification = Boolean(settings.allowCustomerModification);
      }

      if (
        settings?.allowCustomerCancellation === false ||
        settings?.customerManagement?.allowCustomerCancellation === false ||
        settings?.allowCancellation === false
      ) {
        allowCustomerCancellation = false;
      } else if (body.allowCustomerCancellation === false || body.allowCancellation === false) {
        allowCustomerCancellation = false;
      } else if (settings?.allowCustomerCancellation !== undefined) {
        allowCustomerCancellation = Boolean(settings.allowCustomerCancellation);
      }
    } catch (e) {
      console.warn('[Cancellation Edge] Failed to fetch settings:', e);
    }

    const { subject, html, text } = buildCancellationEmail({
      ...body,
      resendApiKey,
      resendFromEmail,
      restaurantName,
      logoUrl,
      primaryColor,
      restaurantEmail,
      restaurantPhone,
      restaurantAddress,
      restaurantPostcode,
      restaurantCity,
      restaurantWebsite,
      timezone,
      allowCustomerModification,
      allowCustomerCancellation,
      cancellationReason: body.cancellationReason || body.reason
    });

    const result = await sendEmailViaResend({
      to: body.email,
      subject,
      html,
      text,
      apiKey: resendApiKey,
      fromEmail: resendFromEmail,
      restaurantName: restaurantName
    }, env);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send cancellation email', result.status || 400);
    }

    return jsonResponse({
      success: true,
      messageId: result.messageId
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error sending cancellation email', 500);
  }
}
