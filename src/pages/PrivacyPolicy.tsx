import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { Shield, Eye, Lock, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../data/appConfig';

export default function PrivacyPolicy() {
  const { slug } = useParams<{ slug?: string }>();
  const { settings } = useSettings(slug);
  const { language, t } = useLanguage();

  const isDark = settings?.theme === 'dark';
  const restaurantName = settings?.name || APP_CONFIG.appName;
  const email = settings?.email || APP_CONFIG.email;
  const address = settings?.address || APP_CONFIG.address;
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
            <Shield size={120} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Shield size={32} />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-bold transition-colors leading-tight",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {restaurantName}
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-widest text-amber-500">
                {settings?.region === 'ireland' ? 'GDPR / Irish Data Protection Act Compliant' : 'RGPD / GDPR Compliant'}
              </span>
            </div>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight mb-4">
            {t('common.privacy_policy')}
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
                  <FileText size={18} /> 1. Introdução e Enquadramento Legal
                </h2>
                <p>
                  A privacidade e segurança dos seus dados pessoais são fundamentais para o <strong>{restaurantName}</strong> (morada: {address}; contacto: {email}). Esta Política de Privacidade explica detalhadamente como recolhemos, utilizamos, processamos e protegemos os seus dados quando utiliza a nossa plataforma de reservas online, em total conformidade com o <strong>Regulamento Geral sobre a Proteção de Dados (RGPD) - Regulamento (UE) 2016/679</strong> do Parlamento Europeu e do Conselho, bem como com {settings?.region === 'ireland' ? 'a lei de proteção de dados aplicável na Irlanda (Data Protection Act 2018)' : 'a legislação nacional aplicável em Portugal (Lei n.º 58/2019)'}.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Eye size={18} /> 2. Dados que Recolhemos e Finalidade
                </h2>
                <p>
                  Ao realizar uma reserva de mesa ou registar-se na plataforma do <strong>{restaurantName}</strong>, recolhemos os seguintes dados estritamente necessários para a execução do serviço:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Nome Completo:</strong> Para identificação e personalização da reserva.</li>
                  <li><strong>Contacto Telefónico:</strong> Essencial para verificação da reserva através de códigos e comunicação rápida em caso de imprevistos ou alterações de turnos.</li>
                  <li><strong>Endereço de Correio Eletrónico (Email):</strong> Para envio de confirmações, bilhetes de reserva e atualizações de estado.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Lock size={18} /> 3. Segurança e Retenção de Dados
                </h2>
                <p>
                  O <strong>{restaurantName}</strong> implementa medidas técnicas e organizativas rigorosas para proteger os seus dados contra acesso não autorizado, perda ou alteração. Os dados das reservas são armazenados de forma segura e eliminados ou anonimizados após o cumprimento das finalidades legais e fiscais aplicáveis.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Shield size={18} /> 4. Os Seus Direitos
                </h2>
                <p>
                  Nos termos da legislação aplicável, tem direito a aceder, retificar, solicitar a portabilidade ou o apagamento dos seus dados pessoais tratados pelo <strong>{restaurantName}</strong>. Para exercer os seus direitos, contacte-nos através do email oficial: <a href={`mailto:${email}`} className="text-amber-500 underline">{email}</a>.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <FileText size={18} /> 1. Introduction & Legal Framework
                </h2>
                <p>
                  The privacy and security of your personal data are paramount to <strong>{restaurantName}</strong> (Address: {address}; Contact: {email}). This Privacy Policy details how we collect, use, process, and protect your information when you use our online reservation platform, in full compliance with the <strong>General Data Protection Regulation (GDPR) - Regulation (EU) 2016/679</strong> of the European Parliament and of the Council, as well as {settings?.region === 'ireland' ? 'applicable Irish data protection legislation (Data Protection Act 2018)' : 'applicable national legislation in Portugal'}.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Eye size={18} /> 2. Data We Collect & Purpose
                </h2>
                <p>
                  When making a table reservation or registering on <strong>{restaurantName}</strong>'s platform, we collect the following data strictly necessary for service execution:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Full Name:</strong> For identification and reservation personalization.</li>
                  <li><strong>Phone Number:</strong> Essential for reservation verification and rapid communication in case of changes or table availability updates.</li>
                  <li><strong>Email Address:</strong> For sending booking confirmations, digital tickets, and status updates.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Lock size={18} /> 3. Security & Data Retention
                </h2>
                <p>
                  <strong>{restaurantName}</strong> implements rigorous technical and organizational measures to safeguard your personal data against unauthorized access, loss, or alteration. Reservation records are securely stored and deleted or anonymized once statutory and tax retention periods have elapsed.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Shield size={18} /> 4. Your Rights
                </h2>
                <p>
                  Under applicable laws, you have the right to access, rectify, port, or request erasure of your personal data processed by <strong>{restaurantName}</strong>. To exercise your rights, please contact us at <a href={`mailto:${email}`} className="text-amber-500 underline">{email}</a>.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
