import React from 'react';
import { PlatformLegalLayout, TocItem } from '../../components/platform/PlatformLegalLayout';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useLanguage } from '../../hooks/useLanguage';
import { 
  Scale, FileText, CheckCircle2, AlertTriangle, ShieldCheck, 
  CreditCard, RefreshCw, Server, Lock, ExternalLink, HelpCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const tocItems: TocItem[] = [
  { id: 'sec-intro', titleEn: '1. Introduction & Multi-Tenant SaaS Scope', titlePt: '1. Introdução e Âmbito da Plataforma SaaS' },
  { id: 'sec-roles', titleEn: '2. Contractual Roles & Tripartite Relationship', titlePt: '2. Relações Contratuais e Separação de Papéis' },
  { id: 'sec-accounts', titleEn: '3. Restaurant Accounts & Security Responsibilities', titlePt: '3. Contas de Restaurante e Deveres de Segurança' },
  { id: 'sec-plans', titleEn: '4. Subscription Plans, Billing, VAT & Entitlements', titlePt: '4. Planos de Subscrição, Faturação, IVA e Quotas' },
  { id: 'sec-offline', titleEn: '5. Offline-First Sync Architecture & Service Availability', titlePt: '5. Arquitetura Offline-First e Disponibilidade' },
  { id: 'sec-support', titleEn: '6. Technical Support & Temporary Access Protocol', titlePt: '6. Suporte Técnico e Acesso Temporário' },
  { id: 'sec-dpa', titleEn: '7. Data Processing Addendum (Article 28 GDPR)', titlePt: '7. Acordo de Subcontratação de Dados (Art. 28.º RGPD)' },
  { id: 'sec-ip', titleEn: '8. Intellectual Property & Proprietary Rights', titlePt: '8. Propriedade Intelectual e Direitos da Plataforma' },
  { id: 'sec-acceptable-use', titleEn: '9. Acceptable Use Policy & Prohibited Conduct', titlePt: '9. Política de Utilização Aceitável e Condutas Proibidas' },
  { id: 'sec-liability', titleEn: '10. Limitation of Liability & Warranty Disclaimers', titlePt: '10. Limitação de Responsabilidade e Exclusões' },
  { id: 'sec-termination', titleEn: '11. Term, Suspension & Data Export on Termination', titlePt: '11. Duração, Suspensão e Exportação de Dados' },
  { id: 'sec-jurisdiction', titleEn: '12. Governing Law, Dispute Resolution & Jurisdiction', titlePt: '12. Lei Aplicável, Resolução de Litígios e Foro' },
  { id: 'sec-review-notice', titleEn: '13. Legal Compliance & Professional Counsel Notice', titlePt: '13. Verificação Legal e Parecer Profissional' },
];

export default function PlatformTermsAndConditions() {
  const { platformSettings } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const brandName = platformSettings.saasName || 'DineMaster Pro';
  const legalEntity = platformSettings.legalCompanyName || `${brandName} Technologies Ltd.`;
  const registeredAddress = platformSettings.registeredAddress || '[Pending Configuration in Super Admin]';
  const vatNumber = platformSettings.vatNumber || '[Pending Configuration in Super Admin]';
  const companyReg = platformSettings.companyRegistrationNumber || '[Pending Configuration in Super Admin]';
  const supportEmail = platformSettings.legalContactEmail || platformSettings.supportEmail || 'support@dinemasterpro.com';
  const privacyEmail = platformSettings.dpoContactEmail || platformSettings.legalContactEmail || 'privacy@dinemasterpro.com';
  const jurisdiction = platformSettings.primaryJurisdiction || 'ireland';

  return (
    <PlatformLegalLayout
      activeDoc="terms"
      toc={tocItems}
      titleEn="DineMaster Pro Platform Terms & Conditions"
      titlePt="Termos e Condições Gerais da Plataforma DineMaster Pro"
      subtitleEn="Comprehensive commercial and operational terms governing access to the DineMaster Pro multi-tenant SaaS restaurant reservation software, administrative tools, and online booking engines."
      subtitlePt="Termos comerciais e operacionais que regem o acesso ao software SaaS multi-tenant DineMaster Pro para gestão de reservas, ferramentas de administração e motores de agendamento online."
      hidePrintButton={true}
    >
      {/* Document Header Metadata Callout */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Scale size={14} className="text-amber-400" />
            {isPt ? 'Contrato de Prestação de Serviços de Software (SaaS)' : 'Software-as-a-Service (SaaS) Agreement'}
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            {isPt ? 'Versão Oficial: 2026.2' : 'Official Version: 2026.2'}
          </span>
        </div>
        <p className="text-slate-300">
          {isPt ? (
            <>
              Estes Termos e Condições constituem um contrato vinculativo celebrado entre a <strong>{legalEntity}</strong> (operadora do software <strong>{brandName}</strong>, com sede em {registeredAddress}, NIPC/Registo {companyReg}, NIF/IVA {vatNumber}) e o Cliente (Restaurante, Grupo Hoteleiro ou Operador de Restauração). Aplicam-se a todos os serviços prestados na Irlanda, em Portugal e no território da União Europeia.
            </>
          ) : (
            <>
              These Terms and Conditions constitute a legally binding agreement between <strong>{legalEntity}</strong> (operator of the <strong>{brandName}</strong> software platform, registered address at {registeredAddress}, Company Registration {companyReg}, VAT {vatNumber}) and the Customer (Restaurant subscriber, hospitality group, or food-service operator). These terms apply across Ireland, Portugal, and the European Union.
            </>
          )}
        </p>
      </div>

      {/* 1. Introduction & Multi-Tenant SaaS Scope */}
      <section id="sec-intro" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">01.</span>
          {isPt ? 'Introdução e Âmbito da Plataforma SaaS' : 'Introduction & Multi-Tenant SaaS Scope'}
        </h2>
        <p>
          {isPt ? (
            <>
              O <strong>{brandName}</strong> é uma solução de software como serviço (SaaS) multi-tenant concebida especificamente para o setor da restauração e hotelaria. A plataforma disponibiliza ferramentas avançadas para gestão de plantas de sala, mesas interativas, inventário de capacidade em tempo real, receção de reservas através da Internet, notificações transacionais aos clientes e painéis de estatísticas operacionais.
            </>
          ) : (
            <>
              <strong>{brandName}</strong> is a dedicated multi-tenant Software-as-a-Service (SaaS) operating system engineered specifically for the hospitality industry. The platform provides digital floor plan design, interactive table allocation, real-time seat inventory management, automated online reservation widgets, transactional guest messaging, and operational dining metrics.
            </>
          )}
        </p>
        <p>
          {isPt ? (
            <>
              Ao criar uma conta, subscrever um plano, iniciar um período experimental gratuito ou aceder aos painéis administrativos do {brandName}, o Restaurante confirma expressamente que leu, compreendeu e aceita a totalidade destes Termos e Condições, comprometendo-se a respeitar todas as obrigações neles estipuladas.
            </>
          ) : (
            <>
              By registering an account, subscribing to any service plan, initiating a trial, or accessing administrative interfaces of {brandName}, the subscriber restaurant confirms that it has read, understood, and agreed to be bound by these Terms and Conditions in full.
            </>
          )}
        </p>
      </section>

      {/* 2. Contractual Roles & Tripartite Relationship */}
      <section id="sec-roles" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">02.</span>
          {isPt ? 'Relações Contratuais e Separação de Papéis' : 'Contractual Roles & Tripartite Relationship'}
        </h2>
        <p>
          {isPt ? (
            <>
              A utilização do ecossistema {brandName} assenta numa separação estrita de funções e esferas jurídicas:
            </>
          ) : (
            <>
              The operational model of {brandName} relies on a strict distinction of contractual spheres and legal roles:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-amber-400 block">
              {isPt ? 'A. Relação Plataforma ↔ Restaurante (B2B)' : 'A. Platform ↔ Restaurant (B2B SaaS)'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isPt
                ? 'O DineMaster Pro fornece uma licença de utilização de software ao Restaurante Subscritor. O DineMaster Pro não é proprietário do restaurante, não prepara alimentos, não estabelece políticas de consumo mínimo e não garante o comparecimento dos clientes.'
                : 'DineMaster Pro grants a commercial software license to the subscriber restaurant. DineMaster Pro does not operate the restaurant, prepare food, establish dining policies, or guarantee customer turnout.'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-amber-400 block">
              {isPt ? 'B. Relação Restaurante ↔ Cliente Comensal' : 'B. Restaurant ↔ Dining Guest'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isPt
                ? 'O contrato de reserva e prestação do serviço de refeição é celebrado única e diretamente entre o Cliente Comensal e o Restaurante respetivo, aplicando-se os termos próprios do restaurante (/r/[slug]/terms).'
                : 'The contract for table reservation, food service, and dining policies is concluded exclusively between the dining guest and the individual restaurant, governed by the restaurant’s own terms (/r/[slug]/terms).'}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 italic">
          {isPt
            ? 'Em nenhuma circunstância o DineMaster Pro atua como intermediário financeiro de refeições ou prestador de serviços de restauração física.'
            : 'Under no circumstances does DineMaster Pro act as a food vendor, restaurant operator, or hospitality party.'}
        </p>
      </section>

      {/* 3. Restaurant Accounts & Security Responsibilities */}
      <section id="sec-accounts" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">03.</span>
          {isPt ? 'Contas de Restaurante e Deveres de Segurança' : 'Restaurant Accounts & Security Responsibilities'}
        </h2>
        <p>
          {isPt ? (
            <>
              O acesso aos painéis de administração exige a criação de uma conta autenticada. A plataforma disponibiliza controlo de acesso baseado em funções (Role-Based Access Control — RBAC):
            </>
          ) : (
            <>
              Access to administrative dashboards requires an authenticated account. The platform implements Role-Based Access Control (RBAC):
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>Super Admin:</strong> {isPt ? 'Supervisão técnica global da infraestrutura e suporte à plataforma.' : 'Global technical oversight of infrastructure, multi-tenant ingress, and system health.'}
          </li>
          <li>
            <strong>Restaurant Admin (Proprietário/Gestor):</strong> {isPt ? 'Acesso total à configuração do restaurante, subscrição, faturação, utilizadores e plantas de sala.' : 'Full administrative control over restaurant settings, billing, subscriptions, users, and floor plans.'}
          </li>
          <li>
            <strong>Restaurant Staff:</strong> {isPt ? 'Acesso operacional diário a reservas, live view, marcação de mesas e gestão de clientes.' : 'Daily operational access to reservations, live view, seating, waitlist, and guest check-in.'}
          </li>
          <li>
            <strong>Customer (Comensal):</strong> {isPt ? 'Gestão direta das suas próprias reservas através do portal de cliente.' : 'Direct self-service management of their own reservation bookings.'}
          </li>
        </ul>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isPt
            ? 'O Restaurante é inteiramente responsável por manter a confidencialidade das credenciais de acesso dos seus colaboradores, revogar prontamente o acesso de pessoal desligado do estabelecimento e notificar de imediato o DineMaster Pro caso detete qualquer utilização não autorizada ou quebra de segurança.'
            : 'The restaurant subscriber is solely responsible for preserving the confidentiality of user credentials, promptly revoking access for departing personnel, and notifying DineMaster Pro immediately upon suspecting any unauthorized access or security breach.'}
        </p>
      </section>

      {/* 4. Subscription Plans, Billing, VAT & Entitlements */}
      <section id="sec-plans" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">04.</span>
          {isPt ? 'Planos de Subscrição, Faturação, IVA e Quotas' : 'Subscription Plans, Billing, VAT & Entitlements'}
        </h2>
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {isPt ? (
              <>
                O serviço é disponibilizado sob modelo de subscrição recorrente (mensal ou anual), de acordo com os planos ativos na plataforma (Free Trial, Professional, Enterprise). As quotas e funcionalidades de cada plano incluem:
              </>
            ) : (
              <>
                The service is provided on a recurring subscription basis (monthly or annual), according to published tiers (Free Trial, Professional, Enterprise). Plan quotas and entitlements encompass:
              </>
            )}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isPt ? 'Limite máximo de reservas registadas por mês;' : 'Maximum reservations processed per calendar month;'}</li>
            <li>{isPt ? 'Número máximo de contas de utilizadores (staff seats);' : 'Maximum concurrent staff account seats;'}</li>
            <li>{isPt ? 'Número de mesas ativas na planta de sala interativa;' : 'Number of active tables managed on the interactive floor plan;'}</li>
            <li>{isPt ? 'Módulos complementares: Domínios personalizados, estatísticas avançadas, alertas inteligentes e lista de espera.' : 'Feature flags: Custom domains, advanced insights, waitlist, and smart alerts.'}</li>
          </ul>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <CreditCard size={14} className="text-amber-400" />
            {isPt ? 'Moeda, Pagamentos e Regime do IVA (EU VAT)' : 'Currency, Billing & EU VAT Compliance'}
          </span>
          <p className="text-slate-300 leading-relaxed">
            {isPt ? (
              <>
                Todas as taxas de subscrição são faturadas em Euros (€ EUR). No caso de clientes empresariais sedeados noutros Estados-Membros da União Europeia detentores de NIF intracomunitário válido registado no sistema VIES, aplica-se o mecanismo de <strong>autoliquidação de IVA (Reverse Charge)</strong>, ao abrigo do artigo 196.º da Diretiva 2006/112/CE do Conselho. Para subscritores sediados na jurisdição fiscal da entidade operadora, aplica-se a taxa legal de IVA em vigor (ex.: 23% na Irlanda ou em Portugal, conforme a sede fiscal do prestador).
              </>
            ) : (
              <>
                All subscription fees are denominated and billed in Euros (€ EUR). For business customers established in other EU Member States possessing a valid VAT identification number verified in the European VIES database, the <strong>VAT Reverse Charge mechanism</strong> applies under Article 196 of Council Directive 2006/112/EC. For domestic subscribers within the operator’s tax jurisdiction, statutory VAT is charged at the prevailing rate (e.g. 23% in Ireland or Portugal).
              </>
            )}
          </p>
        </div>
      </section>

      {/* 5. Offline-First Sync Architecture & Service Availability */}
      <section id="sec-offline" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">05.</span>
          {isPt ? 'Arquitetura Offline-First e Disponibilidade' : 'Offline-First Sync Architecture & Service Availability'}
        </h2>
        <p>
          {isPt ? (
            <>
              O {brandName} integra uma arquitetura de sincronização <strong>Offline-First</strong> através do Firestore SDK e armazenamento local seguro (IndexedDB/Cache).
            </>
          ) : (
            <>
              {brandName} is built on an <strong>Offline-First</strong> synchronization architecture utilizing the Firestore client engine and secure local persistence (IndexedDB/Cache).
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>{isPt ? 'Resiliência no Serviço de Sala:' : 'Front-of-House Continuity:'}</strong>{' '}
            {isPt
              ? 'As reservas para o dia corrente e dia seguinte permanecem armazenadas localmente no dispositivo da equipa. Em caso de quebra temporária de rede de Internet no restaurante, o staff continua a poder consultar mesas e verificar chegadas de clientes sem interrupção.'
              : 'Bookings for today and tomorrow are maintained in local storage. In the event of an Internet outage at the restaurant premises, staff can continue viewing seat assignments and checking in arriving diners without interruption.'}
          </li>
          <li>
            <strong>{isPt ? 'Reconciliação Automática de Conflitos:' : 'Automatic Conflict Reconciliation:'}</strong>{' '}
            {isPt
              ? 'Assim que a ligação à rede for restabelecida, a plataforma sincroniza automaticamente os registos pendentes com os servidores na nuvem, aplicando verificação de conflitos em múltiplos pontos (Live View e Reserva).'
              : 'Once network connectivity is restored, the platform automatically reconciles local mutations with the cloud database, validating against double-bookings in both Live View and reservation queues.'}
          </li>
          <li>
            <strong>{isPt ? 'Janelas de Manutenção:' : 'Scheduled Maintenance:'}</strong>{' '}
            {isPt
              ? 'O DineMaster Pro envidará todos os esforços razoáveis para assegurar uma disponibilidade mensal de 99,5%, excluindo janelas de manutenção técnica programada previamente notificadas.'
              : 'DineMaster Pro uses reasonable commercial efforts to target 99.5% service uptime, excluding scheduled maintenance windows notified in advance.'}
          </li>
        </ul>
      </section>

      {/* 6. Technical Support & Temporary Access Protocol */}
      <section id="sec-support" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">06.</span>
          {isPt ? 'Suporte Técnico e Acesso Temporário' : 'Technical Support & Temporary Access Protocol'}
        </h2>
        <p>
          {isPt ? (
            <>
              Para diagnóstico de anomalias, depuração de configurações ou apoio operacional solicitado pelo Restaurante, a equipa de Super Administradores da plataforma dispõe de um mecanismo de acesso temporário autorizado (suporte assistido).
            </>
          ) : (
            <>
              To diagnose anomalies, resolve configuration issues, or provide requested operational assistance, platform Super Administrators possess an authorized temporary support protocol (assisted support).
            </>
          )}
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
            <Lock size={13} />
            {isPt ? 'Garantias de Auditoria Imutável' : 'Immutable Audit Trail Guarantees'}
          </span>
          <p className="leading-relaxed">
            {isPt
              ? 'Qualquer sessão de suporte assistido é estritamente temporária, limitada no tempo e registada no registo de auditoria imutável (audit_logs), com registo do operador, carimbo temporal, endereço IP e ações efetuadas, em total respeito pelo sigilo comercial e dados pessoais.'
              : 'Every assisted support session is strictly temporary, time-bound, and recorded in the immutable audit log (audit_logs), capturing the administrator identity, timestamp, IP address, and actions performed in full compliance with confidentiality and data protection laws.'}
          </p>
        </div>
      </section>

      {/* 7. Data Processing Addendum (Article 28 GDPR) */}
      <section id="sec-dpa" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">07.</span>
          {isPt ? 'Acordo de Subcontratação de Dados (Art. 28.º RGPD)' : 'Data Processing Addendum (Article 28 GDPR)'}
        </h2>
        <p>
          {isPt ? (
            <>
              Na medida em que o {brandName} processe dados pessoais de clientes comensais em nome do Restaurante durante a execução dos serviços de reserva, aplica-se o presente <strong>Acordo de Subcontratação de Dados (Data Processing Addendum — DPA)</strong>, obrigatório nos termos do artigo 28.º do RGPD:
            </>
          ) : (
            <>
              To the extent that {brandName} processes personal data of dining guests on behalf of the restaurant in providing reservation software services, this <strong>Data Processing Addendum (DPA)</strong> applies as mandated by Article 28 of the GDPR:
            </>
          )}
        </p>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">
              {isPt ? '7.1 Qualificação das Partes' : '7.1 Qualification of Parties'}
            </strong>
            <p>
              {isPt
                ? 'O Restaurante atua como Responsável pelo Tratamento (Data Controller) relativamente aos dados das reservas dos seus clientes. O DineMaster Pro atua como Subcontratante (Data Processor), tratando esses dados unicamente sob instruções documentadas do Restaurante.'
                : 'The Restaurant acts as the Data Controller in respect of dining reservation records. DineMaster Pro acts as a Data Processor, processing such personal data exclusively under the documented instructions of the Restaurant.'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">
              {isPt ? '7.2 Objeto, Duração e Categorias de Dados' : '7.2 Subject Matter, Duration & Categories'}
            </strong>
            <p>
              {isPt
                ? 'O objeto consiste no fornecimento da infraestrutura de agendamento online de mesas. Os dados tratados incluem: nome do comensal, telefone, endereço de correio eletrónico, número de pessoas, data/hora da refeição, preferências dietéticas/alergénios declarados pelo cliente e notas especiais. A duração corresponde à vigência da subscrição do restaurante.'
                : 'The subject matter is the technical provision of online restaurant booking software. Data processed includes diner name, telephone number, email address, party size, booking date and time, customer-declared dietary/allergy preferences, and dining notes. The duration corresponds to the active subscription.'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">
              {isPt ? '7.3 Subcontratantes Ulteriores Autorizados' : '7.3 Authorized Sub-Processors'}
            </strong>
            <p>
              {isPt
                ? 'O Restaurante autoriza expressamente a contratação dos seguintes prestadores essenciais de infraestrutura na nuvem: (a) Google Cloud / Firebase (alojamento de base de dados e autenticação em centros de dados na União Europeia); (b) Resend Inc. (envio de emails transacionais de confirmação); (c) Cloudinary Ltd. (distribuição otimizada de imagens e plantas); (d) Twilio Inc. (envio opcional de SMS e mensagens WhatsApp caso ativado).'
                : 'The Restaurant grants general written authorization for the engagement of the following essential cloud sub-processors: (a) Google Cloud / Firebase (database hosting and authentication within EU data centres); (b) Resend Inc. (transactional email dispatch); (c) Cloudinary Ltd. (image and asset delivery); (d) Twilio Inc. (optional SMS and WhatsApp notifications when enabled).'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <strong className="text-white block mb-1">
              {isPt ? '7.4 Medidas Técnicas e Notificação de Violações' : '7.4 Security Measures & Breach Notification'}
            </strong>
            <p>
              {isPt
                ? 'O DineMaster Pro implementa medidas técnicas e organizativas adequadas nos termos do Artigo 32.º do RGPD (ciffragem TLS em trânsito, cifragem AES-256 em repouso, regras estritas de segurança na base de dados e backups regulares). Em caso de violação de dados pessoais que afete os dados do restaurante, o DineMaster Pro notificará o Restaurante sem demora injustificada no prazo máximo de 48 horas após dela ter conhecimento.'
                : 'DineMaster Pro implements appropriate technical and organizational measures under Article 32 GDPR (TLS transit encryption, AES-256 rest encryption, hardened security rules, and automated backups). In the event of a confirmed personal data breach affecting restaurant records, DineMaster Pro shall notify the Restaurant without undue delay within 48 hours of becoming aware.'}
            </p>
          </div>
        </div>
      </section>

      {/* 8. Intellectual Property & Proprietary Rights */}
      <section id="sec-ip" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">08.</span>
          {isPt ? 'Propriedade Intelectual e Direitos da Plataforma' : 'Intellectual Property & Proprietary Rights'}
        </h2>
        <p>
          {isPt ? (
            <>
              Todo o código-fonte, marcas, logótipos, algoritmos de alocação de mesas, interfaces visuais e documentação técnica associados ao {brandName} são propriedade exclusiva da {legalEntity} ou dos seus licenciantes. É concedida ao Restaurante uma licença não exclusiva, intransmissível e revogável de utilização durante o período de subscrição ativo.
            </>
          ) : (
            <>
              All source code, software architecture, table allocation algorithms, visual interfaces, trademarks, and documentation associated with {brandName} are the exclusive property of {legalEntity} or its licensors. The Restaurant receives a non-exclusive, non-transferable, revocable license to utilize the software during the active subscription period.
            </>
          )}
        </p>
        <p className="text-xs text-slate-400">
          {isPt
            ? 'O Restaurante mantém a total propriedade sobre os seus próprios dados de negócio, marcas registadas, imagens carregadas e base de dados de clientes.'
            : 'The Restaurant retains complete ownership over its business data, customer reservation records, menus, and brand assets uploaded to the system.'}
        </p>
      </section>

      {/* 9. Acceptable Use Policy & Prohibited Conduct */}
      <section id="sec-acceptable-use" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">09.</span>
          {isPt ? 'Política de Utilização Aceitável e Condutas Proibidas' : 'Acceptable Use Policy & Prohibited Conduct'}
        </h2>
        <p>
          {isPt ? (
            <>
              É expressamente proibido a qualquer utilizador da plataforma:
            </>
          ) : (
            <>
              All users and subscriber accounts are strictly prohibited from:
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>{isPt ? 'Tentar realizar engenharia reversa, descompilação ou cópia do código do DineMaster Pro;' : 'Reverse engineering, decompiling, or attempting to extract the underlying source code of DineMaster Pro;'}</li>
          <li>{isPt ? 'Utilizar a infraestrutura para envio de comunicações comerciais não solicitadas (SPAM);' : 'Using platform transactional communication channels to broadcast unsolicited spam;' }</li>
          <li>{isPt ? 'Efetuar reservas falsas ou testes de carga não autorizados que degradem o serviço;' : 'Injecting automated fraudulent reservations or conducting denial-of-service load spikes;'}</li>
          <li>{isPt ? 'Tentar contornar as regras de segurança e isolamento multi-tenant da base de dados.' : 'Circumventing multi-tenant isolation rules or unauthorized database queries.'}</li>
        </ul>
      </section>

      {/* 10. Limitation of Liability & Warranty Disclaimers */}
      <section id="sec-liability" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">10.</span>
          {isPt ? 'Limitação de Responsabilidade e Exclusões' : 'Limitation of Liability & Warranty Disclaimers'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isPt ? (
            <>
              Na extensão máxima permitida pela lei aplicável, o {brandName} é fornecido "tal como está" (as-is). A responsabilidade agregada total da {legalEntity} por quaisquer danos decorrentes ou relacionados com a subscrição da plataforma fica estritamente limitada ao montante total efetivamente pago pelo Restaurante à operadora nos 12 (doze) meses imediatamente anteriores ao evento que deu origem à reclamação. Em caso algum o DineMaster Pro será responsável por lucros cessantes, perda de receitas de refeições, não comparência de clientes (no-shows) ou danos indiretos.
            </>
          ) : (
            <>
              To the maximum extent permitted by applicable law, {brandName} is provided on an "as-is" and "as-available" basis. The aggregate total liability of {legalEntity} arising out of or relating to this agreement shall be strictly capped at the total amount actually paid by the subscriber restaurant to the operator in the 12 (twelve) months preceding the incident giving rise to liability. In no event shall DineMaster Pro be liable for lost restaurant revenue, dining no-shows, food spoliation, or consequential indirect damages.
            </>
          )}
        </p>
      </section>

      {/* 11. Term, Suspension & Data Export on Termination */}
      <section id="sec-termination" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">11.</span>
          {isPt ? 'Duração, Suspensão e Exportação de Dados' : 'Term, Suspension & Data Export on Termination'}
        </h2>
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {isPt ? (
              <>
                A subscrição renova-se automaticamente no final de cada período (mensal ou anual), a menos que o Restaurante cancele o plano antes do termo do ciclo corrente através do painel de administração.
              </>
            ) : (
              <>
                Subscriptions automatically renew at the end of each billing cycle (monthly or annual), unless canceled by the restaurant administrator prior to the renewal date via the dashboard.
              </>
            )}
          </p>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-amber-400 block">
              {isPt ? 'Período de Graça para Exportação de Dados (30 Dias):' : '30-Day Data Portability Grace Period:'}
            </strong>
            <p>
              {isPt
                ? 'Em caso de cancelamento ou cessação da subscrição, o Restaurante dispõe de um período de graça de 30 (trinta) dias para descarregar o histórico das suas reservas e base de clientes em formato legível por máquina (CSV/PDF), findo o qual os dados serão definitivamente anonimizados ou eliminados de forma segura.'
                : 'Upon subscription termination, the restaurant is granted a 30-day grace period to export all historical reservations and guest lists in a structured machine-readable format (CSV/PDF), after which tenant records are purged or anonymized in accordance with retention schedules.'}
            </p>
          </div>
        </div>
      </section>

      {/* 12. Governing Law, Dispute Resolution & Jurisdiction */}
      <section id="sec-jurisdiction" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">12.</span>
          {isPt ? 'Lei Aplicável, Resolução de Litígios e Foro' : 'Governing Law, Dispute Resolution & Jurisdiction'}
        </h2>
        <p>
          {isPt ? (
            <>
              Estes Termos e Condições regem-se e são interpretados em conformidade com:
            </>
          ) : (
            <>
              These Terms and Conditions shall be governed by and construed in accordance with:
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>{isPt ? 'Se a jurisdição configurada for a Irlanda:' : 'Where governing jurisdiction is Ireland:'}</strong>{' '}
            {isPt
              ? 'Aplica-se a lei substantiva da República da Irlanda e os tribunais de Dublin terão competência exclusiva para dirimir quaisquer litígios.'
              : 'Governed by the substantive laws of Ireland, and the Courts of Dublin shall possess exclusive jurisdiction.'}
          </li>
          <li>
            <strong>{isPt ? 'Se a jurisdição configurada for Portugal:' : 'Where governing jurisdiction is Portugal:'}</strong>{' '}
            {isPt
              ? 'Aplica-se a lei substantiva portuguesa e os tribunais da comarca da sede social indicada terão competência territorial exclusiva.'
              : 'Governed by the substantive laws of Portugal, subject to the jurisdiction of the competent courts of the registered seat.'}
          </li>
          <li>
            <strong>{isPt ? 'Resolução de Litígios de Consumo da UE (ODR):' : 'EU Online Dispute Resolution (ODR):'}</strong>{' '}
            {isPt
              ? 'Para consumidores que efetuem reservas através da plataforma, recorda-se a existência da Plataforma de Resolução de Litígios em Linha da Comissão Europeia em ec.europa.eu/consumers/odr.'
              : 'For dining consumers booking through the web interface, reference is made to the European Commission Online Dispute Resolution platform at ec.europa.eu/consumers/odr.'}
          </li>
        </ul>
      </section>

      {/* 13. Legal Compliance & Professional Counsel Notice */}
      <section id="sec-review-notice" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">13.</span>
          {isPt ? 'Verificação Legal e Parecer Profissional' : 'Legal Compliance & Professional Counsel Notice'}
        </h2>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertTriangle size={15} />
            <span>
              {isPt ? 'Nota de Rigor e Transparência Jurídica' : 'Statutory Verification & Legal Counsel Notice'}
            </span>
          </div>
          <p className="leading-relaxed">
            {isPt ? (
              <>
                O presente texto foi estruturado de forma rigorosa para a operação de um software SaaS multi-tenant de reservas na Irlanda e em Portugal, cumprindo o Regulamento Geral sobre a Proteção de Dados (RGPD - Regulamento (UE) 2016/679), o Irish Data Protection Act 2018, a Lei n.º 58/2019 de Portugal, o Decreto-Lei n.º 7/2004 e a Diretiva de Comércio Eletrónico. Recomenda-se vivamente ao proprietário da plataforma a validação formal por um advogado qualificado na jurisdição aplicável (Irlanda ou Portugal) antes do lançamento comercial pleno.
              </>
            ) : (
              <>
                This document is tailored specifically for a multi-tenant SaaS restaurant reservation software operating in Ireland and Portugal, adhering to the EU General Data Protection Regulation (Regulation (EU) 2016/679), Irish Data Protection Act 2018, Portuguese Law No. 58/2019, Irish Electronic Commerce Act 2000, and Portuguese DL 7/2004. Formal verification by qualified legal counsel in Ireland or Portugal is recommended prior to commercial launch.
              </>
            )}
          </p>
        </div>
      </section>
    </PlatformLegalLayout>
  );
}
