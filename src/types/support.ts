export type SupportRequestStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'waiting_for_restaurant' 
  | 'active' 
  | 'approved' 
  | 'resolved' 
  | 'rejected' 
  | 'expired' 
  | 'revoked' 
  | 'closed' 
  | 'completed'
  | 'Pending'
  | 'Approved'
  | 'Active'
  | 'Completed'
  | 'Expired'
  | 'Rejected'
  | string;

export type SupportIssueCategory = 
  | 'general' 
  | 'technical' 
  | 'billing' 
  | 'reservations' 
  | 'tables' 
  | 'urgent' 
  | 'configuration'
  | 'settings'
  | 'floor_plan'
  | 'email_notifications'
  | 'booking_page'
  | 'domains'
  | 'account'
  | 'other'
  | string;

export interface SupportAuditLogEntry {
  id: string;
  action: string;
  timestamp: string;
  actor: string;
  details?: Record<string, any>;
  superAdminEmail?: string;
  superAdminName?: string;
  restaurantId?: string;
  [key: string]: any;
}

export type SupportAuditEvent = SupportAuditLogEntry;

export interface SupportSession {
  id: string;
  restaurantId: string;
  adminId: string;
  requestId?: string;
  status?: string;
  expiresAt?: string;
  superAdminName?: string;
  superAdminEmail?: string;
  reason?: string;
  createdAt?: string;
  endedAt?: string;
  [key: string]: any;
}

export interface SupportRequest {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug?: string;
  userEmail: string;
  userName?: string;
  description: string;
  subject?: string;
  status: SupportRequestStatus | string;
  category?: SupportIssueCategory | string;
  requestedByName?: string;
  requestedByRole?: string;
  assignedSuperAdminName?: string;
  assignedSuperAdminEmail?: string;
  decisionNote?: string;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}
