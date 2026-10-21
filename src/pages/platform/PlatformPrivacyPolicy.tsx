import React from 'react';
import { PlatformLegalLayout, TocItem } from '../../components/platform/PlatformLegalLayout';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useLanguage } from '../../hooks/useLanguage';
import { 
  Shield, Eye, Lock, FileText, CheckCircle2, AlertCircle, 
  ExternalLink, Server, Globe2, UserCheck, Trash2, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';

const tocItems: TocItem[] = [
  { id: 'sec-privacy-intro', titleEn: '1. Introduction & Statutory Framework', titlePt: '1. Introdução e Enquadramento Legal' },
  { id: 'sec-privacy-controller', titleEn: '2. Identity of the Data Controller & DPO', titlePt: '2. Identificação do Responsável pelo Tratamento e EPD' },
  { id: 'sec-privacy-dual-role', titleEn: '3. Dual-Role Architecture: Controller vs. Processor', titlePt: '3. Modelo de Duplo Papel: Responsável vs. Subcontratante' },
  { id: 'sec-privacy-categories', titleEn: '4. Categories of Personal Data Collected', titlePt: '4. Categorias de Dados Pessoais Tratados' },
  { id: 'sec-privacy-legal-basis', titleEn: '5. Legal Bases for Data Processing (GDPR Art. 6)', titlePt: '5. Fundamentos de Licitude do Tratamento (Art. 6.º RGPD)' },
  { id: 'sec-privacy-isolation', titleEn: '6. Multi-Tenant Data Isolation & Security Measures', titlePt: '6. Isolamento Multi-Tenant e Medidas de Segurança' },
  { id: 'sec-privacy-subprocessors', titleEn: '7. Authorized Sub-Processors & Infrastructure', titlePt: '7. Subcontratantes e Infraestrutura na Nuvem' },
  { id: 'sec-privacy-transfers', titleEn: '8. International Data Transfers (Chapter V GDPR)', titlePt: '8. Transferências Internacionais de Dados' },
  { id: 'sec-privacy-retention', titleEn: '9. Data Retention & Archival Schedules', titlePt: '9. Prazos de Conservação e Eliminação de Dados' },
  { id: 'sec-privacy-rights', titleEn: '10. Data Subject Rights (Articles 15–22 GDPR)', titlePt: '10. Direitos dos Titulares dos Dados (Arts. 15.º a 22.º)' },
  { id: 'sec-privacy-authorities', titleEn: '11. Supervisory Authorities & Complaints (DPC & CNPD)', titlePt: '11. Autoridades de Controlo e Reclamações (DPC e CNPD)' },
  { id: 'sec-privacy-automated', titleEn: '12. Automated Decision-Making & Profiling', titlePt: '12. Decisões Automatizadas e Definição de Perfis' },
  { id: 'sec-privacy-review', titleEn: '13. Policy Updates & Statutory Verification Notice', titlePt: '13. Atualizações e Verificação Jurídica' },
];

export default function PlatformPrivacyPolicy() {
  const { platformSettings } = usePlatformSettings();
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const brandName = platformSettings.saasName || 'DineMaster Pro';
  const legalName = platformSettings.legalCompanyName || `${brandName} Technologies Ltd.`;
  const registeredAddress = platformSettings.registeredAddress || '[Pending Configuration in Super Admin]';
  const vatNumber = platformSettings.vatNumber || '[Pending Configuration in Super Admin]';
  const companyReg = platformSettings.companyRegistrationNumber || '[Pending Configuration in Super Admin]';
  const supportEmail = platformSettings.legalContactEmail || platformSettings.supportEmail || 'support@dinemasterpro.com';
  const privacyEmail = platformSettings.dpoContactEmail || platformSettings.legalContactEmail || 'privacy@dinemasterpro.com';
  const jurisdiction = platformSettings.primaryJurisdiction || 'ireland';

  return (
    <PlatformLegalLayout
      activeDoc="privacy"
      toc={tocItems}
      titleEn="DineMaster Pro Platform Privacy Policy"
      titlePt="Política de Privacidade da Plataforma DineMaster Pro"
      subtitleEn="Detailed information on how personal data is collected, processed, secured, and transferred by DineMaster Pro as a SaaS platform under the EU GDPR, Irish Data Protection Act 2018, and Portuguese Law No. 58/2019."
      subtitlePt="Informação exaustiva sobre como os dados pessoais são recolhidos, tratados, protegidos e transferidos pelo DineMaster Pro enquanto plataforma SaaS ao abrigo do RGPD, do Irish Data Protection Act 2018 e da Lei n.º 58/2019 de Portugal."
      hidePrintButton={true}
    >
      {/* 1. Introduction & Statutory Framework */}
      <section id="sec-privacy-intro" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">01.</span>
          {isPt ? 'Introdução e Enquadramento Legal' : 'Introduction & Statutory Framework'}
        </h2>
        <p>
          {isPt ? (
            <>
              A presente Política de Privacidade regula o tratamento de dados pessoais no âmbito da plataforma de software como serviço (SaaS) <strong>{brandName}</strong>. A nossa operação rege-se estritamente pela legislação europeia e nacional de proteção de dados em vigor, designadamente:
            </>
          ) : (
            <>
              This Privacy Policy governs the processing of personal data within the <strong>{brandName}</strong> Software-as-a-Service (SaaS) platform. Our operations strictly comply with the applicable European and national data protection statutory frameworks, notably:
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>{isPt ? 'Regulamento Geral sobre a Proteção de Dados (RGPD):' : 'EU General Data Protection Regulation (GDPR):'}</strong>{' '}
            Regulation (EU) 2016/679 of the European Parliament and of the Council.
          </li>
          <li>
            <strong>{isPt ? 'Legislação Aplicável na Irlanda:' : 'Irish Data Protection Statutory Law:'}</strong>{' '}
            Irish Data Protection Act 2018 (Act 7 of 2018).
          </li>
          <li>
            <strong>{isPt ? 'Legislação Aplicável em Portugal:' : 'Portuguese Data Protection Statutory Law:'}</strong>{' '}
            Lei n.º 58/2019, de 8 de agosto (Execução do RGPD na ordem jurídica portuguesa).
          </li>
          <li>
            <strong>{isPt ? 'Diretiva de Privacidade Eletrónica (ePrivacy):' : 'ePrivacy Directive & National Transpositions:'}</strong>{' '}
            Directive 2002/58/EC as amended; Irish S.I. No. 336/2011; Portuguese Lei n.º 41/2004 (alterada pela Lei n.º 46/2012).
          </li>
        </ul>
      </section>

      {/* 2. Identity of the Data Controller & DPO */}
      <section id="sec-privacy-controller" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">02.</span>
          {isPt ? 'Identificação do Responsável pelo Tratamento e EPD' : 'Identity of the Data Controller & DPO'}
        </h2>
        <p>
          {isPt ? (
            <>
              Para os tratamentos de dados em que a plataforma atua como Responsável pelo Tratamento (Data Controller), a entidade legal responsável é:
            </>
          ) : (
            <>
              For processing activities where the platform acts as an independent Data Controller, the responsible corporate entity is:
            </>
          )}
        </p>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
            <div>
              <span className="text-slate-500 block">{isPt ? 'Entidade:' : 'Corporate Entity:'}</span>
              <span className="font-semibold text-white">{legalName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{isPt ? 'NIPC / Registo:' : 'Company Registration / CRO:'}</span>
              <span className="font-mono text-slate-200">{companyReg}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{isPt ? 'NIF / IVA (VAT):' : 'VAT Identification:'}</span>
              <span className="font-mono text-slate-200">{vatNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{isPt ? 'Sede Social:' : 'Registered Address:'}</span>
              <span className="text-slate-200">{registeredAddress}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4 text-slate-300">
            <span>
              {isPt ? 'Contacto Geral:' : 'General Inquiries:'}{' '}
              <a href={`mailto:${supportEmail}`} className="text-amber-400 hover:underline font-mono">{supportEmail}</a>
            </span>
            <span>
              {isPt ? 'Contacto do Encarregado de Proteção de Dados (DPO):' : 'Data Protection Officer (DPO):'}{' '}
              <a href={`mailto:${privacyEmail}`} className="text-amber-400 hover:underline font-mono">{privacyEmail}</a>
            </span>
          </div>
        </div>
      </section>

      {/* 3. Dual-Role Architecture: Controller vs. Processor */}
      <section id="sec-privacy-dual-role" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">03.</span>
          {isPt ? 'Modelo de Duplo Papel: Responsável vs. Subcontratante' : 'Dual-Role Architecture: Controller vs. Processor'}
        </h2>
        <p>
          {isPt ? (
            <>
              Em estrita conformidade com os artigos 4.º(7) e 4.º(8) do RGPD, o {brandName} desempenha dois papéis jurídicos complementares mas perfeitamente distintos:
            </>
          ) : (
            <>
              In accordance with Articles 4(7) and 4(8) of the GDPR, {brandName} operates under two legally distinct roles depending on the nature of the data:
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Shield size={14} />
              {isPt ? 'Papel 1: Responsável pelo Tratamento (Data Controller)' : 'Role 1: Data Controller (DineMaster Pro)'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isPt
                ? 'O DineMaster Pro atua como Responsável pelo Tratamento relativamente aos dados de utilizadores que criam contas na plataforma (proprietários de restaurantes, administradores, colaboradores), dados de faturação e subscrição, contactos de suporte e dados de navegação no website comercial principal (marketing/landing).'
                : 'DineMaster Pro acts as Data Controller for account data of restaurant subscribers (owners, managers, staff accounts), billing and subscription records, customer support logs, and marketing website telemetry on the platform domain.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Server size={14} />
              {isPt ? 'Papel 2: Subcontratante (Data Processor)' : 'Role 2: Data Processor (On behalf of Restaurants)'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isPt
                ? 'Relativamente aos dados das reservas efetuadas pelos clientes comensais (nome do comensal, telefone, data/hora, número de pessoas, notas de mesa), o DineMaster Pro atua unicamente como Subcontratante (Data Processor), tratando os dados em nome e sob as instruções do Restaurante respetivo, que é o Responsável pelo Tratamento independente (/r/[slug]/privacy).'
                : 'With respect to dining reservation records placed by restaurant guests (diner name, phone number, reservation date/time, party size, dining requests), DineMaster Pro acts strictly as a Data Processor under Article 28 GDPR on behalf of the subscriber restaurant, who serves as the independent Data Controller (/r/[slug]/privacy).'}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Categories of Personal Data Collected */}
      <section id="sec-privacy-categories" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">04.</span>
          {isPt ? 'Categorias de Dados Pessoais Tratados' : 'Categories of Personal Data Collected'}
        </h2>
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {isPt ? 'Recolhemos e processamos as seguintes categorias de dados:' : 'We collect and process the following categories of personal data:'}
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>{isPt ? 'Dados de Registo e Autenticação:' : 'Identity & Authentication Credentials:'}</strong>{' '}
              {isPt
                ? 'Nome, endereço de email profissional, palavra-passe encriptada, identificador único de utilizador Firebase (UID), função atribuída (super_admin, admin, staff, customer).'
                : 'Name, corporate email address, hashed credentials, Firebase unique user identifier (UID), and assigned RBAC role.'}
            </li>
            <li>
              <strong>{isPt ? 'Dados Comerciais e de Faturação:' : 'Commercial & Billing Information:'}</strong>{' '}
              {isPt
                ? 'Nome da empresa, NIF/NIPC, morada fiscal, histórico de faturas, identificador de método de pagamento (armazenado de forma segura sem acesso a dados de cartão de crédito).'
                : 'Company legal name, VAT/tax number, registered billing address, invoice records, and tokenized payment identifiers.'}
            </li>
            <li>
              <strong>{isPt ? 'Dados de Reservas Operacionais (em nome do Restaurante):' : 'Dining Reservation Records (Processor role):'}</strong>{' '}
              {isPt
                ? 'Nome do cliente comensal, número de telefone para confirmação, email de envio de voucher/lembrete, data e hora da refeição, número de pessoas, notas de mesa e preferências declaradas.'
                : 'Guest contact name, confirmation telephone, reminder email, party size, booking timestamp, dietary/allergy notations, and attendance status (seated, canceled, no-show).'}
            </li>
            <li>
              <strong>{isPt ? 'Dados Técnicos de Rede e Segurança:' : 'Technical Telemetry & Security Logs:'}</strong>{' '}
              {isPt
                ? 'Endereço IP, registos de autenticação, registo de ações no painel de administração (audit_logs), identificador do dispositivo e metadados de sessão.'
                : 'IP address, authentication event logs, administrative audit logs (audit_logs), device user-agent, and session metadata.'}
            </li>
          </ul>
        </div>
      </section>

      {/* 5. Legal Bases for Data Processing (GDPR Art. 6) */}
      <section id="sec-privacy-legal-basis" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">05.</span>
          {isPt ? 'Fundamentos de Licitude do Tratamento (Art. 6.º RGPD)' : 'Legal Bases for Data Processing (GDPR Art. 6)'}
        </h2>
        <p>
          {isPt ? (
            <>
              O tratamento de dados pessoais pelo {brandName} fundamenta-se nas seguintes bases de licitude previstas no artigo 6.º do RGPD:
            </>
          ) : (
            <>
              Processing of personal data by {brandName} is lawful under the following bases set forth in Article 6 of the GDPR:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-white block">Art. 6(1)(b) — Execução Contratual</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Necessário para a prestação dos serviços de software SaaS, gestão de mesas, autenticação na plataforma e processamento de reservas.'
                : 'Necessary for the performance of the SaaS service contract, table management tools, user authentication, and reservation dispatch.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-white block">Art. 6(1)(c) — Obrigação Jurídica</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Cumprimento de deveres fiscais, contabilísticos e comerciais na Irlanda (Irish Companies Act 2014) e em Portugal (Código Comercial e CIVA).'
                : 'Compliance with mandatory tax, accounting, and fiscal retention laws in Ireland and Portugal.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-white block">Art. 6(1)(f) — Interesses Legítimos</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Prevenção de acessos fraudulentos, segurança da infraestrutura na nuvem, registos de auditoria imutáveis e melhoria técnica contínua.'
                : 'Defending system integrity, preventing brute-force intrusion, audit log verification, and infrastructure reliability.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <strong className="text-white block">Art. 6(1)(a) — Consentimento</strong>
            <p className="text-slate-400">
              {isPt
                ? 'Subscrição voluntária de newsletters e ativação de cookies não essenciais de acordo com a Diretiva ePrivacy.'
                : 'Voluntary newsletter sign-ups and non-exempt tracking cookies managed via the cookie consent interface.'}
            </p>
          </div>
        </div>
      </section>

      {/* 6. Multi-Tenant Data Isolation & Security Measures */}
      <section id="sec-privacy-isolation" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">06.</span>
          {isPt ? 'Isolamento Multi-Tenant e Medidas de Segurança' : 'Multi-Tenant Data Isolation & Security Measures'}
        </h2>
        <p>
          {isPt ? (
            <>
              Em cumprimento do Artigo 32.º do RGPD, implementámos garantias técnicas e organizativas rigorosas para assegurar um nível de segurança adequado ao risco:
            </>
          ) : (
            <>
              In fulfillment of Article 32 GDPR, we maintain technical and organizational safeguards to protect data against accidental loss, alteration, or unauthorized disclosure:
            </>
          )}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
          <li>
            <strong>{isPt ? 'Isolamento Lógico Multi-Tenant:' : 'Logical Multi-Tenant Isolation:'}</strong>{' '}
            {isPt
              ? 'Todos os documentos e coleções na base de dados (reservations, tables, areas, settings) são estritamente indexados pelo restaurantId. As regras de segurança do Firestore (firestore.rules) bloqueiam ativamente qualquer tentativa de leitura ou escrita cruzada entre restaurantes distintos.'
              : 'All collections (reservations, tables, areas, settings) are strictly scoped by restaurantId. Server-enforced Firestore security rules mathematically prevent cross-tenant data leakage between independent establishments.'}
          </li>
          <li>
            <strong>{isPt ? 'Cifra em Trânsito e Repouso:' : 'Encryption in Transit & at Rest:'}</strong>{' '}
            {isPt
              ? 'Todas as comunicações com a plataforma utilizam encriptação TLS 1.3 (HTTPS/WSS). Todos os dados em repouso nos servidores europeus da Google Cloud estão cifrados com algoritmos AES-256.'
              : 'All external communications utilize TLS 1.3 encryption. Data stored at rest across Google Cloud Europe repositories is protected with AES-256 encryption.'}
          </li>
          <li>
            <strong>{isPt ? 'Sincronização Offline Segura:' : 'Encrypted Offline Caching:'}</strong>{' '}
            {isPt
              ? 'A cache local nos dispositivos do staff restringe-se estritamente às reservas do dia e do dia seguinte, assegurando a continuidade do serviço e minimizando a superfície de exposição.'
              : 'Local front-of-house storage is limited to current and next-day dining data, minimizing the local data footprint while ensuring uninterrupted floor operations.'}
          </li>
        </ul>
      </section>

      {/* 7. Authorized Sub-Processors & Infrastructure */}
      <section id="sec-privacy-subprocessors" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">07.</span>
          {isPt ? 'Subcontratantes e Infraestrutura na Nuvem' : 'Authorized Sub-Processors & Infrastructure'}
        </h2>
        <div className="overflow-x-auto text-xs pt-1">
          <table className="w-full text-left border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-900 text-slate-300">
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Subcontratante' : 'Sub-Processor'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Finalidade do Tratamento' : 'Processing Purpose'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Localização dos Servidores' : 'Server Location'}</th>
                <th className="p-2.5 border border-slate-800 font-semibold">{isPt ? 'Garantia de Conformidade' : 'Compliance Safeguard'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-400">
              <tr>
                <td className="p-2.5 font-medium text-white">Google Cloud / Firebase</td>
                <td className="p-2.5">{isPt ? 'Base de dados Firestore, autenticação e alojamento web' : 'Firestore database, user authentication & web hosting'}</td>
                <td className="p-2.5 font-mono text-amber-400">União Europeia (europe-west)</td>
                <td className="p-2.5">{isPt ? 'Art. 28 RGPD DPA / UE' : 'Art. 28 GDPR DPA / EU Data Residency'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">Resend Inc.</td>
                <td className="p-2.5">{isPt ? 'Envio de emails transacionais de reservas e alertas' : 'Transactional confirmation emails and booking notices'}</td>
                <td className="p-2.5">EUA / UE</td>
                <td className="p-2.5">EU-U.S. Data Privacy Framework &amp; SCCs</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">Cloudinary Ltd.</td>
                <td className="p-2.5">{isPt ? 'Alojamento e entrega otimizada de imagens e plantas de sala' : 'Image optimization and floor plan visual delivery'}</td>
                <td className="p-2.5">Global CDN / UE</td>
                <td className="p-2.5">Standard Contractual Clauses (SCCs)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">Twilio Inc. (Opcional)</td>
                <td className="p-2.5">{isPt ? 'Envio de SMS e WhatsApp caso ativado pelo restaurante' : 'SMS and WhatsApp dispatch if enabled by subscriber'}</td>
                <td className="p-2.5">EUA / UE</td>
                <td className="p-2.5">EU-U.S. Data Privacy Framework &amp; SCCs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. International Data Transfers (Chapter V GDPR) */}
      <section id="sec-privacy-transfers" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">08.</span>
          {isPt ? 'Transferências Internacionais de Dados' : 'International Data Transfers (Chapter V GDPR)'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isPt ? (
            <>
              Os dados principais da plataforma são prioritariamente armazenados e tratados em centros de dados situados no Espaço Económico Europeu (EEE). Nas situações em que determinados fornecedores tecnológicos subcontratados realizem transferências para países terceiros fora do EEE (como os Estados Unidos da América), essas transferências são efetuadas ao abrigo de decisões de adequação da Comissão Europeia (designadamente o <strong>Quadro de Privacidade de Dados UE-EUA — EU-U.S. Data Privacy Framework</strong>, nos termos do Artigo 45.º do RGPD) ou mediante a subscrição das <strong>Cláusulas Contratuais-Tipo (Standard Contractual Clauses — SCCs)</strong> aprovadas pela Decisão de Execução (UE) 2021/914 da Comissão Europeia, acompanhadas de avaliações de impacto na transferência (TIA).
            </>
          ) : (
            <>
              Primary platform databases and application servers are domiciled in cloud regions within the European Economic Area (EEA). Where certain auxiliary sub-processors transfer data outside the EEA (such as to the United States), such international transfers are safeguarded under European Commission adequacy decisions (notably the <strong>EU-U.S. Data Privacy Framework</strong> under Article 45 GDPR) or through <strong>Standard Contractual Clauses (SCCs)</strong> adopted under Commission Implementing Decision (EU) 2021/914, reinforced by Transfer Impact Assessments (TIAs).
            </>
          )}
        </p>
      </section>

      {/* 9. Data Retention & Archival Schedules */}
      <section id="sec-privacy-retention" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">09.</span>
          {isPt ? 'Prazos de Conservação e Eliminação de Dados' : 'Data Retention & Archival Schedules'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">{isPt ? 'Contas de Restaurante' : 'Active Account Data'}</span>
            <p className="text-slate-400">
              {isPt
                ? 'Conservados durante a vigência do contrato. Após cancelamento, arquivados por 30 dias para exportação e eliminados.'
                : 'Retained for active subscription duration. Retained for 30-day export grace period following account closure.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">{isPt ? 'Documentos Fiscais' : 'Fiscal & Invoicing Logs'}</span>
            <p className="text-slate-400">
              {isPt
                ? 'Conservados pelo prazo legal de 10 anos em Portugal (art. 52.º CIVA) ou 6 anos na Irlanda (Taxes Consolidation Act 1997).'
                : 'Preserved for statutory retention periods: 6 years in Ireland, 10 years in Portugal.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-white block">{isPt ? 'Registos de Auditoria (Logs)' : 'Audit & Security Logs'}</span>
            <p className="text-slate-400">
              {isPt
                ? 'Conservados por um período máximo de 90 a 180 dias para fins de investigação de incidentes e segurança da rede.'
                : 'Maintained for 90 to 180 days for security analysis, breach investigation, and network integrity.'}
            </p>
          </div>
        </div>
      </section>

      {/* 10. Data Subject Rights (Articles 15–22 GDPR) */}
      <section id="sec-privacy-rights" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">10.</span>
          {isPt ? 'Direitos dos Titulares dos Dados (Arts. 15.º a 22.º)' : 'Data Subject Rights (Articles 15–22 GDPR)'}
        </h2>
        <p>
          {isPt ? (
            <>
              Nos termos do RGPD, os titulares dos dados gozam dos seguintes direitos fundamentais:
            </>
          ) : (
            <>
              Under Chapter III of the GDPR, all data subjects hold the following statutory rights:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Direito de Acesso (Art. 15.º):' : 'Right of Access (Art. 15):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Obter confirmação e cópia dos dados pessoais tratados.' : 'Request confirmation and a structured copy of processed data.'}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Direito de Retificação (Art. 16.º):' : 'Right to Rectification (Art. 16):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Corrigir dados inexatos ou completar dados incompletos.' : 'Correct inaccurate or outdated personal records.'}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Direito ao Apagamento (Art. 17.º):' : 'Right to Erasure / Forgotten (Art. 17):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Exigir o apagamento quando os dados deixem de ser necessários.' : 'Request data deletion when retention grounds cease.'}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Direito à Portabilidade (Art. 20.º):' : 'Right to Portability (Art. 20):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Receber dados num formato estruturado, de uso corrente e leitura automática.' : 'Export personal data in machine-readable format (CSV/JSON).'}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Direito de Oposição (Art. 21.º):' : 'Right to Object (Art. 21):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Opor-se a tratamentos baseados em interesses legítimos ou marketing.' : 'Object to processing predicated upon legitimate interest or direct marketing.'}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
            <strong>{isPt ? 'Limitação do Tratamento (Art. 18.º):' : 'Right to Restriction (Art. 18):'}</strong>{' '}
            <span className="text-slate-400">{isPt ? 'Solicitar a suspensão provisória do tratamento de dados.' : 'Request temporary freezing of data processing.'}</span>
          </div>
        </div>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Para exercer qualquer um destes direitos relativamente à sua conta de plataforma, envie um pedido formal por escrito para <a href={`mailto:${privacyEmail}`} className="text-amber-400 underline font-mono">{privacyEmail}</a>. Responderemos no prazo máximo legal de 1 (um) mês. Caso o pedido diga respeito a reservas efetuadas num restaurante específico, o comensal deverá contactar diretamente o respetivo Restaurante (Responsável pelo Tratamento).
            </>
          ) : (
            <>
              To exercise these rights in relation to your platform user account, submit a formal request to <a href={`mailto:${privacyEmail}`} className="text-amber-400 underline font-mono">{privacyEmail}</a>. We respond within the statutory one-month period. For requests concerning restaurant table reservations, dining guests should contact the specific restaurant directly (the Data Controller).
            </>
          )}
        </p>
      </section>

      {/* 11. Supervisory Authorities & Complaints (DPC & CNPD) */}
      <section id="sec-privacy-authorities" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">11.</span>
          {isPt ? 'Autoridades de Controlo e Reclamações (DPC e CNPD)' : 'Supervisory Authorities & Complaints (DPC & CNPD)'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Sem prejuízo de qualquer outro recurso administrativo ou judicial, o titular dos dados tem o direito de apresentar reclamação junto da autoridade de controlo competente do Estado-Membro da União Europeia da sua residência habitual, local de trabalho ou local onde foi cometida a alegada infração:
            </>
          ) : (
            <>
              Without prejudice to any other administrative or judicial remedy, data subjects have the right to lodge a complaint with an EU data protection supervisory authority:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-white block">
              {isPt ? 'Irlanda: Data Protection Commission (DPC)' : 'Ireland: Data Protection Commission (DPC)'}
            </span>
            <p className="text-slate-400">
              Coimisiún um Chosaint Sonraí, 21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland.
            </p>
            <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]">
              <span>www.dataprotection.ie</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-white block">
              {isPt ? 'Portugal: Comissão Nacional de Proteção de Dados (CNPD)' : 'Portugal: Comissão Nacional de Proteção de Dados (CNPD)'}
            </span>
            <p className="text-slate-400">
              Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa, Portugal.
            </p>
            <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]">
              <span>www.cnpd.pt</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </section>

      {/* 12. Automated Decision-Making & Profiling */}
      <section id="sec-privacy-automated" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">12.</span>
          {isPt ? 'Decisões Automatizadas e Definição de Perfis' : 'Automated Decision-Making & Profiling'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              O {brandName} <strong>não adota</strong> quaisquer mecanismos de decisão exclusivamente automatizada que produzam efeitos jurídicos na esfera do utilizador ou do comensal, nem realiza operações de definição de perfis (profiling) nos termos do artigo 22.º do RGPD. A aprovação, recusa ou alocação final de reservas cabe em exclusivo ao critério humano da equipa do restaurante.
            </>
          ) : (
            <>
              {brandName} <strong>does not</strong> subject data subjects to automated decision-making producing legal or similarly significant effects under Article 22 GDPR, nor does it conduct behavioral profiling. Final table assignment and reservation confirmations remain at all times subject to human management by restaurant personnel.
            </>
          )}
        </p>
      </section>

      {/* 13. Policy Updates & Statutory Verification Notice */}
      <section id="sec-privacy-review" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-mono">13.</span>
          {isPt ? 'Atualizações e Verificação Jurídica' : 'Policy Updates & Statutory Verification Notice'}
        </h2>
        <p className="text-xs text-slate-300">
          {isPt ? (
            <>
              Esta política pode ser atualizada periodicamente para refletir alterações nos serviços ou na legislação comunitária. Quaisquer alterações materiais serão comunicadas com antecedência razoável através da plataforma.
            </>
          ) : (
            <>
              This Privacy Policy may be updated periodically to mirror enhancements in software features or changes in statutory data protection jurisprudence. Material revisions will be communicated through the platform interface.
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
                Esta Política de Privacidade foi especificamente concebida para a plataforma de software SaaS DineMaster Pro, contemplando o regime jurídico aplicável na Irlanda e em Portugal. O proprietário da plataforma deve confirmar todos os dados corporativos em Super Admin → Definições da Plataforma e submeter o documento a revisão formal por um profissional do foro jurídico qualificado antes da disponibilização pública final.
              </>
            ) : (
              <>
                This Privacy Policy is drafted specifically for the DineMaster Pro SaaS software architecture operating in Ireland and Portugal. The platform owner must verify all corporate identity fields under Super Admin → Platform Settings and seek formal review by qualified legal counsel in Ireland or Portugal prior to commercial deployment.
              </>
            )}
          </p>
        </div>
      </section>
    </PlatformLegalLayout>
  );
}
