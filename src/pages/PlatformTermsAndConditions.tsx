import React from 'react';
import { PlatformLegalLayout, TocItem } from '../components/legal/PlatformLegalLayout';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { useLanguage } from '../hooks/useLanguage';
import { 
  Building2, Scale, ShieldCheck, CreditCard, Clock, Server, 
  HelpCircle, AlertCircle, FileText, Globe, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlatformTermsAndConditions() {
  const { legalDetails } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const toc: TocItem[] = isPt ? [
    { id: '1-identificacao-operador', title: '1. Identificação do Prestador de Serviços' },
    { id: '2-ambito-e-natureza', title: '2. Âmbito e Natureza da Plataforma SaaS' },
    { id: '3-registo-e-contas', title: '3. Registo, Contas e Segurança de Acesso' },
    { id: '4-planos-e-faturacao', title: '4. Período Experimental, Planos e Pagamentos' },
    { id: '5-limites-e-utilizacao', title: '5. Quotas de Recursos e Política de Uso Justo' },
    { id: '6-disponibilidade-e-offline', title: '6. Disponibilidade, Manutenção e Modo Offline' },
    { id: '7-suporte-e-acesso-tecnico', title: '7. Suporte Técnico e Acesso Temporário' },
    { id: '8-propriedade-intelectual', title: '8. Propriedade Intelectual e Licença de Uso' },
    { id: '9-obrigacoes-e-restricoes', title: '9. Obrigações do Cliente e Usos Proibidos' },
    { id: '10-protecao-dados-dpa', title: '10. Proteção de Dados e Acordo de Subcontratação' },
    { id: '11-suspensao-e-rescisao', title: '11. Suspensão, Rescisão e Exportação de Dados' },
    { id: '12-garantias-e-responsabilidade', title: '12. Conformidade, Garantias e Limitação de Responsabilidade' },
    { id: '13-regulamento-servicos-digitais', title: '13. Regulamento dos Serviços Digitais (DSA)' },
    { id: '14-lei-aplicavel-e-litigios', title: '14. Lei Aplicável, Foro e Resolução de Litígios' },
    { id: '15-alteracoes-e-contactos', title: '15. Alterações aos Termos e Contactos Oficiais' },
  ] : [
    { id: '1-operator-identity', title: '1. Service Provider Identification' },
    { id: '2-scope-and-services', title: '2. Scope & SaaS Platform Architecture' },
    { id: '3-registration-and-accounts', title: '3. Registration, Credentials & Account Security' },
    { id: '4-plans-and-billing', title: '4. Free Trial, Subscription Plans & Invoicing' },
    { id: '5-quotas-and-fair-use', title: '5. Resource Quotas & Fair Usage Policy' },
    { id: '6-availability-and-offline', title: '6. Platform Availability, SLA & Offline-First Mode' },
    { id: '7-support-and-access', title: '7. Technical Support & Administrative Access' },
    { id: '8-intellectual-property', title: '8. Intellectual Property & Limited License' },
    { id: '9-acceptable-use', title: '9. Customer Responsibilities & Acceptable Use' },
    { id: '10-data-protection-dpa', title: '10. Data Protection & Article 28 GDPR DPA' },
    { id: '11-suspension-and-termination', title: '11. Suspension, Termination & Data Return' },
    { id: '12-warranties-and-liability', title: '12. Statutory Conformity & Limitation of Liability' },
    { id: '13-digital-services-act', title: '13. Digital Services Act (DSA) Compliance' },
    { id: '14-governing-law-and-disputes', title: '14. Governing Law, Jurisdiction & Dispute Resolution' },
    { id: '15-amendments-and-contacts', title: '15. Amendments to Terms & Official Notices' },
  ];

  return (
    <PlatformLegalLayout activeDoc="terms" toc={toc} hidePrintButton={true}>
      <article className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed space-y-10">
        
        {/* Intro Preamble */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Scale size={16} className="text-amber-400" />
            <span>
              {isPt 
                ? 'Termos Contratuais da Plataforma DineMaster Pro (B2B SaaS)' 
                : 'DineMaster Pro Platform Service Agreement (B2B SaaS Terms)'}
            </span>
          </div>
          <p>
            {isPt 
              ? `Estes Termos e Condições constituem um contrato vinculativo celebrado entre a entidade operadora do DineMaster Pro e a pessoa singular ou coletiva («Restaurante», «Cliente» ou «Subscritor») que acede ou utiliza a plataforma de software como serviço (SaaS) DineMaster Pro. O presente documento foi redigido com observância da legislação da União Europeia, da República da Irlanda e de Portugal aplicável ao fornecimento de serviços e conteúdos digitais.`
              : `These Terms and Conditions constitute a legally binding agreement between the operating entity of DineMaster Pro and the legal person or entity ("Restaurant", "Customer", or "Subscriber") subscribing to or utilizing the DineMaster Pro software-as-a-service (SaaS) hospitality platform. This document is drafted in accordance with applicable European Union, Irish, and Portuguese laws governing digital services, electronic commerce, and commercial subscriptions.`}
          </p>
        </div>

        {/* Section 1 */}
        <section id={isPt ? '1-identificacao-operador' : '1-operator-identity'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 size={18} className="text-amber-400" />
            <span>{isPt ? '1. Identificação do Prestador de Serviços' : '1. Service Provider Identification'}</span>
          </h2>
          <p>
            {isPt
              ? `A plataforma de software DineMaster Pro é operada e fornecida pela entidade comercial identificada nos registos oficiais da plataforma:`
              : `The DineMaster Pro software platform is developed, hosted, and operated by the commercial legal entity configured in the official platform records:`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Designação Comercial / Marca:' : 'Platform Commercial Brand:'}
              </span>
              <strong className="text-white">{legalDetails.platformName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Firma / Nome Legal da Empresa:' : 'Registered Corporate / Legal Name:'}
              </span>
              {legalDetails.legalCompanyName ? (
                <strong className="text-white">{legalDetails.legalCompanyName}</strong>
              ) : (
                <span className="text-amber-400">
                  [Pending Super Admin Configuration — Legal Entity Name Required]
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'NIPC / Registo Comercial:' : 'Company Registration Number (CRN / NIPC):'}
              </span>
              {legalDetails.companyRegistrationNumber ? (
                <strong className="text-white">{legalDetails.companyRegistrationNumber}</strong>
              ) : (
                <span className="text-amber-400">
                  [Pending Super Admin Configuration — Registration Number Required]
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'NIF / Número de IVA (VAT ID):' : 'VAT / Tax Identification Number:'}
              </span>
              {legalDetails.vatNumber ? (
                <strong className="text-white">{legalDetails.vatNumber}</strong>
              ) : (
                <span className="text-amber-400">
                  [Pending Super Admin Configuration — VAT / Tax ID Required]
                </span>
              )}
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Sede Social Registada:' : 'Registered Corporate Address:'}
              </span>
              {legalDetails.registeredAddress ? (
                <strong className="text-white">{legalDetails.registeredAddress}</strong>
              ) : (
                <span className="text-amber-400">
                  [Pending Super Admin Configuration — Registered Address Required]
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Email Oficial para Contactos:' : 'Official Contact Email:'}
              </span>
              <a href={`mailto:${legalDetails.contactEmail}`} className="text-amber-400 hover:underline">
                {legalDetails.contactEmail}
              </a>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Endereço Web da Plataforma:' : 'Platform Website URL:'}
              </span>
              <a href={legalDetails.platformUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                {legalDetails.platformUrl}
              </a>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {isPt 
              ? `Qualquer comunicação oficial ou notificação legal relativa a estes Termos deve ser dirigida por correio eletrónico para ${legalDetails.contactEmail} ou por correio registado para a morada registada da sede.`
              : `Any formal legal notice concerning this Agreement must be addressed by electronic mail to ${legalDetails.contactEmail} or by registered mail to the corporate registered office address listed above.`}
          </p>
        </section>

        {/* Section 2 */}
        <section id={isPt ? '2-ambito-e-natureza' : '2-scope-and-services'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Server size={18} className="text-amber-400" />
            <span>{isPt ? '2. Âmbito e Natureza da Plataforma SaaS' : '2. Scope & SaaS Platform Architecture'}</span>
          </h2>
          <p>
            {isPt 
              ? `${legalDetails.platformName} é uma plataforma de software multi-inquilino (multi-tenant) concebida para a gestão moderna de reservas e operações de restauração. A plataforma disponibiliza:`
              : `${legalDetails.platformName} is a multi-tenant cloud-native software-as-a-service application designed for restaurant reservation orchestration and table operations. The platform provides:`}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Gestão de Mesas e Plantas de Sala:' : 'Table Floor Plans & Live Management:'}</strong>{' '}
              {isPt 
                ? 'Desenho visual de layouts de salas, esplanadas e balcão, cálculo de capacidade e atribuição dinâmica de mesas em tempo real.'
                : 'Interactive multi-room visual floor layouts, seating assignments, capacity management, and live table status indicators.'}
            </li>
            <li>
              <strong>{isPt ? 'Motor de Reservas Online:' : 'Online Reservation Engine:'}</strong>{' '}
              {isPt 
                ? 'Formulários de reserva para incorporação ou ligação através do endereço dedicado do restaurante (/r/:slug), validação instantânea de disponibilidade e prevenção de conflitos de horário.'
                : 'Embeddable booking widgets and branded booking portals (/r/:slug), automated party size matching, and conflict-prevention algorithms.'}
            </li>
            <li>
              <strong>{isPt ? 'Painéis de Controlo e Acesso de Funcionários:' : 'Staff & Management Dashboards:'}</strong>{' '}
              {isPt 
                ? 'Acesso diferenciado por funções (administrador de restaurante, gerente, funcionário de sala) com autorizações granulares e registo de ações.'
                : 'Role-based access control (restaurant owner, general manager, service staff) with granular permissions and audit logging.'}
            </li>
            <li>
              <strong>{isPt ? 'Comunicações e Lembretes Transacionais:' : 'Transactional Notifications:'}</strong>{' '}
              {isPt 
                ? 'Envio automatizado de confirmações digitais, bilhetes de reserva e códigos de verificação por email (via Resend) e por SMS (via Twilio).'
                : 'Automated digital confirmation passes, reminder links, and verification codes delivered via email (Resend) and SMS (Twilio).'}
            </li>
            <li>
              <strong>{isPt ? 'Arquitetura com Suporte Offline:' : 'Offline-First Operational Resiliency:'}</strong>{' '}
              {isPt 
                ? 'Sincronização em cache das reservas do dia corrente e do dia seguinte, assegurando o funcionamento da receção mesmo durante falhas temporárias de ligação à internet.'
                : 'Local client-side caching of today’s and tomorrow’s reservations ensuring floor seating remains operable during temporary internet disruptions.'}
            </li>
          </ul>
          <p className="text-xs text-slate-400">
            {isPt 
              ? `O DineMaster Pro atua exclusivamente como fornecedor de infraestrutura tecnológica. O DineMaster Pro não é um restaurante, não comercializa refeições nem intervém na relação direta de consumo entre o restaurante e os seus clientes finais.`
              : `DineMaster Pro acts strictly as an infrastructure technology provider. DineMaster Pro does not prepare or sell food and beverage services, nor does it act as an intermediary party to the direct hospitality contract between a restaurant and its diners.`}
          </p>
        </section>

        {/* Section 3 */}
        <section id={isPt ? '3-registo-e-contas' : '3-registo-e-contas'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <span>{isPt ? '3. Registo, Contas e Segurança de Acesso' : '3. Registration, Credentials & Account Security'}</span>
          </h2>
          <p>
            {isPt 
              ? `O acesso às funcionalidades administrativas exige o registo de uma conta de utilizador com credenciais válidas. Ao registar-se em nome de um restaurante, o utilizador declara e garante que detém poderes legais suficientes para vincular a respetiva entidade comercial.`
              : `Access to administrative dashboards requires user registration with verified credentials. By registering on behalf of a restaurant business, you represent and warrant that you possess full legal authority to bind that business entity to these Terms.`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Confidencialidade das Credenciais:' : 'Credential Confidentiality:'}</strong>{' '}
              {isPt 
                ? 'O Cliente é o único responsável pela guarda e confidencialidade das palavras-passe e códigos de acesso à sua conta. A partilha de credenciais entre múltiplos funcionários sem conta individual é expressamente desaconselhada.'
                : 'The Customer is exclusively responsible for maintaining the confidentiality of passwords and authentication credentials. Account sharing across distinct staff members without individual accounts is strictly prohibited.'}
            </li>
            <li>
              <strong>{isPt ? 'Notificação de Intrusão:' : 'Prompt Breach Notification:'}</strong>{' '}
              {isPt 
                ? 'Qualquer suspeita de acesso não autorizado, extravio de credenciais ou anomalia de segurança deve ser imediatamente comunicada à equipa de suporte do DineMaster Pro.'
                : 'Any suspected unauthorized access, compromise of credentials, or security vulnerability must be reported immediately to DineMaster Pro technical support.'}
            </li>
            <li>
              <strong>{isPt ? 'Acesso Multi-Funções:' : 'Role-Based Accountability:'}</strong>{' '}
              {isPt 
                ? 'Os proprietários de restaurantes podem criar e revogar contas para gerentes e funcionários com permissões limitadas. Cada ação fica associada ao identificador do respetivo utilizador para efeitos de registo de auditoria.'
                : 'Restaurant owners can provision and revoke seats for staff and managers. System activities are recorded against the acting user ID in immutable tenant audit logs.'}
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id={isPt ? '4-planos-e-faturacao' : '4-plans-and-billing'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <CreditCard size={18} className="text-amber-400" />
            <span>{isPt ? '4. Período Experimental, Planos e Pagamentos' : '4. Free Trial, Subscription Plans & Invoicing'}</span>
          </h2>
          <p>
            {isPt 
              ? `O DineMaster Pro oferece pacotes de subscrição escalonados (Iniciante, Profissional, Empresarial e Enterprise), bem como um período experimental gratuito de 14 dias para novos restaurantes:`
              : `DineMaster Pro offers tiered subscription packages (Starter, Professional, Business, and Enterprise), alongside an initial 14-day full free trial for qualifying new venues:`}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Período Experimental Gratuito (14 Dias):' : '14-Day Free Trial Period:'}</strong>{' '}
              {isPt 
                ? 'Durante os primeiros 14 dias após a adesão, o restaurante usufrui de acesso pleno aos recursos do plano de teste sem cobrança de taxas de subscrição.'
                : 'New restaurant sign-ups receive full access to designated trial features for 14 calendar days without subscription charges.'}
            </li>
            <li>
              <strong>{isPt ? 'Periodicidade e Cobrança:' : 'Billing Cycles & Automatic Renewal:'}</strong>{' '}
              {isPt 
                ? 'As subscrições são cobradas antecipadamente em regime mensal ou anual (com desconto aplicável), renovando-se automaticamente no termo de cada período, salvo cancelamento prévio pelo Cliente através do painel de administração.'
                : 'Subscriptions are billed in advance on either a monthly or annual cadence (with annual savings applied). Subscriptions renew automatically unless cancelled before the renewal date through the Billing panel.'}
            </li>
            <li>
              <strong>{isPt ? 'Impostos e IVA na UE:' : 'Value Added Tax (VAT) & EU Compliance:'}</strong>{' '}
              {isPt 
                ? 'Salvo indicação em contrário, todos os preços são indicados em Euros (EUR) líquidos de IVA. Para clientes empresariais na União Europeia fora do país da entidade operadora, aplica-se o mecanismo de autoliquidação de IVA (reverse charge) mediante validação de número VIES válido.'
                : 'All subscription prices are quoted in Euros (EUR) net of VAT. For business customers within the European Union outside the provider’s jurisdiction, the reverse-charge mechanism applies subject to verification of a valid EU VIES VAT number.'}
            </li>
            <li>
              <strong>{isPt ? 'Falta de Pagamento e Suspensão:' : 'Non-Payment & Grace Period:'}</strong>{' '}
              {isPt 
                ? 'Em caso de rejeição de débito ou falha de pagamento, o restaurante recebe um aviso eletrónico e beneficia de um período de carência de 7 (sete) dias para regularizar o pagamento antes de a conta ser suspensa.'
                : 'If a renewal payment fails, the Customer is notified and provided a 7-day grace window before service suspension takes effect.'}
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id={isPt ? '5-limites-e-utilizacao' : '5-quotas-and-fair-use'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock size={18} className="text-amber-400" />
            <span>{isPt ? '5. Quotas de Recursos e Política de Uso Justo' : '5. Resource Quotas & Fair Usage Policy'}</span>
          </h2>
          <p>
            {isPt 
              ? `Cada pacote de subscrição confere direito a quotas operacionais específicas (número máximo de mesas mapeadas, utilizadores de equipa ativos, limites mensais de reservas e permissão para ligação de domínio próprio). O Cliente compromete-se a utilizar a plataforma de forma equilibrada e leal:`
              : `Each plan level grants defined resource entitlements (table seat count, concurrent staff accounts, monthly booking allowances, and custom domain routing). The Customer agrees to adhere to fair operational usage:`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              {isPt 
                ? 'Caso o volume de reservas exceda o teto do plano contratado, o sistema notificará o Cliente para realizar a transição para um nível superior.'
                : 'If booking volumes exceed plan allowances, the platform provides timely upgrade notifications to prevent service throttling.'}
            </li>
            <li>
              {isPt 
                ? 'É estritamente proibida a criação massiva de reservas simuladas, o envio de spam por SMS através da infraestrutura da plataforma ou a execução de testes automatizados de carga sem autorização prévia por escrito.'
                : 'Synthetic reservation spamming, automated stress-testing against live endpoints, or deceptive booking injections are strictly forbidden.'}
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id={isPt ? '6-disponibilidade-e-offline' : '6-availability-and-offline'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Server size={18} className="text-amber-400" />
            <span>{isPt ? '6. Disponibilidade, Manutenção e Modo Offline' : '6. Platform Availability, SLA & Offline-First Mode'}</span>
          </h2>
          <p>
            {isPt 
              ? `O DineMaster Pro envida todos os esforços razoáveis do ponto de vista técnico e comercial para assegurar um nível de disponibilidade da plataforma de 99,9% (tempo de funcionamento), excluindo janelas de manutenção previamente anunciadas.`
              : `DineMaster Pro deploys industry-standard infrastructure to target 99.9% platform availability across calendar months, excluding scheduled maintenance periods.`}
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{isPt ? 'Garantia de Operação Offline na Sala de Refeições' : 'Offline Floor Continuity Protocol'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {isPt 
                ? 'Reconhecendo a criticidade do serviço num restaurante movimentado, o DineMaster Pro integra um mecanismo de persistência local que armazena na memória do navegador as reservas do dia corrente e do dia seguinte. Em caso de quebra pontual de ligação à rede, os funcionários de sala podem continuar a consultar mesas e assentar clientes. Quando a ligação é restabelecida, o sistema sincroniza automaticamente as alterações.'
                : 'Recognizing that table management cannot halt during peak service, DineMaster Pro incorporates offline IndexedDB replication for current-day and next-day reservations. Floor staff may consult schedules and seat arriving parties even if local connectivity fluctuates; mutations queue and synchronize automatically upon reconnection.'}
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section id={isPt ? '7-suporte-e-acesso-tecnico' : '7-support-and-access'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <HelpCircle size={18} className="text-amber-400" />
            <span>{isPt ? '7. Suporte Técnico e Acesso Temporário' : '7. Technical Support & Administrative Access'}</span>
          </h2>
          <p>
            {isPt 
              ? `O suporte técnico é prestado através de correio eletrónico e canal dedicado no painel de administração. Para fins exclusivos de diagnóstico, resolução de incidentes ou configuração solicitada pelo Cliente, os Super Administradores da plataforma podem aceder temporariamente à instância do restaurante («suporte assistido / personificação técnica»).`
              : `Technical assistance is provided via electronic mail and in-app administrative requests. For the sole purpose of resolving reported operational issues or configuration queries requested by the Customer, authorized Super Administrators may exercise scoped, temporary diagnostic access («support impersonation mode»).`}
          </p>
          <p className="text-xs text-slate-400">
            {isPt 
              ? 'Todas as sessões de acesso técnico são registadas com identificador do operador, data, hora e motivo do acesso, garantindo total transparência e conformidade com o RGPD.'
              : 'All administrative support sessions generate non-repudiable audit logs recording operator email, timestamp, and accessed resources to ensure comprehensive GDPR compliance and accountability.'}
          </p>
        </section>

        {/* Section 8 */}
        <section id={isPt ? '8-propriedade-intelectual' : '8-intellectual-property'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText size={18} className="text-amber-400" />
            <span>{isPt ? '8. Propriedade Intelectual e Licença de Uso' : '8. Intellectual Property & Limited License'}</span>
          </h2>
          <p>
            {isPt 
              ? `Todos os direitos de propriedade intelectual sobre a plataforma DineMaster Pro (incluindo código-fonte, arquitetura de software, interfaces visuais, logótipos e documentação) são e permanecerão da exclusiva titularidade da respetiva entidade detentora.`
              : `All intellectual property rights in and to the DineMaster Pro platform, software source code, proprietary algorithms, visual designs, and documentation remain the sole property of the platform operator.`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Licença Limitada Concedida:' : 'Granted SaaS License:'}</strong>{' '}
              {isPt 
                ? 'Concede-se ao Cliente uma licença não exclusiva, intransmissível, revogável e de âmbito mundial durante a vigência da subscrição para aceder e utilizar o serviço nos seus estabelecimentos autorizados.'
                : 'The Customer receives a non-exclusive, non-transferable, revocable license to access and use the software solely for internal restaurant operations during the active subscription.'}
            </li>
            <li>
              <strong>{isPt ? 'Dados e Conteúdos do Restaurante:' : 'Customer Ownership of Content:'}</strong>{' '}
              {isPt 
                ? 'O Cliente mantém a propriedade plena de todos os seus dados comerciais, logótipos de marca, ementas e fotografias carregadas para a plataforma.'
                : 'The Customer retains all proprietary rights and title to restaurant brand trademarks, uploaded logos, menu copy, and photography.'}
            </li>
          </ul>
        </section>

        {/* Section 9 */}
        <section id={isPt ? '9-obrigacoes-e-restricoes' : '9-acceptable-use'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <span>{isPt ? '9. Obrigações do Cliente e Usos Proibidos' : '9. Customer Responsibilities & Acceptable Use'}</span>
          </h2>
          <p>
            {isPt 
              ? 'É expressamente vedado ao Cliente e aos respetivos utilizadores:'
              : 'The Customer and its authorized users agree strictly not to:'}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>{isPt ? 'Descompilar, realizar engenharia reversa ou tentar extrair o código-fonte da aplicação.' : 'Reverse-engineer, decompile, or attempt to extract underlying software source code.'}</li>
            <li>{isPt ? 'Revender, sublicenciar ou disponibilizar o serviço a terceiros em regime de prestação de serviços não autorizada.' : 'Sublicense, resell, or distribute the platform as a commercial white-label service without explicit written permission.'}</li>
            <li>{isPt ? 'Utilizar a infraestrutura de mensagens (email ou SMS) para fins de publicidade não solicitada (spam) ou em violação da lei de privacidade eletrónica.' : 'Transmit unsolicited marketing spam through transactional email or SMS gateways in violation of the ePrivacy Directive.'}</li>
            <li>{isPt ? 'Carregar ficheiros com código malicioso, vírus ou conteúdo manifestamente ilícito.' : 'Upload malware, malicious payloads, or unlawful content to cloud storage.'}</li>
          </ul>
        </section>

        {/* Section 10 */}
        <section id={isPt ? '10-protecao-dados-dpa' : '10-data-protection-dpa'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <span>{isPt ? '10. Proteção de Dados e Acordo de Subcontratação' : '10. Data Protection & Article 28 GDPR DPA'}</span>
          </h2>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
            <p className="font-semibold text-white">
              {isPt 
                ? 'Distinção Fundamental de Papéis sob o RGPD (Artigo 28.º):' 
                : 'Fundamental Role Distinction Under GDPR (Article 28):'}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>{isPt ? 'DineMaster Pro como Responsável pelo Tratamento (Data Controller):' : 'DineMaster Pro as Data Controller:'}</strong>{' '}
                {isPt 
                  ? 'O DineMaster Pro atua como Responsável pelo Tratamento exclusivamente quanto aos dados dos utilizadores registados do Cliente (proprietários e funcionários do restaurante), dados de faturação e subscrição, e registos analíticos de segurança da infraestrutura.'
                  : 'DineMaster Pro acts as an independent Data Controller solely for direct Subscriber account credentials, subscription billing records, and platform security telemetry.'}
              </li>
              <li>
                <strong>{isPt ? 'DineMaster Pro como Subcontratante (Data Processor):' : 'DineMaster Pro as Data Processor:'}</strong>{' '}
                {isPt 
                  ? 'Relativamente aos dados pessoais dos comensais e clientes de reservas (nomes, contactos telefónicos, emails, datas, notas de mesa e preferências de refeição), o Restaurante é o Responsável pelo Tratamento (Data Controller) e o DineMaster Pro atua na estrita qualidade de Subcontratante (Data Processor), tratando esses dados unicamente mediante as instruções documentadas do Restaurante.'
                  : 'Regarding personal data of diners and booking guests (names, telephone numbers, emails, party notes, and dining histories), the Restaurant is the independent Data Controller, and DineMaster Pro acts strictly as a Data Processor pursuant to Article 28 GDPR.'}
              </li>
            </ul>
            <p className="text-slate-400">
              {isPt 
                ? `Para consultar as cláusulas exaustivas do Acordo de Tratamento de Dados (DPA) e a lista de subcontratantes ulteriores (Google Cloud, Resend, Twilio, Cloudinary), consulte a nossa `
                : `For comprehensive Data Processing Agreement clauses and current sub-processor authorizations (Google Cloud, Resend, Twilio, Cloudinary), refer directly to the `}
              <Link to="/privacy" className="text-amber-400 underline font-semibold">
                {isPt ? 'Política de Privacidade da Plataforma' : 'Platform Privacy Policy'}
              </Link>.
            </p>
          </div>
        </section>

        {/* Section 11 */}
        <section id={isPt ? '11-suspensao-e-rescisao' : '11-suspension-and-termination'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock size={18} className="text-amber-400" />
            <span>{isPt ? '11. Suspensão, Rescisão e Exportação de Dados' : '11. Suspension, Termination & Data Return'}</span>
          </h2>
          <p>
            {isPt 
              ? `O Cliente pode cancelar a sua subscrição a qualquer momento através do painel de administração. O cancelamento produzirá efeitos no termo do ciclo de faturação corrente já liquidado, mantendo-se o acesso ativo até essa data.`
              : `The Customer may terminate their subscription at any time via the admin dashboard. Termination takes effect at the conclusion of the current paid billing cycle.`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Período de Exportação de Dados (30 Dias):' : '30-Day Data Export Grace Window:'}</strong>{' '}
              {isPt 
                ? 'Após o encerramento da subscrição, o Cliente dispõe de um prazo de 30 (trinta) dias para exportar a sua base de dados de reservas e clientes através das ferramentas da plataforma.'
                : 'Following subscription termination, the Customer retains a 30-day window to export historical reservation and customer rosters via platform data export tools.'}
            </li>
            <li>
              <strong>{isPt ? 'Apagamento Definitivo:' : 'Permanent Purge:'}</strong>{' '}
              {isPt 
                ? 'Decorrido o prazo de 30 dias, os dados da instância são definitivamente eliminados ou anonimizados dos servidores ativos, com exceção dos registos contabilísticos cuja retenção seja exigida por lei fiscal (6 anos).'
                : 'After 30 days, tenant data is irrevocably deleted from active databases, save for financial transaction ledgers retained pursuant to statutory tax obligations.'}
            </li>
          </ul>
        </section>

        {/* Section 12 */}
        <section id={isPt ? '12-garantias-e-responsabilidade' : '12-warranties-and-liability'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Scale size={18} className="text-amber-400" />
            <span>{isPt ? '12. Conformidade, Garantias e Limitação de Responsabilidade' : '12. Statutory Conformity & Limitation of Liability'}</span>
          </h2>
          <p>
            {isPt 
              ? `Em conformidade com a Diretiva (UE) 2019/770, o DineMaster Pro garante que a plataforma fornece as funcionalidades e requisitos descritos nas especificações do serviço. Não obstante:`
              : `In compliance with Directive (EU) 2019/770 and national digital services legislation, DineMaster Pro guarantees that the platform substantially matches published operational descriptions. However:`}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              {isPt 
                ? 'O DineMaster Pro não responde por lucros cessantes, perda de receitas, quebras de faturação no restaurante ou danos indiretos decorrentes de interrupções de telecomunicações fora do seu controlo razoável.'
                : 'To the maximum extent permitted by applicable law, DineMaster Pro shall not be liable for loss of profits, venue turnover shortfalls, or indirect consequential damages arising from telecom outages.'}
            </li>
            <li>
              {isPt 
                ? 'A responsabilidade total agregada do DineMaster Pro perante o Cliente por quaisquer litígios contratuais fica expressamente limitada ao montante total efetivamente pago pelo Cliente a título de subscrição nos 12 (doze) meses imediatamente anteriores ao evento lesivo.'
                : 'The aggregate liability of DineMaster Pro under this Agreement is strictly capped at the total amount paid by the Customer in subscription fees during the 12-month period preceding the claim.'}
            </li>
          </ul>
        </section>

        {/* Section 13 */}
        <section id={isPt ? '13-regulamento-servicos-digitais' : '13-digital-services-act'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '13. Regulamento dos Serviços Digitais (DSA)' : '13. Digital Services Act (DSA) Compliance'}</span>
          </h2>
          <p>
            {isPt 
              ? `Em cumprimento do Regulamento (UE) 2022/2065 (Regulamento dos Serviços Digitais), o DineMaster Pro designa como ponto único de contacto eletrónico para autoridades de supervisão e destinatários dos serviços o endereço: `
              : `Pursuant to Articles 11 and 12 of Regulation (EU) 2022/2065 (Digital Services Act), DineMaster Pro designates the following single electronic point of contact for member state authorities and recipients:`}
            <a href={`mailto:${legalDetails.contactEmail}`} className="text-amber-400 underline font-mono">
              {legalDetails.contactEmail}
            </a>.
          </p>
        </section>

        {/* Section 14 */}
        <section id={isPt ? '14-lei-aplicavel-e-litigios' : '14-governing-law-and-disputes'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 size={18} className="text-amber-400" />
            <span>{isPt ? '14. Lei Aplicável, Foro e Resolução de Litígios' : '14. Governing Law, Jurisdiction & Dispute Resolution'}</span>
          </h2>
          <p>
            {isPt 
              ? `Estes Termos e Condições são regidos e interpretados de acordo com a legislação aplicável da União Europeia e as leis do país de registo da entidade operadora (República da Irlanda ou Portugal, consoante a jurisdição contratante indicada nas definições da plataforma).`
              : `These Terms and Conditions shall be governed by and construed in accordance with the substantive laws of Ireland or Portugal (as designated by the contracting operating entity), without regard to conflict of laws principles.`}
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
            <span className="font-semibold text-white block">
              {isPt ? 'Resolução Alternativa de Litígios (Consumidores e B2B):' : 'Alternative Dispute Resolution:'}
            </span>
            <p className="text-slate-400">
              {isPt 
                ? `A Comissão Europeia disponibiliza uma plataforma de Resolução de Litígios em Linha (RLL), acessível em: `
                : `The European Commission provides an Online Dispute Resolution (ODR) portal accessible at: `}
              <a 
                href={legalDetails.disputeResolutionPlatform} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-amber-400 underline"
              >
                {legalDetails.disputeResolutionPlatform}
              </a>.
            </p>
          </div>
        </section>

        {/* Section 15 */}
        <section id={isPt ? '15-alteracoes-e-contactos' : '15-amendments-and-contacts'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <AlertCircle size={18} className="text-amber-400" />
            <span>{isPt ? '15. Alterações aos Termos e Contactos Oficiais' : '15. Amendments to Terms & Official Notices'}</span>
          </h2>
          <p>
            {isPt 
              ? `O DineMaster Pro reserva-se o direito de atualizar os presentes Termos para refletir evoluções regulamentares ou introdução de novas funcionalidades. Alterações substanciais serão comunicadas aos restaurantes com um pré-aviso mínimo de 30 (trinta) dias antes da sua entrada em vigor.`
              : `DineMaster Pro reserves the right to amend these Terms to accommodate statutory updates or technical evolution. Material changes will be communicated to active Subscribers with at least 30 calendar days prior notice before taking effect.`}
          </p>
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="text-slate-400">
              {isPt ? 'Documento legal revisto e em vigor para 2026.' : 'Platform legal terms active & verified for 2026.'}
            </span>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                <span>{isPt ? 'Ler Política de Privacidade' : 'Read Privacy Policy'}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

      </article>
    </PlatformLegalLayout>
  );
}
