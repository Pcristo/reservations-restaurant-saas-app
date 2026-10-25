import { Customer } from '../types/customer';
import { parseISO, addMinutes, isBefore, isAfter, isSameDay } from 'date-fns';
import { getEffectiveOpeningHours, getSessionFromTime } from './utils';

/**
 * Normalizes a phone string for robust comparison.
 * Removes spaces, dashes, parentheses, dots, etc.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '').trim();
}

/**
 * Extracts numeric digits only from a phone string.
 */
export function getPhoneDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Compares two phone numbers intelligently (handles international codes like +351, leading zeros, formatting).
 */
export function arePhonesMatching(phoneA?: string, phoneB?: string): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  if (normA.toLowerCase() === normB.toLowerCase()) return true;

  const digitsA = getPhoneDigits(phoneA);
  const digitsB = getPhoneDigits(phoneB);
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;

  // Suffix matching for standard national numbers (minimum 7 digits)
  if (digitsA.length >= 7 && digitsB.length >= 7) {
    if (digitsA.endsWith(digitsB) || digitsB.endsWith(digitsA)) {
      return true;
    }
  }
  return false;
}

/**
 * Compares two customer names flexibly (case-insensitive, trims extra spaces).
 */
export function areNamesMatching(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = nameA.trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanB = nameB.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Name part matching for full names (e.g. "Pedro Cristo" matches "Pedro Cristo")
  const partsA = cleanA.split(' ').filter(p => p.length >= 2);
  const partsB = cleanB.split(' ').filter(p => p.length >= 2);
  if (partsA.length >= 2 && partsB.length >= 2) {
    if (partsA.every(p => partsB.includes(p)) || partsB.every(p => partsA.includes(p))) {
      return true;
    }
  }
  return false;
}

export interface CustomerLookupQuery {
  customerUid?: string;
  userId?: string;
  id?: string;
  customerEmail?: string;
  email?: string;
  customerPhone?: string;
  phone?: string;
  customerName?: string;
  name?: string;
}

export interface MatchedCustomerResult {
  customer: Customer | null;
  favoriteTables: string[];
  isRegular: boolean;
  isRegistered: boolean;
  allMatchingCustomers: Customer[];
}

/**
 * Locates all matching customer profiles across the collection and merges their favorite tables
 * in strict priority order (1st favorite, 2nd favorite, 3rd favorite).
 */
export function findMatchingCustomer(
  customersList: Customer[],
  query: CustomerLookupQuery
): MatchedCustomerResult {
  if (!customersList || !Array.isArray(customersList) || customersList.length === 0) {
    return {
      customer: null,
      favoriteTables: [],
      isRegular: false,
      isRegistered: false,
      allMatchingCustomers: []
    };
  }

  const uid = (query.customerUid || query.userId || query.id || '').trim();
  const email = (query.customerEmail || query.email || '').trim().toLowerCase();
  const phone = (query.customerPhone || query.phone || '').trim();
  const name = (query.customerName || query.name || '').trim().toLowerCase();

  const matchingCustomers: Customer[] = [];

  for (const c of customersList) {
    let isMatch = false;

    // 1. Match by UID / ID / authUid
    if (uid && (c.id === uid || (c as any).authUid === uid || (c as any).userId === uid)) {
      isMatch = true;
    }

    // 2. Match by Email
    if (!isMatch && email && c.email) {
      if (c.email.trim().toLowerCase() === email) {
        isMatch = true;
      }
    }

    // 3. Match by Phone
    if (!isMatch && phone && c.phone) {
      if (arePhonesMatching(phone, c.phone)) {
        isMatch = true;
      }
    }

    // 4. Match by Name
    if (!isMatch && name && c.name) {
      if (areNamesMatching(name, c.name)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matchingCustomers.push(c);
    }
  }

  // Aggregate favorite tables in priority order across all matching profiles
  const favoriteTables: string[] = [];

  // Sort matching customers so profiles with favoriteTables come first, then regulars, then registered
  matchingCustomers.sort((a, b) => {
    const aFavs = Array.isArray(a.favoriteTables) ? a.favoriteTables.length : 0;
    const bFavs = Array.isArray(b.favoriteTables) ? b.favoriteTables.length : 0;
    if (aFavs !== bFavs) return bFavs - aFavs;
    if (a.isRegular && !b.isRegular) return -1;
    if (!a.isRegular && b.isRegular) return 1;
    if (a.isRegistered && !b.isRegistered) return -1;
    if (!a.isRegistered && b.isRegistered) return 1;
    return 0;
  });

  for (const c of matchingCustomers) {
    if (Array.isArray(c.favoriteTables)) {
      for (const tId of c.favoriteTables) {
        if (tId && typeof tId === 'string' && !favoriteTables.includes(tId)) {
          favoriteTables.push(tId);
        }
      }
    }
  }

  const primaryCustomer = matchingCustomers[0] || null;
  const isRegular = matchingCustomers.some(c => !!c.isRegular);
  const isRegistered = matchingCustomers.some(c => !!c.isRegistered);

  return {
    customer: primaryCustomer ? { ...primaryCustomer, favoriteTables } : null,
    favoriteTables,
    isRegular,
    isRegistered,
    allMatchingCustomers: matchingCustomers
  };
}

export interface BestTableCandidate {
  table: any;
  overlappingCount: number;
  isFullyBooked: boolean;
}

export interface BestTableSelectionResult {
  tableId: string;
  verifyTableNumber: boolean;
  preferredTableUnavailable: boolean;
  assignedFavoriteIndex: number;
}

/**
 * Core table allocation algorithm with full favorite tables priority:
 * 1. Checks 1st favorite table. If available and seats >= guests -> ASSIGNS 1st favorite (verifyTableNumber = false).
 * 2. If 1st favorite is booked/unfit, checks 2nd favorite. If available -> ASSIGNS 2nd favorite (verifyTableNumber = false).
 * 3. Continues through 3rd, 4th, etc.
 * 4. If ALL favorite tables are booked or cannot seat the party, assigns the best available table
 *    (preferring the same section/room as favorite tables) AND sets verifyTableNumber = true (badge on booking).
 * 5. If customer has no favorites, assigns standard optimal table (verifyTableNumber = false).
 */
export function resolveBestTableWithFavorites({
  guests,
  date,
  time,
  tables,
  reservations,
  favoriteTables = [],
  settings,
  currentResId,
  manualSession
}: {
  guests: number;
  date: string;
  time: string;
  tables: any[];
  reservations: any[];
  favoriteTables?: string[];
  settings?: any;
  currentResId?: string;
  manualSession?: 'lunch' | 'dinner' | string;
}): BestTableSelectionResult {
  if (!tables || tables.length === 0 || !date || !time) {
    return {
      tableId: '',
      verifyTableNumber: false,
      preferredTableUnavailable: false,
      assignedFavoriteIndex: -1
    };
  }

  const targetDate = date;
  const targetTime = time;
  const gap = settings?.minReservationGap || 135;

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const newStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const newEnd = addMinutes(newStart, gap);

  let session: 'lunch' | 'dinner' | 'general' = 'general';
  if (manualSession === 'lunch' || manualSession === 'dinner') {
    session = manualSession;
  } else if (settings) {
    const eff = getEffectiveOpeningHours(targetDate, settings);
    if (eff?.lunch?.active && targetTime >= eff.lunch.open && targetTime < eff.lunch.close) {
      session = 'lunch';
    } else if (eff?.dinner?.active && targetTime >= eff.dinner.open && targetTime < eff.dinner.close) {
      session = 'dinner';
    }
  }

  // 1. Identify all valid candidate tables
  const validCandidates = tables.filter(table => {
    if (table.isActive === false) return false;
    if (session !== 'general' && table.activeSessions && table.activeSessions[session] === false) return false;

    const tableSeats = Number(table.seats);
    if (isNaN(tableSeats) || tableSeats < guests) return false;

    // Date & Session specific logic
    const selectedDateObj = parseISO(targetDate);
    if (table.isExtra) {
      const isAvailableOnDate = (table.availableDate && isSameDay(selectedDateObj, parseISO(table.availableDate))) || 
                               (table.availableDates && table.availableDates.includes(targetDate));
      
      let isAvailableForSession = true;
      if (session !== 'general' && table.extraAvailability?.[targetDate]) {
        isAvailableForSession = table.extraAvailability[targetDate][session] !== false;
      } else if (session !== 'general' && table.extraSessions) {
        isAvailableForSession = table.extraSessions[session] !== false;
      }

      if (!isAvailableOnDate || !isAvailableForSession) return false;
    } else if (table.availableDate) {
      const availDate = parseISO(table.availableDate);
      if (isBefore(selectedDateObj, availDate) && !isSameDay(selectedDateObj, availDate)) return false;
    }

    return true;
  });

  if (validCandidates.length === 0) {
    return {
      tableId: '',
      verifyTableNumber: favoriteTables.length > 0,
      preferredTableUnavailable: favoriteTables.length > 0,
      assignedFavoriteIndex: -1
    };
  }

  // 2. Overlap analysis
  const mappedTables: BestTableCandidate[] = validCandidates.map(table => {
    const sessionKey = session !== 'general' ? session : 'default';
    const currentJoin = table.dailyJoins?.[date]?.[sessionKey];
    const joinGroup = currentJoin && currentJoin.joinedTables && currentJoin.joinedTables.length > 0
      ? [table.id, ...currentJoin.joinedTables]
      : [table.id];

    // Check if table is blocked
    const isGroupBlocked = reservations.some(r => {
      return r.date === date && r.status === 'blocked' && joinGroup.includes(r.tableId || '');
    }) || joinGroup.some(tid => {
      const tObj = tables.find(t => t.id === tid);
      if (!tObj) return false;
      return !!(tObj.blockedDates?.[date]?.[sessionKey] || tObj.blockedDates?.[date]?.default || tObj.isBlocked);
    });

    if (isGroupBlocked) {
      return { table, overlappingCount: 999, isFullyBooked: true };
    }

    const overlappingRes = reservations.filter(r => {
      if (currentResId && r.id === currentResId) return false;
      if (!joinGroup.includes(r.tableId || '') || r.date !== date) return false;
      if (['cancelled', 'completed', 'no-show', 'blocked', 'waiting-list'].includes(r.status)) return false;
      if (!r.date || !r.time) return false;

      const [rYear, rMonth, rDay] = r.date.split('-').map(Number);
      const [rHours, rMinutes] = r.time.split(':').map(Number);
      const resStart = new Date(rYear, rMonth - 1, rDay, rHours, rMinutes, 0, 0);
      const resEnd = addMinutes(resStart, gap);

      return (
        (isBefore(newStart, resEnd) && (isAfter(newStart, resStart) || newStart.getTime() === resStart.getTime())) ||
        (isBefore(resStart, newEnd) && (isAfter(resStart, newStart) || resStart.getTime() === newStart.getTime()))
      );
    });

    return {
      table,
      overlappingCount: overlappingRes.length,
      isFullyBooked: overlappingRes.length >= 1
    };
  });

  const freeTables = mappedTables.filter(item => !item.isFullyBooked);

  if (freeTables.length === 0) {
    return {
      tableId: '',
      verifyTableNumber: favoriteTables.length > 0,
      preferredTableUnavailable: favoriteTables.length > 0,
      assignedFavoriteIndex: -1
    };
  }

  // 3. Favorite Tables Evaluation in exact priority order (1st, 2nd, 3rd...)
  if (favoriteTables && favoriteTables.length > 0) {
    for (let i = 0; i < favoriteTables.length; i++) {
      const favId = favoriteTables[i];
      const match = freeTables.find(ft => ft.table.id === favId);
      if (match) {
        // High priority favorite table found and free!
        return {
          tableId: match.table.id,
          verifyTableNumber: false,
          preferredTableUnavailable: false,
          assignedFavoriteIndex: i
        };
      }
    }

    // If we reach here, ALL favorite tables are booked or cannot accommodate party size.
    // Give another available table, preferring the same section/area as the favorites.
    const favoriteAreas = new Set(
      favoriteTables.map(id => tables.find(t => t.id === id)?.areaId).filter(Boolean)
    );

    freeTables.sort((a, b) => {
      // 1. Same area as favorites
      const aInArea = favoriteAreas.has(a.table.areaId);
      const bInArea = favoriteAreas.has(b.table.areaId);
      if (aInArea && !bInArea) return -1;
      if (!aInArea && bInArea) return 1;

      // 2. Best fit capacity (smallest seats >= guests)
      const seatsA = Number(a.table.seats || 0);
      const seatsB = Number(b.table.seats || 0);
      if (seatsA !== seatsB) return seatsA - seatsB;

      // 3. Alphabetical name
      return a.table.name.localeCompare(b.table.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return {
      tableId: freeTables[0].table.id,
      verifyTableNumber: true, // Mark "Verify Table" badge
      preferredTableUnavailable: true,
      assignedFavoriteIndex: -1
    };
  }

  // 4. Customer has no favorite tables: Sort by best fit capacity, then name
  freeTables.sort((a, b) => {
    const seatsA = Number(a.table.seats || 0);
    const seatsB = Number(b.table.seats || 0);
    if (seatsA !== seatsB) return seatsA - seatsB;
    return a.table.name.localeCompare(b.table.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return {
    tableId: freeTables[0].table.id,
    verifyTableNumber: false,
    preferredTableUnavailable: false,
    assignedFavoriteIndex: -1
  };
}
