export interface EmailBasePayload {
  email: string;
  name?: string;
  customerName?: string;
  reservationId?: string;
  restaurantId?: string;
  restaurantName?: string;
  language?: 'en' | 'pt';
  date?: string;
  time?: string;
  guests?: number;
  table?: string;
  tableNumber?: string;
  bookingNumber?: string;
  notes?: string;
  specialRequests?: string;
  primaryColor?: string;
  logoUrl?: string;
  restaurantEmail?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantPostcode?: string;
  restaurantCity?: string;
  restaurantWebsite?: string;
  timezone?: string;
  status?: string;
  cancellationReason?: string;
  cancelUrl?: string;
  modifyUrl?: string;
  viewUrl?: string;
  canModifyOnline?: boolean;
  canCancelOnline?: boolean;
  allowCustomerModification?: boolean;
  allowCustomerCancellation?: boolean;
  alreadyModifiedOnline?: boolean;
  previousDetails?: {
    date?: string;
    time?: string;
    guests?: number;
  };
}

export interface EmailServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function postEmailEndpoint(endpoint: string, payload: Record<string, unknown>): Promise<EmailServiceResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: Failed to send email`
      };
    }

    return {
      success: true,
      messageId: data.messageId || data.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network error while sending email'
    };
  }
}

export async function sendConfirmationEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  const normalized = {
    ...payload,
    name: payload.name || payload.customerName,
    table: payload.table || payload.tableNumber,
    notes: payload.notes || payload.specialRequests,
    specialRequests: payload.specialRequests || payload.notes
  };
  return postEmailEndpoint('/api/email/confirmation', normalized as unknown as Record<string, unknown>);
}

export async function sendReminderEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  const normalized = {
    ...payload,
    name: payload.name || payload.customerName,
    table: payload.table || payload.tableNumber,
    notes: payload.notes || payload.specialRequests,
    specialRequests: payload.specialRequests || payload.notes
  };
  return postEmailEndpoint('/api/email/reminder', normalized as unknown as Record<string, unknown>);
}

export async function sendCancellationEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  const normalized = {
    ...payload,
    name: payload.name || payload.customerName,
    table: payload.table || payload.tableNumber,
    notes: payload.notes || payload.specialRequests
  };
  return postEmailEndpoint('/api/email/cancellation', normalized as unknown as Record<string, unknown>);
}

export async function sendUpdateEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  const normalized = {
    ...payload,
    name: payload.name || payload.customerName,
    table: payload.table || payload.tableNumber,
    notes: payload.notes || payload.specialRequests,
    specialRequests: payload.specialRequests || payload.notes
  };
  return postEmailEndpoint('/api/email/update', normalized as unknown as Record<string, unknown>);
}

export async function sendTestEmail(payload: { 
  email: string; 
  restaurantName?: string; 
  apiKey?: string; 
  fromEmail?: string; 
  primaryColor?: string;
  logoUrl?: string;
  restaurantEmail?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantPostcode?: string;
  restaurantCity?: string;
  restaurantWebsite?: string;
  language?: string;
}): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/test', payload as Record<string, unknown>);
}
