import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, Shield, Cookie, ArrowLeft, Globe, 
  Building2, AlertTriangle, ExternalLink, Settings as SettingsIcon, Check
} from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { PlatformSettings } from '../../types';
import { DEFAULT_PLATFORM_SETTINGS } from '../../data/plans';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export interface TocItem {
  id: string;
  title: string;
  subItems?: { id: string; title: string }[];
}

interface PlatformLegalLayoutProps {
  children: React.ReactNode;
  activeDoc: 'terms' | 'privacy' | 'cookies';
  toc: TocItem[];
  hidePrintButton?: boolean;
}

export function PlatformLegalLayout({
  children,
  activeDoc,
  toc,
  hidePrintButton = false,
}: PlatformLegalLayoutProps) {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const isPt = language === 'pt';

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const cached = localStorage.getItem('dinemaster_platform_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_PLATFORM_SETTINGS;
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platform_settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PlatformSettings;
        setPlatformSettings(data);
        try {
          localStorage.setItem('dinemaster_platform_settings', JSON.stringify(data));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  const [activeSection, setActiveSection] = useState<string>('');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Active section tracking on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headings = toc.map(item => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
      const scrollPos = window.scrollY + 140;

      for (let i = headings.length - 1; i >= 0; i--) {
        if (headings[i].offsetTop <= scrollPos) {
          setActiveSection(headings[i].id);
          return;
        }
      }
      if (headings.length > 0) {
        setActiveSection(headings[0].id);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  const isSuperAdminUser = 
    user?.email?.toLowerCase() === 'pcristo35@gmail.com' || 
    (user as any)?.role === 'super_admin' || 
    (user as any)?.role === 'superadmin';

  // Check if critical corporate details are missing
  const hasMissingCorporateDetails = 
    !platformSettings.legalCompanyName || 
    !platformSettings.registeredAddress || 
    !platformSettings.vatNumber ||
    !platformSettings.companyRegistrationNumber;

  const docTitles = {
    terms: {
      en: 'Terms & Conditions',
      pt: 'Termos e Condições da Plataforma',
      descEn: 'Governing the software services, subscriptions, and platform access between DineMaster Pro and restaurants.',
      descPt: 'Regem os serviços de software, subscrições e acesso à plataforma entre o DineMaster Pro e os restaurantes.',
      icon: FileText
    },
    privacy: {
      en: 'Platform Privacy Policy',
      pt: 'Política de Privacidade da Plataforma',
      descEn: 'Comprehensive data protection, Controller vs Processor separation, and GDPR compliance (EU / Ireland / Portugal).',
      descPt: 'Proteção de dados integral, distinção entre Responsável e Subcontratante e conformidade RGPD (UE / Irlanda / Portugal).',
      icon: Shield
    },
    cookies: {
      en: 'Cookie & Tracking Policy',
      pt: 'Política de Cookies e Rastreio',
      descEn: 'Transparent disclosure of local storage, authentication tokens, offline caching, and user consent management.',
      descPt: 'Divulgação transparente de armazenamento local, tokens de autenticação, cache offline e gestão de consentimento.',
      icon: Cookie
    }
  };

  const currentMeta = docTitles[activeDoc];
  const CurrentIcon = currentMeta.icon;

  const reviewDate = platformSettings.lastLegalReviewDate || '2026-10-21';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="text-lg font-bold tracking-tight text-white flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                {platformSettings.saasName ? platformSettings.saasName.charAt(0) : 'D'}
              </div>
              <span className="group-hover:text-amber-400 transition-colors">
                {platformSettings.saasName || 'DineMaster Pro'}
              </span>
            </Link>
            <span className="hidden sm:inline-block text-slate-700">/</span>
            <span className="hidden sm:inline-block text-xs font-mono uppercase tracking-wider text-slate-400">
              {isPt ? 'Portal Legal' : 'Platform Legal'}
            </span>
          </div>

          {/* Navigation Links between all 3 platform legal documents */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <Link
              to="/terms"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                activeDoc === 'terms'
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isPt ? 'Termos e Condições' : 'Terms & Conditions'}
            </Link>
            <Link
              to="/privacy"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                activeDoc === 'privacy'
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isPt ? 'Privacidade' : 'Privacy Policy'}
            </Link>
            <Link
              to="/cookies"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                activeDoc === 'cookies'
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isPt ? 'Cookies' : 'Cookie Policy'}
            </Link>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center rounded-lg p-0.5 bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                  language === 'en'
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                )}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('pt')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                  language === 'pt'
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                )}
                title="Português"
              >
                PT
              </button>
            </div>

            {/* Back to Platform Home */}
            <Link
              to="/"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">{isPt ? 'Início' : 'Home'}</span>
            </Link>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex items-center border-t border-slate-800/80 px-4 py-2 bg-slate-950 gap-2 overflow-x-auto">
          <Link
            to="/terms"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap",
              activeDoc === 'terms' ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            )}
          >
            {isPt ? 'Termos' : 'Terms'}
          </Link>
          <Link
            to="/privacy"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap",
              activeDoc === 'privacy' ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            )}
          >
            {isPt ? 'Privacidade' : 'Privacy'}
          </Link>
          <Link
            to="/cookies"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap",
              activeDoc === 'cookies' ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            )}
          >
            {isPt ? 'Cookies' : 'Cookies'}
          </Link>
        </div>
      </header>

      {/* 2. Hero Header */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            {/* Breadcrumb & Subtitle */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4">
              <span>{platformSettings.saasName || 'DineMaster Pro'}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-medium">
                {isPt ? 'Documentação Legal da Plataforma' : 'Platform Legal Documents'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isPt ? `Atualizado em: ${reviewDate}` : `Last Updated: ${reviewDate}`}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <CurrentIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {isPt ? currentMeta.pt : currentMeta.en}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {isPt ? currentMeta.descPt : currentMeta.descEn}
            </p>

            {/* Metadata Bar */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-amber-400 shrink-0" />
                <span>
                  {platformSettings.legalCompanyName ? (
                    <strong className="text-slate-200">{platformSettings.legalCompanyName}</strong>
                  ) : (
                    <span className="text-amber-400/90 font-mono">
                      [Pending Super Admin Configuration — Legal Entity Name Required]
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-400 shrink-0" />
                <span>
                  {platformSettings.primaryJurisdiction === 'ireland'
                    ? (isPt ? 'Jurisdição Principal: Irlanda' : 'Primary Jurisdiction: Ireland')
                    : platformSettings.primaryJurisdiction === 'portugal'
                    ? (isPt ? 'Jurisdição Principal: Portugal' : 'Primary Jurisdiction: Portugal')
                    : (isPt ? 'Jurisdições Operacionais: Irlanda & Portugal (União Europeia)' : 'Operating Jurisdictions: Ireland & Portugal (European Union)')}
                </span>
              </div>

              {isSuperAdminUser && (
                <Link
                  to="/app/super-admin/settings"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium hover:underline print:hidden"
                >
                  <SettingsIcon size={12} />
                  <span>{isPt ? 'Editar Definições no Super Admin' : 'Edit in Super Admin Settings'}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Missing Corporate Info Alert Box (Visible to assist admin before publication) */}
      {hasMissingCorporateDetails && (
        <aside 
          aria-label="Configuration Notice"
          className="bg-amber-950/30 border-b border-amber-500/30 py-3.5 px-4 sm:px-6 lg:px-8 print:hidden"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-amber-200">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-300">
                  {isPt ? 'Aviso de Publicação Legal (Super Admin)' : 'Legal Publication Notice (Super Admin)'}
                </strong>
                <span className="text-amber-200/90">
                  {isPt 
                    ? 'Alguns dados societários da entidade gestora (Nome Legal, Morada Registada, NIPC ou NIF/IVA) ainda não foram configurados em Definições da Plataforma. Estão temporariamente assinalados com marcas de aviso e devem ser preenchidos antes da publicação definitiva.'
                    : 'Statutory corporate identity details (Legal Company Name, Registered Address, VAT/Tax ID, or Company Registration Number) are not yet configured in Super Admin → Platform Settings. They are flagged with placeholders below and must be completed before official deployment.'}
                </span>
              </div>
            </div>
            {isSuperAdminUser && (
              <Link
                to="/app/super-admin/settings"
                className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <span>{isPt ? 'Configurar Agora' : 'Configure Now'}</span>
                <ExternalLink size={12} />
              </Link>
            )}
          </div>
        </aside>
      )}

      {/* 4. Main Document Body with Sticky Table of Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Table of Contents Column */}
          <aside className="lg:col-span-4 xl:col-span-3 print:hidden">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {isPt ? 'Índice do Documento' : 'Table of Contents'}
                  </h2>
                  <span className="text-[10px] font-mono text-slate-400">
                    {toc.length} {isPt ? 'secções' : 'sections'}
                  </span>
                </div>

                <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                  {toc.map((item, idx) => {
                    const isActive = activeSection === item.id;
                    return (
                      <div key={item.id} className="space-y-0.5">
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(item.id);
                            if (el) {
                              const yOffset = -90;
                              const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }}
                          className={cn(
                            "block px-2.5 py-1.5 text-xs rounded-lg transition-colors leading-snug",
                            isActive
                              ? "bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                          )}
                        >
                          <span className="font-mono text-[11px] opacity-60 mr-1.5">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          {item.title}
                        </a>

                        {item.subItems && (
                          <div className="pl-4 space-y-0.5 border-l border-slate-800/60 ml-2 mt-0.5">
                            {item.subItems.map(sub => (
                              <a
                                key={sub.id}
                                href={`#${sub.id}`}
                                className="block px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 rounded"
                              >
                                {sub.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Legal Support Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Shield size={14} className="text-amber-400" />
                  <span>{isPt ? 'Canal de Apoio Jurídico' : 'Legal Contact Channel'}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isPt 
                    ? 'Para questões sobre RGPD, exercício de direitos ou termos de subscrição:'
                    : 'For GDPR inquiries, data subject rights, or platform subscription agreements:'}
                </p>
                <div className="pt-1">
                  <a 
                    href={`mailto:${platformSettings.legalContactEmail || platformSettings.supportEmail || 'legal@dinemasterpro.com'}`}
                    className="text-amber-400 hover:text-amber-300 font-mono text-xs block break-all hover:underline"
                  >
                    {platformSettings.legalContactEmail || platformSettings.supportEmail || 'legal@dinemasterpro.com'}
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Column */}
          <main className="lg:col-span-8 xl:col-span-9 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl">
            {children}
          </main>
        </div>
      </div>

      {/* 5. Dedicated Platform Legal Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-bold text-white text-sm">
                  {platformSettings.saasName || 'DineMaster Pro'}
                </span>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                  SaaS Hospitality Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {platformSettings.legalCompanyName 
                  ? `${platformSettings.legalCompanyName} — Registered in ${platformSettings.primaryJurisdiction === 'portugal' ? 'Portugal' : 'Ireland'} & European Union.`
                  : 'Multi-tenant restaurant reservation SaaS platform operating in Ireland and Portugal.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link to="/terms" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Termos e Condições' : 'Terms & Conditions'}
              </Link>
              <Link to="/privacy" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
              </Link>
              <Link to="/cookies" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Política de Cookies' : 'Cookie Policy'}
              </Link>
              <a 
                href={platformSettings.disputeResolutionPlatform || 'https://ec.europa.eu/consumers/odr'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition-colors inline-flex items-center gap-1"
              >
                <span>{isPt ? 'Resolução de Litígios (ODR)' : 'EU Dispute Resolution'}</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-900 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} {platformSettings.saasName || 'DineMaster Pro'}. {isPt ? 'Todos os direitos reservados.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
