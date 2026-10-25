// Edge-compatible Firebase Auth and Firestore REST API helpers

import firebaseConfig from '../../firebase-applet-config.json';

export function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.mapValue?.fields !== undefined) result[key] = parseFirestoreFields(val.mapValue.fields);
    else if (val.nullValue !== undefined) result[key] = null;
    else if (val.arrayValue?.values !== undefined) {
      result[key] = val.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.mapValue?.fields !== undefined) return parseFirestoreFields(v.mapValue.fields);
        return v;
      });
    } else result[key] = val;
  }
  return result;
}

export async function getFirestoreSettings(env: Record<string, any> = {}, restaurantId?: string): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const docIds = Array.from(new Set([restaurantId, 'main', 'default-restaurant', 'dinemaster-bistro'].filter(Boolean))) as string[];
  const dbIds = [databaseId, '(default)'];

  let result: Record<string, any> = {};

  // 1. Try settings collection documents
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/settings/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            const parsed = parseFirestoreFields(doc.fields);
            result = { ...parsed, ...result };
            if (result.name || result.restaurantName) {
              break;
            }
          }
        }
      } catch (e) {
        // try next
      }
    }
    if (result.name || result.restaurantName) break;
  }

  // 2. Try restaurants collection documents for tenant branding and contact info
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/restaurants/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            const parsed = parseFirestoreFields(doc.fields);
            if (!result.name && parsed.name) result.name = parsed.name;
            if (!result.restaurantName && parsed.name) result.restaurantName = parsed.name;
            if (!result.logoUrl && parsed.logoUrl) result.logoUrl = parsed.logoUrl;
            if (!result.logoUrl && parsed.cloudinaryLogoUrl) result.logoUrl = parsed.cloudinaryLogoUrl;
            if (!result.logoUrl && parsed.branding?.logoUrl) result.logoUrl = parsed.branding.logoUrl;
            if (!result.email && parsed.email) result.email = parsed.email;
            if (!result.phone && parsed.phone) result.phone = parsed.phone;
            if (!result.address && parsed.address) result.address = parsed.address;
            if (!result.city && parsed.city) result.city = parsed.city;
            if (!result.postcode && (parsed.postcode || parsed.postalCode || parsed.zipCode)) result.postcode = parsed.postcode || parsed.postalCode || parsed.zipCode;
            if (!result.primaryColor && (parsed.primaryColor || parsed.branding?.primaryColor)) result.primaryColor = parsed.primaryColor || parsed.branding?.primaryColor;
            if (!result.websiteUrl && (parsed.website || parsed.websiteUrl)) result.websiteUrl = parsed.website || parsed.websiteUrl;
            if (!result.timezone && parsed.timezone) result.timezone = parsed.timezone;
            if (result.customerManagement === undefined && parsed.customerManagement !== undefined) {
              result.customerManagement = parsed.customerManagement;
            }
            if (result.allowCancellation === undefined && parsed.allowCancellation !== undefined) {
              result.allowCancellation = parsed.allowCancellation;
            }
            if (result.allowModification === undefined && parsed.allowModification !== undefined) {
              result.allowModification = parsed.allowModification;
            }
            if (result.allowCustomerCancellation === undefined && parsed.allowCustomerCancellation !== undefined) {
              result.allowCustomerCancellation = parsed.allowCustomerCancellation;
            }
            if (result.allowCustomerModification === undefined && parsed.allowCustomerModification !== undefined) {
              result.allowCustomerModification = parsed.allowCustomerModification;
            }
            break;
          }
        }
      } catch (e) {
        // try next
      }
    }
  }

  // Handle settings branding.logoUrl if set
  if (!result.logoUrl && result.branding?.logoUrl) {
    result.logoUrl = result.branding.logoUrl;
  }
  if (!result.logoUrl && result.cloudinaryLogoUrl) {
    result.logoUrl = result.cloudinaryLogoUrl;
  }
  if (!result.logoUrl && result.branding?.cloudinaryLogoUrl) {
    result.logoUrl = result.branding.cloudinaryLogoUrl;
  }
  if (result.logoUrl) {
    result.logoUrl = (result.logoUrl || '').trim();
  }

  // Consolidate customer management flags:
  // If the restaurant has disabled the option for customers to modify or cancel bookings themselves,
  // ensure allowCustomerModification / allowCustomerCancellation are false.
  let allowCustomerModification = true;
  if (
    result.customerManagement?.allowCustomerModification === false ||
    result.allowCustomerModification === false ||
    result.allowModification === false
  ) {
    allowCustomerModification = false;
  }
  result.allowCustomerModification = allowCustomerModification;

  let allowCustomerCancellation = true;
  if (
    result.customerManagement?.allowCustomerCancellation === false ||
    result.allowCustomerCancellation === false ||
    result.allowCancellation === false
  ) {
    allowCustomerCancellation = false;
  }
  result.allowCustomerCancellation = allowCustomerCancellation;

  return result;
}

export async function getPlatformSettings(env: Record<string, any> = {}): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const docIds = ['general', 'main'];
  const dbIds = [databaseId, '(default)'];
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/platform_settings/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            return parseFirestoreFields(doc.fields);
          }
        }
      } catch (e) {
        // try next
      }
    }
  }
  return {};
}

export async function getPlatformFeatureFlags(env: Record<string, any> = {}): Promise<Array<{ id: string; enabled: boolean }>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const dbIds = [databaseId, '(default)'];
  for (const dbId of dbIds) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/platform_settings/feature_flags?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const doc = await res.json();
        if (doc.fields) {
          const parsed = parseFirestoreFields(doc.fields);
          if (Array.isArray(parsed.flags)) {
            return parsed.flags;
          }
        }
      }
    } catch (e) {
      // try next
    }
  }
  return [];
}

export async function getMarketingWebsiteSettingsRest(env: Record<string, any> = {}): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const dbIds = [databaseId, '(default)'];
  for (const dbId of dbIds) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/settings/marketing_website?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const doc = await res.json();
        if (doc.fields) {
          return parseFirestoreFields(doc.fields);
        }
      }
    } catch (e) {
      // try next
    }
  }
  return {};
}

export async function verifyAuthToken(idToken: string, env: Record<string, any> = {}): Promise<{ success: boolean; uid?: string; email?: string; error?: string }> {
  if (!idToken) {
    return { success: false, error: 'No authorization token provided' };
  }
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.users || data.users.length === 0) {
      return { success: false, error: data?.error?.message || 'Invalid or expired auth token' };
    }
    const user = data.users[0];
    return { success: true, uid: user.localId, email: user.email };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication failed' };
  }
}

export function encodeFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (v === null) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        fields[k] = { integerValue: String(v) };
      } else {
        fields[k] = { doubleValue: v };
      }
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: v.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (typeof item === 'object' && item !== null) return { mapValue: { fields: encodeFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: encodeFirestoreFields(v) } };
    }
  }
  return fields;
}

export async function saveFirestoreDocRest(
  collectionName: string, 
  docId: string, 
  data: Record<string, any>, 
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const fields = encodeFirestoreFields(data);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || `Failed to save document: status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save document' };
  }
}

export async function createUserInAuth(
  email: string,
  password?: string,
  displayName?: string,
  env: Record<string, any> = {}
): Promise<{ success: boolean; uid?: string; user?: any; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const body: Record<string, any> = {
      email,
      returnSecureToken: true
    };
    if (password) body.password = password;
    if (displayName) body.displayName = displayName;

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error?.message === 'EMAIL_EXISTS') {
        const lookup = await lookupUserByEmail(email, env);
        if (lookup.success && lookup.user) {
          if (password) {
            await updateUserPasswordInAuth(lookup.user.localId, password, env);
          }
          return { success: true, uid: lookup.user.localId, user: lookup.user };
        }
      }
      return { success: false, error: data?.error?.message || `Failed to create auth user: ${res.status}` };
    }

    return { success: true, uid: data.localId, user: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error creating user in Firebase Auth' };
  }
}


export async function deleteUserFromAuth(uid: string, env: Record<string, any> = {}): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      // If user not found, treat as already deleted
      if (data?.error?.message === 'USER_NOT_FOUND') {
        return { success: true };
      }
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function lookupUserByEmail(email: string, env: Record<string, any> = {}): Promise<{ success: boolean; user?: any; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [email] })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error?.message === 'EMAIL_NOT_FOUND') {
        return { success: true, user: null };
      }
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }

    const user = data.users && data.users.length > 0 ? data.users[0] : null;
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function updateUserInAuth(
  uid: string, 
  updates: { email?: string; password?: string; displayName?: string }, 
  env: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const body: Record<string, any> = { localId: uid };
    if (updates.email) body.email = updates.email;
    if (updates.password) body.password = updates.password;
    if (updates.displayName) body.displayName = updates.displayName;

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function updateUserPasswordInAuth(uid: string, newPassword: string, env: Record<string, any> = {}): Promise<{ success: boolean; error?: string }> {
  return updateUserInAuth(uid, { password: newPassword }, env);
}

export async function deleteFirestoreDocRest(
  collectionName: string, 
  docId: string, 
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok && res.status !== 404) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || `Failed to delete document: status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete document' };
  }
}

export async function deleteMatchingDocsRest(
  collectionName: string,
  fieldName: string,
  fieldValue: string,
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: { stringValue: fieldValue }
            }
          }
        }
      })
    });

    if (!queryRes.ok) {
      return { success: false, count: 0 };
    }

    const results = await queryRes.json().catch(() => []);
    let deletedCount = 0;

    if (Array.isArray(results)) {
      for (const item of results) {
        if (item.document?.name) {
          const docPath = item.document.name;
          const deleteUrl = `https://firestore.googleapis.com/v1/${docPath}?key=${apiKey}`;
          await fetch(deleteUrl, { method: 'DELETE', headers }).catch(() => {});
          deletedCount++;
        }
      }
    }

    return { success: true, count: deletedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}

export async function getFirestoreDocRest(
  collectionName: string,
  docId: string,
  env: Record<string, any> = {},
  idToken?: string
): Promise<Record<string, any> | null> {
  if (!docId) return null;
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const doc = await res.json().catch(() => null);
    if (!doc || !doc.fields) return null;
    return parseFirestoreFields(doc.fields);
  } catch {
    return null;
  }
}

export async function queryFirestoreDocsRest(
  collectionName: string,
  fieldName: string,
  fieldValue: string,
  env: Record<string, any> = {},
  idToken?: string
): Promise<Array<Record<string, any>>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: { stringValue: fieldValue }
            }
          }
        }
      })
    });
    if (!queryRes.ok) return [];
    const results = await queryRes.json().catch(() => []);
    if (!Array.isArray(results)) return [];
    const docs: Array<Record<string, any>> = [];
    for (const item of results) {
      if (item.document?.fields) {
        const parsed = parseFirestoreFields(item.document.fields);
        const nameParts = String(item.document.name || '').split('/');
        const docId = nameParts[nameParts.length - 1];
        docs.push({ id: docId, ...parsed });
      }
    }
    return docs;
  } catch {
    return [];
  }
}

export async function listFirestoreDocsRest(
  collectionName: string,
  env: Record<string, any> = {},
  idToken?: string
): Promise<Array<Record<string, any>>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}?key=${apiKey}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({ documents: [] }));
    const docs: Array<Record<string, any>> = [];
    if (data.documents) {
      for (const item of data.documents) {
        if (item.fields) {
          const parsed = parseFirestoreFields(item.fields);
          const nameParts = String(item.name || '').split('/');
          const docId = nameParts[nameParts.length - 1];
          docs.push({ id: docId, ...parsed });
        }
      }
    }
    return docs;
  } catch {
    return [];
  }
}

export interface FirebaseEnv {
  VITE_FIREBASE_API_KEY?: string;
  FIREBASE_API_KEY?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_DATABASE_ID?: string;
  FIREBASE_DATABASE_ID?: string;
}

export async function verifyIdToken(idToken: string, env: Record<string, any> = {}): Promise<{ localId: string; email?: string }> {
  const res = await verifyAuthToken(idToken, env);
  if (!res.success || !res.uid) {
    throw new Error(res.error || 'Unauthorized');
  }
  return { localId: res.uid, email: res.email };
}

export async function firestoreGet(env: Record<string, any>, collectionName: string, docId: string): Promise<Record<string, any> | null> {
  return getFirestoreDocRest(collectionName, docId, env);
}

export async function firestoreSet(env: Record<string, any>, collectionName: string, docId: string, data: Record<string, any>): Promise<void> {
  const res = await saveFirestoreDocRest(collectionName, docId, data, env);
  if (!res.success) throw new Error(res.error || 'Failed to save document');
}

export async function firestorePatch(env: Record<string, any>, collectionName: string, docId: string, data: Record<string, any>): Promise<void> {
  const existing = (await getFirestoreDocRest(collectionName, docId, env)) || {};
  const merged = { ...existing, ...data };
  const res = await saveFirestoreDocRest(collectionName, docId, merged, env);
  if (!res.success) throw new Error(res.error || 'Failed to patch document');
}

export async function firestoreDelete(env: Record<string, any>, collectionName: string, docId: string): Promise<void> {
  const res = await deleteFirestoreDocRest(collectionName, docId, env);
  if (!res.success) throw new Error(res.error || 'Failed to delete document');
}

export async function firestoreQuery(env: Record<string, any>, collectionName: string, wheres: Array<{ field: string; op: string; value: any }>): Promise<Array<Record<string, any>>> {
  if (wheres.length === 0) return [];
  const w = wheres[0];
  return queryFirestoreDocsRest(collectionName, w.field, w.value, env);
}



