import { describe, it, expect } from 'bun:test';
import { 
  buildConfirmationEmail, 
  buildUpdateEmail, 
  buildCancellationEmail, 
  buildReminderEmail,
  buildTestEmail 
} from '../../functions/lib/emailTemplates';

describe('Email Templates & Customer Reservation Management', () => {
  const sampleRestaurant = {
    restaurantName: 'Bella Italia Ristorante',
    logoUrl: 'https://images.unsplash.com/photo-sample-logo.png',
    primaryColor: '#059669',
    restaurantEmail: 'reservas@bellaitalia.com',
    restaurantPhone: '+351 912 345 678',
    restaurantAddress: 'Rua das Flores 123',
    restaurantCity: 'Lisboa',
    restaurantPostcode: '1200-195',
    restaurantWebsite: 'https://bellaitalia.com'
  };

  const sampleBooking = {
    email: 'client@example.com',
    name: 'Carlos Silva',
    date: '2026-10-24',
    time: '20:30',
    guests: 4,
    bookingNumber: 'BI-26-00042',
    reservationId: 'res_test_12345',
    table: 'Mesa 12',
    notes: 'Mesa tranquila, aniversário de casamento',
    viewUrl: 'https://bellaitalia.com/reservations/BI-26-00042',
    cancelUrl: 'https://bellaitalia.com/reservations/BI-26-00042/cancel'
  };

  it('builds confirmation email with full restaurant branding, logo, and links', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      language: 'pt'
    });

    expect(email.subject).toContain('Reserva Confirmada');
    expect(email.subject).toContain('Bella Italia Ristorante');
    expect(email.subject).toContain('BI-26-00042');

    // HTML assertions
    expect(email.html).toContain('Bella Italia Ristorante');
    expect(email.html).toContain(sampleRestaurant.logoUrl);
    expect(email.html).toContain('Carlos Silva');
    expect(email.html).toContain('20:30');
    expect(email.html).toContain('4 Pessoas');
    expect(email.html).toContain('BI-26-00042');
    expect(email.html).toContain('Mesa 12');
    expect(email.html).toContain('Mesa tranquila, aniversário de casamento');
    expect(email.html).toContain('Rua das Flores 123');
    expect(email.html).toContain('1200-195');
    expect(email.html).toContain('reservas@bellaitalia.com');
    expect(email.html).toContain('+351 912 345 678');
    expect(email.html).toContain(sampleBooking.viewUrl);
    expect(email.html).toContain(sampleBooking.cancelUrl);
    expect(email.html).toContain(sampleRestaurant.primaryColor);

    // Schema.org assertions
    expect(email.html).toContain('application/ld+json');
    expect(email.html).toContain('FoodEstablishmentReservation');
    expect(email.html).toContain('ReservationConfirmed');

    // Plain text assertions
    expect(email.text).toBeDefined();
    expect(email.text).toContain('BELLA ITALIA RISTORANTE');
    expect(email.text).toContain('BI-26-00042');
    expect(email.text).toContain('Carlos Silva');
    expect(email.text).toContain('20:30');
    expect(email.text).toContain('4');
    expect(email.text).toContain(sampleBooking.viewUrl);
    expect(email.text).toContain('1200-195');
    expect(email.text).toContain('+351 912 345 678');
  });

  it('displays DineMaster Pro logo as default at top of email when no restaurant logo is configured', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      restaurantName: 'Tasca Lusitana',
      logoUrl: '',
      restaurantEmail: 'contacto@tascalusitana.pt',
      restaurantPhone: '+351 213 000 111',
      restaurantAddress: 'Avenida Central 50',
      language: 'en'
    });

    expect(email.html).toContain('Tasca Lusitana');
    // Displays DineMaster Pro logo image as default at the top of the email
    expect(email.html).toContain('<img src=');
    expect(email.html).toContain('alt="DineMaster Pro"');
    expect(email.html).toContain('Powered by DineMaster Pro');
    expect(email.text).toContain('TASCA LUSITANA');
    expect(email.text).toContain('Avenida Central 50');
  });

  it('builds update email with latest details and change notice', () => {
    const email = buildUpdateEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      date: '2026-10-25',
      time: '21:00',
      guests: 6,
      language: 'en',
      previousDetails: {
        date: '2026-10-24',
        time: '20:30',
        guests: 4
      }
    });

    expect(email.subject).toContain('Reservation Updated');
    expect(email.subject).toContain('Bella Italia Ristorante');
    expect(email.html).toContain('Reservation Updated');
    expect(email.html).toContain('21:00');
    expect(email.html).toContain('6 Guests');
    expect(email.html).toContain(sampleBooking.viewUrl);
    expect(email.text).toContain('UPDATED RESERVATION SUMMARY');
    expect(email.text).toContain('6');
  });

  it('builds cancellation email clearly stating cancellation with reason and follow-up', () => {
    const email = buildCancellationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      language: 'pt',
      cancellationReason: 'Alteração de planos devido a viagem de trabalho'
    });

    expect(email.subject).toContain('Reserva Cancelada');
    expect(email.subject).toContain('Bella Italia Ristorante');
    expect(email.html).toContain('Reserva Cancelada');
    expect(email.html).toContain('cancelada');
    expect(email.html).toContain('Alteração de planos devido a viagem de trabalho');
    expect(email.html).toContain('BI-26-00042');
    expect(email.html).toContain('Rua das Flores 123');
    expect(email.text).toContain('RESERVA CANCELADA');
    expect(email.text).toContain('Alteração de planos devido a viagem de trabalho');
    expect(email.text).toContain('BI-26-00042');
  });

  it('builds reminder email correctly identifying today vs tomorrow', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEmail = buildReminderEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      date: todayStr,
      language: 'en'
    });

    expect(todayEmail.subject).toContain('today');
    expect(todayEmail.html).toContain('scheduled for <strong>today</strong>');
    expect(todayEmail.html).toContain(sampleBooking.viewUrl);

    const futureEmail = buildReminderEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      date: '2029-12-31',
      language: 'pt'
    });
    expect(futureEmail.html).toContain('amanhã');
  });

  it('builds test email for email gateway verification with branding', () => {
    const email = buildTestEmail({
      email: 'admin@restaurant.com',
      restaurantName: 'Chez Pierre',
      primaryColor: '#2563eb',
      restaurantEmail: 'info@chezpierre.com',
      restaurantPhone: '+33 1 42 68 00 00',
      restaurantAddress: '15 Rue de la Paix',
      restaurantCity: 'Paris',
      restaurantPostcode: '75002',
      language: 'en'
    });

    expect(email.subject).toContain('Branded Test Email');
    expect(email.subject).toContain('Chez Pierre');
    expect(email.html).toContain('Chez Pierre');
    expect(email.html).toContain('15 Rue de la Paix');
    expect(email.html).toContain('75002');
    expect(email.html).toContain('+33 1 42 68 00 00');
    expect(email.text).toContain('CHEZ PIERRE');
  });

  it('displays the restaurant logo configured in the settings at the top of the email', () => {
    const configuredLogoUrl = 'https://static.vecteezy.com/system/resources/previews/052/792/818/non_2x/restaurant-logo-design-vector.jpg';
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      logoUrl: configuredLogoUrl,
      language: 'en'
    });

    expect(email.html).toContain('<img src=');
    expect(email.html).toContain(configuredLogoUrl);
    expect(email.html).toContain(`alt="${sampleRestaurant.restaurantName}"`);
  });

  it('omits modify button and renders direct contact notice when reservation has already been modified online once', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      alreadyModifiedOnline: true,
      canModifyOnline: false,
      language: 'en'
    });

    expect(email.html).not.toContain('>Modify Reservation<');
    expect(email.html).toContain('This reservation has already been modified online');
    expect(email.html).toContain('contact the restaurant directly');
    expect(email.html).toContain(sampleBooking.viewUrl);
  });

  it('builds update email with single modification limit and contact notice in Portuguese', () => {
    const email = buildUpdateEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      date: '2026-10-25',
      time: '21:00',
      guests: 6,
      language: 'pt',
      alreadyModifiedOnline: true,
      canModifyOnline: false,
      previousDetails: {
        date: '2026-10-24',
        time: '20:30',
        guests: 4
      }
    });

    expect(email.html).toContain('cada reserva só pode ser alterada online uma vez');
    expect(email.html).toContain('contacte o restaurante diretamente');
    expect(email.text).toContain('NOTA: Cada reserva só pode ser alterada online uma vez');
  });

  it('does not display modification options or instructions when restaurant disables customer modification', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      allowCustomerModification: false,
      language: 'en'
    });

    // Modification button and instructions must NOT be displayed
    expect(email.html).not.toContain('>Modify Reservation<');
    expect(email.html).not.toContain(sampleBooking.viewUrl + '/modify');
    expect(email.html).not.toContain('This reservation has already been modified online');
    expect(email.text).not.toContain('Modify:');
    
    // Cancellation is still allowed
    expect(email.html).toContain('>Cancel Reservation<');
    expect(email.text).toContain('Cancel reservation:');
  });

  it('does not display cancellation options or instructions when restaurant disables customer cancellation', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      allowCustomerCancellation: false,
      language: 'en'
    });

    // Cancellation button and instructions must NOT be displayed
    expect(email.html).not.toContain('>Cancel Reservation<');
    expect(email.html).not.toContain(sampleBooking.cancelUrl);
    expect(email.text).not.toContain('Cancel reservation:');

    // Modification is still allowed
    expect(email.html).toContain('>Modify Reservation<');
    expect(email.text).toContain('Modify:');
  });

  it('does not display any modification or cancellation options or instructions when both are disabled by restaurant', () => {
    const email = buildConfirmationEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      allowCustomerModification: false,
      allowCustomerCancellation: false,
      language: 'en'
    });

    // Neither button should be present
    expect(email.html).not.toContain('>Modify Reservation<');
    expect(email.html).not.toContain('>Cancel Reservation<');
    expect(email.html).not.toContain('This reservation has already been modified online');
    expect(email.text).not.toContain('Modify:');
    expect(email.text).not.toContain('Cancel reservation:');

    // Only view details is shown
    expect(email.html).toContain('>View Details<');
    expect(email.text).toContain('View details:');
    expect(email.text).toContain('RESERVATION DETAILS');
    expect(email.text).not.toContain('MANAGE / MODIFY');
  });

  it('omits modification instructions in update email when customer modification is disabled by restaurant', () => {
    const email = buildUpdateEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      allowCustomerModification: false,
      allowCustomerCancellation: false,
      language: 'en'
    });

    expect(email.html).not.toContain('Online Modification Completed');
    expect(email.html).not.toContain('>Cancel Reservation<');
    expect(email.text).not.toContain('NOTE: Each reservation can be modified online only once');
    expect(email.text).not.toContain('Cancel reservation:');
  });

  it('displays configured restaurant logo at top of every email type', () => {
    const customLogo = 'https://custom-restaurant.com/assets/logo.png';
    const confEmail = buildConfirmationEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: customLogo });
    const updateEmail = buildUpdateEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: customLogo });
    const cancelEmail = buildCancellationEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: customLogo });
    const reminderEmail = buildReminderEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: customLogo });
    const testEmail = buildTestEmail({ ...sampleRestaurant, email: 'test@example.com', logoUrl: customLogo });

    for (const email of [confEmail, updateEmail, cancelEmail, reminderEmail, testEmail]) {
      expect(email.html).toContain(customLogo);
      expect(email.html).toContain('<img src="https://custom-restaurant.com/assets/logo.png"');
    }
  });

  it('displays DineMaster Pro default logo at top of every email type when no logo is configured', () => {
    const confEmail = buildConfirmationEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: '' });
    const updateEmail = buildUpdateEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: '   ' });
    const cancelEmail = buildCancellationEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: undefined });
    const reminderEmail = buildReminderEmail({ ...sampleBooking, ...sampleRestaurant, logoUrl: '' });
    const testEmail = buildTestEmail({ ...sampleRestaurant, email: 'test@example.com', logoUrl: '' });

    for (const email of [confEmail, updateEmail, cancelEmail, reminderEmail, testEmail]) {
      expect(email.html).toContain('alt="DineMaster Pro"');
      expect(email.html).toContain('Powered by DineMaster Pro');
    }
  });

  it('omits modification and cancellation options in reminder emails when disabled by restaurant settings', () => {
    const reminder = buildReminderEmail({
      ...sampleBooking,
      ...sampleRestaurant,
      allowCustomerModification: false,
      allowCustomerCancellation: false,
      language: 'en'
    });

    expect(reminder.html).not.toContain('>Modify Reservation<');
    expect(reminder.html).not.toContain('>Cancel Reservation<');
    expect(reminder.text).not.toContain('Modify:');
    expect(reminder.text).not.toContain('Cancel reservation:');
    expect(reminder.text).toContain('RESERVATION DETAILS');
  });
});

