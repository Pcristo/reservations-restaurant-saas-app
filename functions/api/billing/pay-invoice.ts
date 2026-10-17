import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest } from '../../lib/firebaseAdmin';
import { Invoice, PaymentTransaction, RestaurantSubscription } from '../../../src/types';
import { Resend } from 'resend';
import { APP_CONFIG } from '../../lib/appConfig';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { 
      restaurantId, 
      invoiceId, 
      paymentMethodToken, 
      cardNumber, 
      cardholderName,
      idempotencyKey,
      actor 
    } = body;

    if (!restaurantId || !invoiceId) {
      return errorResponse('restaurantId and invoiceId are required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();

    // 1. Fetch invoice and ensure tenant isolation
    const invoice: Invoice = await getDocById('invoices', invoiceId, env);
    if (!invoice) {
      return errorResponse('Invoice not found', 404);
    }

    if (invoice.restaurantId !== cleanRestaurantId) {
      return errorResponse('Unauthorized: Invoice does not belong to this restaurant', 403);
    }

    // 2. Idempotency Check: Don't charge twice if already paid
    if (invoice.status === 'paid') {
      return jsonResponse({
        success: true,
        alreadyPaid: true,
        invoice,
        message: 'This invoice has already been paid in full.',
      });
    }

    // 3. Server-side payment processing validation
    const cleanCard = (cardNumber || '').replace(/\s+/g, '');
    const last4 = cleanCard ? cleanCard.slice(-4) : (paymentMethodToken?.last4 || '4242');

    // Simulated decline test case (e.g. test cards ending in 0002)
    if (last4 === '0002') {
      // Record failed transaction attempt
      const failedTx: PaymentTransaction = {
        id: `tx-failed-${Date.now()}`,
        restaurantId: cleanRestaurantId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'failed',
        paymentMethod: `Card ending in ${last4}`,
        providerReference: `tx_declined_${Date.now()}`,
        description: `Payment attempt for ${invoice.invoiceNumber} (Declined)`,
        date: new Date().toISOString(),
        failureReason: 'Card was declined by the issuer: Insufficient funds.',
        createdAt: new Date().toISOString(),
      };
      await saveFirestoreDocRest('transactions', failedTx.id, failedTx, env);

      return errorResponse('Payment failed: Your card was declined by the issuer (Insufficient funds). Please try a different card.', 402, {
        failureReason: 'insufficient_funds',
        transactionId: failedTx.id,
      });
    }

    // 4. Payment Succeeded: Record Transaction
    const now = new Date().toISOString();
    const providerRef = `tx_dmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentMethodDescription = `Visa ending in ${last4}`;

    const transaction: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      restaurantId: cleanRestaurantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      currency: invoice.currency,
      status: 'succeeded',
      paymentMethod: paymentMethodDescription,
      providerReference: providerRef,
      description: `Payment for ${invoice.invoiceNumber} (${invoice.planName})`,
      date: now,
      createdAt: now,
    };

    await saveFirestoreDocRest('transactions', transaction.id, transaction, env);

    // 5. Update Invoice status to 'paid'
    const updatedInvoice: Invoice = {
      ...invoice,
      status: 'paid',
      paidAt: now,
      paymentMethodDescription,
      transactionReference: providerRef,
      updatedAt: now,
    };

    await saveFirestoreDocRest('invoices', invoice.id, updatedInvoice, env);

    // 6. Update Subscription status to 'active' if it was payment_due or past_due
    const subId = `sub-${cleanRestaurantId}`;
    const sub: RestaurantSubscription = await getDocById('subscriptions', subId, env);
    if (sub && (sub.status === 'payment_due' || sub.status === 'past_due')) {
      const nextBilling = new Date(Date.now() + 30 * 86400000).toISOString();
      await saveFirestoreDocRest('subscriptions', subId, {
        ...sub,
        status: 'active',
        nextBillingDate: nextBilling,
        updatedAt: now,
      }, env);
    }

    // 7. Audit Log
    await saveFirestoreDocRest('audit_logs', `log-pay-${Date.now()}`, {
      restaurantId: cleanRestaurantId,
      action: 'billing.invoice_paid',
      userId: actor?.id || 'admin',
      userName: actor?.name || 'Restaurant Manager',
      userEmail: actor?.email || 'manager@restaurant.com',
      details: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        currency: invoice.currency,
        providerReference: providerRef,
      },
      createdAt: now,
    }, env);

    // 8. Send Email Notification via Resend if API key available
    const resendKey = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY;
    if (resendKey && invoice.customerEmail) {
      try {
        const resend = new Resend(resendKey);
        const fromEmail = env.RESEND_FROM_EMAIL || 'DineMaster Pro <reservations@wordwide.pro>';
        await resend.emails.send({
          from: fromEmail,
          to: invoice.customerEmail,
          subject: `Payment Receipt: ${invoice.invoiceNumber} - ${APP_CONFIG.appName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
              <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; color: #ffffff; text-align: center;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #f59e0b;">${APP_CONFIG.appName}</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Payment Received & Confirmed</p>
              </div>
              <div style="padding: 24px 0; border-bottom: 1px solid #e2e8f0;">
                <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Thank you for your payment!</h2>
                <p style="font-size: 14px; line-height: 1.5; color: #475569;">
                  We have successfully processed the payment for <strong>${invoice.invoiceNumber}</strong> for <strong>${invoice.restaurantName}</strong>.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${invoice.currency === 'EUR' ? '€' : '$'}${invoice.total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Invoice Reference:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Transaction Reference:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #475569;">${providerRef}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Date:</td>
                    <td style="padding: 8px 0; text-align: right; color: #0f172a;">${new Date(now).toLocaleDateString('en-GB')}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
                You can download the full PDF invoice directly from your DineMaster Pro dashboard.
              </p>
            </div>
          `
        }).catch((e: any) => console.warn('[Resend] Billing email notice error:', e));
      } catch (emailErr) {
        console.warn('[Resend] Failed to send receipt email:', emailErr);
      }
    }

    return jsonResponse({
      success: true,
      invoice: updatedInvoice,
      transaction,
      message: `Payment of ${invoice.currency === 'EUR' ? '€' : '$'}${invoice.total.toFixed(2)} for ${invoice.invoiceNumber} was processed successfully!`,
    });
  } catch (err: any) {
    console.error('[API /api/billing/pay-invoice Error]:', err);
    return errorResponse(err?.message || 'Payment processing failed', 500);
  }
}
