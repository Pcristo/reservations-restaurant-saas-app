import { describe, it, expect } from 'bun:test';
import { 
  calculateAvailableTimeSlots, 
  findBestTableForBooking,
  isTableAvailableForSlot
} from '../../src/features/reservations/reservationAvailability';
import { Table, Reservation, RestaurantSettings } from '../../src/types';

describe('Reservation Modification Availability & Table Selection', () => {
  const mockSettings: Partial<RestaurantSettings> = {
    minReservationGap: 120,
    reservationInterval: 30,
    openingHours: {
      Monday: {
        open: '12:00',
        close: '23:00',
        closed: false,
        lunch: { open: '12:00', close: '15:00', active: true },
        dinner: { open: '19:00', close: '23:00', active: true }
      },
      Tuesday: {
        open: '12:00',
        close: '23:00',
        closed: false,
        lunch: { open: '12:00', close: '15:00', active: true },
        dinner: { open: '19:00', close: '23:00', active: true }
      },
      Wednesday: {
        open: '00:00',
        close: '00:00',
        closed: true
      }
    },
    closedDays: ['Wednesday']
  } as unknown as RestaurantSettings;

  const mockTables: Table[] = [
    {
      id: 'table-2top',
      name: 'Table 1',
      seats: 2,
      x: 100,
      y: 100,
      status: 'available',
      allowOnlineReservations: true,
      isActive: true
    },
    {
      id: 'table-4top',
      name: 'Table 2',
      seats: 4,
      x: 200,
      y: 100,
      status: 'available',
      allowOnlineReservations: true,
      isActive: true
    },
    {
      id: 'table-8top',
      name: 'Table 3',
      seats: 8,
      x: 300,
      y: 100,
      status: 'available',
      allowOnlineReservations: true,
      isActive: true
    }
  ];

  const currentReservation: Reservation = {
    id: 'res-current-123',
    bookingNumber: '998877',
    customerName: 'Alice Walker',
    customerEmail: 'alice@example.com',
    customerPhone: '+351912345678',
    date: '2027-01-04', // Monday
    time: '19:30',
    guests: 2,
    tableId: 'table-2top',
    tableName: 'Table 1',
    status: 'confirmed'
  };

  const otherReservation: Reservation = {
    id: 'res-other-456',
    bookingNumber: '112233',
    customerName: 'Bob Builder',
    customerEmail: 'bob@example.com',
    customerPhone: '+351919876543',
    date: '2027-01-04',
    time: '20:00',
    guests: 4,
    tableId: 'table-4top',
    tableName: 'Table 2',
    status: 'confirmed'
  };

  it('calculates available slots for the selected date respecting lunch and dinner hours', () => {
    const result = calculateAvailableTimeSlots({
      date: '2027-01-04', // Monday
      guests: 2,
      currentResId: currentReservation.id,
      settings: mockSettings as RestaurantSettings,
      tables: mockTables,
      reservations: [currentReservation, otherReservation]
    });

    expect(result.isClosed).toBe(false);
    expect(result.availableSlots.length).toBeGreaterThan(0);
    // Lunch slots: 12:00, 12:30, 13:00, 13:30, 14:00, 14:30
    expect(result.availableSlots).toContain('12:00');
    expect(result.availableSlots).toContain('13:00');
    // Dinner slots: 19:00, 19:30, 20:00, etc.
    expect(result.availableSlots).toContain('19:00');
    expect(result.availableSlots).toContain('19:30');
  });

  it('allows reservation being modified to keep its existing time without self-conflict', () => {
    // Current reservation is at 19:30 on table-2top.
    // If currentResId was not passed, table-2top would show as conflicting at 19:30.
    const resultWithSelfExcluded = calculateAvailableTimeSlots({
      date: '2026-10-19',
      guests: 2,
      currentResId: currentReservation.id,
      settings: mockSettings as RestaurantSettings,
      tables: [mockTables[0]], // Only table-2top
      reservations: [currentReservation]
    });

    expect(resultWithSelfExcluded.availableSlots).toContain('19:30');
  });

  it('correctly marks closed dates when restaurant is closed on that day', () => {
    const result = calculateAvailableTimeSlots({
      date: '2026-10-21', // Wednesday (closed)
      guests: 2,
      currentResId: currentReservation.id,
      settings: mockSettings as RestaurantSettings,
      tables: mockTables,
      reservations: []
    });

    expect(result.isClosed).toBe(true);
    expect(result.availableSlots).toEqual([]);
  });

  it('filters available slots when table capacity cannot accommodate party size', () => {
    // Party of 10 cannot fit on 2-top, 4-top, or 8-top
    const resultLargeParty = calculateAvailableTimeSlots({
      date: '2026-10-19',
      guests: 10,
      currentResId: currentReservation.id,
      settings: mockSettings as RestaurantSettings,
      tables: mockTables,
      reservations: []
    });

    expect(resultLargeParty.availableSlots).toEqual([]);
  });

  it('selects best matching table with closest capacity fit on modification submission', () => {
    // For 2 guests, table-2top (seats: 2) should be chosen over table-4top or table-8top
    const bestTable2 = findBestTableForBooking({
      date: '2026-10-19',
      time: '13:00',
      guests: 2,
      currentResId: currentReservation.id,
      tables: mockTables,
      reservations: [],
      settings: mockSettings as RestaurantSettings
    });

    expect(bestTable2?.id).toBe('table-2top');

    // For 4 guests, table-4top should be chosen
    const bestTable4 = findBestTableForBooking({
      date: '2026-10-19',
      time: '13:00',
      guests: 4,
      currentResId: currentReservation.id,
      tables: mockTables,
      reservations: [],
      settings: mockSettings as RestaurantSettings
    });

    expect(bestTable4?.id).toBe('table-4top');
  });

  it('retains preferred table if still valid and available', () => {
    const table = findBestTableForBooking({
      date: '2026-10-19',
      time: '19:30',
      guests: 2,
      currentResId: currentReservation.id,
      preferredTableId: 'table-2top',
      tables: mockTables,
      reservations: [currentReservation],
      settings: mockSettings as RestaurantSettings
    });

    expect(table?.id).toBe('table-2top');
  });
});
