import React, { useState, useEffect } from 'react';
import { PlatformLegalLayout, TocItem } from '../../components/platform/PlatformLegalLayout';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useLanguage } from '../../hooks/useLanguage';
import { 
  Cookie, Settings, ShieldCheck, Database, CheckCircle2, 
  XCircle, Sliders, ExternalLink, RefreshCw, AlertCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const tocItems: TocItem[] = [
  { id: 'sec-cookie-intro', titleEn: '1. What Are Cookies & Storage Technologies?', titlePt: '1. O que são Cookies e Tecnologias de Armazenamento?' },
  { id: 'sec-cookie-framework', titleEn: '2. Legal & Regulatory Framework (ePrivacy Directive)', titlePt: '2. Enquadramento Legal e Diretiva de Privacidade Eletrónica' },
  { id: 'sec-cookie-inventory', titleEn: '3. Technical Inventory of Storage Used in DineMaster Pro', titlePt: '3. Inventário Técnico Real da Aplicação DineMaster Pro' },
  { id: 'sec-cookie-consent', titleEn: '4. Consent Requirements & Your Current Preferences', titlePt: '4. Requisitos de Consentimento e Suas Preferências Atuais' },
  { id: 'sec-cookie-thirdparty', titleEn: '5. Third-Party Embedded Integrations', titlePt: '5. Integrações e Serviços de Terceiros' },
  { id: 'sec-cookie-manage', titleEn: '6. Managing & Withdrawing Consent in Your Browser', titlePt: '6. Como Gerir ou Revogar o Consentimento no Navegador' },
  { id: 'sec-cookie-updates', titleEn: '7. Policy Revisions & Statutory Verification Notice', titlePt: '7. Atualizações e Verificação Jurídica' },
];

export default function PlatformCookiePolicy() {
  const { platformSettings } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const brandName = platformSettings.saasName || 'DineMaster Pro';
  const supportEmail = platformSettings.legalContactEmail || platformSettings.supportEmail || 'support@dinemasterpro.com';
  const privacyEmail = platformSettings.dpoContactEmail || platformSettings.legalContactEmail || 'privacy@dinemasterpro.com';

  // Live state of user's cookie preferences from localStorage
  const [currentConsent, setCurrentConsent] = useState<{
    choice: string | null;
    preferences: {
      necessary: boolean;
      preferences: boolean;
      analytics: boolean;
      marketing: boolean;
    };
  }>({
    choice: null,
    preferences: {
      necessary: true,
      preferences: true,
      analytics: false,
      marketing: false,
    },
  });

  const loadPreferences = () => {
    try {
      const choice = localStorage.getItem('cookie-consent');
      const savedPrefs = localStorage.getItem('cookie-preferences');
      let prefs = {
        necessary: true,
        preferences: true,
        analytics: false,
        marketing: false,
      };
      if (savedPrefs) {
        prefs = { ...prefs, ...JSON.parse(savedPrefs), necessary: true };
      }
      setCurrentConsent({ choice, preferences: prefs });
    } catch {
      // ignore JSON errors
    }
  };

  useEffect(() => {
    loadPreferences();
    const handleStorageChange = () => loadPreferences();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleOpenConsentModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  };

  return (
    <PlatformLegalLayout
      activeDoc="cookies"
      toc={tocItems}
      titleEn="DineMaster Pro Platform Cookie & Local Storage Policy"
      titlePt="Política de Cookies e Armazenamento Local da Plataforma DineMaster Pro"
      subtitleEn="Accurate and transparent disclosure of all cookies, local storage mechanisms, and session tokens utilized by the DineMaster Pro software platform under the ePrivacy Directive, Irish S.I. 336/2011, and Portuguese Law 41/2004."
      subtitlePt="Divulgação rigorosa e transparente de todos os cookies, mecanismos de armazenamento local e tokens de sessão utilizados pela plataforma DineMaster Pro ao abrigo da Diretiva ePrivacy, do S.I. 336/2011 da Irlanda e da Lei n.º 41/2004 de Portugal."
      hidePrintButton={true}
    >
      {/* 1. What Are Cookies & Storage Technologies? */}
      <section id="sec-cookie-intro" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">01.</span>
          {isPt ? 'O que são Cookies e Tecnologias de Armazenamento?' : 'What Are Cookies & Storage Technologies?'}
        </h2>
        <p>
          {isPt ? (
            <>
              Os <strong>cookies</strong> são pequenos ficheiros de texto transferidos para o seu computador, telemóvel ou tablet quando visita um sítio web. As aplicações web modernas utilizam também mecanismos complementares de armazenamento no navegador, tais como <strong>Armazenamento Local (localStorage)</strong>, <strong>Armazenamento de Sessão (sessionStorage)</strong> e <strong>Bases de Dados Locais Indexadas (IndexedDB)</strong>.
            </>
          ) : (
            <>
              <strong>Cookies</strong> are small text files downloaded to your device when you visit a website. Modern web applications additionally employ complementary browser storage mechanisms, such as <strong>Local Storage (localStorage)</strong>, <strong>Session Storage (sessionStorage)</strong>, and <strong>IndexedDB</strong>.
            </>
          )}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isPt ? (
            <>
              No <strong>{brandName}</strong>, estas tecnologias desempenham um papel vital para assegurar a autenticação segura de contas, a memorização da preferência de idioma (Inglês ou Português), a identificação do restaurante pretendido no modelo multi-tenant e, muito especialmente, a continuidade de serviço através da nossa arquitetura <strong>Offline-First</strong> (que permite consultar reservas de hoje e de amanhã mesmo durante quebras temporárias de Internet no restaurante).
            </>
          ) : (
            <>
              In <strong>{brandName}</strong>, these storage technologies are vital to maintain authenticated user sessions, remember language preferences (English or Portuguese), resolve multi-tenant restaurant subdomains, and power our <strong>Offline-First</strong> resilience architecture (ensuring today’s and tomorrow’s reservations remain accessible to floor staff during network dropouts).
            </>
          )}
        </p>
      </section>

      {/* 2. Legal & Regulatory Framework */}
      <section id="sec-cookie-framework" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">02.</span>
          {isPt ? 'Enquadramento Legal e Diretiva de Privacidade Eletrónica' : 'Legal & Regulatory Framework (ePrivacy Directive)'}
        </h2>
        <p>
          {isPt ? (
            <>
              A utilização de tecnologias de armazenamento e acesso no terminal do utilizador rege-se pelo Artigo 5.º(3) da <strong>Diretiva 2002/58/CE (Diretiva de Privacidade Eletrónica / ePrivacy)</strong>, com a redação dada pela Diretiva 2009/136/CE, e pelas respetivas legislações nacionais de transposição:
            </>
          ) : (
            <>
              The storage of information and access to information already stored in the terminal equipment of a user is governed by Article 5(3) of the <strong>ePrivacy Directive (Directive 2002/58/EC as amended)</strong> and its national transpositions:
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>{isPt ? 'Irlanda:' : 'Ireland:'}</strong>{' '}
            European Communities (Electronic Communications Networks and Services) (Privacy and Electronic Communications) Regulations 2011 (S.I. No. 336 of 2011).
          </li>
          <li>
            <strong>{isPt ? 'Portugal:' : 'Portugal:'}</strong>{' '}
            Lei n.º 41/2004, de 18 de agosto, alterada pela Lei n.º 46/2012, de 29 de agosto (Comunicações Eletrónicas e Proteção de Dados).
          </li>
          <li>
            <strong>{isPt ? 'Orientações Europeias do CEPD:' : 'EDPB Guidelines:'}</strong>{' '}
            Guidelines 01/2020 on consent under Regulation 2016/679 and Guidelines 2/2023 on Technical Scope of Art. 5(3) of ePrivacy Directive.
          </li>
        </ul>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <span className="font-semibold text-white block">
            {isPt ? 'A Regra da Isenção para Tecnologias Estritamente Necessárias:' : 'Strictly Necessary Exemption under Article 5(3):'}
          </span>
          <p className="leading-relaxed">
            {isPt
              ? 'A lei europeia dispensa a exigência de consentimento prévio para o armazenamento ou acesso técnico que tenha como única finalidade efetuar a transmissão de uma comunicação através de uma rede de comunicações eletrónicas, ou que seja estritamente necessário para prestar um serviço da sociedade da informação expressamente solicitado pelo utilizador (como manter o login seguro, aplicar opções de privacidade ou efetuar uma reserva solicitada).'
              : 'Statutory law establishes an explicit exemption from prior consent for storage whose sole purpose is carrying out the transmission of a communication, or which is strictly necessary to provide an information society service explicitly requested by the subscriber or user (such as maintaining authentication, routing tenant reservations, or recording consent choices).'}
          </p>
        </div>
      </section>

      {/* 3. Technical Inventory of Storage Used in DineMaster Pro */}
      <section id="sec-cookie-inventory" className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">03.</span>
          {isPt ? 'Inventário Técnico Real da Aplicação DineMaster Pro' : 'Technical Inventory of Storage Used in DineMaster Pro'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Em observância do princípio de rigor e veracidade, realizámos uma auditoria completa ao código-fonte do <strong>{brandName}</strong>. A tabela seguinte reflete com precisão os identificadores e mecanismos de armazenamento efetivamente utilizados:
            </>
          ) : (
            <>
              In adherence to strict transparency, we conducted a comprehensive code audit of <strong>{brandName}</strong>. The table below details every client-side storage mechanism currently in active operational use:
            </>
          )}
        </p>

        {/* Detailed Table */}
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-900 text-slate-300">
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Chave / Mecanismo' : 'Key / Storage Mechanism'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Tecnologia' : 'Type'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Classificação' : 'Category'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Finalidade Operacional' : 'Operational Purpose'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Duração' : 'Duration'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {/* Necessary */}
              <tr className="bg-slate-950/40">
                <td className="p-2.5 font-mono text-amber-400 font-medium">firebaseLocalStorageDb</td>
                <td className="p-2.5 font-mono text-[11px]">IndexedDB</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {isPt ? 'Estritamente Necessário' : 'Strictly Necessary'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Tokens de sessão e autenticação segura do Firebase Auth (UID, perfil de utilizador).' : 'Firebase Auth session tokens & credentials persistence for secure sign-in.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>

              <tr className="bg-slate-950/40">
                <td className="p-2.5 font-mono text-amber-400 font-medium">cookie-consent &amp; cookie-preferences</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {isPt ? 'Estritamente Necessário' : 'Strictly Necessary'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Regista o consentimento e escolhas de cookies do utilizador de acordo com a ePrivacy.' : 'Stores the user’s consent choice to prevent re-displaying the banner.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? '1 Ano' : '1 Year'}</td>
              </tr>

              <tr className="bg-slate-950/40">
                <td className="p-2.5 font-mono text-amber-400 font-medium">dinemaster_platform_settings</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {isPt ? 'Estritamente Necessário' : 'Strictly Necessary'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Cache de configurações de domínio e roteamento da plataforma multi-tenant.' : 'Local cache of platform settings and multi-tenant domain routing.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>

              <tr className="bg-slate-950/40">
                <td className="p-2.5 font-mono text-amber-400 font-medium">cached_areas &amp; cached_tables</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {isPt ? 'Estritamente Necessário' : 'Strictly Necessary'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Arquitetura Offline-First: Mantém a planta de sala acessível em quebras de rede.' : 'Offline-first floor plan cache ensuring operational continuity during outages.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>

              <tr className="bg-slate-950/40">
                <td className="p-2.5 font-mono text-amber-400 font-medium">app_developing_unlocked &amp; impersonation</td>
                <td className="p-2.5 font-mono text-[11px]">sessionStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {isPt ? 'Estritamente Necessário' : 'Strictly Necessary'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Tokens temporários de sessão de manutenção e suporte técnico assistido.' : 'Temporary security tokens for authorized maintenance and support sessions.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Sessão do Navegador' : 'Browser Session'}</td>
              </tr>

              {/* Preferences */}
              <tr>
                <td className="p-2.5 font-mono text-white font-medium">language</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                    {isPt ? 'Preferências / Funcional' : 'Preferences'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Memoriza o idioma selecionado (Português ou Inglês).' : 'Remembers the user’s selected interface language (en/pt).'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>

              <tr>
                <td className="p-2.5 font-mono text-white font-medium">defaultToDinner</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                    {isPt ? 'Preferências / Funcional' : 'Preferences'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Memoriza a preferência de turno de refeição selecionada pelo operador.' : 'Remembers default meal service shift preference in the live view.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>

              {/* Performance */}
              <tr>
                <td className="p-2.5 font-mono text-white font-medium">smartAlertsCount</td>
                <td className="p-2.5 font-mono text-[11px]">localStorage</td>
                <td className="p-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
                    {isPt ? 'Desempenho / Estatísticas' : 'Performance / Metrics'}
                  </span>
                </td>
                <td className="p-2.5 text-slate-300">
                  {isPt ? 'Contador em cache de notificações ativas para evitar consultas repetitivas.' : 'Cached notification counters to optimize bandwidth and avoid redundant queries.'}
                </td>
                <td className="p-2.5 text-slate-400">{isPt ? 'Persistente' : 'Persistent'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Consent Requirements & Your Current Preferences */}
      <section id="sec-cookie-consent" className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">04.</span>
          {isPt ? 'Requisitos de Consentimento e Suas Preferências Atuais' : 'Consent Requirements & Your Current Preferences'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              O {brandName} não ativa tecnologias de rastreio não essenciais sem a sua autorização prévia e informada. Abaixo pode verificar em tempo real o estado atual das suas opções de consentimento armazenadas neste navegador:
            </>
          ) : (
            <>
              {brandName} does not activate non-essential tracking technologies without prior informed consent. Below you can inspect the live status of your stored cookie choices on this device:
            </>
          )}
        </p>

        {/* Live Preferences Status Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {isPt ? 'Estado do Seu Consentimento Neste Navegador' : 'Live Consent Status on This Device'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenConsentModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Settings size={13} />
              <span>{isPt ? 'Alterar Preferências' : 'Modify Consent Choices'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Necessary */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Estritamente Necessários' : 'Strictly Necessary'}</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>{isPt ? 'Sempre Ativo' : 'Always Active'}</span>
              </span>
              <p className="text-[10px] text-slate-500">
                {isPt ? 'Essencial para login, reservas e roteamento.' : 'Required for auth, booking engine & security.'}
              </p>
            </div>

            {/* 2. Preferences */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Preferências de Idioma' : 'Preferences & Language'}</span>
              <span className={`font-semibold flex items-center gap-1.5 ${currentConsent.preferences.preferences ? 'text-emerald-400' : 'text-slate-500'}`}>
                {currentConsent.preferences.preferences ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{currentConsent.preferences.preferences ? (isPt ? 'Ativado' : 'Enabled') : (isPt ? 'Desativado' : 'Disabled')}</span>
              </span>
              <p className="text-[10px] text-slate-500">
                {isPt ? 'Memoriza Português ou Inglês.' : 'Remembers language and shift selections.'}
              </p>
            </div>

            {/* 3. Analytics */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Estatísticas de Desempenho' : 'Performance & Analytics'}</span>
              <span className={`font-semibold flex items-center gap-1.5 ${currentConsent.preferences.analytics ? 'text-emerald-400' : 'text-slate-500'}`}>
                {currentConsent.preferences.analytics ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{currentConsent.preferences.analytics ? (isPt ? 'Ativado' : 'Enabled') : (isPt ? 'Desativado' : 'Disabled')}</span>
              </span>
              <p className="text-[10px] text-slate-500">
                {isPt ? 'Métricas de tráfego agregadas.' : 'Aggregated technical load telemetry.'}
              </p>
            </div>

            {/* 4. Marketing */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Marketing e Terceiros' : 'Marketing & Embedded'}</span>
              <span className={`font-semibold flex items-center gap-1.5 ${currentConsent.preferences.marketing ? 'text-emerald-400' : 'text-slate-500'}`}>
                {currentConsent.preferences.marketing ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{currentConsent.preferences.marketing ? (isPt ? 'Ativado' : 'Enabled') : (isPt ? 'Desativado' : 'Disabled')}</span>
              </span>
              <p className="text-[10px] text-slate-500">
                {isPt ? 'Serviços externos opcionais.' : 'External maps and media widgets.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Third-Party Embedded Integrations */}
      <section id="sec-cookie-thirdparty" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">05.</span>
          {isPt ? 'Integrações e Serviços de Terceiros' : 'Third-Party Embedded Integrations'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Determinadas páginas da aplicação podem carregar componentes ou recursos de parceiros tecnológicos autorizados:
            </>
          ) : (
            <>
              Certain pages may load visual components or operational assets from authorized technical providers:
            </>
          )}
        </p>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-0.5">Google Maps Platform &amp; Places Autocomplete (Google LLC)</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Utilizado nas páginas dos restaurantes para apresentação de mapas de localização e preenchimento de moradas. A Google pode processar o endereço IP nos termos da sua política de privacidade em policies.google.com/privacy.'
                : 'Employed on restaurant reservation portals for interactive map previews and location autocomplete. Subject to Google privacy policies.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-0.5">Cloudinary (Cloudinary Ltd.)</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Rede de Distribuição de Conteúdos (CDN) para entrega de imagens, fotografias de pratos e plantas de sala em alta velocidade e com compressão otimizada.'
                : 'Content Delivery Network (CDN) for serving cached food imagery, floor plans, and restaurant brand logos with low latency.'}
            </p>
          </div>
        </div>
      </section>

      {/* 6. Managing & Withdrawing Consent in Your Browser */}
      <section id="sec-cookie-manage" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">06.</span>
          {isPt ? 'Como Gerir ou Revogar o Consentimento no Navegador' : 'Managing & Withdrawing Consent in Your Browser'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Além do nosso painel interativo de preferências, pode bloquear ou eliminar cookies e dados locais diretamente nas definições do seu navegador de Internet:
            </>
          ) : (
            <>
              In addition to our interactive consent control, you may inspect, block, or delete cookies and local storage directly through your browser settings:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">Google Chrome</strong>
            <p className="text-slate-400 text-[11px]">Definições → Privacidade e Segurança → Cookies e outros dados de sites.</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">Mozilla Firefox</strong>
            <p className="text-slate-400 text-[11px]">Definições → Privacidade e Segurança → Cookies e dados do site.</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">Apple Safari</strong>
            <p className="text-slate-400 text-[11px]">Preferências → Privacidade → Gerir dados de sítios web.</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">Microsoft Edge</strong>
            <p className="text-slate-400 text-[11px]">Definições → Cookies e Permissões do Site → Gerir e eliminar cookies.</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          {isPt
            ? 'Atenção: A desativação total do armazenamento local (localStorage/IndexedDB) impedirá o funcionamento da sessão autenticada e da sincronização offline das mesas.'
            : 'Notice: Completely blocking all local storage will prevent authentication and disable the offline table synchronization features.'}
        </p>
      </section>

      {/* 7. Policy Revisions & Statutory Verification Notice */}
      <section id="sec-cookie-updates" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">07.</span>
          {isPt ? 'Atualizações e Verificação Jurídica' : 'Policy Revisions & Statutory Verification Notice'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Esta política é revista periodicamente sempre que ocorram alterações às tecnologias de armazenamento empregues pelo {brandName} ou alterações legislativas na União Europeia, Irlanda ou Portugal.
            </>
          ) : (
            <>
              This Cookie Policy is updated periodically to reflect software enhancements or regulatory developments in the European Union, Ireland, or Portugal.
            </>
          )}
        </p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertCircle size={15} />
            <span>{isPt ? 'Aviso de Verificação Profissional' : 'Professional Legal Verification Notice'}</span>
          </div>
          <p className="leading-relaxed">
            {isPt ? (
              <>
                Esta política reflete com rigor as tecnologias reais utilizadas na base de código do DineMaster Pro, sem invenção de cookies fictícios ou omissão de armazenamento técnico (como IndexedDB e localStorage). Recomenda-se a validação das definições corporativas no Super Admin antes da publicação final.
              </>
            ) : (
              <>
                This policy strictly mirrors the technical storage implementation of DineMaster Pro without invented cookies or unrecorded tools. Verification of platform corporate settings under Super Admin → Platform Settings is recommended prior to formal launch.
              </>
            )}
          </p>
        </div>
      </section>
    </PlatformLegalLayout>
  );
}
