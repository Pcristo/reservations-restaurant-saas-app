export type ReservationStatus = 
  | 'pending' 
  | 'booked' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'blocked' 
  | 'arrived' 
  | 'no-show' 
  | 'waiting-list' 
  | 'delayed' 
  | 'history';

export interface ReservationEmailLog {
  sent: boolean;
  sentAt?: string | null;
  messageId?: string;
  failed?: boolean;
  error?: string;
  lastAttemptAt?: string;
}

export interface ReservationReminderEmailLog {
  scheduled: boolean;
  scheduledAt?: string | null;
  scheduledFor?: string | null;
  sent: boolean;
  sentAt?: string | null;
  messageId?: string | null;
}

export interface Reservation {
  id: string;
  restaurantId?: string;
  bookingNumber?: string;
  customerUid?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  language?: 'pt' | 'en';
  date: string;
  time: string;
  guests: number;
  tableId?: string;
  tableName?: string;
  notes?: string;
  status: ReservationStatus;
  isWaitlist?: boolean;
  isDeleted?: boolean;
  isHistory?: boolean;
  createdAt?: string;
  source?: 'public' | 'admin';
  bookedByStaffNumber?: string;
  showInUpcomingReports?: boolean;
  verifyTableNumber?: boolean;
  preferredTableUnavailable?: boolean;
  isRegularCustomer?: boolean;
  isDeletedByCustomer?: boolean;
  manualSession?: 'lunch' | 'dinner';
  session?: 'lunch' | 'dinner' | string;
  lastModifiedAt?: string;
  lastModifiedBy?: 'customer' | 'staff' | 'system';
  modificationCount?: number;
  onlineModificationCount?: number;
  modifiedByCustomer?: boolean;
  modifiedOnline?: boolean;
  hasBeenModifiedOnline?: boolean;
  customerModifiedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  history?: ReservationHistoryEntry[];
  confirmationEmail?: ReservationEmailLog;
  reminderEmail?: ReservationReminderEmailLog;
}

export interface ReservationHistoryEntry {
  timestamp: string;
  action: 'created' | 'modified_by_customer' | 'cancelled_by_customer' | 'status_change' | 'modified_by_staff' | string;
  changedBy: 'customer' | 'staff' | 'system' | string;
  details?: string;
  previousValues?: {
    date?: string;
    time?: string;
    guests?: number;
    notes?: string;
    status?: string;
  };
  newValues?: {
    date?: string;
    time?: string;
    guests?: number;
    notes?: string;
    status?: string;
  };
  reason?: string;
}

export interface ReservationConflictResult {
  hasConflict: boolean;
  conflictingReservation?: Reservation;
  isBlocked?: boolean;
  reason?: 'blocked_date' | 'blocked_reservation' | 'overlapping_reservation';
}
