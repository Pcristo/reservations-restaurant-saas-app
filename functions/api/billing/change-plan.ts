import { jsonResponse, errorResponse } from '../../lib/response';
import { getDocById, getRestaurantMeta } from '../../lib/billingServiceBackend';
import { saveFirestoreDocRest, getFirestoreDocRest } from '../../lib/firebaseAdmin';
import { DEFAULT_PLANS, normalizePlan } from '../../lib/plans';
import { RestaurantSubscription, Invoice, BillingFrequency, Plan } from '../../../src/types';
import { APP_CONFIG } from '../../lib/appConfig';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const {
      restaurantId,
      planId,
      billingFrequency = 'monthly',
      actor,
    } = body;

    if (!restaurantId || !planId) {
      return errorResponse('restaurantId and planId are required', 400);
    }

    const cleanRestaurantId = restaurantId.toLowerCase().trim();
    const cleanPlanId = planId.toLowerCase().trim();

    // 1. Verify target plan exists in Firestore plans collection or DEFAULT_PLANS
    let targetPlan: Plan | undefined;
    const dbPlanDoc = await getFirestoreDocRest('plans', cleanPlanId, env);
    if (dbPlanDoc) {
      targetPlan = normalizePlan({ ...dbPlanDoc, id: cleanPlanId }, cleanPlanId);
    } else {
      const fallback = DEFAULT_PLANS.find((p) => p.id.toLowerCase() === cleanPlanId);
      if (fallback) {
        targetPlan = normalizePlan(fallback, fallback.id);
      }
    }

    if (!targetPlan) {
      return errorResponse(`Invalid plan: ${planId}`, 400);
    }

    // 2. Fetch existing subscription
    const subId = `sub-${cleanRestaurantId}`;
    const sub: RestaurantSubscription = await getDocById('subscriptions', subId, env);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const priceMonthly = targetPlan.priceMonthly;
    const priceAnnual =
      typeof targetPlan.priceAnnual === 'number'
        ? targetPlan.priceAnnual
        : Math.round(priceMonthly * 12 * 0.8);
    const isAnnual = billingFrequency === 'annual';
    const newPrice = isAnnual ? priceAnnual : priceMonthly;

    const periodStart = now.toISOString();
    const periodEnd = isAnnual
      ? new Date(currentYear + 1, currentMonth, now.getDate()).toISOString()
      : new Date(currentYear, currentMonth + 1, now.getDate()).toISOString();

    const nextBill = periodEnd;

    const updatedSub: RestaurantSubscription = {
      ...(sub || {
        id: subId,
        restaurantId: cleanRestaurantId,
        createdAt: now.toISOString(),
      }),
      planId: targetPlan.id,
      planName: targetPlan.name,
      status: 'active',
      billingFrequency: billingFrequency as BillingFrequency,
      currency: targetPlan.currency || 'EUR',
      priceMonthly,
      priceAnnual,
      currentPrice: newPrice,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: nextBill,
      nextPaymentAmount: newPrice,
      cancelAtPeriodEnd: false,
      cancelledAt: undefined,
      cancellationReason: undefined,
      updatedAt: now.toISOString(),
    };

    await saveFirestoreDocRest('subscriptions', subId, updatedSub, env);

    // 3. Update restaurant document planId & planName (preserve existing tables/staff/bookings safely on downgrade)
    await saveFirestoreDocRest(
      'restaurants',
      cleanRestaurantId,
      {
        planId: targetPlan.id,
        planName: targetPlan.name,
        updatedAt: now.toISOString(),
      },
      env
    );

    // 4. Generate an invoice for the plan change if price > 0
    let createdInvoice: Invoice | null = null;
    if (newPrice > 0) {
      const restMeta = await getRestaurantMeta(cleanRestaurantId, env);
      const invoiceNumber = `INV-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
      const subtotal = newPrice;
      const taxRate = 23;
      const taxAmount = Math.round(subtotal * 0.23 * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      const invoice: Invoice = {
        id: `inv-${cleanRestaurantId}-${Date.now()}`,
        invoiceNumber,
        restaurantId: cleanRestaurantId,
        restaurantName: restMeta.name,
        restaurantLegalName: restMeta.legalName,
        restaurantAddress: restMeta.address,
        restaurantCity: restMeta.city,
        restaurantCountry: restMeta.country,
        restaurantVatNumber: restMeta.vatNumber,
        customerEmail: restMeta.email,
        planId: targetPlan.id,
        planName: targetPlan.name,
        billingPeriod: `${now.toLocaleDateString('en-GB')} – ${new Date(periodEnd).toLocaleDateString('en-GB')}`,
        issueDate: now.toISOString(),
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: targetPlan.currency || 'EUR',
        status: 'paid',
        paidAt: now.toISOString(),
        paymentMethodDescription: 'Visa ending in 4242',
        transactionReference: `tx_dmp_${Date.now()}`,
        lineItems: [
          {
            id: `line-${Date.now()}`,
            description: `${APP_CONFIG.appName} ${targetPlan.name} Plan (${isAnnual ? 'Annual' : 'Monthly'})`,
            periodStart: now.toLocaleDateString('en-GB'),
            periodEnd: new Date(periodEnd).toLocaleDateString('en-GB'),
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
          },
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await saveFirestoreDocRest('invoices', invoice.id, invoice, env);
      createdInvoice = invoice;

      await saveFirestoreDocRest(
        'transactions',
        `tx-${invoice.id}`,
        {
          id: `tx-${invoice.id}`,
          restaurantId: cleanRestaurantId,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: total,
          currency: invoice.currency,
          status: 'succeeded',
          paymentMethod: 'Visa •••• 4242',
          providerReference: invoice.transactionReference,
          description: `Plan changed to ${targetPlan.name}`,
          date: now.toISOString(),
          createdAt: now.toISOString(),
        },
        env
      );
    }

    // 5. Audit log
    await saveFirestoreDocRest(
      'audit_logs',
      `log-plan-${Date.now()}`,
      {
        restaurantId: cleanRestaurantId,
        action: 'billing.plan_changed',
        userId: actor?.id || 'admin',
        userName: actor?.name || 'Restaurant Manager',
        userEmail: actor?.email || 'manager@restaurant.com',
        details: {
          oldPlanId: sub?.planId,
          newPlanId: targetPlan.id,
          newPlanName: targetPlan.name,
          billingFrequency,
          newPrice,
        },
        createdAt: now.toISOString(),
      },
      env
    );

    return jsonResponse({
      success: true,
      subscription: updatedSub,
      invoice: createdInvoice,
      message: `Successfully switched to ${targetPlan.name} (${billingFrequency})!`,
    });
  } catch (err: any) {
    console.error('[API /api/billing/change-plan Error]:', err);
    return errorResponse(err?.message || 'Failed to change subscription plan', 500);
  }
}
