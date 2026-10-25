import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase';
import { User, SuperAdminInvitation } from '../types';
import { logAuditAction } from './tenantService';
import { APP_CONFIG } from '../data/appConfig';
import { isUserSuperAdmin } from '../lib/permissions';
import firebaseConfig from '../../firebase-applet-config.json';

const MASTER_ADMIN_EMAIL = 'pcristo35@gmail.com';
const SECONDARY_APP_NAME = 'secondarySuperAdmin';

/**
 * List all existing Super Admins from the users collection
 */
export async function listSuperAdmins(): Promise<User[]> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'super_admin'));
    const snap = await getDocs(q);
    const admins: User[] = [];
    const seenEmails = new Set<string>();

    snap.forEach((d) => {
      const data = d.data() as User;
      const email = (data.email || '').trim().toLowerCase();
      if (email) seenEmails.add(email);
      admins.push({
        id: d.id,
        ...data,
      });
    });

    // Ensure Master Super Admin is included even if not explicitly stored yet
    if (!seenEmails.has(MASTER_ADMIN_EMAIL.toLowerCase())) {
      admins.unshift({
        id: 'master-super-admin',
        authUid: 'master-super-admin',
        name: 'Master Super Admin',
        email: MASTER_ADMIN_EMAIL,
        role: 'super_admin',
        status: 'active',
        authProvider: 'google',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    }

    return admins;
  } catch (err) {
    console.error('[superAdminManagement] Error listing super admins:', err);
    // Return master admin at minimum
    return [{
      id: 'master-super-admin',
      authUid: 'master-super-admin',
      name: 'Master Super Admin',
      email: MASTER_ADMIN_EMAIL,
      role: 'super_admin',
      status: 'active',
      authProvider: 'google',
      createdAt: '2025-01-01T00:00:00.000Z',
    }];
  }
}

/**
 * List all pending or historical Super Admin invitations
 */
export async function listSuperAdminInvitations(): Promise<SuperAdminInvitation[]> {
  try {
    const q = query(collection(db, 'super_admin_invitations'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const invites: SuperAdminInvitation[] = [];
    snap.forEach((d) => {
      invites.push({
        id: d.id,
        ...(d.data() as Omit<SuperAdminInvitation, 'id'>),
      });
    });
    return invites;
  } catch (err) {
    console.warn('[superAdminManagement] Notice listing invitations:', err);
    return [];
  }
}

/**
 * Invite a Super Admin by Email (pre-provisioning & generating direct invitation link)
 */
export async function inviteSuperAdmin(
  data: { email: string; name: string; notes?: string },
  actor: User | null
): Promise<{ inviteId: string; inviteUrl: string }> {
  // Guard: Creator must be an authenticated and authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can invite another Super Admin.');
  }

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim() || cleanEmail.split('@')[0];

  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }

  // Check if already Master Admin
  if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`${cleanEmail} is already the platform owner / master admin.`);
  }

  const inviteId = `invite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  // 7-day expiration time limit
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Create invitation record with expiration and invitedBy audit metadata
  const invitationRecord: SuperAdminInvitation = {
    id: inviteId,
    email: cleanEmail,
    name: cleanName,
    role: 'super_admin',
    status: 'pending',
    invitedBy: actor?.email || MASTER_ADMIN_EMAIL,
    createdAt: nowIso,
    expiresAt,
    notes: data.notes || '',
  };

  await setDoc(doc(db, 'super_admin_invitations', inviteId), invitationRecord);

  // 2. Pre-provision in users collection
  // Check if a document already exists with this email
  let existingUserDocId: string | null = null;
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingUserDocId = snap.docs[0].id;
    }
  } catch (e) {}

  if (existingUserDocId) {
    // Elevate existing account to super_admin
    await updateDoc(doc(db, 'users', existingUserDocId), {
      role: 'super_admin',
      status: 'active',
      name: cleanName,
      invitedBy: actor?.email || MASTER_ADMIN_EMAIL,
      updatedAt: nowIso,
    });
  } else {
    // Create new pre-provisioned user document
    const friendlyId = `sa-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/gi, '')}-${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'users', friendlyId), {
      id: friendlyId,
      name: cleanName,
      email: cleanEmail,
      role: 'super_admin',
      status: 'active',
      invitedBy: actor?.email || MASTER_ADMIN_EMAIL,
      invitedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 3. Log audit action
  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: 'superadmin.invite_created',
    resource: `super_admin_invitations/${inviteId}`,
    details: { invitedEmail: cleanEmail, invitedName: cleanName, expiresAt },
    result: 'success',
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${baseUrl}/app/super-admin?invited=${encodeURIComponent(cleanEmail)}&inviteId=${encodeURIComponent(inviteId)}`;

  return {
    inviteId,
    inviteUrl,
  };
}


/**
 * Directly create a Super Admin with Email & Password
 * Uses secondary Firebase Auth instance so the current Super Admin is never logged out.
 */
export async function createSuperAdminWithPassword(
  data: { email: string; name: string; password: string; notes?: string },
  actor: User | null
): Promise<User> {
  // Guard: Creator must be an authenticated and authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can create another Super Admin.');
  }

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !data.password) {
    throw new Error('Please provide email and password.');
  }

  if (data.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Secondary Firebase Auth App pattern to avoid logging out the current active Super Admin
  const secondaryApp = getApps().find(app => app.name === SECONDARY_APP_NAME) || 
    initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);

  let resultUid: string | null = null;
  const nowIso = new Date().toISOString();

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, data.password);
    resultUid = cred.user.uid;
    await signOut(secondaryAuth);
  } catch (err: any) {
    console.error('[superAdminManagement] Error creating Firebase Auth user:', err);
    if (err?.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists in Authentication. Try using the "Invite via Email" option instead.');
    }
    throw new Error(err?.message || 'Failed to create administrator authentication account.');
  }

  const newAdminUser: User = {
    id: resultUid,
    authUid: resultUid,
    name: cleanName,
    email: cleanEmail,
    role: 'super_admin',
    status: 'active',
    authProvider: 'email',
    createdAt: nowIso,
    createdBy: actor?.email || MASTER_ADMIN_EMAIL,
  };

  // Write record in users/{uid}
  await setDoc(doc(db, 'users', resultUid), {
    ...newAdminUser,
    id: resultUid,
    authUid: resultUid,
    createdAt: serverTimestamp(),
  });

  // Also mark any pending invitation as accepted
  try {
    const qInv = query(collection(db, 'super_admin_invitations'), where('email', '==', cleanEmail));
    const snapInv = await getDocs(qInv);
    for (const d of snapInv.docs) {
      await updateDoc(doc(db, 'super_admin_invitations', d.id), {
        status: 'accepted',
        acceptedAt: nowIso,
      });
    }
  } catch (e) {}

  // Log audit action
  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: 'superadmin.create_admin',
    resource: `users/${resultUid}`,
    details: { email: cleanEmail, name: cleanName },
    result: 'success',
  });

  return newAdminUser;
}

/**
 * Toggle Active / Suspended status of a Super Admin
 */
export async function toggleSuperAdminStatus(
  adminUser: User,
  newStatus: 'active' | 'suspended' | 'inactive',
  actor: User | null
): Promise<void> {
  // Guard: Actor must be an authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can modify administrator status.');
  }

  const targetEmail = (adminUser.email || '').trim().toLowerCase();

  // Guard: Master Admin cannot be suspended
  if (targetEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('The Platform Owner / Master Admin cannot be deactivated.');
  }

  // Guard: Actor cannot suspend themselves
  if (actor?.email && actor.email.toLowerCase() === targetEmail) {
    throw new Error('You cannot deactivate your own Super Admin account.');
  }

  // Lockout protection: Cannot deactivate the platform's last active Super Admin
  if (newStatus !== 'active') {
    const allAdmins = await listSuperAdmins();
    const remainingActive = allAdmins.filter(
      a => a.status === 'active' && a.id !== adminUser.id && (a.email || '').toLowerCase() !== targetEmail
    );
    if (remainingActive.length === 0) {
      throw new Error('Lockout Protection: Cannot deactivate the platform\'s last active Super Admin.');
    }
  }

  await updateDoc(doc(db, 'users', adminUser.id), {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: `superadmin.status_${newStatus}`,
    resource: `users/${adminUser.id}`,
    details: { targetEmail, newStatus },
    result: 'success',
  });
}

/**
 * Remove / Revoke a Super Admin
 */
export async function removeSuperAdmin(
  adminUser: User,
  actor: User | null
): Promise<void> {
  // Guard: Actor must be an authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can remove an administrator.');
  }

  const targetEmail = (adminUser.email || '').trim().toLowerCase();

  // Guard: Master Admin cannot be removed
  if (targetEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('The Platform Owner / Master Admin cannot be removed.');
  }

  // Guard: Actor cannot remove themselves
  if (actor?.email && actor.email.toLowerCase() === targetEmail) {
    throw new Error('You cannot remove your own Super Admin account.');
  }

  // Lockout protection: Cannot delete the platform's last active Super Admin
  const allAdmins = await listSuperAdmins();
  const remainingActive = allAdmins.filter(
    a => a.status === 'active' && a.id !== adminUser.id && (a.email || '').toLowerCase() !== targetEmail
  );
  if (remainingActive.length === 0) {
    throw new Error('Lockout Protection: Cannot delete the platform\'s last active Super Admin.');
  }

  // Delete user doc
  await deleteDoc(doc(db, 'users', adminUser.id));

  // Mark pending invitations as revoked
  try {
    const qInv = query(collection(db, 'super_admin_invitations'), where('email', '==', targetEmail));
    const snapInv = await getDocs(qInv);
    for (const d of snapInv.docs) {
      await updateDoc(doc(db, 'super_admin_invitations', d.id), {
        status: 'revoked',
      });
    }
  } catch (e) {}

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: 'superadmin.remove_admin',
    resource: `users/${adminUser.id}`,
    details: { targetEmail },
    result: 'success',
  });
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(
  inviteId: string,
  email: string,
  actor: User | null
): Promise<void> {
  // Guard: Actor must be an authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can revoke invitations.');
  }

  await updateDoc(doc(db, 'super_admin_invitations', inviteId), {
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy: actor?.email || MASTER_ADMIN_EMAIL,
  });

  // Also remove pre-provisioned user if they haven't authenticated yet
  try {
    const cleanEmail = email.toLowerCase().trim();
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail), where('role', '==', 'super_admin'));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      // If user has not signed in with authUid yet, remove the draft record
      if (!data.authUid || data.authUid === data.id) {
        await deleteDoc(doc(db, 'users', d.id));
      }
    }
  } catch (e) {}

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: 'superadmin.revoke_invitation',
    resource: `super_admin_invitations/${inviteId}`,
    details: { email },
    result: 'success',
  });
}

/**
 * Manually approve and activate a pending Super Admin invitation directly from the panel
 */
export async function manuallyActivateInvitation(
  invite: SuperAdminInvitation,
  actor: User | null
): Promise<void> {
  // Guard: Actor must be an authorized Super Admin
  if (!actor || !isUserSuperAdmin(actor)) {
    throw new Error('Unauthorized: Only an authenticated Super Admin can manually activate invitations.');
  }

  const nowIso = new Date().toISOString();
  const cleanEmail = invite.email.toLowerCase().trim();

  // 1. Mark invitation as accepted
  await updateDoc(doc(db, 'super_admin_invitations', invite.id), {
    status: 'accepted',
    acceptedAt: nowIso,
  });

  // 2. Ensure user document in users collection is active super_admin
  let userDocId: string | null = null;
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userDocId = snap.docs[0].id;
    }
  } catch {}

  if (userDocId) {
    await updateDoc(doc(db, 'users', userDocId), {
      role: 'super_admin',
      status: 'active',
      name: invite.name || cleanEmail.split('@')[0],
      updatedAt: nowIso,
    });
  } else {
    const friendlyId = `sa-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/gi, '')}-${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'users', friendlyId), {
      id: friendlyId,
      name: invite.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'super_admin',
      status: 'active',
      invitedBy: actor?.email || MASTER_ADMIN_EMAIL,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 3. Log audit action
  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || MASTER_ADMIN_EMAIL,
    action: 'superadmin.manually_activated',
    resource: `super_admin_invitations/${invite.id}`,
    details: { email: cleanEmail },
    result: 'success',
  });
}

/**
 * Decline an invitation (invited user saying NO)
 */
export async function declineSuperAdminInvitation(
  email: string,
  inviteId?: string
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  const nowIso = new Date().toISOString();

  if (inviteId) {
    try {
      await updateDoc(doc(db, 'super_admin_invitations', inviteId), {
        status: 'declined',
        declinedAt: nowIso,
      });
    } catch {}
  } else {
    try {
      const q = query(
        collection(db, 'super_admin_invitations'),
        where('email', '==', cleanEmail),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'super_admin_invitations', d.id), {
          status: 'declined',
          declinedAt: nowIso,
        });
      }
    } catch {}
  }

  // Remove pre-provisioned user draft record if not signed in
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail), where('role', '==', 'super_admin'));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.authUid || data.authUid === data.id) {
        await deleteDoc(doc(db, 'users', d.id));
      }
    }
  } catch {}
}

/**
 * Validates whether an email has authorized Super Admin access or is a restaurant tenant account
 */
export async function checkSuperAdminAccess(
  email: string,
  userDoc?: User | null
): Promise<{
  isAuthorizedSuperAdmin: boolean;
  isRestaurantTenant: boolean;
  restaurantId?: string;
  restaurantName?: string;
  reason?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { isAuthorizedSuperAdmin: false, isRestaurantTenant: false, reason: 'missing_email' };
  }

  // 1. Master Super Admin is always authorized
  if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return { isAuthorizedSuperAdmin: true, isRestaurantTenant: false };
  }

  // 2. Check if userDoc already provided
  let fetchedUser: User | null = userDoc || null;
  if (!fetchedUser) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        fetchedUser = snap.docs[0].data() as User;
      }
    } catch (e) {
      console.warn('[checkSuperAdminAccess] Notice querying users:', e);
    }
  }

  // 3. If user has a restaurant association, they are a RESTAURANT TENANT
  if (fetchedUser && fetchedUser.restaurantId) {
    let restaurantName = 'Restaurant Tenant';
    try {
      const restDoc = await getDoc(doc(db, 'restaurants', fetchedUser.restaurantId));
      if (restDoc.exists()) {
        restaurantName = restDoc.data()?.name || restaurantName;
      }
    } catch {}

    return {
      isAuthorizedSuperAdmin: false,
      isRestaurantTenant: true,
      restaurantId: fetchedUser.restaurantId,
      restaurantName,
      reason: 'tenant_account',
    };
  }

  // 4. If user document has role === 'super_admin' and no restaurantId
  if (fetchedUser && (fetchedUser.role === 'super_admin' || fetchedUser.role === ('superadmin' as any)) && !fetchedUser.restaurantId) {
    if (fetchedUser.status === 'suspended' || fetchedUser.status === 'inactive') {
      return { isAuthorizedSuperAdmin: false, isRestaurantTenant: false, reason: 'suspended' };
    }
    return { isAuthorizedSuperAdmin: true, isRestaurantTenant: false };
  }

  // 5. Check if user has a valid unexpired pending super admin invitation
  try {
    const qInv = query(collection(db, 'super_admin_invitations'), where('email', '==', cleanEmail));
    const snapInv = await getDocs(qInv);
    if (!snapInv.empty) {
      const invData = snapInv.docs[0].data() as SuperAdminInvitation;
      if (invData.status === 'pending') {
        const isExpired = invData.expiresAt && new Date(invData.expiresAt).getTime() < Date.now();
        if (!isExpired) {
          return { isAuthorizedSuperAdmin: true, isRestaurantTenant: false };
        }
      }
    }
  } catch (e) {
    console.warn('[checkSuperAdminAccess] Notice querying invitations:', e);
  }

  // 6. Not a super admin
  return { isAuthorizedSuperAdmin: false, isRestaurantTenant: false, reason: 'not_super_admin' };
}
