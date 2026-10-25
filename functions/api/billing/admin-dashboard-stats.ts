import { jsonResponse, errorResponse } from '../../lib/response';
import { listFirestoreDocsRest } from '../../lib/firebaseAdmin';

export async function onRequestGet(context: any) {
  try {
    const [invoices, subscriptions, transactions] = await Promise.all([
      listFirestoreDocsRest('invoices', context.env || {}),
      listFirestoreDocsRest('subscriptions', context.env || {}),
      listFirestoreDocsRest('transactions', context.env || {})
    ]);

    // Aggregate metrics
    let totalRevenueCollected = 0;
    let mrr = 0;
    let activePaidSubs = 0;
    let trialSubs = 0;
    let pastDueSubs = 0;
    let cancelledSubs = 0;
    let overdueAmount = 0;
    let failedPaymentsCount = 0;

    // Process Invoices
    for (const inv of invoices) {
      if (inv.status === 'paid') {
        totalRevenueCollected += (inv.total || 0);
      } else if (inv.status === 'overdue') {
        overdueAmount += (inv.total || 0);
      }
    }

    // Process Subscriptions
    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        activePaidSubs++;
        mrr += (sub.currentPrice || 0);
      } else if (sub.status === 'trial') {
        trialSubs++;
      } else if (['suspended', 'payment_due', 'past_due'].includes(sub.status)) {
        pastDueSubs++;
      } else if (sub.status === 'cancelled') {
        cancelledSubs++;
      }
    }

    // Process Transactions
    for (const tx of transactions) {
      if (tx.status === 'failed') {
        failedPaymentsCount++;
      }
    }

    const arr = mrr * 12;
    const payingCount = activePaidSubs || 1;
    const arpu = Math.round(mrr / payingCount);

    return jsonResponse({
      success: true,
      data: {
        totalRevenueCollected: Math.round(totalRevenueCollected * 100) / 100,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        activePaidSubs,
        trialSubs,
        pastDueSubs,
        cancelledSubs,
        outstandingInvoicesCount: invoices.filter(inv => ['unpaid', 'overdue', 'pending'].includes(inv.status)).length,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        failedPaymentsCount,
        arpu,
      },
    });
  } catch (err: any) {
    console.error('[API /api/billing/admin-dashboard-stats Error]:', err);
    return errorResponse(err?.message || 'Failed to fetch platform billing stats', 500);
  }
}
