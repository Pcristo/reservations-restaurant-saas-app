import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, setDoc, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth } from './useAuth';
import { useTenantSafe } from './useTenant';
import { User, DEFAULT_RESTAURANT_ID } from '../types';
import { doesUserBelongToRestaurant, isUserSuperAdmin, normalizeTenantIdentifier } from '../lib/permissions';
import {
  doesUserCountTowardsStaffQuota,
  checkCanCreateResource,
  ResourceCreationCheckResult,
} from '../services/entitlementsService';
import firebaseConfig from '../../firebase-applet-config.json';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, isStaff, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const tenant = useTenantSafe();

  // Resolve target restaurant strictly from active route / tenant / user membership
  const targetRestaurantId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const routeSlug = normalizeTenantIdentifier(match[1]);
        if (tenant?.tenant && (normalizeTenantIdentifier(tenant.tenant.slug) === routeSlug || normalizeTenantIdentifier(tenant.tenant.id) === routeSlug)) {
          return normalizeTenantIdentifier(tenant.tenant.id);
        }
        return routeSlug;
      }
    }
    if (tenant?.targetRestaurantId) {
      return normalizeTenantIdentifier(tenant.targetRestaurantId);
    }
    if (!isSuperAdmin && currentUser?.restaurantId) {
      return normalizeTenantIdentifier(currentUser.restaurantId);
    }
    return DEFAULT_RESTAURANT_ID;
  }, [tenant?.targetRestaurantId, tenant?.tenant, isSuperAdmin, currentUser?.restaurantId]);

  useEffect(() => {
    if (authLoading || (!isStaff && !isAdmin)) {
      if (!authLoading) {
        setUsers([]);
        setLoading(false);
      }
      return;
    }

    // Strict tenant boundary check for non-super-admin staff/admins
    if (!isSuperAdmin && !doesUserBelongToRestaurant(currentUser, targetRestaurantId, tenant?.tenant)) {
      setUsers([]);
      setLoading(false);
      return;
    }

    if (!targetRestaurantId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const isBelaItalia = targetRestaurantId === 'bela-italia' || targetRestaurantId === 'bella-italia';

    let q;
    if (isDefault) {
      q = query(
        collection(db, 'users'),
        where('restaurantId', 'in', [DEFAULT_RESTAURANT_ID, 'main', 'default-restaurant'])
      );
    } else if (isBelaItalia) {
      q = query(
        collection(db, 'users'),
        where('restaurantId', 'in', ['bela-italia', 'bella-italia'])
      );
    } else {
      q = query(
        collection(db, 'users'),
        where('restaurantId', '==', targetRestaurantId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimer);

      const usersData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => {
          // Never list customers or global super_admin accounts in a restaurant's staff list
          if (u.role === 'customer' || u.role === 'super_admin' || (u.role as any) === 'superadmin') {
            return false;
          }
          if (isUserSuperAdmin(u)) {
            return false;
          }
          // Every staff/admin account must explicitly belong to this targetRestaurantId
          if (!u.restaurantId && (!u.restaurantIds || u.restaurantIds.length === 0)) {
            return false;
          }
          return doesUserBelongToRestaurant(u, targetRestaurantId, tenant?.tenant);
        });

      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.error('Error in users listener:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isStaff, isAdmin, isSuperAdmin, authLoading, targetRestaurantId, currentUser, tenant?.tenant]);

  // Calculate active staff accounts counting towards the package limit
  const activeStaffCount = useMemo(() => {
    return users.filter((u) => doesUserCountTowardsStaffQuota(u, targetRestaurantId, tenant?.tenant)).length;
  }, [users, targetRestaurantId, tenant?.tenant]);

  const staffLimitCheck: ResourceCreationCheckResult = useMemo(() => {
    return checkCanCreateResource(tenant?.entitlements, 'staff', activeStaffCount);
  }, [tenant?.entitlements, activeStaffCount]);

  const verifyAdminTenantAccess = () => {
    if (!currentUser || (!isAdmin && !isSuperAdmin)) {
      throw new Error('Unauthorized: Administrator privileges required.');
    }
    if (!isSuperAdmin && !doesUserBelongToRestaurant(currentUser, targetRestaurantId, tenant?.tenant)) {
      throw new Error('Unauthorized: You can only manage users in your own assigned restaurant.');
    }
  };

  const verifyUserAccess = (id: string) => {
    verifyAdminTenantAccess();
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      throw new Error(`Unauthorized: User ${id} does not belong to this restaurant.`);
    }
    if (!doesUserBelongToRestaurant(targetUser, targetRestaurantId, tenant?.tenant)) {
      throw new Error(`Unauthorized: User ${id} belongs to another restaurant.`);
    }
    return true;
  };

  const updateUserRole = async (id: string, role: string) => {
    verifyUserAccess(id);
    if (!isSuperAdmin && currentUser?.id === id) {
      throw new Error('Unauthorized: You cannot change your own role.');
    }
    if (role === 'super_admin' || role === 'superadmin') {
      throw new Error('Unauthorized: Cannot assign Super Admin role to restaurant users.');
    }
    const allowedRole = (role === 'admin' || role === 'restaurant_owner' || role === 'restaurant_manager') ? role : 'staff';
    await updateDoc(doc(db, 'users', id), { role: allowedRole });
  };

  const updateUserStatus = async (id: string, status: 'active' | 'inactive') => {
    verifyUserAccess(id);
    if (currentUser?.id === id && status === 'inactive') {
      throw new Error('Unauthorized: You cannot deactivate your own account.');
    }
    const targetUser = users.find(u => u.id === id);
    if (status === 'active' && targetUser?.status !== 'active') {
      const check = checkCanCreateResource(tenant?.entitlements, 'staff', activeStaffCount);
      if (!check.allowed) {
        throw new Error(check.reasonPt || check.reason || 'Staff account limit reached for current subscription package.');
      }
    }
    await updateDoc(doc(db, 'users', id), { status });
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    verifyUserAccess(id);
    if (!isSuperAdmin && currentUser?.id === id && data.role && data.role !== currentUser.role) {
      throw new Error('Unauthorized: You cannot change your own role.');
    }
    const updateData: Record<string, any> = { ...data };
    if (updateData.role === 'super_admin' || updateData.role === 'superadmin') {
      delete updateData.role;
    }
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    // Strictly lock user to this restaurant tenant
    updateData.restaurantId = targetRestaurantId;
    updateData.restaurantIds = [targetRestaurantId];
    await updateDoc(doc(db, 'users', id), updateData);
  };

  const addUser = async (userData: Omit<User, 'id'>, password?: string) => {
    verifyAdminTenantAccess();

    // Enforce subscription package staff accounts limit
    const limitCheck = checkCanCreateResource(tenant?.entitlements, 'staff', activeStaffCount);
    if (!limitCheck.allowed) {
      throw new Error(
        limitCheck.reasonPt ||
        limitCheck.reason ||
        'Staff account limit reached for your subscription package. Please upgrade to add more staff.'
      );
    }

    const finalRestaurantId = normalizeTenantIdentifier(
      isSuperAdmin ? (userData.restaurantId || targetRestaurantId) : targetRestaurantId
    );

    if (!finalRestaurantId) {
      throw new Error('Cannot create staff or admin account without a valid restaurant assignment.');
    }

    const cleanEmail = (userData.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Email address is required.');
    }

    const allowedRole =
      userData.role === 'admin' ||
      userData.role === 'restaurant_owner' ||
      userData.role === 'restaurant_manager'
        ? userData.role
        : 'staff';

    const userToSave = {
      ...userData,
      email: cleanEmail,
      role: allowedRole,
      restaurantId: finalRestaurantId,
      restaurantIds: [finalRestaurantId],
    };

    if (password) {
      const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        let result;
        try {
          result = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
        } catch (initialErr: any) {
          if (initialErr.code === 'auth/email-already-in-use') {
            // Only clean up if the email is an orphaned Auth record (NOT an active user in another restaurant!)
            try {
              const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
              const res = await fetch('/api/admin/delete-user-by-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  email: cleanEmail,
                  restaurantId: finalRestaurantId,
                })
              });
              if (res.ok) {
                result = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
              } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(
                  errData.error || 'This email is already registered to another account. Please use a unique email address.'
                );
              }
            } catch (cleanupErr: any) {
              throw cleanupErr?.message ? cleanupErr : initialErr;
            }
          } else {
            throw initialErr;
          }
        }
        
        const uid = result.user.uid;
        await setDoc(doc(db, 'users', uid), {
          ...userToSave,
          id: uid,
          authUid: uid,
          restaurantId: finalRestaurantId,
          restaurantIds: [finalRestaurantId],
          createdAt: serverTimestamp(),
        });
        
        await signOut(secondaryAuth);
      } catch (error: any) {
        console.error('Error adding user:', error);
        throw error;
      }
    } else {
      let friendlyId = cleanEmail ? cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'user';
      friendlyId += '-' + Math.random().toString(36).substring(2, 6);
      
      await setDoc(doc(db, 'users', friendlyId), {
        ...userToSave,
        id: friendlyId,
        restaurantId: finalRestaurantId,
        restaurantIds: [finalRestaurantId],
        createdAt: serverTimestamp(),
      });
    }
  };

  const deleteUser = async (id: string) => {
    verifyUserAccess(id);
    if (currentUser?.id === id) {
      throw new Error('Unauthorized: You cannot delete your own account.');
    }
    try {
      let authUid = null;
      let email = null;
      
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const docData = userDoc.data() as User;
        if (!isSuperAdmin && !doesUserBelongToRestaurant(docData, targetRestaurantId, tenant?.tenant)) {
          throw new Error('Unauthorized: Cannot delete a user belonging to another restaurant.');
        }
        authUid = docData.authUid || docData.id;
        email = docData.email;
      }
      
      if ((authUid && authUid.length > 10) || email) { 
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
          const res = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              uid: authUid || null,
              email: email || null,
              restaurantId: targetRestaurantId,
            })
          });
          if (!res.ok) {
            console.error('Failed to delete auth user');
          }
        } catch (e) {
          console.error('Error calling delete API:', e);
        }
      }

      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  return {
    users,
    loading,
    activeStaffCount,
    staffLimitCheck,
    updateUserRole,
    updateUserStatus,
    updateUser,
    addUser,
    deleteUser,
  };
}
