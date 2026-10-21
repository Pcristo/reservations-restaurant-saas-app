import React from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatWhatsAppNumber } from '../utils/whatsapp';
import { useFeatureFlags } from '../services/featureFlagsService';
import { useTenantSafe } from '../hooks/useTenant';
import { isPackageFeatureEnabled } from '../services/entitlementsService';

interface WhatsAppButtonProps {
  phone: string | undefined | null;
  customerName?: string;
  region?: string;
  defaultCountryCode?: string;
  language?: string;
  className?: string;
  iconSize?: number;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  customerName,
  region,
  defaultCountryCode,
  language = 'en',
  className,
  iconSize = 16,
}) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const tenantCtx = useTenantSafe();

  // Respect platform feature flag and restaurant package entitlement in real-time
  const isPlatformEnabled = isFeatureEnabled('whatsapp_actions');
  const isEntitled = isPackageFeatureEnabled(tenantCtx?.entitlements, 'whatsapp');

  if (!isPlatformEnabled || !isEntitled) {
    return null;
  }

  const formattedNumber = formatWhatsAppNumber(phone, region, defaultCountryCode);

  const title = language === 'pt' 
    ? `Ligar para ${customerName || 'cliente'} no WhatsApp` 
    : `Call ${customerName || 'customer'} on WhatsApp`;

  if (!formattedNumber) {
    return (
      <span 
        className={cn("p-1.5 text-gray-300 rounded cursor-not-allowed", className)}
        title={language === 'pt' ? 'Sem número de telefone' : 'No phone number available'}
        onClick={(e) => e.stopPropagation()}
      >
        <MessageCircle size={iconSize} />
      </span>
    );
  }

  return (
    <a
      href={`https://wa.me/${formattedNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors flex items-center justify-center no-underline hover:no-underline",
        className
      )}
      title={title}
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle size={iconSize} />
    </a>
  );
};

export default WhatsAppButton;
