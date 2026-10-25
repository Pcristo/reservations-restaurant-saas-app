import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { Resend } from 'resend';
import { APP_CONFIG } from '../../lib/appConfig';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { restaurantId, invoiceId } = body;
    console.log('[send-reminder] restaurantId:', restaurantId, 'invoiceId:', invoiceId);

    if (!restaurantId || !invoiceId) {
      console.error('[send-reminder] Missing restaurantId or invoiceId');
      return errorResponse('restaurantId and invoiceId are required', 400);
    }

    const invoice = await getDocById('invoices', invoiceId, env);
    console.log('[send-reminder] fetched invoice:', invoice);
    if (!invoice || invoice.restaurantId !== restaurantId.toLowerCase().trim()) {
      console.error('[send-reminder] Invoice not found or unauthorized:', invoiceId);
      return errorResponse('Invoice not found or unauthorized', 404);
    }

    const resendKey = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY;
    if (resendKey && invoice.customerEmail) {
      const resend = new Resend(resendKey);
      const fromEmail = env.RESEND_FROM_EMAIL || 'DineMaster Pro <reservations@wordwide.pro>';
      
      await resend.emails.send({
        from: fromEmail,
        to: invoice.customerEmail,
        subject: `Payment Reminder: ${invoice.invoiceNumber} - ${APP_CONFIG.appName}`,
        html: `<p>This is a reminder to pay your invoice: ${invoice.invoiceNumber}. Total: ${invoice.total}</p>`
      });
    }

    return jsonResponse({ success: true, message: 'Reminder sent' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to send reminder', 500);
  }
}
