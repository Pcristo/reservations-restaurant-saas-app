export const DINEMASTER_PRO_DEFAULT_LOGO = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&h=400&q=80';
export const DEFAULT_RESTAURANT_LOGO = DINEMASTER_PRO_DEFAULT_LOGO;

export interface EmailOptions {
  email: string;
  name: string;
  date: string;
  time: string;
  guests: number;
  restaurantName?: string;
  resendApiKey?: string;
  language?: string;
  logoUrl?: string;
  primaryColor?: string;
  restaurantEmail?: string;
  resendFromEmail?: string;
  restaurantPhone?: string;
  bookingNumber?: string;
  restaurantAddress?: string;
  restaurantPostcode?: string;
  restaurantCity?: string;
  restaurantWebsite?: string;
  timezone?: string;
  table?: string;
  notes?: string;
  specialRequests?: string;
  reservationId?: string;
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

export interface EmailResult {
  subject: string;
  html: string;
  text: string;
}

// Generates Schema.org JSON-LD for FoodEstablishmentReservation
export function generateSchemaMarkup(opts: EmailOptions, status: 'ReservationConfirmed' | 'ReservationCancelled') {
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  let startTime = `${opts.date}T${opts.time || '12:00'}:00`;
  try {
    const d = new Date(`${opts.date}T${opts.time || '12:00'}:00`);
    if (!isNaN(d.getTime())) {
      startTime = d.toISOString();
    }
  } catch (e) {
    // fallback
  }

  const street = [opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ');

  const schema = {
    "@context": "http://schema.org",
    "@type": "FoodEstablishmentReservation",
    "reservationNumber": opts.bookingNumber || opts.reservationId || "N/A",
    "reservationStatus": `http://schema.org/${status}`,
    "underName": {
      "@type": "Person",
      "name": opts.name
    },
    "reservationFor": {
      "@type": "FoodEstablishment",
      "name": displayName,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": street || "123 Example Street, Dublin, D01 XXXX, Ireland"
      },
      "telephone": (opts.restaurantPhone || '').trim() || "+353 1 555 0100"
    },
    "startTime": startTime,
    "partySize": opts.guests
  };

  if (opts.viewUrl && opts.allowCustomerModification !== false && opts.canModifyOnline !== false) {
    (schema as any).modifyReservationUrl = opts.viewUrl;
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

export function getFromEmail(rawFromEmail?: string, restaurantName?: string): string {
  let from = (rawFromEmail || '').trim();
  const name = (restaurantName || '').trim() || 'DineMaster Bistro';
  const cleanName = name.replace(/[<>"']/g, '').trim();

  // If someone passed an API key or invalid value as from email, default to verified domain
  if (!from || from.startsWith('re_') || !from.includes('@')) {
    from = 'reservations@wordwide.pro';
  }

  // Extract pure email inside <brackets> if present
  const bracketMatch = from.match(/<([^>]+)>/);
  const pureEmail = bracketMatch ? bracketMatch[1].trim() : from.trim();

  return `${cleanName} <${pureEmail}>`;
}

function sanitizeColor(color?: string, fallback: string = '#d97706'): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function formatDisplayDate(dateStr: string, isPt: boolean): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(isPt ? 'pt-PT' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

export function getBaseHtml(
  opts: EmailOptions, 
  title: string, 
  badgeText: string,
  badgeBg: string,
  badgeTextColor: string,
  content: string, 
  status: 'ReservationConfirmed' | 'ReservationCancelled'
): string {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Bistro';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'D';
  const brandColor = sanitizeColor(opts.primaryColor, '#d97706');

  let cleanLogoUrl = (opts.logoUrl || '').trim();
  if (cleanLogoUrl.startsWith('//')) {
    cleanLogoUrl = 'https:' + cleanLogoUrl;
  } else if (cleanLogoUrl.startsWith('/')) {
    const baseUrl = (opts.restaurantWebsite || '').trim().replace(/\/$/, '') || 'https://dinemasterpro.com';
    cleanLogoUrl = baseUrl + cleanLogoUrl;
  }

  // If no logo is configured in settings or provided, display the DineMaster Pro logo as the default
  const isDefaultLogo = !cleanLogoUrl;
  if (!cleanLogoUrl) {
    cleanLogoUrl = DINEMASTER_PRO_DEFAULT_LOGO;
  }

  const logoAlt = isDefaultLogo ? 'DineMaster Pro' : displayName;

  const logoHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center">
            <img src="${cleanLogoUrl}" alt="${logoAlt}" border="0" style="max-height: 70px; max-width: 220px; height: auto; width: auto; object-fit: contain; display: inline-block; vertical-align: middle; border-radius: 8px;" />
          </td>
        </tr>
      </table>
      <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px;">
        ${displayName}
      </div>
      ${isDefaultLogo ? `
      <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Powered by DineMaster Pro
      </div>` : ''}
    </div>
  `;

  const contactEmail = (opts.restaurantEmail || '').trim();
  const contactPhone = (opts.restaurantPhone || '').trim();
  const contactWebsite = (opts.restaurantWebsite || '').trim();
  
  // Format full address with postcode
  let fullAddress = (opts.restaurantAddress || '').trim();
  if (opts.restaurantCity && !fullAddress.toLowerCase().includes(opts.restaurantCity.toLowerCase())) {
    fullAddress += fullAddress ? `, ${opts.restaurantCity.trim()}` : opts.restaurantCity.trim();
  }
  if (opts.restaurantPostcode && !fullAddress.toLowerCase().includes(opts.restaurantPostcode.toLowerCase())) {
    fullAddress += fullAddress ? ` ${opts.restaurantPostcode.trim()}` : opts.restaurantPostcode.trim();
  }

  let footerContactHtml = '';
  if (contactEmail || contactPhone || contactWebsite || fullAddress) {
    footerContactHtml += `<div style="text-align: center; font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; padding: 18px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">`;
    footerContactHtml += `<strong style="font-size: 14px; color: #0f172a; display: block; margin-bottom: 8px;">${displayName}</strong>`;
    if (fullAddress) {
      footerContactHtml += `<div style="color: #475569; margin-bottom: 5px;">📍 ${fullAddress}</div>`;
    }
    if (contactPhone) {
      footerContactHtml += `<div style="color: #475569; margin-bottom: 5px;">📞 ${isPt ? 'Telefone' : 'Phone'}: <a href="tel:${contactPhone.replace(/\s+/g, '')}" style="color: ${brandColor}; text-decoration: none; font-weight: 600;">${contactPhone}</a></div>`;
    }
    if (contactEmail) {
      footerContactHtml += `<div style="color: #475569; margin-bottom: 5px;">✉️ ${isPt ? 'Email' : 'Email'}: <a href="mailto:${contactEmail}" style="color: ${brandColor}; text-decoration: none; font-weight: 600;">${contactEmail}</a></div>`;
    }
    if (contactWebsite) {
      const cleanWeb = contactWebsite.startsWith('http') ? contactWebsite : 'https://' + contactWebsite;
      footerContactHtml += `<div style="margin-top: 5px;">🌐 <a href="${cleanWeb}" style="color: ${brandColor}; text-decoration: none; font-weight: 600;">${contactWebsite.replace(/^https?:\/\//, '')}</a></div>`;
    }
    footerContactHtml += `</div>`;
  } else {
    footerContactHtml += `<div style="text-align: center; font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      <strong style="font-size: 14px; color: #0f172a;">${displayName}</strong>
    </div>`;
  }

  const preheaderSnippet = `${title} • ${displayName} • ${opts.date} @ ${opts.time} (${opts.guests} ${opts.guests === 1 ? 'Guest' : 'Guests'})`;

  return `<!DOCTYPE html>
<html lang="${isPt ? 'pt' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - ${displayName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  ${generateSchemaMarkup(opts, status)}
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-card { padding: 16px !important; }
      .grid-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .action-button { display: block !important; width: 100% !important; margin: 8px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text hidden snippet -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheaderSnippet}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06); overflow: hidden;" class="email-container">
          <tr>
            <td style="padding: 32px 28px 24px 28px;" class="email-card">
              ${logoHtml}
              
              <div style="text-align: center; margin-bottom: 22px;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; background-color: ${badgeBg}; color: ${badgeTextColor};">
                  ${badgeText}
                </span>
                <h1 style="color: #0f172a; margin: 12px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.3;">
                  ${title}
                </h1>
              </div>

              ${content}

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
              
              ${footerContactHtml}

              <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; margin: 0 0 10px 0;">
                <strong>${isPt ? 'Por favor, não responda diretamente a este email automático.' : 'Please do not reply directly to this automated email.'}</strong><br>
                ${isPt ? `Para alterações urgentes ou dúvidas, contacte o ${displayName}${contactPhone ? ` via telefone ${contactPhone}` : ''}.` : `For urgent changes or questions, contact ${displayName}${contactPhone ? ` directly at ${contactPhone}` : ''}.`}
              </p>
              
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                ${isPt ? 'Sistema de reservas alimentado por' : 'Reservation system powered by'} <span style="font-weight: 600; color: #64748b;">DineMaster Pro</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildDetailsCard(opts: EmailOptions, brandColor: string, isPt: boolean): string {
  const specialNotes = (opts.specialRequests || opts.notes || '').trim();
  const formattedDate = formatDisplayDate(opts.date, isPt);
  const refNumber = opts.bookingNumber ? `#${opts.bookingNumber}` : (opts.reservationId ? `#${opts.reservationId.slice(0, 8)}` : 'N/A');

  let tableRow = '';
  if (opts.table) {
    tableRow = `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600; width: 38%;">
          🍽️ ${isPt ? 'Mesa' : 'Table'}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
          ${opts.table}
        </td>
      </tr>
    `;
  }

  let notesRow = '';
  if (specialNotes) {
    notesRow = `
      <tr>
        <td colspan="2" style="padding: 12px 14px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            📝 ${isPt ? 'Pedidos Especiais / Notas' : 'Special Requests / Notes'}
          </div>
          <div style="font-size: 13px; color: #1e293b; line-height: 1.5; font-style: italic;">
            "${specialNotes}"
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <div style="margin: 22px 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="background-color: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
              ${isPt ? 'Detalhes da Reserva' : 'Reservation Summary'}
            </td>
            <td align="right" style="font-size: 13px; font-weight: 700; font-family: monospace; color: ${brandColor};">
              ${refNumber}
            </td>
          </tr>
        </table>
      </div>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600; width: 38%;">
            📅 ${isPt ? 'Data' : 'Date'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
            ${formattedDate}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600;">
            ⏰ ${isPt ? 'Hora' : 'Time'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
            ${opts.time}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600;">
            👥 ${isPt ? 'Pessoas' : 'Guests'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
            ${opts.guests} ${opts.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600;">
            👤 ${isPt ? 'Cliente' : 'Guest Name'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
            ${opts.name}
          </td>
        </tr>
        ${tableRow}
        ${notesRow}
      </table>
    </div>
  `;
}

function buildActionButtons(opts: EmailOptions, brandColor: string, isPt: boolean, isCancelled: boolean = false): string {
  if (isCancelled) {
    if (opts.viewUrl) {
      return `
        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="${opts.viewUrl}" class="action-button" style="display: inline-block; padding: 13px 28px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${isPt ? 'Ver Histórico da Reserva' : 'View Reservation Status'}</a>
        </div>
      `;
    }
    return '';
  }

  const buttons: string[] = [];
  const isModificationAllowedBySettings = opts.allowCustomerModification !== false;
  const cleanViewUrl = (opts.viewUrl || '').replace(/\/modify\/?$/, '').replace(/\/cancel\/?$/, '');
  const canModify = isModificationAllowedBySettings && opts.canModifyOnline !== false && !opts.alreadyModifiedOnline;
  const modifyUrl = canModify ? (opts.modifyUrl || (cleanViewUrl ? `${cleanViewUrl.replace(/\/$/, '')}/modify` : '')) : '';

  const isCancellationAllowedBySettings = opts.allowCustomerCancellation !== false;
  const canCancel = isCancellationAllowedBySettings && opts.canCancelOnline !== false;
  const cancelUrl = canCancel ? (opts.cancelUrl || (cleanViewUrl ? `${cleanViewUrl.replace(/\/$/, '')}/cancel` : '')) : '';

  if (modifyUrl) {
    buttons.push(`
      <a href="${modifyUrl}" class="action-button" style="display: inline-block; padding: 13px 26px; margin: 6px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.12); text-align: center;">${isPt ? 'Modificar Reserva' : 'Modify Reservation'}</a>
    `);
  }

  if (cleanViewUrl && (cleanViewUrl !== modifyUrl || !modifyUrl)) {
    buttons.push(`
      <a href="${cleanViewUrl}" class="action-button" style="display: inline-block; padding: 13px 22px; margin: 6px; background-color: #ffffff; color: #334155; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; border: 1px solid #cbd5e1; text-align: center;">${isPt ? 'Ver Detalhes' : 'View Details'}</a>
    `);
  }

  if (cancelUrl) {
    buttons.push(`
      <a href="${cancelUrl}" class="action-button" style="display: inline-block; padding: 13px 20px; margin: 6px; background-color: #f8fafc; color: #dc2626; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; border: 1px solid #fecaca; text-align: center;">${isPt ? 'Cancelar Reserva' : 'Cancel Reservation'}</a>
    `);
  }

  let contactNotice = '';
  // Only display single modification limit notice if customer modifications are fundamentally enabled, but already used
  if (isModificationAllowedBySettings && opts.alreadyModifiedOnline) {
    contactNotice = `
      <div style="font-size: 12px; color: #92400e; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin: 12px auto 8px auto; max-width: 480px; line-height: 1.5; text-align: center;">
        <strong>ℹ️ ${isPt ? 'Alterações Adicionais' : 'Additional Modifications'}:</strong>
        <div style="margin-top: 4px;">
          ${isPt 
            ? 'Esta reserva já foi alterada online. Para efetuar alterações adicionais, por favor contacte o restaurante diretamente.'
            : 'This reservation has already been modified online. To make any further changes, please contact the restaurant directly.'}
        </div>
      </div>
    `;
  }

  if (buttons.length === 0 && !contactNotice) return '';

  let subText = '';
  if (canModify || canCancel) {
    subText = isPt 
      ? 'Clique no botão acima para aceder à sua reserva sem necessidade de registo.' 
      : 'Access and manage your booking anytime using the link above.';
  } else if (cleanViewUrl) {
    subText = isPt 
      ? 'Clique no botão acima para consultar os detalhes da sua reserva.' 
      : 'View your confirmed booking details anytime using the link above.';
  }

  return `
    <div style="text-align: center; margin: 24px 0 16px 0;">
      ${buttons.join('\n')}
      ${contactNotice}
      ${subText ? `
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        ${subText}
      </div>` : ''}
    </div>
  `;
}

function buildPlainTextActions(opts: EmailOptions, isPt: boolean): string {
  const isModificationAllowed = opts.allowCustomerModification !== false && opts.canModifyOnline !== false;
  const canModify = isModificationAllowed && !opts.alreadyModifiedOnline;
  const cleanViewUrl = (opts.viewUrl || '').replace(/\/modify\/?$/, '').replace(/\/cancel\/?$/, '');
  const modifyUrl = canModify ? (opts.modifyUrl || (cleanViewUrl ? `${cleanViewUrl.replace(/\/$/, '')}/modify` : '')) : '';

  const isCancellationAllowed = opts.allowCustomerCancellation !== false && opts.canCancelOnline !== false;
  const cancelUrl = isCancellationAllowed ? (opts.cancelUrl || (cleanViewUrl ? `${cleanViewUrl.replace(/\/$/, '')}/cancel` : '')) : '';

  if (!modifyUrl && !cancelUrl && !cleanViewUrl) {
    return '';
  }

  const lines: string[] = ['---------------------------------------------------'];

  if (canModify || isCancellationAllowed) {
    lines.push(isPt ? 'GERIR A SUA RESERVA' : 'MANAGE YOUR RESERVATION');
  } else {
    lines.push(isPt ? 'DETALHES DA RESERVA' : 'RESERVATION DETAILS');
  }

  if (modifyUrl) {
    lines.push(`${isPt ? 'Modificar' : 'Modify'}: ${modifyUrl}`);
  }
  if (cleanViewUrl) {
    lines.push(`${isPt ? 'Ver detalhes' : 'View details'}: ${cleanViewUrl}`);
  }
  if (cancelUrl) {
    lines.push(`${isPt ? 'Cancelar reserva' : 'Cancel reservation'}: ${cancelUrl}`);
  }

  return lines.join('\n') + '\n';
}

// ----------------------------------------------------------------------
// 1. CONFIRMATION EMAIL
// ----------------------------------------------------------------------
export function buildConfirmationEmail(opts: EmailOptions): EmailResult {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Confirmada' : 'Reservation Confirmed';
  const brandColor = sanitizeColor(opts.primaryColor, '#d97706');

  const content = `
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt ? 'Olá' : 'Hello'} <strong>${opts.name}</strong>,
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt 
        ? `Agradecemos a sua preferência. A sua mesa no <strong>${displayName}</strong> foi reservada e confirmada com sucesso!` 
        : `Thank you for choosing us. Your table at <strong>${displayName}</strong> has been successfully booked and confirmed!`}
    </p>

    ${buildDetailsCard(opts, brandColor, isPt)}

    ${buildActionButtons(opts, brandColor, isPt)}

    <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 0 0;">
      ${isPt ? `Aguardamos a sua visita com muito gosto no ${displayName}!` : `We look forward to welcoming you to ${displayName}!`}
    </p>
  `;

  const html = getBaseHtml(
    opts, 
    title, 
    isPt ? 'Confirmada' : 'Confirmed',
    '#dcfce7',
    '#166534',
    content, 
    'ReservationConfirmed'
  );

  const text = `
===================================================
${displayName.toUpperCase()}
${title.toUpperCase()}
===================================================

${isPt ? 'Olá' : 'Hello'} ${opts.name},

${isPt 
  ? `A sua mesa no ${displayName} foi reservada e confirmada com sucesso!` 
  : `Your table at ${displayName} has been successfully booked and confirmed!`}

---------------------------------------------------
${isPt ? 'DETALHES DA RESERVA' : 'RESERVATION SUMMARY'}
---------------------------------------------------
• ${isPt ? 'Nº de Reserva' : 'Booking Ref'}: #${opts.bookingNumber || opts.reservationId || 'N/A'}
• ${isPt ? 'Estado' : 'Status'}: ${isPt ? 'Confirmada' : 'Confirmed'}
• ${isPt ? 'Data' : 'Date'}: ${formatDisplayDate(opts.date, isPt)} (${opts.date})
• ${isPt ? 'Hora' : 'Time'}: ${opts.time}
• ${isPt ? 'Pessoas' : 'Guests'}: ${opts.guests}
• ${isPt ? 'Nome' : 'Guest Name'}: ${opts.name}
${buildPlainTextActions(opts, isPt)}
---------------------------------------------------
${isPt ? 'CONTACTOS DO RESTAURANTE' : 'RESTAURANT CONTACT'}
---------------------------------------------------
${displayName}
${[opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ')}
${opts.restaurantPhone ? `${isPt ? 'Telefone' : 'Phone'}: ${opts.restaurantPhone}\n` : ''}${opts.restaurantEmail ? `Email: ${opts.restaurantEmail}\n` : ''}${opts.restaurantWebsite ? `Website: ${opts.restaurantWebsite}\n` : ''}
===================================================
${isPt ? 'Por favor, não responda a este email automático.' : 'Please do not reply directly to this automated email.'}
Powered by DineMaster Pro
`.trim();

  return {
    subject: `${title} #${opts.bookingNumber || ''} - ${displayName}`.replace(' # -', ' -'),
    html,
    text
  };
}

// ----------------------------------------------------------------------
// 2. UPDATE EMAIL
// ----------------------------------------------------------------------
export function buildUpdateEmail(opts: EmailOptions): EmailResult {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Atualizada' : 'Reservation Updated';
  const brandColor = sanitizeColor(opts.primaryColor, '#d97706');

  let changeNotice = '';
  if (opts.previousDetails) {
    changeNotice = `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #1e40af;">
        <strong>ℹ️ ${isPt ? 'Alterações Efetuadas:' : 'Updated Details:'}</strong>
        <div style="margin-top: 4px; line-height: 1.5;">
          ${isPt ? 'Os novos detalhes confirmados da sua reserva encontram-se apresentados abaixo.' : 'The updated details of your reservation are confirmed below.'}
        </div>
      </div>
    `;
  }

  const content = `
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt ? 'Olá' : 'Hello'} <strong>${opts.name}</strong>,
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt 
        ? `A sua reserva no <strong>${displayName}</strong> foi atualizada com sucesso. Apresentamos abaixo os detalhes confirmados mais recentes:` 
        : `Your reservation at <strong>${displayName}</strong> has been updated successfully. Below are your latest confirmed booking details:`}
    </p>

    ${changeNotice}

    ${opts.allowCustomerModification !== false ? `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e;">
      <strong>ℹ️ ${isPt ? 'Alterações Online Efetuadas (Limite de 1 Alteração)' : 'Online Modification Completed (1-Time Limit)'}:</strong>
      <div style="margin-top: 4px; line-height: 1.5;">
        ${isPt 
          ? 'A sua reserva foi alterada online com sucesso. De acordo com a política do restaurante, cada reserva só pode ser alterada online uma vez. Para qualquer alteração adicional, por favor contacte o restaurante diretamente.'
          : 'Your reservation was successfully updated online. Per restaurant policy, online modifications can only be made once. To make any further changes, please contact the restaurant directly.'}
      </div>
    </div>` : ''}

    ${buildDetailsCard(opts, brandColor, isPt)}

    ${buildActionButtons({ ...opts, canModifyOnline: false, alreadyModifiedOnline: true }, brandColor, isPt)}

    <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 0 0;">
      ${isPt ? `Aguardamos a sua visita no ${displayName}!` : `We look forward to seeing you at ${displayName}!`}
    </p>
  `;

  const html = getBaseHtml(
    opts, 
    title, 
    isPt ? 'Atualizada' : 'Updated',
    '#dbeafe',
    '#1e40af',
    content, 
    'ReservationConfirmed'
  );

  const text = `
===================================================
${displayName.toUpperCase()}
${title.toUpperCase()}
===================================================

${isPt ? 'Olá' : 'Hello'} ${opts.name},

${isPt 
  ? `A sua reserva no ${displayName} foi atualizada com sucesso. Aqui estão os detalhes mais recentes:` 
  : `Your reservation at ${displayName} has been updated successfully. Here are your latest details:`}

${opts.allowCustomerModification !== false ? (isPt ? 'NOTA: Cada reserva só pode ser alterada online uma vez. Para alterações adicionais, contacte o restaurante diretamente.\n' : 'NOTE: Each reservation can be modified online only once. For any further changes, please contact the restaurant directly.\n') : ''}
---------------------------------------------------
${isPt ? 'DETALHES ATUALIZADOS' : 'UPDATED RESERVATION SUMMARY'}
---------------------------------------------------
• ${isPt ? 'Nº de Reserva' : 'Booking Ref'}: #${opts.bookingNumber || opts.reservationId || 'N/A'}
• ${isPt ? 'Estado' : 'Status'}: ${isPt ? 'Atualizada' : 'Updated'}
• ${isPt ? 'Data' : 'Date'}: ${formatDisplayDate(opts.date, isPt)} (${opts.date})
• ${isPt ? 'Hora' : 'Time'}: ${opts.time}
• ${isPt ? 'Pessoas' : 'Guests'}: ${opts.guests}
• ${isPt ? 'Nome' : 'Guest Name'}: ${opts.name}
${buildPlainTextActions({ ...opts, canModifyOnline: false, alreadyModifiedOnline: true }, isPt)}
---------------------------------------------------
${isPt ? 'CONTACTOS DO RESTAURANTE' : 'RESTAURANT CONTACT'}
---------------------------------------------------
${displayName}
${[opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ')}
${opts.restaurantPhone ? `${isPt ? 'Telefone' : 'Phone'}: ${opts.restaurantPhone}\n` : ''}${opts.restaurantEmail ? `Email: ${opts.restaurantEmail}\n` : ''}${opts.restaurantWebsite ? `Website: ${opts.restaurantWebsite}\n` : ''}
===================================================
Powered by DineMaster Pro
`.trim();

  return {
    subject: `${title} #${opts.bookingNumber || ''} - ${displayName}`.replace(' # -', ' -'),
    html,
    text
  };
}

// ----------------------------------------------------------------------
// 3. CANCELLATION EMAIL
// ----------------------------------------------------------------------
export function buildCancellationEmail(opts: EmailOptions): EmailResult {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Cancelada' : 'Reservation Cancelled';
  const refNumber = opts.bookingNumber ? `#${opts.bookingNumber}` : (opts.reservationId ? `#${opts.reservationId.slice(0, 8)}` : '');
  const formattedDate = formatDisplayDate(opts.date, isPt);

  let reasonBox = '';
  if (opts.cancellationReason) {
    reasonBox = `
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #991b1b;">
        <strong>⚠️ ${isPt ? 'Motivo do Cancelamento:' : 'Cancellation Reason:'}</strong>
        <div style="margin-top: 4px; line-height: 1.5; font-style: italic;">
          "${opts.cancellationReason}"
        </div>
      </div>
    `;
  }

  const content = `
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt ? 'Olá' : 'Hello'} <strong>${opts.name}</strong>,
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt 
        ? `Informamos que a sua reserva no <strong>${displayName}</strong> foi <strong>cancelada</strong> com sucesso.` 
        : `Your reservation at <strong>${displayName}</strong> has been successfully <strong>cancelled</strong> as requested.`}
    </p>

    ${reasonBox}

    <div style="margin: 22px 0; border: 1px solid #fecaca; border-radius: 10px; overflow: hidden; background-color: #fffaf0;">
      <div style="background-color: #fee2e2; padding: 10px 16px; border-bottom: 1px solid #fecaca;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">
              ${isPt ? 'Registo de Cancelamento' : 'Cancelled Reservation Details'}
            </td>
            <td align="right" style="font-size: 13px; font-weight: 700; font-family: monospace; color: #b91c1c;">
              ${refNumber}
            </td>
          </tr>
        </table>
      </div>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #fee2e2; color: #7f1d1d; font-size: 13px; font-weight: 600; width: 38%;">
            📅 ${isPt ? 'Data Prevista' : 'Scheduled Date'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #fee2e2; color: #111827; font-size: 14px; text-decoration: line-through;">
            ${formattedDate}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #fee2e2; color: #7f1d1d; font-size: 13px; font-weight: 600;">
            ⏰ ${isPt ? 'Hora' : 'Time'}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #fee2e2; color: #111827; font-size: 14px; text-decoration: line-through;">
            ${opts.time}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #7f1d1d; font-size: 13px; font-weight: 600;">
            👥 ${isPt ? 'Pessoas' : 'Guests'}
          </td>
          <td style="padding: 10px 14px; color: #111827; font-size: 14px;">
            ${opts.guests} ${opts.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}
          </td>
        </tr>
      </table>
    </div>

    ${buildActionButtons(opts, '#dc2626', isPt, true)}

    <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 0 0;">
      ${isPt 
        ? `Lamentamos não o poder receber desta vez. Esperamos ter o gosto de o receber numa próxima oportunidade no ${displayName}!` 
        : `We are sorry we won't see you this time. We hope to welcome you on another occasion at ${displayName}!`}
    </p>
  `;

  const html = getBaseHtml(
    opts, 
    title, 
    isPt ? 'Cancelada' : 'Cancelled',
    '#fee2e2',
    '#991b1b',
    content, 
    'ReservationCancelled'
  );

  const text = `
===================================================
${displayName.toUpperCase()}
${title.toUpperCase()}
===================================================

${isPt ? 'Olá' : 'Hello'} ${opts.name},

${isPt 
  ? `A sua reserva no ${displayName} foi cancelada conforme solicitado.` 
  : `Your reservation at ${displayName} has been cancelled as requested.`}

---------------------------------------------------
${isPt ? 'REGISTO DE CANCELAMENTO' : 'CANCELLED RESERVATION'}
---------------------------------------------------
• ${isPt ? 'Nº de Reserva' : 'Booking Ref'}: #${opts.bookingNumber || opts.reservationId || 'N/A'}
• ${isPt ? 'Estado' : 'Status'}: ${isPt ? 'Cancelada' : 'Cancelled'}
• ${isPt ? 'Data' : 'Date'}: ${formatDisplayDate(opts.date, isPt)} (${opts.date})
• ${isPt ? 'Hora' : 'Time'}: ${opts.time}
• ${isPt ? 'Pessoas' : 'Guests'}: ${opts.guests}
${opts.cancellationReason ? `• ${isPt ? 'Motivo' : 'Reason'}: ${opts.cancellationReason}\n` : ''}
${isPt 
  ? `Esperamos ter o gosto de o receber numa próxima ocasião.` 
  : `We hope to have the opportunity to welcome you on another occasion.`}

---------------------------------------------------
${isPt ? 'CONTACTOS DO RESTAURANTE' : 'RESTAURANT CONTACT'}
---------------------------------------------------
${displayName}
${[opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ')}
${opts.restaurantPhone ? `${isPt ? 'Telefone' : 'Phone'}: ${opts.restaurantPhone}\n` : ''}${opts.restaurantEmail ? `Email: ${opts.restaurantEmail}\n` : ''}${opts.restaurantWebsite ? `Website: ${opts.restaurantWebsite}\n` : ''}
===================================================
Powered by DineMaster Pro
`.trim();

  return {
    subject: `${title} #${opts.bookingNumber || ''} - ${displayName}`.replace(' # -', ' -'),
    html,
    text
  };
}

// ----------------------------------------------------------------------
// 4. REMINDER EMAIL
// ----------------------------------------------------------------------
export function buildReminderEmail(opts: EmailOptions): EmailResult {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const brandColor = sanitizeColor(opts.primaryColor, '#d97706');

  let isToday = false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    isToday = opts.date === todayStr;
  } catch (e) {
    // fallback
  }

  const title = isPt
    ? (isToday ? 'A sua reserva é hoje!' : 'Lembrete da sua reserva para amanhã')
    : (isToday ? 'Your reservation is today!' : 'Reminder: Your reservation is tomorrow');

  const dayWord = isPt
    ? (isToday ? 'hoje' : 'amanhã')
    : (isToday ? 'today' : 'tomorrow');

  const content = `
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt ? 'Olá' : 'Hello'} <strong>${opts.name}</strong>,
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt 
        ? `Este é um lembrete amigável de que tem uma reserva agendada para <strong>${dayWord}</strong> no <strong>${displayName}</strong>.` 
        : `This is a friendly reminder that you have a reservation scheduled for <strong>${dayWord}</strong> at <strong>${displayName}</strong>.`}
    </p>

    ${buildDetailsCard(opts, brandColor, isPt)}

    ${buildActionButtons(opts, brandColor, isPt)}

    <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 0 0;">
      ${isPt ? `Aguardamos a sua visita com muito gosto no ${displayName}!` : `We look forward to seeing you at ${displayName}!`}
    </p>
  `;

  const html = getBaseHtml(
    opts, 
    title, 
    isPt ? 'Lembrete' : 'Reminder',
    '#fef3c7',
    '#92400e',
    content, 
    'ReservationConfirmed'
  );

  const text = `
===================================================
${displayName.toUpperCase()}
${title.toUpperCase()}
===================================================

${isPt ? 'Olá' : 'Hello'} ${opts.name},

${isPt 
  ? `Este é um lembrete de que tem uma reserva agendada para ${dayWord} no ${displayName}.` 
  : `This is a reminder that you have a reservation scheduled for ${dayWord} at ${displayName}.`}

---------------------------------------------------
${isPt ? 'DETALHES DA RESERVA' : 'RESERVATION SUMMARY'}
---------------------------------------------------
• ${isPt ? 'Nº de Reserva' : 'Booking Ref'}: #${opts.bookingNumber || opts.reservationId || 'N/A'}
• ${isPt ? 'Data' : 'Date'}: ${formatDisplayDate(opts.date, isPt)} (${opts.date})
• ${isPt ? 'Hora' : 'Time'}: ${opts.time}
• ${isPt ? 'Pessoas' : 'Guests'}: ${opts.guests}
• ${isPt ? 'Nome' : 'Guest Name'}: ${opts.name}
${opts.table ? `• ${isPt ? 'Mesa' : 'Table'}: ${opts.table}\n` : ''}${opts.notes || opts.specialRequests ? `• ${isPt ? 'Notas' : 'Special Requests'}: ${opts.notes || opts.specialRequests}\n` : ''}
${buildPlainTextActions(opts, isPt)}
---------------------------------------------------
${isPt ? 'CONTACTOS DO RESTAURANTE' : 'RESTAURANT CONTACT'}
---------------------------------------------------
${displayName}
${[opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ')}
${opts.restaurantPhone ? `${isPt ? 'Telefone' : 'Phone'}: ${opts.restaurantPhone}\n` : ''}${opts.restaurantEmail ? `Email: ${opts.restaurantEmail}\n` : ''}${opts.restaurantWebsite ? `Website: ${opts.restaurantWebsite}\n` : ''}
===================================================
Powered by DineMaster Pro
`.trim();

  return {
    subject: `${title} #${opts.bookingNumber || ''} - ${displayName}`.replace(' # -', ' -'),
    html,
    text
  };
}

// ----------------------------------------------------------------------
// 5. TEST EMAIL
// ----------------------------------------------------------------------
export function buildTestEmail(opts: {
  email: string;
  restaurantName?: string;
  logoUrl?: string;
  primaryColor?: string;
  restaurantEmail?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantPostcode?: string;
  restaurantCity?: string;
  restaurantWebsite?: string;
  timezone?: string;
  language?: string;
}): EmailResult {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Bistro';
  const title = isPt ? 'Email de Teste de Marca' : 'Branded Test Email';
  const brandColor = sanitizeColor(opts.primaryColor, '#d97706');

  const content = `
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt ? 'Olá!' : 'Hello!'}
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      ${isPt 
        ? `Este é um email de teste enviado pelo sistema de reservas do <strong>${displayName}</strong> para validar o design, identidade de marca e entregabilidade.` 
        : `This is a test email sent from <strong>${displayName}</strong>'s reservation management system to validate design, branding, and deliverability.`}
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px 20px; border-radius: 10px; margin: 20px 0; color: #166534;">
      <strong style="font-size: 15px; display: block; margin-bottom: 4px;">
        ✓ ${isPt ? 'Serviço de Emails Operacional!' : 'Email Service Fully Operational!'}
      </strong>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #15803d;">
        ${isPt 
          ? `O modelo responsivo está ativo com o logótipo, cores e dados de contacto oficiais do <strong>${displayName}</strong>.` 
          : `The responsive template is active with the official logo, colors, and contact info of <strong>${displayName}</strong>.`}
      </p>
    </div>

    ${buildDetailsCard({
      email: opts.email,
      name: isPt ? 'Exemplo Cliente' : 'Sample Guest',
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      guests: 2,
      bookingNumber: 'SAMPLE-101',
      table: isPt ? 'Mesa 4' : 'Table 4',
      specialRequests: isPt ? 'Mesa junto à janela, se possível' : 'Window table preferred',
      restaurantName: displayName
    }, brandColor, isPt)}
  `;

  const html = getBaseHtml(
    {
      ...opts,
      name: 'Admin',
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      guests: 2,
      restaurantName: displayName
    }, 
    title, 
    isPt ? 'Teste' : 'Test',
    '#e0e7ff',
    '#3730a3',
    content, 
    'ReservationConfirmed'
  );

  const text = `
===================================================
${displayName.toUpperCase()}
${title.toUpperCase()}
===================================================

${isPt ? 'Email de Teste' : 'Test Email'}
${isPt ? 'O seu serviço de envio de emails está 100% operacional.' : 'Your email delivery service is 100% operational.'}

${displayName}
${[opts.restaurantAddress, opts.restaurantCity, opts.restaurantPostcode].filter(Boolean).join(', ')}
${opts.restaurantPhone ? `Phone: ${opts.restaurantPhone}\n` : ''}${opts.restaurantEmail ? `Email: ${opts.restaurantEmail}\n` : ''}
===================================================
Powered by DineMaster Pro
`.trim();

  return {
    subject: `${title} - ${displayName}`,
    html,
    text
  };
}
