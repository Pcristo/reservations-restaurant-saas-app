import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plan, User } from '../types';
import { DEFAULT_PLANS } from '../data/plans';
import { logAuditAction } from './tenantService';
import { APP_CONFIG } from '../data/appConfig';
import {
  normalizePlan,
  validatePlanConfiguration,
} from './entitlementsService';

const PLANS_COLLECTION = 'plans';

/**
 * Lists all SaaS subscription plans from Firestore (central source of truth).
 * If the collection is empty, seeds the initial DEFAULT_PLANS into Firestore.
 */
export async function listAllPlans(): Promise<Plan[]> {
  try {
    const coll = collection(db, PLANS_COLLECTION);
    const snap = await getDocs(coll);

    if (snap.empty) {
      const seededPlans: Plan[] = [];
      for (const p of DEFAULT_PLANS) {
        const normalized = normalizePlan(
          {
            ...p,
            isActive: p.isActive !== false,
            isPublic: p.isPublic !== false,
          },
          p.id
        );
        try {
          await setDoc(doc(db, PLANS_COLLECTION, normalized.id), normalized);
        } catch (e) {
          console.warn('[planService] Notice seeding default plan:', normalized.id, e);
        }
        seededPlans.push(normalized);
      }
      return seededPlans.sort((a, b) => a.priceMonthly - b.priceMonthly);
    }

    const plans: Plan[] = [];
    snap.forEach((d) => {
      const data = d.data() as Partial<Plan>;
      plans.push(normalizePlan(data, d.id));
    });

    return plans.sort((a, b) => a.priceMonthly - b.priceMonthly);
  } catch (err) {
    console.error('[planService] Error listing plans from Firestore:', err);
    return DEFAULT_PLANS.map((p) => normalizePlan(p, p.id)).sort(
      (a, b) => a.priceMonthly - b.priceMonthly
    );
  }
}

/**
 * Subscribes in real time to all SaaS subscription packages in Firestore.
 * Ensures Super Admin edits propagate immediately to public pricing and restaurant dashboards.
 */
export function subscribeToPlans(onUpdate: (plans: Plan[]) => void): () => void {
  try {
    const coll = collection(db, PLANS_COLLECTION);
    const unsubscribe = onSnapshot(
      coll,
      (snap) => {
        if (snap.empty) {
          onUpdate(
            DEFAULT_PLANS.map((p) => normalizePlan(p, p.id)).sort(
              (a, b) => a.priceMonthly - b.priceMonthly
            )
          );
          return;
        }
        const loaded: Plan[] = [];
        snap.forEach((d) => {
          loaded.push(normalizePlan(d.data() as Partial<Plan>, d.id));
        });
        loaded.sort((a, b) => a.priceMonthly - b.priceMonthly);
        onUpdate(loaded);
      },
      (err) => {
        console.warn('[planService] Real-time plans listener fallback:', err);
        onUpdate(
          DEFAULT_PLANS.map((p) => normalizePlan(p, p.id)).sort(
            (a, b) => a.priceMonthly - b.priceMonthly
          )
        );
      }
    );
    return unsubscribe;
  } catch {
    onUpdate(
      DEFAULT_PLANS.map((p) => normalizePlan(p, p.id)).sort(
        (a, b) => a.priceMonthly - b.priceMonthly
      )
    );
    return () => {};
  }
}

/**
 * Validates and saves a SaaS Plan with its full entitlements, usage limit controls, and visibility flags.
 */
export async function savePlan(plan: Plan, actor?: User | null): Promise<Plan> {
  const planId = (plan.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!planId) {
    throw new Error('Plan ID must not be empty.');
  }

  const validation = validatePlanConfiguration({ ...plan, id: planId });
  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'Invalid package configuration.');
  }

  const cleanPlan: Plan = normalizePlan(
    {
      ...plan,
      id: planId,
      name: plan.name.trim(),
      description: (plan.description || '').trim(),
      priceMonthly: Math.max(0, Number(plan.priceMonthly)),
      priceAnnual:
        typeof plan.priceAnnual === 'number' && !Number.isNaN(plan.priceAnnual)
          ? Math.max(0, Number(plan.priceAnnual))
          : Math.round(Math.max(0, Number(plan.priceMonthly)) * 12 * 0.8),
      currency: plan.currency || 'EUR',
      isPopular: Boolean(plan.isPopular),
      isActive: plan.isActive !== false,
      isPublic: plan.isPublic !== false,
      customFeatures: (plan.customFeatures || [])
        .map((f) => ({
          id:
            f.id ||
            `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          title: f.title?.trim() || '',
          description: f.description?.trim() || '',
          enabled: f.enabled !== false,
        }))
        .filter((f) => Boolean(f.title)),
      updatedAt: new Date().toISOString(),
    },
    planId
  );

  const planRef = doc(db, PLANS_COLLECTION, planId);
  await setDoc(planRef, cleanPlan, { merge: true });

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plan_saved',
    resource: `plans/${planId}`,
    details: {
      planName: cleanPlan.name,
      priceMonthly: cleanPlan.priceMonthly,
      priceAnnual: cleanPlan.priceAnnual,
      isVisible: cleanPlan.isPublic && cleanPlan.isActive,
      entitlements: cleanPlan.entitlements,
    },
    result: 'success',
  });

  return cleanPlan;
}

/**
 * Toggles whether a plan is displayed or hidden on the marketing website & registration.
 */
export async function togglePlanVisibility(
  planId: string,
  isVisible: boolean,
  actor?: User | null
): Promise<void> {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  await updateDoc(planRef, {
    isActive: isVisible,
    isPublic: isVisible,
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: isVisible ? 'superadmin.plan_published' : 'superadmin.plan_hidden',
    resource: `plans/${planId}`,
    details: { isVisible },
    result: 'success',
  });
}

/**
 * Deletes a custom subscription plan from Firestore.
 */
export async function deletePlan(planId: string, actor?: User | null): Promise<void> {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  await deleteDoc(planRef);

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plan_deleted',
    resource: `plans/${planId}`,
    details: { planId },
    result: 'success',
  });
}

/**
 * Resets plans in Firestore back to DEFAULT_PLANS.
 */
export async function resetPlansToDefault(actor?: User | null): Promise<Plan[]> {
  for (const p of DEFAULT_PLANS) {
    const normalized = normalizePlan(
      {
        ...p,
        isActive: true,
        isPublic: true,
        updatedAt: new Date().toISOString(),
      },
      p.id
    );
    await setDoc(doc(db, PLANS_COLLECTION, normalized.id), normalized);
  }

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plans_reset_defaults',
    resource: 'plans',
    details: { count: DEFAULT_PLANS.length },
    result: 'success',
  });

  return listAllPlans();
}
