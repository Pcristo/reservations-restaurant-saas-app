import { collection, getDocs, setDoc, updateDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface AssistanceRequest {
  id: string;
  ticketNumber?: string;
  restaurantId: string;
  restaurantName: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject?: string;
  description: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'In Progress' | 'Waiting for Restaurant' | 'Resolved' | 'Rejected' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  [key: string]: any;
}

export const ASSISTANCE_STATUSES = [
  'Pending',
  'Under Review',
  'Approved',
  'In Progress',
  'Waiting for Restaurant',
  'Resolved',
  'Rejected',
  'Cancelled'
] as const;

export const ASSISTANCE_STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-500',
  'Under Review': 'bg-blue-500',
  'Approved': 'bg-purple-500',
  'In Progress': 'bg-cyan-500',
  'Waiting for Restaurant': 'bg-yellow-400',
  'Resolved': 'bg-green-600',
  'Rejected': 'bg-red-500',
  'Cancelled': 'bg-gray-400',
};

export async function fetchAssistanceRequests(restaurantId?: string): Promise<AssistanceRequest[]> {
  try {
    const colRef = collection(db, 'assistance_requests');
    let q = query(colRef);
    if (restaurantId) {
      q = query(colRef, where('restaurantId', '==', restaurantId));
    }
    const snap = await getDocs(q);
    const list: AssistanceRequest[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AssistanceRequest);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error('Error fetching assistance requests:', err);
    return [];
  }
}

export async function createAssistanceRequest(data: {
  restaurantId: string;
  restaurantName: string;
  userId: string;
  userEmail: string;
  userName: string;
  description: string;
  subject?: string;
}): Promise<{ id: string; ticketNumber: string; [key: string]: any }> {
  const colRef = collection(db, 'assistance_requests');
  const now = new Date().toISOString();
  const docRef = doc(colRef);
  const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const payload = {
    ticketNumber,
    restaurantId: data.restaurantId || 'default-restaurant',
    restaurantName: data.restaurantName || 'Restaurant',
    userId: data.userId || 'unknown',
    userEmail: data.userEmail || 'unknown',
    userName: data.userName || 'unknown',
    description: data.description,
    subject: data.subject || 'Support Request',
    status: 'Pending' as const,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, payload);
  return { id: docRef.id, ...payload };
}

export async function updateAssistanceRequest(requestId: string, subject: string, description: string): Promise<void> {
  const docRef = doc(db, 'assistance_requests', requestId);
  await updateDoc(docRef, {
    subject,
    description,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAssistanceRequest(requestId: string): Promise<void> {
  const docRef = doc(db, 'assistance_requests', requestId);
  await deleteDoc(docRef);
}

export async function updateAssistanceRequestStatus(requestId: string, status: string, adminNotes?: string): Promise<void> {
  const docRef = doc(db, 'assistance_requests', requestId);
  const updateData: any = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }
  await updateDoc(docRef, updateData);
}
