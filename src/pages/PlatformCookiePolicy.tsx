import React from 'react';
import { PlatformLegalLayout, TocItem } from '../components/legal/PlatformLegalLayout';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { useLanguage } from '../hooks/useLanguage';
import { 
  Cookie, Shield, Settings, Eye, Database, CheckCircle2, 
  Sliders, RefreshCw, Lock, Globe, ArrowRight, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlatformCookiePolicy() {
  const { legalDetails } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const toc: TocItem[] = isPt ? [
    { id: '1-o-que-sao-cookies', title: '1. O que são Cookies e Tecnologias de Armazenamento?' },
    { id: '2-enquadramento-eprivacy', title: '2. Enquadramento Legal e Requisitos de Consentimento' },
    { id: '3-inventario-tecnologias', title: '3. Inventário Técnico das Tecnologias Utilizadas' },
    { id: '4-cookies-estritamente-necessarios', title: '4. Armazenamento Estritamente Necessário' },
    { id: '5-cookies-funcionais-preferencias', title: '5. Preferências e Funcionalidades' },
    { id: '6-analiticos-e-desempenho', title: '6. Estatísticas e Desempenho' },
    { id: '7-armazenamento-offline-restauracao', title: '7. Persistência Offline para Salas de Refeição' },
    { id: '8-gestao-e-revogacao-consentimento', title: '8. Como Gerir ou Revogar o seu Consentimento' },
    { id: '9-configuracao-no-navegador', title: '9. Controlo através das Definições do Navegador' },
    { id: '10-atualizacoes-e-contactos', title: '10. Atualizações da Política e Contactos' },
  ] : [
    { id: '1-what-are-cookies', title: '1. What are Cookies and Local Storage Technologies?' },
    { id: '2-eprivacy-framework', title: '2. Legal Framework & Consent Standards' },
    { id: '3-technical-inventory', title: '3. Technical Inventory of Implemented Storage' },
    { id: '4-strictly-necessary', title: '4. Strictly Necessary Local Storage' },
    { id: '5-preferences-functional', title: '5. Preferences & Functional Mechanisms' },
    { id: '6-analytics-performance', title: '6. Performance & Statistical Analytics' },
    { id: '7-offline-storage-resilience', title: '7. Offline Storage for Floor Continuity' },
    { id: '8-manage-and-withdraw-consent', title: '8. How to Manage or Withdraw Your Consent' },
    { id: '9-browser-controls', title: '9. Controlling Storage via Browser Settings' },
    { id: '10-policy-updates-contacts', title: '10. Policy Updates & Official Contact' },
  ];

  const handleOpenCookieModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  };

  return (
    <PlatformLegalLayout activeDoc="cookies" toc={toc} hidePrintButton={true}>
      <article className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed space-y-10">
        
        {/* Intro Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Cookie size={16} className="text-amber-400" />
            <span>
              {isPt 
                ? 'Política de Cookies e Tecnologias de Armazenamento Local da Plataforma DineMaster Pro' 
                : 'DineMaster Pro Platform Cookie & Local Storage Transparency Policy'}
            </span>
          </div>
          <p>
            {isPt 
              ? `Esta Política descreve com precisão técnica e jurídica a utilização de cookies, tokens de sessão, memória local (localStorage e sessionStorage) e base de dados offline (IndexedDB) na plataforma DineMaster Pro. Cumprimos rigorosamente a Diretiva ePrivacy da UE, a jurisprudência Planet49 do Tribunal de Justiça da UE, a legislação irlandesa (S.I. 336/2011) e a lei portuguesa (Lei n.º 41/2004 alterada pela Lei n.º 46/2012).`
              : `This Policy provides transparent, technically verified disclosure of all cookies, session tokens, browser storage (localStorage, sessionStorage), and offline databases (IndexedDB) implemented across the DineMaster Pro platform. We strictly adhere to the EU ePrivacy Directive, the CJEU Planet49 ruling, Irish S.I. No. 336/2011, and Portuguese Law No. 41/2004.`}
          </p>

          {/* Direct Interactive Trigger */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            <span className="text-slate-300 font-medium">
              {isPt ? 'Pretende alterar as suas preferências agora?' : 'Need to adjust your current cookie preferences?'}
            </span>
            <button
              type="button"
              onClick={handleOpenCookieModal}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
            >
              <Sliders size={13} />
              <span>{isPt ? 'Gerir Preferências de Cookies' : 'Manage Cookie Preferences'}</span>
            </button>
          </div>
        </div>

        {/* Section 1 */}
        <section id={isPt ? '1-o-que-sao-cookies' : '1-what-are-cookies'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cookie size={18} className="text-amber-400" />
            <span>{isPt ? '1. O que são Cookies e Tecnologias de Armazenamento?' : '1. What are Cookies and Local Storage Technologies?'}</span>
          </h2>
          <p>
            {isPt 
              ? `Os cookies são pequenos ficheiros de texto transferidos para o computador ou dispositivo móvel do utilizador através do navegador web. Além dos cookies tradicionais baseados em cabeçalhos HTTP, as aplicações web modernas como o DineMaster Pro utilizam outras tecnologias de armazenamento no equipamento terminal (HTML5 localStorage, sessionStorage e IndexedDB) para garantir desempenho veloz, segurança de sessões e disponibilidade offline.`
              : `Cookies are compact text files stored on your device by your web browser. In addition to traditional HTTP cookies, modern cloud web applications like DineMaster Pro utilize local terminal storage technologies (HTML5 localStorage, sessionStorage, and client-side IndexedDB) to enable high performance, secure session persistence, and offline operational continuity.`}
          </p>
        </section>

        {/* Section 2 */}
        <section id={isPt ? '2-enquadramento-eprivacy' : '2-eprivacy-framework'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '2. Enquadramento Legal e Requisitos de Consentimento' : '2. Legal Framework & Consent Standards'}</span>
          </h2>
          <p>
            {isPt 
              ? `Nos termos do Artigo 5.º, n.º 3 da Diretiva 2002/58/CE (Diretiva ePrivacy) e das respetivas transposições na Irlanda (Regulamento S.I. 336/2011) e em Portugal (Artigo 5.º da Lei n.º 41/2004 alterada pela Lei n.º 46/2012):`
              : `Pursuant to Article 5(3) of Directive 2002/58/EC (ePrivacy Directive) as implemented by Irish S.I. No. 336/2011 and Portuguese Law No. 41/2004 (as amended by Law No. 46/2012):`}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Isenção de Consentimento para Tecnologias Estritamente Necessárias:' : 'Exemption for Strictly Necessary Storage:'}</strong>{' '}
              {isPt 
                ? 'O armazenamento técnico ou acesso a dados que tenha como única finalidade efetuar a transmissão de uma comunicação por rede eletrónica ou que seja estritamente necessário para prestar um serviço expressamente solicitado pelo utilizador (ex.: autenticação de sessão e preservação do cesto de reserva) não carece de consentimento prévio.'
                : 'Storage mechanisms whose sole purpose is carrying out electronic communications or strictly providing a service explicitly requested by the user (such as authentication tokens and booking process state) are legally exempt from prior consent.'}
            </li>
            <li>
              <strong>{isPt ? 'Consentimento Prévio Obrigatório para Outras Finalidades:' : 'Mandatory Prior Opt-In for Non-Essential Technologies:'}</strong>{' '}
              {isPt 
                ? 'Em harmonia com o acórdão Planet49 do TJUE e as orientações das autoridades de controlo (DPC e CNPD), tecnologias analíticas ou de publicidade só podem ser ativadas após um ato positivo e esclarecido de consentimento pelo utilizador, rejeitando-se qualquer aceitação tácita ou caixas pré-validadas.'
                : 'In accordance with the CJEU Planet49 judgment (Case C-673/17) and supervisory guidelines, analytical and marketing technologies require clear affirmative opt-in consent before activation; pre-ticked checkboxes or implied consent are legally void.'}
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id={isPt ? '3-inventario-tecnologias' : '3-technical-inventory'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Database size={18} className="text-amber-400" />
            <span>{isPt ? '3. Inventário Técnico das Tecnologias Utilizadas' : '3. Technical Inventory of Implemented Storage'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Apresentamos em seguida a listagem detalhada de todos os mecanismos de armazenamento utilizados pelo DineMaster Pro:'
              : 'Below is an exhaustive technical disclosure of storage mechanisms currently implemented in the DineMaster Pro application:'}
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-200">
                  <th className="p-3 font-semibold">{isPt ? 'Chave / Identificador' : 'Key / Name'}</th>
                  <th className="p-3 font-semibold">{isPt ? 'Tipo / Tecnologia' : 'Storage Medium'}</th>
                  <th className="p-3 font-semibold">{isPt ? 'Categoria' : 'Category'}</th>
                  <th className="p-3 font-semibold">{isPt ? 'Duração' : 'Duration'}</th>
                  <th className="p-3 font-semibold">{isPt ? 'Finalidade Operacional' : 'Operational Purpose'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                <tr>
                  <td className="p-3 text-amber-400 font-bold">firebase:authUser:[apiKey]</td>
                  <td className="p-3">IndexedDB / Local</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">Persistent (until sign-out)</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Garante a autenticação segura e autorização de funcionários e administradores.' : 'Maintains secure user sign-in and authorization for staff and admins.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">cookie-consent</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">12 Months</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Memoriza a escolha de consentimento efetuada pelo visitante.' : 'Records user consent decision (accepted, declined, or customized).'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">cookie-preferences</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">12 Months</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Regista granularmente as categorias autorizadas (necessárias, preferências, analíticas).' : 'Stores granular category consent states per ePrivacy standards.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">dinemaster_platform_settings</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">Persistent</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Cache de definições globais da plataforma para carregamento rápido.' : 'Caches platform configuration to prevent network boot bottlenecks.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">app_developing_unlocked</td>
                  <td className="p-3">sessionStorage</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">Session Only</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Autorização temporária de pré-visualização quando o modo em desenvolvimento está ativo.' : 'Temporary session flag when platform development mode is enabled.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">firestore-offline-cache</td>
                  <td className="p-3">IndexedDB</td>
                  <td className="p-3 text-emerald-400 font-sans font-semibold">Strictly Necessary</td>
                  <td className="p-3">Local Cache</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Armazena reservas de hoje e amanhã para permitir atendimento de mesa sem internet.' : 'Replicates current & next-day bookings ensuring floor table operations during net cuts.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-amber-400 font-bold">dinemaster_language</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 text-blue-400 font-sans font-semibold">Preferences</td>
                  <td className="p-3">Persistent</td>
                  <td className="p-3 font-sans text-xs">
                    {isPt ? 'Memoriza o idioma preferido do utilizador (Português ou Inglês).' : 'Remembers user interface language choice (EN / PT).'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 */}
        <section id={isPt ? '4-cookies-estritamente-necessarios' : '4-strictly-necessary'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield size={18} className="text-amber-400" />
            <span>{isPt ? '4. Armazenamento Estritamente Necessário' : '4. Strictly Necessary Local Storage'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Estes elementos são tecnicamente indispensáveis para o funcionamento da plataforma e não podem ser desativados nos nossos sistemas. Incluem os tokens de autenticação cifrada emitidos pelo Google Firebase, a persistência de escolhas de consentimento e a integridade de rotas.'
              : 'Strictly necessary storage is essential for core platform operation and cannot be disabled in our systems. It encompasses secure Firebase authentication tokens, user consent records, and critical tenant routing keys.'}
          </p>
        </section>

        {/* Section 5 */}
        <section id={isPt ? '5-cookies-funcionais-preferencias' : '5-preferences-functional'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Settings size={18} className="text-amber-400" />
            <span>{isPt ? '5. Preferências e Funcionalidades' : '5. Preferences & Functional Mechanisms'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Servem para memorizar configurações personalizadas, tais como a seleção de idioma (Inglês ou Português) e temas de visualização, dispensando a necessidade de reconfiguração a cada visita.'
              : 'Functional preferences allow the website to remember user customizations—such as interface language (English or Portuguese) and dark/light view modes—ensuring a seamless experience across visits.'}
          </p>
        </section>

        {/* Section 6 */}
        <section id={isPt ? '6-analiticos-e-desempenho' : '6-analytics-performance'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Eye size={18} className="text-amber-400" />
            <span>{isPt ? '6. Estatísticas e Desempenho' : '6. Performance & Statistical Analytics'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Permitem avaliar a volumetria de visitas e o desempenho da plataforma de forma agregada e anónima. Estas tecnologias permanecem estritamente bloqueadas até que o utilizador conceda consentimento explícito através do painel de preferências.'
              : 'Statistical analytics measure platform responsiveness, error frequency, and anonymized usage patterns. These tools are strictly blocked by default until explicit opt-in consent is recorded via our consent manager.'}
          </p>
        </section>

        {/* Section 7 */}
        <section id={isPt ? '7-armazenamento-offline-restauracao' : '7-offline-storage-resilience'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Database size={18} className="text-amber-400" />
            <span>{isPt ? '7. Persistência Offline para Salas de Refeição' : '7. Offline Storage for Floor Continuity'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Uma das características técnicas distintivas do DineMaster Pro é a capacidade de funcionamento em modo offline. O navegador armazena localmente na base de dados IndexedDB as reservas do dia e do dia seguinte:'
              : 'A core architectural differentiator of DineMaster Pro is offline dining room continuity. The web application replicates current and next-day reservations into client-side browser IndexedDB:'}
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-white block">
              {isPt ? 'Princípios de Proteção de Dados no Modo Offline:' : 'Offline Data Protection Principles:'}
            </span>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>{isPt ? 'Os dados offline ficam restritos à sandbox segura do navegador do dispositivo autorizado.' : 'Offline records are constrained exclusively to the browser’s secure local origin sandbox.'}</li>
              <li>{isPt ? 'A cache é automaticamente atualizada e purgada assim que as reservas transitam para o histórico.' : 'Expired booking data is automatically purged once reservations elapse into past status.'}</li>
              <li>{isPt ? 'Nenhum dado é transferido para terceiros através desta camada de resiliência.' : 'No third-party analytics or external telemetry participate in offline local storage.'}</li>
            </ul>
          </div>
        </section>

        {/* Section 8 */}
        <section id={isPt ? '8-gestao-e-revogacao-consentimento' : '8-manage-and-withdraw-consent'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders size={18} className="text-amber-400" />
            <span>{isPt ? '8. Como Gerir ou Revogar o seu Consentimento' : '8. How to Manage or Withdraw Your Consent'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Pode rever, modificar ou revogar as suas escolhas de cookies a qualquer momento com efeito para o futuro através do botão interativo abaixo:'
              : 'You have the absolute right under the ePrivacy Directive and GDPR to modify or withdraw your consent at any time with immediate effect:'}
          </p>

          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <strong className="text-white block text-sm">
                {isPt ? 'Painel de Consentimento de Cookies' : 'Interactive Cookie Consent Modal'}
              </strong>
              <p className="text-xs text-slate-400">
                {isPt ? 'Alterne permissões por categoria com efeito imediato.' : 'Inspect or toggle granular categories at any time.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCookieModal}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Sliders size={14} />
              <span>{isPt ? 'Abrir Gestor de Consentimento' : 'Open Cookie Manager'}</span>
            </button>
          </div>
        </section>

        {/* Section 9 */}
        <section id={isPt ? '9-configuracao-no-navegador' : '9-browser-controls'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '9. Controlo através das Definições do Navegador' : '9. Controlling Storage via Browser Settings'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Pode igualmente configurar o seu navegador para recusar, bloquear ou apagar cookies e dados de sítios web. Consulte as instruções do fabricante do seu navegador:'
              : 'You can also control, block, or delete cookies directly through your web browser preferences:'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <a 
              href="https://support.google.com/chrome/answer/95647" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/40 text-center block transition-colors"
            >
              <strong className="text-white block">Google Chrome</strong>
              <span className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-1">
                <span>{isPt ? 'Guia Oficial' : 'Guide'}</span>
                <ExternalLink size={10} />
              </span>
            </a>

            <a 
              href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/40 text-center block transition-colors"
            >
              <strong className="text-white block">Mozilla Firefox</strong>
              <span className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-1">
                <span>{isPt ? 'Guia Oficial' : 'Guide'}</span>
                <ExternalLink size={10} />
              </span>
            </a>

            <a 
              href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/40 text-center block transition-colors"
            >
              <strong className="text-white block">Apple Safari</strong>
              <span className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-1">
                <span>{isPt ? 'Guia Oficial' : 'Guide'}</span>
                <ExternalLink size={10} />
              </span>
            </a>

            <a 
              href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/40 text-center block transition-colors"
            >
              <strong className="text-white block">Microsoft Edge</strong>
              <span className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-1">
                <span>{isPt ? 'Guia Oficial' : 'Guide'}</span>
                <ExternalLink size={10} />
              </span>
            </a>
          </div>
          <p className="text-xs text-slate-400">
            {isPt 
              ? 'Nota: A desativação de cookies estritamente necessários poderá inviabilizar o acesso ao painel de administração e o início de sessão.'
              : 'Please note that disabling strictly necessary storage may prevent you from authenticating or accessing your management dashboard.'}
          </p>
        </section>

        {/* Section 10 */}
        <section id={isPt ? '10-atualizacoes-e-contactos' : '10-policy-updates-contacts'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <RefreshCw size={18} className="text-amber-400" />
            <span>{isPt ? '10. Atualizações da Política e Contactos' : '10. Policy Updates & Official Contact'}</span>
          </h2>
          <p>
            {isPt 
              ? `A presente Política de Cookies é revista periodicamente para refletir alterações nos mecanismos técnicos ou na legislação de privacidade eletrónica.`
              : `This Cookie Policy is periodically reviewed to reflect technical adjustments or legal guidelines.`}
          </p>
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-mono">
              {isPt ? `Última revisão: ${legalDetails.lastLegalReviewDate}` : `Last reviewed: ${legalDetails.lastLegalReviewDate}`}
            </span>
            <Link to="/terms" className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
              <span>{isPt ? 'Consultar Termos & Condições' : 'View Terms & Conditions'}</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

      </article>
    </PlatformLegalLayout>
  );
}
