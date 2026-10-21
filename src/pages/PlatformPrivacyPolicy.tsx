import React from 'react';
import { PlatformLegalLayout, TocItem } from '../components/legal/PlatformLegalLayout';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { useLanguage } from '../hooks/useLanguage';
import { 
  Shield, Lock, Eye, Server, Globe, FileCheck, AlertCircle, 
  UserCheck, Database, Key, CheckCircle2, ArrowRight, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlatformPrivacyPolicy() {
  const { legalDetails } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const toc: TocItem[] = isPt ? [
    { id: '1-responsavel-tratamento', title: '1. Responsável pelo Tratamento e Contactos' },
    { id: '2-enquadramento-legal', title: '2. Enquadramento Legal (RGPD, Irlanda e Portugal)' },
    { id: '3-papeis-distincao', title: '3. Distinção de Papéis: Responsável vs. Subcontratante' },
    { id: '4-dados-como-responsavel', title: '4. Dados Tratados como Responsável (Contas e Faturação)' },
    { id: '5-dados-como-subcontratante', title: '5. Dados Tratados como Subcontratante (Reservas e Comensais)' },
    { id: '6-bases-legais', title: '6. Bases de Licitude do Tratamento' },
    { id: '7-acordo-subcontratacao-dpa', title: '7. Acordo de Subcontratação (Artigo 28.º do RGPD)' },
    { id: '8-subcontratantes-ulteriores', title: '8. Subcontratantes e Fornecedores de Infraestrutura' },
    { id: '9-transferencias-internacionais', title: '9. Transferências Internacionais de Dados' },
    { id: '10-prazos-retencao', title: '10. Prazos de Conservação de Dados' },
    { id: '11-medidas-seguranca', title: '11. Medidas Técnicas e Organizativas de Segurança' },
    { id: '12-direitos-titulares', title: '12. Direitos dos Titulares dos Dados' },
    { id: '13-autoridades-supervisao', title: '13. Autoridades de Controlo e Direito de Reclamação' },
    { id: '14-alteracoes-politica', title: '14. Atualizações e Histórico de Revisões' },
  ] : [
    { id: '1-data-controller-info', title: '1. Data Controller Identity & Contacts' },
    { id: '2-legal-framework', title: '2. Legal Framework (GDPR, Ireland & Portugal)' },
    { id: '3-role-distinction', title: '3. Dual Role: Data Controller vs. Data Processor' },
    { id: '4-controller-data-activities', title: '4. Processing as Controller (Subscriber Accounts & Billing)' },
    { id: '5-processor-data-activities', title: '5. Processing as Processor (Diner & Reservation Data)' },
    { id: '6-lawful-bases', title: '6. Lawful Bases for Processing' },
    { id: '7-dpa-clauses', title: '7. Data Processing Agreement Terms (Article 28 GDPR)' },
    { id: '8-sub-processors', title: '8. Authorized Sub-processors & Infrastructure' },
    { id: '9-international-transfers', title: '9. Cross-Border Data Transfers & Safeguards' },
    { id: '10-retention-periods', title: '10. Data Retention Schedules' },
    { id: '11-security-measures', title: '11. Technical & Organizational Security Measures' },
    { id: '12-data-subject-rights', title: '12. Data Subject Rights & Requests' },
    { id: '13-supervisory-authorities', title: '13. Supervisory Authorities & Right to Complain' },
    { id: '14-policy-updates', title: '14. Policy Updates & Revision History' },
  ];

  return (
    <PlatformLegalLayout activeDoc="privacy" toc={toc} hidePrintButton={true}>
      <article className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed space-y-10">
        
        {/* Intro Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Shield size={16} className="text-amber-400" />
            <span>
              {isPt 
                ? 'Compromisso de Privacidade e Proteção de Dados da Plataforma DineMaster Pro' 
                : 'DineMaster Pro Platform Privacy Commitment & GDPR Compliance'}
            </span>
          </div>
          <p>
            {isPt 
              ? `A presente Política de Privacidade explica de forma rigorosa, clara e transparente como a plataforma DineMaster Pro trata dados pessoais, tanto na qualidade de Responsável pelo Tratamento (para utilizadores de contas e faturação) como na qualidade de Subcontratante (no processamento de dados de reservas em nome dos restaurantes clientes).`
              : `This Privacy Policy transparently delineates how DineMaster Pro collects, stores, protects, and handles personal data, both in its capacity as an independent Data Controller (for platform subscriber accounts and billing) and as a Data Processor (processing diner reservations on behalf of restaurant tenants).`}
          </p>
        </div>

        {/* Section 1 */}
        <section id={isPt ? '1-responsavel-tratamento' : '1-data-controller-info'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield size={18} className="text-amber-400" />
            <span>{isPt ? '1. Responsável pelo Tratamento e Contactos' : '1. Data Controller Identity & Contacts'}</span>
          </h2>
          <p>
            {isPt 
              ? `Para os tratamentos em que atua como Responsável pelo Tratamento, a entidade responsável é:`
              : `For processing activities where DineMaster Pro acts as an independent Data Controller, the responsible entity is:`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Nome Comercial da Plataforma:' : 'Platform Commercial Brand:'}
              </span>
              <strong className="text-white">{legalDetails.platformName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Entidade Legal / Denominação Social:' : 'Corporate Legal Entity Name:'}
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
                {isPt ? 'Registo Comercial (CRN / NIPC):' : 'Company Registration Number (CRN / NIPC):'}
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
                {isPt ? 'Número de Identificação Fiscal (NIF / IVA):' : 'VAT / Tax Identification Number:'}
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
                {isPt ? 'Sede Social Registada:' : 'Registered Corporate Office:'}
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
                {isPt ? 'Email Oficial de Privacidade:' : 'Privacy Inquiries Email:'}
              </span>
              <a href={`mailto:${legalDetails.contactEmail}`} className="text-amber-400 hover:underline">
                {legalDetails.contactEmail}
              </a>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                {isPt ? 'Encarregado de Proteção de Dados (DPO):' : 'Data Protection Officer (DPO):'}
              </span>
              {legalDetails.dpoContactEmail ? (
                <a href={`mailto:${legalDetails.dpoContactEmail}`} className="text-amber-400 hover:underline">
                  {legalDetails.dpoContactEmail}
                </a>
              ) : (
                <span className="text-slate-400">privacy@dinemasterpro.com</span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id={isPt ? '2-enquadramento-legal' : '2-legal-framework'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '2. Enquadramento Legal (RGPD, Irlanda e Portugal)' : '2. Legal Framework (GDPR, Ireland & Portugal)'}</span>
          </h2>
          <p>
            {isPt 
              ? `O tratamento de dados pessoais no DineMaster Pro é estruturado em total conformidade com os seguintes diplomas normativos vigentes:`
              : `All data processing operations conducted by DineMaster Pro strictly conform to applicable European and national statutory regimes:`}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Regulamento Geral sobre a Proteção de Dados (RGPD):' : 'General Data Protection Regulation (GDPR):'}</strong>{' '}
              {isPt 
                ? 'Regulamento (UE) 2016/679 do Parlamento Europeu e do Conselho, que estabelece as regras relativas à proteção das pessoas singulares no que diz respeito ao tratamento de dados pessoais.'
                : 'Regulation (EU) 2016/679 of the European Parliament and of the Council on the protection of natural persons with regard to personal data processing.'}
            </li>
            <li>
              <strong>{isPt ? 'Legislação Nacional da Irlanda:' : 'Irish Data Protection Framework:'}</strong>{' '}
              {isPt 
                ? 'Irish Data Protection Act 2018 (Act 7 of 2018), que executa o RGPD na Irlanda sob a supervisão da Data Protection Commission (DPC).'
                : 'Irish Data Protection Act 2018 (Act 7 of 2018) and relevant secondary legislation supervised by the Data Protection Commission (DPC).'}
            </li>
            <li>
              <strong>{isPt ? 'Legislação Nacional de Portugal:' : 'Portuguese Data Protection Framework:'}</strong>{' '}
              {isPt 
                ? 'Lei n.º 58/2019, de 8 de agosto, que assegura a execução do Regulamento (UE) 2016/679 na ordem jurídica portuguesa, sob supervisão da Comissão Nacional de Proteção de Dados (CNPD).'
                : 'Portuguese Law No. 58/2019 of 8 August, executing Regulation (EU) 2016/679 in Portugal under the supervision of the Comissão Nacional de Proteção de Dados (CNPD).'}
            </li>
            <li>
              <strong>{isPt ? 'Privacidade nas Comunicações Eletrónicas (ePrivacy):' : 'ePrivacy & Electronic Communications:'}</strong>{' '}
              {isPt 
                ? 'Diretiva 2002/58/CE (conforme alterada pela Diretiva 2009/136/CE), Irish S.I. No. 336/2011 e Lei n.º 41/2004 (alterada pela Lei n.º 46/2012) em Portugal, relativas ao armazenamento e acesso a informações em equipamentos terminais (cookies e armazenamento local).'
                : 'Directive 2002/58/EC (as amended), Irish S.I. No. 336/2011, and Portuguese Law No. 41/2004 regarding terminal storage technologies and transactional communications.'}
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id={isPt ? '3-papeis-distincao' : '3-role-distinction'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserCheck size={18} className="text-amber-400" />
            <span>{isPt ? '3. Distinção de Papéis: Responsável vs. Subcontratante' : '3. Dual Role: Data Controller vs. Data Processor'}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Shield size={14} />
                <span>{isPt ? 'Papel 1: Responsável (Data Controller)' : 'Role 1: Data Controller'}</span>
              </span>
              <p className="text-xs text-slate-300">
                {isPt 
                  ? 'O DineMaster Pro determina as finalidades e meios de tratamento relativos a:'
                  : 'DineMaster Pro acts as an independent Data Controller determining the purposes and means of:'}
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>{isPt ? 'Contas de proprietários e funcionários do restaurante.' : 'Restaurant owner, manager, and staff user account profiles.'}</li>
                <li>{isPt ? 'Dados de faturação, NIF, morada fiscal e subscrições.' : 'Subscriber billing information, payment records, and tax invoices.'}</li>
                <li>{isPt ? 'Mensagens e pedidos de contacto recebidos pelo website.' : 'Inquiries submitted to DineMaster Pro via contact channels.'}</li>
                <li>{isPt ? 'Registos de auditoria, segurança e integridade do sistema.' : 'Platform-wide security telemetry, audit trails, and access logs.'}</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Database size={14} />
                <span>{isPt ? 'Papel 2: Subcontratante (Data Processor)' : 'Role 2: Data Processor'}</span>
              </span>
              <p className="text-xs text-slate-300">
                {isPt 
                  ? 'O DineMaster Pro atua exclusivamente em nome e mediante instruções do Restaurante para:'
                  : 'DineMaster Pro acts strictly as a Data Processor on documented instructions of the Restaurant for:'}
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>{isPt ? 'Dados de reservas online de comensais (nome, telefone, email).' : 'Diner booking data (names, telephone numbers, emails, guest counts).'}</li>
                <li>{isPt ? 'Turnos, horas marcadas, notas de mesa e preferências.' : 'Seating assignments, dining times, and service dietary requests.'}</li>
                <li>{isPt ? 'Histórico de reservas e lista de espera do restaurante.' : 'Restaurant guest history, visit statuses, and waitlist records.'}</li>
                <li>
                  <strong className="text-slate-200">
                    {isPt ? 'O Restaurante é o Responsável pelo Tratamento destes dados.' : 'The Restaurant is the exclusive Controller for diner data.'}
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id={isPt ? '4-dados-como-responsavel' : '4-controller-data-activities'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock size={18} className="text-amber-400" />
            <span>{isPt ? '4. Dados Tratados como Responsável (Contas e Faturação)' : '4. Processing as Controller (Subscriber Accounts & Billing)'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Na gestão da plataforma SaaS, o DineMaster Pro recolhe e trata as seguintes categorias de dados pessoais:'
              : 'In managing direct SaaS subscriber relationships, DineMaster Pro processes the following categories of personal data:'}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Dados de Conta e Utilizadores:' : 'Account & Identity Data:'}</strong>{' '}
              {isPt 
                ? 'Nome, email de trabalho, número de telefone, função no restaurante (administrador, gerente ou funcionário) e credenciais de autenticação encriptadas (armazenadas em segurança através do Firebase Authentication).'
                : 'Full name, business email, contact phone, staff role, and salted password hashes securely hashed and stored via Google Firebase Authentication.'}
            </li>
            <li>
              <strong>{isPt ? 'Dados de Faturação e Pagamento:' : 'Billing & Commercial Data:'}</strong>{' '}
              {isPt 
                ? 'Nome da empresa, NIF/NIPC, morada fiscal, histórico de transações, montantes liquidados e faturas emitidas. Dados de cartões bancários são processados diretamente por gateways seguras com certificação PCI-DSS.'
                : 'Commercial trading name, VAT number, billing address, invoice records, and transaction receipts. Card details are processed directly via PCI-DSS compliant payment gateways.'}
            </li>
            <li>
              <strong>{isPt ? 'Registos de Segurança e Auditoria:' : 'Security & Audit Telemetry:'}</strong>{' '}
              {isPt 
                ? 'Endereço IP, data e hora de acesso, navegador utilizado e registos de auditoria de operações sensíveis para prevenção de fraudes e proteção contra acessos não autorizados.'
                : 'IP address, session timestamp, user-agent string, and immutable audit logs of administrative actions for security monitoring and incident prevention.'}
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id={isPt ? '5-dados-como-subcontratante' : '5-processor-data-activities'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Database size={18} className="text-amber-400" />
            <span>{isPt ? '5. Dados Tratados como Subcontratante (Reservas e Comensais)' : '5. Processing as Processor (Diner & Reservation Data)'}</span>
          </h2>
          <p>
            {isPt 
              ? `Quando os clientes de um restaurante realizam uma reserva através da plataforma DineMaster Pro (página /r/:slug, widget ou marcação telefónica inserida por funcionários), o DineMaster Pro atua exclusivamente na qualidade de Subcontratante do restaurante:`
              : `When diners book a table via DineMaster Pro booking interfaces (/r/:slug, booking widgets, or staff phone booking entries), DineMaster Pro acts strictly as a Data Processor on behalf of the respective restaurant:`}
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-white block">
              {isPt ? 'Categorias de Dados de Reservas Processadas:' : 'Processed Reservation Data Categories:'}
            </span>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>{isPt ? 'Nome completo do comensal titular da reserva.' : 'Diner primary contact name.'}</li>
              <li>{isPt ? 'Contacto telefónico (utilizado para envio de SMS e validação).' : 'Mobile telephone number (used for SMS reminders and verification codes).'}</li>
              <li>{isPt ? 'Endereço de correio eletrónico (para confirmação e gestão digital da reserva).' : 'Email address (used for automated booking confirmation and cancellation links).'}</li>
              <li>{isPt ? 'Data, turno, hora, número de convidados e mesa atribuída.' : 'Booking date, dining shift, party size, and table allocation.'}</li>
              <li>{isPt ? 'Notas especiais, restrições alimentares ou alergias voluntariamente comunicadas.' : 'Customer dietary notes or seating preferences voluntarily disclosed.'}</li>
            </ul>
            <p className="text-slate-400 pt-2 border-t border-slate-800/80">
              {isPt 
                ? 'O DineMaster Pro não comercializa, não partilha nem utiliza os dados de comensais para fins próprios de publicidade ou criação de perfis de consumo.'
                : 'DineMaster Pro never sells, monetizes, or cross-profiles diner personal data for independent marketing purposes.'}
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section id={isPt ? '6-bases-legais' : '6-lawful-bases'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <CheckCircle2 size={18} className="text-amber-400" />
            <span>{isPt ? '6. Bases de Licitude do Tratamento' : '6. Lawful Bases for Processing'}</span>
          </h2>
          <p>
            {isPt 
              ? 'O tratamento de dados pessoais assenta estritamente nas seguintes bases de licitude previstas no Artigo 6.º do RGPD:'
              : 'DineMaster Pro processes personal data strictly pursuant to Article 6(1) of the GDPR:'}
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] shrink-0 mt-0.5">
                Art. 6(1)(b)
              </span>
              <div>
                <strong className="text-white block">{isPt ? 'Execução do Contrato de Subscrição:' : 'Contract Performance:'}</strong>
                <span className="text-slate-400">
                  {isPt ? 'Fornecimento dos serviços SaaS, autenticação na conta, processamento de reservas e envio de confirmações transacionais solicitadas.' : 'Providing SaaS capabilities, user sign-in, dispatching transactional booking confirmations, and customer account access.'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] shrink-0 mt-0.5">
                Art. 6(1)(c)
              </span>
              <div>
                <strong className="text-white block">{isPt ? 'Cumprimento de Obrigação Jurídica:' : 'Legal Compliance:'}</strong>
                <span className="text-slate-400">
                  {isPt ? 'Conservação de registos de faturação, IVA e contabilidade nos termos da lei fiscal aplicável na Irlanda e em Portugal (6 anos).' : 'Maintaining financial, invoice, and VAT records under statutory Irish and Portuguese commercial and taxation laws.'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] shrink-0 mt-0.5">
                Art. 6(1)(f)
              </span>
              <div>
                <strong className="text-white block">{isPt ? 'Interesses Legítimos:' : 'Legitimate Interests:'}</strong>
                <span className="text-slate-400">
                  {isPt ? 'Segurança da infraestrutura em nuvem, deteção e prevenção de acessos fraudulentos, registos de auditoria e resolução de incidentes técnicos.' : 'Ensuring cloud system security, monitoring uptime, preventing abusive traffic or reservation fraud, and managing audit logs.'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[10px] shrink-0 mt-0.5">
                Art. 6(1)(a)
              </span>
              <div>
                <strong className="text-white block">{isPt ? 'Consentimento Prévio:' : 'Consent:'}</strong>
                <span className="text-slate-400">
                  {isPt ? 'Ativação de cookies não essenciais de análise ou marketing através da barra de consentimento de cookies.' : 'Activation of non-essential performance, analytical, or marketing storage mechanisms via user consent choice.'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 */}
        <section id={isPt ? '7-acordo-subcontratacao-dpa' : '7-dpa-clauses'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileCheck size={18} className="text-amber-400" />
            <span>{isPt ? '7. Acordo de Subcontratação (Artigo 28.º do RGPD)' : '7. Data Processing Agreement Terms (Article 28 GDPR)'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Nos termos do Artigo 28.º, n.º 3 do RGPD, o DineMaster Pro compromete-se perante cada restaurante cliente a:'
              : 'Pursuant to Article 28(3) of the GDPR, DineMaster Pro commits to each subscribing restaurant controller to:'}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Instruções Documentadas:' : 'Documented Instructions:'}</strong>{' '}
              {isPt 
                ? 'Tratar os dados pessoais de reservas unicamente com base em instruções documentadas do restaurante, salvo obrigação jurídica imperativa decorrente do direito da UE.'
                : 'Process diner data exclusively under documented instructions from the restaurant as transmitted through active software configurations.'}
            </li>
            <li>
              <strong>{isPt ? 'Dever de Confidencialidade:' : 'Duty of Confidentiality:'}</strong>{' '}
              {isPt 
                ? 'Assegurar que todas as pessoas autorizadas a aceder a dados pessoais assumiram compromisso contratual de confidencialidade.'
                : 'Ensure that all engineering and support personnel authorized to access data systems are bound by confidentiality commitments.'}
            </li>
            <li>
              <strong>{isPt ? 'Segurança do Tratamento:' : 'Security Measures:'}</strong>{' '}
              {isPt 
                ? 'Implementar as medidas técnicas e organizativas adequadas exigidas pelo Artigo 32.º do RGPD (cifragem TLS 1.3, regras rigorosas de segurança Firestore e isolamento de inquilinos).'
                : 'Implement technical and organizational safeguards in accordance with Article 32 GDPR (TLS 1.3 encryption, database tenancy boundaries, zero-trust rules).'}
            </li>
            <li>
              <strong>{isPt ? 'Assistência ao Responsável:' : 'Assistance with Rights & DPIAs:'}</strong>{' '}
              {isPt 
                ? 'Prestar assistência ao restaurante na resposta ao exercício de direitos pelos comensais e na notificação de incidentes de violação de dados às autoridades competentes (DPC Irlanda e CNPD Portugal) no prazo máximo de 48 horas após confirmação do evento.'
                : 'Assist the restaurant in fulfilling data subject rights and notify the restaurant controller without undue delay (and within 48 hours) upon confirming any personal data breach.'}
            </li>
            <li>
              <strong>{isPt ? 'Destino Final dos Dados:' : 'Deletion / Return Upon Termination:'}</strong>{' '}
              {isPt 
                ? 'Após o termo do serviço, eliminar ou devolver ao restaurante todos os dados pessoais recolhidos, decorrido o prazo de carência de 30 dias para exportação.'
                : 'Irrevocably delete or return all customer diner records following subscription conclusion and expiry of the 30-day export grace period.'}
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id={isPt ? '8-subcontratantes-ulteriores' : '8-sub-processors'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Server size={18} className="text-amber-400" />
            <span>{isPt ? '8. Subcontratantes e Fornecedores de Infraestrutura' : '8. Authorized Sub-processors & Infrastructure'}</span>
          </h2>
          <p>
            {isPt 
              ? 'O DineMaster Pro recorre a fornecedores de serviços em nuvem rigorosamente selecionados para a execução da plataforma:'
              : 'DineMaster Pro engages selected industry-leading cloud service sub-processors to operate the software infrastructure:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-mono">Google Cloud &amp; Firebase</strong>
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Função: Alojamento em Nuvem, Base de Dados Firestore e Autenticação' : 'Function: Cloud Infrastructure, Firestore DB & Auth'}</span>
              <span className="text-emerald-400 block text-[11px] font-mono">{isPt ? 'Localização: União Europeia (Região europe-west)' : 'Location: European Union (europe-west regions)'}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-mono">Resend (Resend Inc.)</strong>
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Função: Envio Transacional de Confirmações de Reserva por Email' : 'Function: Transactional Booking Confirmation Emails'}</span>
              <span className="text-emerald-400 block text-[11px] font-mono">{isPt ? 'Salvaguarda: Cláusulas Contratuais-Tipo da UE (SCCs)' : 'Safeguard: EU Standard Contractual Clauses (SCCs)'}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-mono">Twilio Inc.</strong>
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Função: Gateway de Envio de SMS e Códigos de Verificação' : 'Function: SMS Gateway & Phone Verification Codes'}</span>
              <span className="text-emerald-400 block text-[11px] font-mono">{isPt ? 'Salvaguarda: Cláusulas Contratuais-Tipo da UE (SCCs)' : 'Safeguard: EU Standard Contractual Clauses (SCCs)'}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-mono">Cloudinary Ltd.</strong>
              <span className="text-slate-400 block text-[11px]">{isPt ? 'Função: Alojamento e Otimização de Logótipos e Imagens dos Restaurantes' : 'Function: Restaurant Brand Media & Floor Plan Asset CDN'}</span>
              <span className="text-emerald-400 block text-[11px] font-mono">{isPt ? 'Salvaguarda: Cláusulas Contratuais-Tipo da UE (SCCs)' : 'Safeguard: EU Standard Contractual Clauses (SCCs)'}</span>
            </div>
          </div>
        </section>

        {/* Section 9 */}
        <section id={isPt ? '9-transferencias-internacionais' : '9-international-transfers'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '9. Transferências Internacionais de Dados' : '9. Cross-Border Data Transfers & Safeguards'}</span>
          </h2>
          <p>
            {isPt 
              ? `Os servidores e bases de dados primárias do DineMaster Pro estão fisicamente alojados dentro da União Europeia. Sempre que qualquer subcontratante ulterior execute operações fora do Espaço Económico Europeu (EEE), o DineMaster Pro garante que a transferência é respaldada por Cláusulas Contratuais-Tipo (SCCs) aprovadas pela Comissão Europeia nos termos do Artigo 46.º do RGPD ou por Decisão de Adequação da Comissão Europeia.`
              : `Primary production databases and application workloads are hosted in data centers located within the European Union. Where specific sub-processors process data outside the EEA, transfers rely strictly upon European Commission Standard Contractual Clauses (SCCs) pursuant to Article 46 GDPR or European Commission Adequacy Decisions.`}
          </p>
        </section>

        {/* Section 10 */}
        <section id={isPt ? '10-prazos-retencao' : '10-retention-periods'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock size={18} className="text-amber-400" />
            <span>{isPt ? '10. Prazos de Conservação de Dados' : '10. Data Retention Schedules'}</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>
              <strong>{isPt ? 'Dados de Contas de Restaurantes:' : 'Subscriber Account Records:'}</strong>{' '}
              {isPt 
                ? 'Mantidos durante a vigência do contrato e eliminados 30 dias após o cancelamento da subscrição.'
                : 'Retained for active subscription duration and purged 30 calendar days post-termination.'}
            </li>
            <li>
              <strong>{isPt ? 'Dados de Faturação e Transações:' : 'Invoicing & Tax Ledgers:'}</strong>{' '}
              {isPt 
                ? 'Conservados por 6 (seis) anos em cumprimento das obrigações fiscais e contabilísticas legais na Irlanda e em Portugal.'
                : 'Retained for 6 years in statutory compliance with Irish and Portuguese corporate tax and VAT recording laws.'}
            </li>
            <li>
              <strong>{isPt ? 'Registos de Reservas de Comensais:' : 'Diner Reservation Records:'}</strong>{' '}
              {isPt 
                ? 'Controlados pelo respetivo restaurante. Por defeito, os registos de reservas ativas são mantidos enquanto necessários para o serviço de mesa e historial de clientes.'
                : 'Governed by the independent restaurant controller’s retention policy and accessible in tenant dashboards.'}
            </li>
            <li>
              <strong>{isPt ? 'Registos de Segurança e Auditoria:' : 'Security Audit Telemetry:'}</strong>{' '}
              {isPt ? 'Conservados por 12 meses e subsequentemente eliminados.' : 'Retained for 12 months for security forensics and subsequently deleted.'}
            </li>
          </ul>
        </section>

        {/* Section 11 */}
        <section id={isPt ? '11-medidas-seguranca' : '11-security-measures'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock size={18} className="text-amber-400" />
            <span>{isPt ? '11. Medidas Técnicas e Organizativas de Segurança' : '11. Technical & Organizational Security Measures'}</span>
          </h2>
          <p>
            {isPt 
              ? 'O DineMaster Pro implementa salvaguardas de nível empresarial em conformidade com o Artigo 32.º do RGPD:'
              : 'DineMaster Pro enforces comprehensive security safeguards matching Article 32 GDPR standards:'}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
            <li>{isPt ? 'Cifragem integral em trânsito com protocolos TLS 1.3 modernos.' : 'Full encryption in transit enforced across all endpoints utilizing modern TLS 1.3.'}</li>
            <li>{isPt ? 'Cifragem em repouso nos discos de armazenamento em nuvem (AES-256).' : 'Encryption at rest across managed cloud datastores (AES-256 standard).'}</li>
            <li>{isPt ? 'Isolamento rigoroso de bases de dados multi-inquilino através de regras de segurança baseadas em atributos (ABAC).' : 'Strict multi-tenant security rules enforcing attribute-based access control (ABAC) preventing cross-tenant leakage.'}</li>
            <li>{isPt ? 'Controlo estrito de acessos com autenticação multifator para contas de Super Administrador.' : 'Enforced least-privilege credentials and administrative access auditing.'}</li>
          </ul>
        </section>

        {/* Section 12 */}
        <section id={isPt ? '12-direitos-titulares' : '12-data-subject-rights'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Key size={18} className="text-amber-400" />
            <span>{isPt ? '12. Direitos dos Titulares dos Dados' : '12. Data Subject Rights & Requests'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Ao abrigo dos Artigos 15.º a 22.º do RGPD, os titulares dos dados têm direito a:'
              : 'Under Articles 15 to 22 of the GDPR, you possess the following actionable rights:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <strong className="text-white block">{isPt ? 'Direito de Acesso (Art. 15.º)' : 'Right of Access (Art. 15)'}</strong>
              <span className="text-slate-400">{isPt ? 'Obter confirmação e cópia dos dados tratados.' : 'Request confirmation and a portable copy of personal records.'}</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <strong className="text-white block">{isPt ? 'Direito de Retificação (Art. 16.º)' : 'Right of Rectification (Art. 16)'}</strong>
              <span className="text-slate-400">{isPt ? 'Corrigir dados inexatos ou desatualizados.' : 'Correct inaccurate, out-of-date, or incomplete data.'}</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <strong className="text-white block">{isPt ? 'Direito ao Apagamento (Art. 17.º)' : 'Right to Erasure (Art. 17)'}</strong>
              <span className="text-slate-400">{isPt ? 'Solicitar a eliminação dos dados («esquecimento»).' : 'Request deletion where statutory exceptions do not apply.'}</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <strong className="text-white block">{isPt ? 'Direito à Portabilidade (Art. 20.º)' : 'Right to Portability (Art. 20)'}</strong>
              <span className="text-slate-400">{isPt ? 'Receber dados em formato estruturado (JSON/CSV).' : 'Receive structured exports in machine-readable format.'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-2">
            {isPt 
              ? `Para exercer qualquer direito relativo à sua conta ou dados tratados pelo DineMaster Pro, contacte-nos em ${legalDetails.contactEmail}. Se é um cliente de restaurante e pretende exercer direitos sobre uma reserva de mesa, recomendamos o contacto direto com o respetivo restaurante (Responsável pelo Tratamento).`
              : `To exercise rights concerning platform accounts or billing records, contact our privacy team at ${legalDetails.contactEmail}. If you are a dining guest requesting modification or deletion of restaurant booking records, contact the venue directly as Data Controller, or we will route your request accordingly.`}
          </p>
        </section>

        {/* Section 13 */}
        <section id={isPt ? '13-autoridades-supervisao' : '13-supervisory-authorities'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe size={18} className="text-amber-400" />
            <span>{isPt ? '13. Autoridades de Controlo e Direito de Reclamação' : '13. Supervisory Authorities & Right to Complain'}</span>
          </h2>
          <p>
            {isPt 
              ? 'Tem o direito de apresentar reclamação junto da autoridade de proteção de dados competente:'
              : 'You have the statutory right under Article 77 GDPR to lodge a complaint with an authorized supervisory authority:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-sans">
                {isPt ? 'Irlanda: Data Protection Commission (DPC)' : 'Ireland: Data Protection Commission (DPC)'}
              </strong>
              <p className="text-slate-400 text-[11px]">
                21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland
              </p>
              <a 
                href="https://www.dataprotection.ie" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-amber-400 hover:underline block text-[11px]"
              >
                www.dataprotection.ie
              </a>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <strong className="text-white block font-sans">
                {isPt ? 'Portugal: Comissão Nacional de Proteção de Dados (CNPD)' : 'Portugal: Comissão Nacional de Proteção de Dados (CNPD)'}
              </strong>
              <p className="text-slate-400 text-[11px]">
                Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa, Portugal
              </p>
              <a 
                href="https://www.cnpd.pt" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-amber-400 hover:underline block text-[11px]"
              >
                www.cnpd.pt
              </a>
            </div>
          </div>
        </section>

        {/* Section 14 */}
        <section id={isPt ? '14-alteracoes-politica' : '14-policy-updates'} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock size={18} className="text-amber-400" />
            <span>{isPt ? '14. Atualizações e Histórico de Revisões' : '14. Policy Updates & Revision History'}</span>
          </h2>
          <p>
            {isPt 
              ? `Esta Política de Privacidade é revista periodicamente. Quaisquer alterações substanciais serão comunicadas aos restaurantes através da plataforma com antecedência razoável.`
              : `This Privacy Policy is periodically audited. Any material amendments will be announced to registered Subscribers with reasonable advance notice.`}
          </p>
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-mono">
              {isPt ? `Versão atual: 2026.1 · Revisto em ${legalDetails.lastLegalReviewDate}` : `Version 2026.1 · Reviewed ${legalDetails.lastLegalReviewDate}`}
            </span>
            <Link to="/cookies" className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
              <span>{isPt ? 'Consultar Política de Cookies' : 'Review Cookie Policy'}</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

      </article>
    </PlatformLegalLayout>
  );
}
