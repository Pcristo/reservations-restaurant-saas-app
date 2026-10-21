import { collection, getDocs, setDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface AssistanceRequest {
  id: string;
  restaurantId: string;
  restaurantName: string;
  userId: string;
  userEmail: string;
  userName: string;
  description: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'In Progress' | 'Waiting for Restaurant' | 'Resolved' | 'Rejected' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
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
}): Promise<string> {
  const colRef = collection(db, 'assistance_requests');
  const now = new Date().toISOString();
  const docRef = doc(colRef);
  await setDoc(docRef, {
    restaurantId: data.restaurantId,
    restaurantName: data.restaurantName,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName,
    description: data.description,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
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
