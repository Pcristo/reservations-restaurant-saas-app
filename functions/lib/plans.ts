import { Plan, PlanEntitlements } from '../../src/types';
import {
  DEFAULT_PLANS,
  UNLIMITED_BOOKINGS_SENTINEL,
  UNLIMITED_STAFF_SENTINEL,
  UNLIMITED_TABLES_SENTINEL,
} from '../../src/data/plans';
import {
  normalizePlan,
  normalizePlanEntitlements,
  resolveEffectivePlanAndEntitlements,
  isPackageFeatureEnabled,
} from '../../src/services/entitlementsService';
import { getFirestoreDocRest } from './firebaseAdmin';

export {
  DEFAULT_PLANS,
  UNLIMITED_BOOKINGS_SENTINEL,
  UNLIMITED_STAFF_SENTINEL,
  UNLIMITED_TABLES_SENTINEL,
  normalizePlan,
  normalizePlanEntitlements,
  resolveEffectivePlanAndEntitlements,
  isPackageFeatureEnabled,
};

/**
 * Resolves a package by ID from Firestore `plans/{planId}`, falling back to central DEFAULT_PLANS.
 */
export async function resolveBackendPlanById(
  planId?: string | null,
  env: Record<string, any> = {}
): Promise<Plan> {
  const cleanId = (planId || 'professional').trim().toLowerCase();
  try {
    const dbDoc = await getFirestoreDocRest('plans', cleanId, env);
    if (dbDoc) {
      return normalizePlan({ ...dbDoc, id: cleanId }, cleanId);
    }
  } catch (err) {
    console.warn(`[PlansBackend] Notice reading plans/${cleanId} from Firestore:`, err);
  }

  const matchedDefault =
    DEFAULT_PLANS.find((p) => p.id.toLowerCase() === cleanId) ||
    DEFAULT_PLANS.find((p) => p.id === 'professional') ||
    DEFAULT_PLANS[1];

  return normalizePlan(matchedDefault, matchedDefault.id);
}

/**
 * Resolves a restaurant's active package and effective PlanEntitlements from Firestore.
 */
export async function resolveBackendRestaurantEntitlements(
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<{
  plan: Plan;
  entitlements: PlanEntitlements;
  restaurant: Record<string, any> | null;
  subscription: Record<string, any> | null;
}> {
  const cleanRestId = (restaurantId || '').trim().toLowerCase();
  let restaurant: Record<string, any> | null = null;
  let subscription: Record<string, any> | null = null;

  if (cleanRestId) {
    try {
      const [restDoc, subDoc] = await Promise.all([
        getFirestoreDocRest('restaurants', cleanRestId, env),
        getFirestoreDocRest('subscriptions', `sub-${cleanRestId}`, env),
      ]);
      restaurant = restDoc;
      subscription = subDoc;
    } catch (err) {
      console.warn(`[PlansBackend] Failed reading restaurant/subscription for ${cleanRestId}:`, err);
    }
  }

  const targetPlanId = subscription?.planId || restaurant?.planId || 'professional';
  const basePlan = await resolveBackendPlanById(targetPlanId, env);

  const { plan, entitlements } = resolveEffectivePlanAndEntitlements({
    planId: targetPlanId,
    plans: [basePlan, ...DEFAULT_PLANS.filter((p) => p.id !== basePlan.id)],
    subscription: subscription as any,
    restaurant: restaurant as any,
  });

  return {
    plan,
    entitlements,
    restaurant,
    subscription,
  };
}
