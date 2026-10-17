import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { Cookie, Shield, Eye, Settings, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../data/appConfig';

export default function CookiePolicy() {
  const { slug } = useParams<{ slug?: string }>();
  const { settings } = useSettings(slug);
  const { language, t } = useLanguage();

  const isDark = settings?.theme === 'dark';
  const restaurantName = settings?.name || APP_CONFIG.appName;
  const email = settings?.email || APP_CONFIG.email;
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
            <Cookie size={120} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Cookie size={32} />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-bold transition-colors leading-tight",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {restaurantName}
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-widest text-amber-500">
                {language === 'pt' ? 'Política de Cookies & Tecnologias de Rastreio' : 'Cookie Policy & Tracking Technologies'}
              </span>
            </div>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight mb-4">
            {t('common.cookie_policy')}
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
                  <Cookie size={18} /> 1. O que são Cookies?
                </h2>
                <p>
                  Os cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita a plataforma online do <strong>{restaurantName}</strong>. São amplamente utilizados para garantir o correto funcionamento do website, memorizar preferências de idioma e otimizar a experiência de reserva de mesa.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Settings size={18} /> 2. Como Utilizamos os Cookies
                </h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Cookies Estritamente Necessários:</strong> Essenciais para a navegação na plataforma e gestão de sessões de reserva.</li>
                  <li><strong>Cookies de Desempenho e Analíticos:</strong> Recolhem dados anónimos sobre a utilização do website para melhorar continuamente os nossos serviços no <strong>{restaurantName}</strong>.</li>
                  <li><strong>Cookies de Preferências:</strong> Armazenam escolhas como o idioma preferido (Português ou Inglês).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Shield size={18} /> 3. Gestão e Consentimento
                </h2>
                <p>
                  Pode configurar o seu navegador para recusar cookies ou alertá-lo quando forem enviados. Note que a desativação de determinados cookies poderá afetar a funcionalidade da plataforma de reservas do <strong>{restaurantName}</strong>. Para esclarecimentos adicionais, contacte-nos através do email <a href={`mailto:${email}`} className="text-amber-500 underline">{email}</a>.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Cookie size={18} /> 1. What are Cookies?
                </h2>
                <p>
                  Cookies are small text files stored on your device when you visit <strong>{restaurantName}</strong>'s online platform. They are widely used to ensure proper website functionality, remember user preferences, and streamline your table reservation experience.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Settings size={18} /> 2. How We Use Cookies
                </h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Strictly Necessary Cookies:</strong> Essential for browsing the platform and managing booking sessions.</li>
                  <li><strong>Performance & Analytics Cookies:</strong> Gather anonymous usage statistics to continually improve services at <strong>{restaurantName}</strong>.</li>
                  <li><strong>Preference Cookies:</strong> Store user choices such as preferred language (English or Portuguese).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Shield size={18} /> 3. Management & Consent
                </h2>
                <p>
                  You can configure your browser to refuse cookies or alert you when they are sent. Please note that disabling certain cookies may impact the functionality of <strong>{restaurantName}</strong>'s reservation system. For inquiries, please contact us at <a href={`mailto:${email}`} className="text-amber-500 underline">{email}</a>.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
