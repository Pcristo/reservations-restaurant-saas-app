import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SupportRequest, SupportSession, SupportAuditEvent, SupportRequestStatus } from '../types/support';

export const listSupportRequests = async (): Promise<SupportRequest[]> => {
  try {
    const q = query(collection(db, 'support_requests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportRequest));
  } catch (err) {
    console.warn('[supportService] Error listing support requests:', err);
    return [];
  }
};

export const updateSupportRequestStatus = async (
  requestId: string,
  status: SupportRequestStatus | string,
  extra?: Record<string, any>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'support_requests', requestId), {
      status,
      updatedAt: new Date().toISOString(),
      ...(extra || {})
    });
  } catch (err) {
    console.warn('[supportService] Error updating status:', err);
  }
};

export const startSupportSession = async (
  requestId: string,
  restaurantId: string,
  adminData: { id: string; name?: string; email?: string },
  reason?: string
): Promise<SupportSession | null> => {
  try {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const newSession: SupportSession = {
      id: sessionId,
      requestId,
      restaurantId,
      adminId: adminData.id,
      superAdminEmail: adminData.email || '',
      superAdminName: adminData.name || '',
      reason: reason || 'Technical troubleshooting assistance',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    await setDoc(doc(db, 'support_sessions', sessionId), newSession);
    await updateSupportRequestStatus(requestId, 'active', {
      activeSessionId: sessionId,
      assignedSuperAdminName: adminData.name || '',
      assignedSuperAdminEmail: adminData.email || '',
    });
    
    await logSupportAction({
      action: 'session_started',
      actorId: adminData.id,
      actorEmail: adminData.email,
      targetRestaurantId: restaurantId,
      details: { sessionId, requestId, reason }
    });

    return newSession;
  } catch (err) {
    console.warn('[supportService] Error starting support session:', err);
    return null;
  }
};

export const endSupportSession = async (sessionId: string, notes?: string, actor?: any): Promise<void> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'support_sessions', sessionId));
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const sessionData = sessionDoc.data() as SupportSession;

    await updateDoc(doc(db, 'support_sessions', sessionId), {
      status: 'ended',
      endedAt: new Date().toISOString(),
      closingNotes: notes || ''
    });
    
    await logSupportAction({
      action: 'session_ended',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetRestaurantId: sessionData.restaurantId,
      details: { sessionId, notes }
    });
  } catch (err) {
    console.warn('[supportService] Error ending support session:', err);
  }
};

export const listSupportSessions = async (): Promise<SupportSession[]> => {
  try {
    const q = query(collection(db, 'support_sessions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportSession));
  } catch (err) {
    console.warn('[supportService] Error listing support sessions:', err);
    return [];
  }
};

export const listSupportAuditEvents = async (): Promise<SupportAuditEvent[]> => {
  try {
    const q = query(collection(db, 'support_audit_events'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportAuditEvent));
  } catch (err) {
    console.warn('[supportService] Error listing audit events:', err);
    return [];
  }
};

export const getActiveSupportSession = async (restaurantId: string): Promise<SupportSession | null> => {
  try {
    const q = query(
      collection(db, 'support_sessions'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as SupportSession;
    }
  } catch (err) {
    console.warn('[supportService] Error getting active session:', err);
  }
  return null;
};

export const subscribeToActiveSession = (restaurantId: string, cb: (session: SupportSession | null) => void) => {
  try {
    const q = query(
      collection(db, 'support_sessions'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'active')
    );
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        cb({ id: snap.docs[0].id, ...snap.docs[0].data() } as SupportSession);
      } else {
        cb(null);
      }
    });
  } catch {
    cb(null);
    return () => {};
  }
};

export const validateSupportSession = async (restaurantId: string, sessionId?: string) => {
  if (!sessionId) return { valid: false, session: null, reason: 'No session ID' };
  try {
    const snap = await getDoc(doc(db, 'support_sessions', sessionId));
    if (snap.exists()) {
      const data = snap.data() as SupportSession;
      if (data.restaurantId === restaurantId && data.status === 'active') {
        return { valid: true, session: data, reason: '' };
      }
    }
  } catch (e: any) {
    return { valid: false, session: null, reason: e.message };
  }
  return { valid: false, session: null, reason: 'Session invalid or expired' };
};

export const logSupportAction = async (data: Record<string, any>) => {
  try {
    const id = `audit_${Date.now()}`;
    await setDoc(doc(db, 'support_audit_events', id), {
      id,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch {}
};

export const subscribeToAllSupportRequests = (cb: (reqs: SupportRequest[]) => void) => {
  try {
    const q = query(collection(db, 'support_requests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportRequest)));
    });
  } catch {
    cb([]);
    return () => {};
  }
};

export const supportService = {
  listSupportRequests,
  updateSupportRequestStatus,
  startSupportSession,
  endSupportSession,
  listSupportSessions,
  listSupportAuditEvents,
  getActiveSupportSession,
  subscribeToActiveSession,
  validateSupportSession,
  logSupportAction,
  subscribeToAllSupportRequests
};

export default supportService;
