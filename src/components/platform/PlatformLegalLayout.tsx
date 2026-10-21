import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, Scale, Cookie, ArrowLeft, Globe, Building2, 
  Mail, Phone, MapPin, AlertCircle, CheckCircle2, 
  ChevronRight, Menu, X, ExternalLink, Calendar
} from 'lucide-react';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import ZarcoFooter from '../extra/ZarcoFooterTemplate';

export interface TocItem {
  id: string;
  titleEn: string;
  titlePt: string;
}

interface PlatformLegalLayoutProps {
  children: React.ReactNode;
  activeDoc: 'terms' | 'privacy' | 'cookies';
  toc: TocItem[];
  titleEn: string;
  titlePt: string;
  subtitleEn: string;
  subtitlePt: string;
  hidePrintButton?: boolean;
}

export const PlatformLegalLayout: React.FC<PlatformLegalLayoutProps> = ({
  children,
  activeDoc,
  toc,
  titleEn,
  titlePt,
  subtitleEn,
  subtitlePt,
  hidePrintButton = false,
}) => {
  const { platformSettings } = usePlatformSettings();
  const { language, setLanguage } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const location = useLocation();
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const isPt = language === 'pt';
  const lastUpdated = platformSettings.lastLegalReviewDate || '2026-10-21';

  // Platform details with safe fallbacks and explicit "Pending Configuration" flags
  const brandName = platformSettings.saasName || 'DineMaster Pro';
  const legalName = platformSettings.legalCompanyName?.trim();
  const regNumber = platformSettings.companyRegistrationNumber?.trim();
  const vatNumber = platformSettings.vatNumber?.trim();
  const address = platformSettings.registeredAddress?.trim();
  const email = (platformSettings.legalContactEmail || platformSettings.supportEmail || 'support@dinemasterpro.com').trim();
  const privacyEmail = (platformSettings.dpoContactEmail || platformSettings.legalContactEmail || 'privacy@dinemasterpro.com').trim();
  const phone = platformSettings.contactPhone?.trim();
  const jurisdiction = platformSettings.primaryJurisdiction || 'ireland';

  const hasMissingCorporateDetails = !legalName || !regNumber || !vatNumber || !address;

  const handleOpenCookieSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Global Platform Legal Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Platform Indicator */}
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2.5 text-white hover:text-amber-400 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Shield size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-tight">
                  {brandName}
                </span>
                <span className="text-[10px] text-amber-400/90 font-mono tracking-wider uppercase">
                  {isPt ? 'Centro Legal da Plataforma' : 'Platform Legal Trust Center'}
                </span>
              </div>
            </Link>

            <div className="hidden lg:block h-5 w-[1px] bg-slate-800" />

            <Link
              to="/"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} />
              <span>{isPt ? 'Voltar ao Website Principal' : 'Back to Main Website'}</span>
            </Link>
          </div>

          {/* Tab Navigation Between the 3 Platform Legal Documents */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <Link
              to="/terms"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeDoc === 'terms'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isPt ? 'Termos & Condições' : 'Terms & Conditions'}
            </Link>
            <Link
              to="/privacy"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeDoc === 'privacy'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            </Link>
            <Link
              to="/cookies"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeDoc === 'cookies'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isPt ? 'Política de Cookies' : 'Cookie Policy'}
            </Link>
          </nav>

          {/* Action Toolbar: Language & Super Admin Link */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('pt')}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  language === 'pt'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PT
              </button>
            </div>

            {/* Mobile TOC Toggle */}
            <button
              type="button"
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
              aria-label="Toggle Table of Contents"
            >
              {mobileTocOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Tabs */}
        <div className="md:hidden border-t border-slate-800/80 px-4 py-2 flex items-center justify-between gap-1 overflow-x-auto text-[11px]">
          <Link
            to="/terms"
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeDoc === 'terms' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            {isPt ? 'Termos' : 'Terms'}
          </Link>
          <Link
            to="/privacy"
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeDoc === 'privacy' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            {isPt ? 'Privacidade' : 'Privacy'}
          </Link>
          <Link
            to="/cookies"
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeDoc === 'cookies' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            {isPt ? 'Cookies' : 'Cookies'}
          </Link>
          <button
            onClick={handleOpenCookieSettings}
            type="button"
            className="px-2 py-1 rounded text-amber-400 bg-amber-500/10 border border-amber-500/20 whitespace-nowrap cursor-pointer ml-auto"
          >
            {isPt ? 'Preferências' : 'Preferences'}
          </button>
        </div>
      </header>

      {/* 2. Hero Banner & Legal Scope Header */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
                {activeDoc === 'terms' && <Scale size={13} />}
                {activeDoc === 'privacy' && <Shield size={13} />}
                {activeDoc === 'cookies' && <Cookie size={13} />}
                <span>
                  {jurisdiction === 'ireland' 
                    ? 'EU / Ireland Applicable Law' 
                    : jurisdiction === 'portugal' 
                    ? 'EU / Portugal Legislação Aplicável' 
                    : 'European Union (GDPR & ePrivacy)'}
                </span>
                <span className="text-slate-600">·</span>
                <span>{isPt ? `Revisto: ${lastUpdated}` : `Last reviewed: ${lastUpdated}`}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {isPt ? titlePt : titleEn}
              </h1>

              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {isPt ? subtitlePt : subtitleEn}
              </p>
            </div>

            {/* Quick Action Button for Cookies if Cookie page */}
            {activeDoc === 'cookies' && (
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCookieSettings}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  <Cookie size={15} />
                  <span>{isPt ? 'Gerir Preferências de Cookies' : 'Manage Cookie Preferences'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Single Source of Truth Corporate Identity Card */}
      <section className="border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {isPt ? 'Identificação da Entidade Operadora da Plataforma' : 'Platform Operating Entity & Corporate Identity'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>
                  {isPt ? 'Fonte da Verdade:' : 'Source of Truth:'}{' '}
                  <strong className="text-slate-200">Super Admin → Platform Settings</strong>
                </span>
                {isSuperAdmin && (
                  <Link
                    to="/app/super-admin/settings"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{isPt ? 'Editar Definições' : 'Edit in Super Admin'}</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>
            </div>

            {/* Corporate Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Entidade Legal:' : 'Legal Company Name:'}</span>
                {legalName ? (
                  <span className="text-white font-medium">{legalName}</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {isPt ? '[Pendente: Nome da Empresa no Super Admin]' : '[Pending: Legal Entity in Super Admin]'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Registo Comercial / NIPC:' : 'Company Registration / CRO:'}</span>
                {regNumber ? (
                  <span className="text-white font-mono">{regNumber}</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {isPt ? '[Pendente: NIPC no Super Admin]' : '[Pending: Reg Number in Super Admin]'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'NIF / N.º IVA (VAT):' : 'VAT / Tax Identification:'}</span>
                {vatNumber ? (
                  <span className="text-white font-mono">{vatNumber}</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {isPt ? '[Pendente: NIF/IVA no Super Admin]' : '[Pending: VAT No. in Super Admin]'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Jurisdição Principal:' : 'Governing Jurisdiction:'}</span>
                <span className="text-slate-200">
                  {jurisdiction === 'ireland'
                    ? 'Ireland (Irish Data Protection Act 2018)'
                    : jurisdiction === 'portugal'
                    ? 'Portugal (Lei n.º 58/2019 / RGPD)'
                    : 'European Union (GDPR Reg. 2016/679)'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Sede Social / Morada Registada:' : 'Registered Business Address:'}</span>
                {address ? (
                  <span className="text-white">{address}</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {isPt ? '[Pendente: Morada Registada no Super Admin]' : '[Pending: Registered Address in Super Admin]'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Contacto Geral / Legal:' : 'Legal Inquiries Email:'}</span>
                <a href={`mailto:${email}`} className="text-amber-400 hover:underline font-mono">
                  {email}
                </a>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">{isPt ? 'Encarregado de Proteção de Dados (DPO):' : 'Data Protection / DPO:'}</span>
                <a href={`mailto:${privacyEmail}`} className="text-amber-400 hover:underline font-mono">
                  {privacyEmail}
                </a>
              </div>
            </div>

            {/* Missing Info Regulatory Disclaimer */}
            {hasMissingCorporateDetails && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  {isPt
                    ? 'Aviso de Transparência Regulatória: Os campos assinalados como [Pendente] devem ser configurados pelo proprietário da plataforma em Super Admin → Definições da Plataforma antes da publicação comercial definitiva. Nenhuns dados societários fictícios são inventados por este software.'
                    : 'Regulatory Transparency Notice: Fields flagged as [Pending] must be configured by the platform administrator under Super Admin → Platform Settings prior to full commercial publication. No fictitious corporate details are invented by this software.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Main Body: Sticky Table of Contents + Legal Document */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents - Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>{isPt ? 'Índice do Documento' : 'Table of Contents'}</span>
                <span className="text-amber-400 font-mono text-[11px]">{toc.length} {isPt ? 'secções' : 'sections'}</span>
              </div>

              <nav className="space-y-1 text-xs max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {toc.map((item, idx) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block px-2.5 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors leading-snug"
                  >
                    <span className="text-amber-500/80 font-mono mr-1.5">{idx + 1}.</span>
                    <span>{isPt ? item.titlePt : item.titleEn}</span>
                  </a>
                ))}
              </nav>

              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="text-slate-500">{isPt ? 'Outros Documentos Legais:' : 'Other Platform Documents:'}</div>
                {activeDoc !== 'terms' && (
                  <Link to="/terms" className="flex items-center gap-1.5 text-amber-400 hover:underline">
                    <ChevronRight size={12} />
                    <span>{isPt ? 'Termos & Condições' : 'Terms & Conditions'}</span>
                  </Link>
                )}
                {activeDoc !== 'privacy' && (
                  <Link to="/privacy" className="flex items-center gap-1.5 text-amber-400 hover:underline">
                    <ChevronRight size={12} />
                    <span>{isPt ? 'Política de Privacidade' : 'Privacy Policy'}</span>
                  </Link>
                )}
                {activeDoc !== 'cookies' && (
                  <Link to="/cookies" className="flex items-center gap-1.5 text-amber-400 hover:underline">
                    <ChevronRight size={12} />
                    <span>{isPt ? 'Política de Cookies' : 'Cookie Policy'}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Strict Separation Callout */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 text-[11px] text-slate-400 space-y-1.5">
              <span className="font-semibold text-slate-300 block">
                {isPt ? 'Separação de Funções & Contratos:' : 'Role Separation Notice:'}
              </span>
              <p className="leading-relaxed">
                {isPt
                  ? 'Estas páginas aplicam-se exclusivamente à plataforma de software DineMaster Pro. As reservas efetuadas em restaurantes parceiros específicos estão sujeitas aos termos e políticas individuais de cada estabelecimento (/r/[restaurante]/privacy).'
                  : 'These legal terms govern the DineMaster Pro software platform. Table reservations placed at partner restaurants are governed additionally by each respective restaurant’s own legal terms (/r/[restaurant]/privacy).'}
              </p>
            </div>
          </aside>

          {/* Mobile TOC Drawer */}
          {mobileTocOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 flex flex-col justify-end">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-h-[80vh] overflow-y-auto space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-sm text-white">{isPt ? 'Índice de Secções' : 'Table of Contents'}</span>
                  <button onClick={() => setMobileTocOpen(false)} className="p-1 text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {toc.map((item, idx) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setMobileTocOpen(false)}
                      className="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <span className="text-amber-500 font-mono mr-1.5">{idx + 1}.</span>
                      <span>{isPt ? item.titlePt : item.titleEn}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Document Content */}
          <article className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-8 text-slate-300 leading-relaxed text-sm">
            {children}
          </article>
        </div>
      </main>

      {/* 5. Footer with Legal Disclaimers & Zarco Template */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
            <div className="space-y-1">
              <span className="text-white font-semibold">
                {brandName} {isPt ? '— Documentação Legal da Plataforma' : '— Platform Legal Framework'}
              </span>
              <p className="text-[11px] text-slate-400 max-w-xl">
                {isPt
                  ? 'Documentação elaborada para conformidade com o RGPD (Regulamento (UE) 2016/679), a Lei n.º 58/2019 de Portugal, o Irish Data Protection Act 2018 e a Diretiva de Privacidade Eletrónica (ePrivacy).'
                  : 'Documented in compliance with EU GDPR (Regulation (EU) 2016/679), Irish Data Protection Act 2018, Portuguese Law No. 58/2019, and the EU ePrivacy framework.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenCookieSettings}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-300 transition-colors cursor-pointer"
              >
                {isPt ? 'Gerir Cookies' : 'Cookie Settings'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px]">
            <div>
              © {new Date().getFullYear()} {legalName || brandName}. {isPt ? 'Todos os direitos reservados.' : 'All rights reserved.'}
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <Link to="/terms" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Termos de Utilização' : 'Terms of Service'}
              </Link>
              <Link to="/privacy" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Privacidade' : 'Privacy'}
              </Link>
              <Link to="/cookies" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Cookies' : 'Cookies'}
              </Link>
              <Link to="/" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Página Inicial' : 'Platform Home'}
              </Link>
            </div>
          </div>

          <ZarcoFooter lang={isPt ? 'pt' : 'en'} />
        </div>
      </footer>
    </div>
  );
};

export default PlatformLegalLayout;
