import { Reservation, Table, Area, RestaurantSettings } from '../../types';
import { format, parseISO, parse, addMinutes, addDays, isSameDay, isBefore, isAfter } from 'date-fns';
import { getEffectiveOpeningHours, getSessionFromTime } from '../../lib/utils';
import { checkReservationConflict } from './conflictDetection';
import { DEFAULT_TABLES } from '../../hooks/useTables';

export interface SlotCalculationOptions {
  date: string; // 'YYYY-MM-DD'
  guests: number;
  currentResId?: string;
  currentBookingNumber?: string;
  settings?: RestaurantSettings | null;
  tables?: Table[];
  areas?: Area[];
  reservations?: Reservation[];
  bufferMinutes?: number;
}

export interface SlotCalculationResult {
  availableSlots: string[];
  slotsBySession: {
    lunch: string[];
    dinner: string[];
    general: string[];
  };
  sessionStatus: {
    lunch: 'open' | 'full' | 'closed' | 'passed';
    dinner: 'open' | 'full' | 'closed' | 'passed';
  };
  isClosed: boolean;
  closedReason?: string;
}

/**
 * Checks whether a single table is eligible and free for a specific slot.
 */
export function isTableAvailableForSlot(options: {
  table: Table;
  date: string;
  time: string;
  guests: number;
  currentResId?: string;
  currentBookingNumber?: string;
  tables: Table[];
  areas?: Area[];
  reservations: Reservation[];
  settings?: RestaurantSettings | null;
  sessionType?: 'lunch' | 'dinner' | 'general';
}): boolean {
  const {
    table,
    date,
    time,
    guests,
    currentResId,
    currentBookingNumber,
    tables,
    areas = [],
    reservations,
    settings,
    sessionType
  } = options;

  // 1. Capacity check
  const capacity = Number(table.maxSeats || table.seats || 0);
  if (capacity < guests) return false;

  // 2. Active & online booking flags
  if (table.isBlocked) return false;
  if (table.isActive === false) return false;
  if (table.allowOnlineReservations === false) return false;

  // 3. Session flags on table
  const sessionKey = sessionType === 'lunch' ? 'lunch' : sessionType === 'dinner' ? 'dinner' : null;
  if (sessionKey) {
    if (table.activeSessions && table.activeSessions[sessionKey] === false) return false;
    if (table.onlineSessions && table.onlineSessions[sessionKey] === false) return false;
  }

  // 4. Area rules & restrictions
  if (table.areaId && areas.length > 0) {
    const area = areas.find(a => a.id === table.areaId);
    if (area) {
      if (area.allowOnlineReservations === false) return false;

      const override = area.dateOverrides?.[date];
      const currentBookingMode = override?.bookingMode !== undefined ? override.bookingMode : area.bookingMode;
      const currentSessionMode = override?.sessionMode !== undefined ? override.sessionMode : area.sessionMode;
      const specialEventSessions = override?.specialEventSessions !== undefined ? override.specialEventSessions : (area.specialEventSessions || ['lunch', 'dinner']);

      const isSpecialActive = currentBookingMode === 'special_event' && (!sessionKey || specialEventSessions.includes(sessionKey));
      if (currentBookingMode === 'manual' || currentBookingMode === 'permanently_closed' || isSpecialActive) {
        return false;
      }

      const closedSessions = override?.closedSessions !== undefined ? override.closedSessions : (area.closedSessions || ['lunch', 'dinner']);
      if (currentBookingMode === 'closed' && (!sessionKey || closedSessions.includes(sessionKey))) {
        return false;
      }

      if (area.bookingMode === 'closed' && area.closedStartDate && area.closedEndDate) {
        if (date >= area.closedStartDate && date <= area.closedEndDate && (!sessionKey || closedSessions.includes(sessionKey))) {
          return false;
        }
      }

      if (currentSessionMode && sessionKey) {
        if (currentSessionMode === 'lunch' && sessionKey === 'dinner') return false;
        if (currentSessionMode === 'dinner' && sessionKey === 'lunch') return false;
      }
    }
  }

  // 5. Date-specific extra table rules
  if (table.isExtra) {
    const isAvailableOnDate =
      (table.availableDate && table.availableDate === date) ||
      (table.availableDates && table.availableDates.includes(date));
    if (!isAvailableOnDate) return false;
  } else if (table.availableDate) {
    if (date < table.availableDate) return false;
  }

  // 6. Extra availability
  if (sessionKey && table.extraAvailability?.[date]) {
    if (table.extraAvailability[date][sessionKey] === false) return false;
  } else if (sessionKey && table.extraSessions) {
    if (table.extraSessions[sessionKey] === false) return false;
  }

  // 7. Overlap and conflict check using unified conflict detection
  const conflict = checkReservationConflict({
    currentResId,
    currentBookingNumber,
    tableId: table.id,
    date,
    time,
    tables,
    reservations,
    settings,
    manualSession: sessionKey || undefined
  });

  return !conflict.hasConflict;
}

/**
 * Calculates available time slots for a given date, party size, and restaurant settings.
 * Accurately enforces opening hours, closed periods, table availability, and conflicts.
 */
export function calculateAvailableTimeSlots(options: SlotCalculationOptions): SlotCalculationResult {
  const {
    date,
    guests,
    currentResId,
    currentBookingNumber,
    settings,
    tables = [],
    areas = [],
    reservations = [],
    bufferMinutes = 20
  } = options;

  const emptyResult: SlotCalculationResult = {
    availableSlots: [],
    slotsBySession: { lunch: [], dinner: [], general: [] },
    sessionStatus: { lunch: 'closed', dinner: 'closed' },
    isClosed: false
  };

  if (!date || guests < 1) {
    return emptyResult;
  }

  try {
    const dateObj = parseISO(date);
    if (isNaN(dateObj.getTime())) {
      return emptyResult;
    }

    const eff = getEffectiveOpeningHours(date, settings);

    // 1. Is completely closed by effective opening hours
    if (eff.closed) {
      return {
        ...emptyResult,
        isClosed: true,
        closedReason: eff.scheduleName || 'Closed'
      };
    }

    // 2. Check closed days
    let dayName = format(dateObj, 'EEEE');
    const closedDays = (settings?.closedDays || []).map(d => d.toLowerCase());
    if (closedDays.includes(dayName.toLowerCase())) {
      return {
        ...emptyResult,
        isClosed: true,
        closedReason: `Closed on ${dayName}`
      };
    }

    // 3. Check closed periods
    if (settings?.closedPeriods && settings.closedPeriods.length > 0) {
      const closedPeriod = settings.closedPeriods.find(
        p => p.startDate && p.endDate && date >= p.startDate && date <= p.endDate
      );
      if (closedPeriod) {
        return {
          ...emptyResult,
          isClosed: true,
          closedReason: closedPeriod.note || 'Closed period'
        };
      }
    }

    // 4. Session status & Full house dates
    const isDateFull = Boolean(settings?.fullHouseDates?.includes(date));
    const isLunchFull = isDateFull || Boolean(settings?.fullHouseLunchDates?.includes(date)) || Boolean(eff.lunch?.fullHouse);
    const isDinnerFull = isDateFull || Boolean(settings?.fullHouseDinnerDates?.includes(date)) || Boolean(eff.dinner?.fullHouse);

    const isLunchActive = Boolean(
      eff.lunch && (eff.lunch.active === true || (eff.lunch.active === undefined && eff.lunch.open && eff.lunch.close && eff.lunch.open !== eff.lunch.close))
    );
    const isDinnerActive = Boolean(
      eff.dinner && (eff.dinner.active === true || (eff.dinner.active === undefined && eff.dinner.open && eff.dinner.close && eff.dinner.open !== eff.dinner.close))
    );

    const sessionStatus: {
      lunch: 'open' | 'full' | 'closed' | 'passed';
      dinner: 'open' | 'full' | 'closed' | 'passed';
    } = {
      lunch: 'closed',
      dinner: 'closed'
    };

    if (isLunchActive) {
      sessionStatus.lunch = isLunchFull ? 'full' : 'open';
    }
    if (isDinnerActive) {
      sessionStatus.dinner = isDinnerFull ? 'full' : 'open';
    }

    if (isDateFull) {
      if (sessionStatus.lunch !== 'closed') sessionStatus.lunch = 'full';
      if (sessionStatus.dinner !== 'closed') sessionStatus.dinner = 'full';
      return {
        availableSlots: [],
        slotsBySession: { lunch: [], dinner: [], general: [] },
        sessionStatus,
        isClosed: false,
        closedReason: 'Full house'
      };
    }

    // Check if sessions have passed for today
    const now = new Date();
    const isToday = isSameDay(dateObj, now);
    const thresholdTime = addMinutes(now, bufferMinutes);
    const lastOnlineMinutes = settings?.lastOnlineReservationMinutes || 0;

    if (isToday) {
      if (sessionStatus.lunch === 'open' && eff.lunch?.close) {
        let lunchClose = parse(eff.lunch.close, 'HH:mm', dateObj);
        if (eff.lunch.open) {
          const lunchOpen = parse(eff.lunch.open, 'HH:mm', dateObj);
          if (!isAfter(lunchClose, lunchOpen)) {
            lunchClose = addDays(lunchClose, 1);
          }
        }
        const lastLunchBooking = addMinutes(lunchClose, -lastOnlineMinutes);
        if (isBefore(lastLunchBooking, thresholdTime)) {
          sessionStatus.lunch = 'passed';
        }
      }

      if (sessionStatus.dinner === 'open' && eff.dinner?.close) {
        let dinnerClose = parse(eff.dinner.close, 'HH:mm', dateObj);
        if (eff.dinner.open) {
          const dinnerOpen = parse(eff.dinner.open, 'HH:mm', dateObj);
          if (!isAfter(dinnerClose, dinnerOpen)) {
            dinnerClose = addDays(dinnerClose, 1);
          }
        }
        const lastDinnerBooking = addMinutes(dinnerClose, -lastOnlineMinutes);
        if (isBefore(lastDinnerBooking, thresholdTime)) {
          sessionStatus.dinner = 'passed';
        }
      }
    }

    // 5. Determine time ranges to check
    const ranges: { open: string; close: string; type: 'lunch' | 'dinner' | 'general' }[] = [];
    const hasActiveSessions = Boolean(isLunchActive || isDinnerActive);

    if (sessionStatus.lunch === 'open' && eff.lunch?.open && eff.lunch.close) {
      ranges.push({ open: eff.lunch.open, close: eff.lunch.close, type: 'lunch' });
    }

    if (sessionStatus.dinner === 'open' && eff.dinner?.open && eff.dinner.close) {
      ranges.push({ open: eff.dinner.open, close: eff.dinner.close, type: 'dinner' });
    }

    if (!hasActiveSessions && eff.open && eff.close && eff.open !== eff.close) {
      ranges.push({ open: eff.open, close: eff.close, type: 'general' });
    }

    if (ranges.length === 0) {
      const isPassedToday = isToday && (sessionStatus.lunch === 'passed' || sessionStatus.dinner === 'passed');
      return {
        availableSlots: [],
        slotsBySession: { lunch: [], dinner: [], general: [] },
        sessionStatus,
        isClosed: !isPassedToday,
        closedReason: isPassedToday ? 'Booking closed for today' : 'No open hours on this date'
      };
    }

    // Filter active tables or use default fallback tables
    let candidateTables = (tables && tables.length > 0 ? tables : DEFAULT_TABLES);
    const canAnyFit = candidateTables.some(t => Number(t.maxSeats || t.seats || 0) >= guests);
    if (!canAnyFit && DEFAULT_TABLES.some(t => t.seats >= guests)) {
      candidateTables = [...candidateTables, ...DEFAULT_TABLES.filter(dt => dt.seats >= guests)];
    }

    const groupedSlots: { lunch: string[]; dinner: string[]; general: string[] } = {
      lunch: [],
      dinner: [],
      general: []
    };
    const allSlotsSet = new Set<string>();

    const interval = eff.reservationInterval || settings?.reservationInterval || 30;

    ranges.forEach(range => {
      if (!range.open || !range.close) return;

      try {
        let current = parse(range.open, 'HH:mm', dateObj);
        let end = parse(range.close, 'HH:mm', dateObj);
        if (isNaN(current.getTime()) || isNaN(end.getTime())) return;

        // If closing time is at or before opening time (e.g., 00:00 midnight or 01:00 AM next day)
        if (!isAfter(end, current)) {
          end = addDays(end, 1);
        }

        const limit = addMinutes(end, -lastOnlineMinutes);

        while (isBefore(current, end)) {
          // If close limit reached, skip
          if (lastOnlineMinutes > 0 && isBefore(limit, current)) {
            current = addMinutes(current, interval);
            continue;
          }

          const timeStr = format(current, 'HH:mm');

          // If booking for today, exclude past times or within buffer
          if (isToday && isBefore(current, thresholdTime)) {
            current = addMinutes(current, interval);
            continue;
          }

          // Check if ANY table can accommodate this slot
          const hasEligibleTable = candidateTables.some(table => {
            return isTableAvailableForSlot({
              table,
              date,
              time: timeStr,
              guests,
              currentResId,
              currentBookingNumber,
              tables: candidateTables,
              areas,
              reservations,
              settings,
              sessionType: range.type
            });
          });

          if (hasEligibleTable) {
            if (!groupedSlots[range.type].includes(timeStr)) {
              groupedSlots[range.type].push(timeStr);
            }
            allSlotsSet.add(timeStr);
          }

          current = addMinutes(current, interval);
        }
      } catch (err) {
        console.warn('[reservationAvailability] Error parsing range:', range, err);
      }
    });

    const sortedAllSlots = Array.from(allSlotsSet).sort((a, b) => a.localeCompare(b));

    return {
      availableSlots: sortedAllSlots,
      slotsBySession: groupedSlots,
      sessionStatus,
      isClosed: false
    };
  } catch (err) {
    console.error('[reservationAvailability] Error calculating slots:', err);
    return emptyResult;
  }
}

/**
 * Finds the most suitable available table for a reservation (or modification).
 * Prefers the current assigned table if it remains valid, then the table with the closest capacity fit.
 */
export function findBestTableForBooking(options: {
  date: string;
  time: string;
  guests: number;
  currentResId?: string;
  currentBookingNumber?: string;
  preferredTableId?: string;
  tables: Table[];
  areas?: Area[];
  reservations: Reservation[];
  settings?: RestaurantSettings | null;
}): Table | null {
  const {
    date,
    time,
    guests,
    currentResId,
    currentBookingNumber,
    preferredTableId,
    tables = [],
    areas = [],
    reservations = [],
    settings
  } = options;

  let candidateTables = tables.length > 0 ? tables : DEFAULT_TABLES;
  const sessionType = getSessionFromTime(time, date, undefined, settings);

  let availableTables = candidateTables.filter(table => {
    return isTableAvailableForSlot({
      table,
      date,
      time,
      guests,
      currentResId,
      currentBookingNumber,
      tables: candidateTables,
      areas,
      reservations,
      settings,
      sessionType: sessionType === 'lunch' || sessionType === 'dinner' ? sessionType : 'general'
    });
  });

  // Fallback to default tables if none found
  if (availableTables.length === 0 && candidateTables !== DEFAULT_TABLES) {
    availableTables = DEFAULT_TABLES.filter(table => {
      return isTableAvailableForSlot({
        table,
        date,
        time,
        guests,
        currentResId,
        currentBookingNumber,
        tables: DEFAULT_TABLES,
        areas,
        reservations,
        settings,
        sessionType: sessionType === 'lunch' || sessionType === 'dinner' ? sessionType : 'general'
      });
    });
  }

  if (availableTables.length === 0) {
    return null;
  }

  // 1. If preferred / current table is still available, keep it
  if (preferredTableId) {
    const matched = availableTables.find(t => t.id === preferredTableId);
    if (matched) return matched;
  }

  // 2. Sort by best capacity fit (smallest table where seats >= guests)
  availableTables.sort((a, b) => {
    const seatsA = Number(a.maxSeats || a.seats || 0);
    const seatsB = Number(b.maxSeats || b.seats || 0);
    const diffA = seatsA - guests;
    const diffB = seatsB - guests;
    if (diffA !== diffB) return diffA - diffB;
    return (a.name || '').localeCompare(b.name || '');
  });

  return availableTables[0];
}
