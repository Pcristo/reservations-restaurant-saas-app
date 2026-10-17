import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { FileText, Calendar, Scale, ShieldAlert, ArrowLeft, Globe } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../data/appConfig';

export default function TermsAndConditions() {
  const { slug } = useParams<{ slug?: string }>();
  const { settings } = useSettings(slug);
  const { language, t } = useLanguage();

  const isDark = settings?.theme === 'dark';
  const restaurantName = settings?.name || APP_CONFIG.appName;
  const phone = settings?.phone || APP_CONFIG.phone;
  const email = settings?.email || APP_CONFIG.email;
  const address = settings?.address || APP_CONFIG.address;
  const maxGuests = settings?.maxOnlineGuests || 10;
  const gracePeriod = settings?.gracePeriod || 15;
  const backTo = slug ? `/r/${slug}` : '/';

  return (
    <div className={cn(
      "min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 text-[0.79em]",
      isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
    )}>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            to={backTo} 
            className={cn(
              "inline-flex items-center gap-2 text-[12.5px] font-semibold transition-colors",
              isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"
            )}
          >
            <ArrowLeft size={16} />
            {language === 'pt' ? 'Voltar ao Início' : 'Back to Home'}
          </Link>
        </div>

        {/* Header */}
        <div className={cn(
          "rounded-3xl p-8 md:p-12 mb-8 shadow-xl relative overflow-hidden",
          isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100"
        )}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Scale size={120} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Scale size={32} />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-bold transition-colors leading-tight",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {restaurantName}
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-widest text-amber-500">
                {language === 'pt' ? 'Termos e Condições Gerais de Reserva' : 'General Terms & Conditions of Reservation'}
              </span>
            </div>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight mb-4">
            {t('common.terms_of_service')}
          </h1>
          <p className={cn(
            "text-[12.5px]",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            {language === 'pt' 
              ? 'Última atualização: 13 de Julho de 2026' 
              : 'Last updated: July 13, 2026'}
          </p>
        </div>

        {/* Content */}
        <div className={cn(
          "rounded-3xl p-8 md:p-12 shadow-xl space-y-8 leading-relaxed",
          isDark ? "bg-gray-900 border border-gray-800 text-gray-300" : "bg-white border border-gray-100 text-gray-700"
        )}>
          {language === 'pt' ? (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <FileText size={18} /> 1. Âmbito e Objeto do Serviço
                </h2>
                <p>
                  Estes Termos e Condições regem o uso do sistema de reservas online e serviços prestados por <strong>{restaurantName}</strong>, localizado em {address} (contacto telefónico: {phone}; email: {email}). Ao efetuar uma reserva através da nossa plataforma, o cliente aceita integralmente os presentes termos.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Calendar size={18} /> 2. Reservas, Grupos e Tolerância de Atraso
                </h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Capacidade Máxima:</strong> Cada reserva online permite até {maxGuests} convidados em simultâneo. Para grupos superiores, por favor contacte-nos diretamente por email ou telefone.</li>
                  <li><strong>Tolerância de Atraso:</strong> O <strong>{restaurantName}</strong> reserva a mesa por um período máximo de {gracePeriod} minutos após a hora marcada. Em caso de atraso superior, agradecemos aviso prévio.</li>
                  <li><strong>Confirmação Instantânea:</strong> Todas as reservas geram um código de confirmação único enviado por email e/ou SMS.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <ShieldAlert size={18} /> 3. Modificações, Cancelamentos e Conduta
                </h2>
                <p>
                  Pode modificar ou cancelar a sua reserva a qualquer momento através do link fornecido no seu email de confirmação ou gerindo a sua reserva no portal do cliente. O <strong>{restaurantName}</strong> reserva-se o direito de recusar o acesso ou cancelar reservas em caso de incumprimento grave das normas de conduta ou fornecimento de contactos falsos.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <FileText size={18} /> 1. Scope & Service Object
                </h2>
                <p>
                  These Terms and Conditions govern the use of the online reservation system and hospitality services provided by <strong>{restaurantName}</strong>, located at {address} (phone: {phone}; email: {email}). By making a table booking through our platform, you fully accept and agree to these terms.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Calendar size={18} /> 2. Bookings, Groups & Grace Period
                </h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Maximum Party Size:</strong> Standard online bookings accommodate up to {maxGuests} guests simultaneously. For larger events or private dining, please contact us directly.</li>
                  <li><strong>Grace Period:</strong> <strong>{restaurantName}</strong> holds reserved tables for up to {gracePeriod} minutes past the scheduled booking time. Please notify us of any unexpected delays.</li>
                  <li><strong>Instant Confirmation:</strong> All reservations generate a unique digital confirmation code sent via email.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <ShieldAlert size={18} /> 3. Modifications, Cancellations & Conduct
                </h2>
                <p>
                  You may modify or cancel your booking at any time using the secure link in your confirmation email or through your guest dashboard. <strong>{restaurantName}</strong> reserves the right to cancel bookings associated with fraudulent contact information or violation of restaurant policies.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
