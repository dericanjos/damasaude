import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">Última atualização: 11 de abril de 2026</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card p-5 space-y-6 text-sm leading-relaxed text-muted-foreground">

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Quem somos</h2>
          <p>
            O DAMA Doc é um aplicativo de gestão operacional para médicos
            desenvolvido e operado pela DAMA Saúde, com sede em Recife, Pernambuco — Brasil.
            O aplicativo é destinado exclusivamente a profissionais médicos que desejam
            registrar e analisar a operação de suas agendas e consultórios.
          </p>
          <p className="mt-2">
            Esta Política descreve como coletamos, usamos, armazenamos e protegemos os
            dados pessoais dos usuários, em conformidade com a Lei Geral de Proteção de
            Dados (Lei nº 13.709/2018 — LGPD) e com as diretrizes da App Store da Apple.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Quais dados coletamos</h2>
          <p>O DAMA Doc coleta apenas os dados necessários para o funcionamento do serviço:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail, telefone, especialidade médica e nome do consultório.</li>
            <li><strong className="text-foreground">Dados de uso operacional:</strong> número de pacientes agendados, atendidos, faltas, cancelamentos, encaixes, horários de trabalho, ticket médio e metas de eficiência informadas pelo próprio médico.</li>
            <li><strong className="text-foreground">Dados técnicos:</strong> identificadores de sessão, registros de acesso (data, hora) e informações básicas do dispositivo, exclusivamente para fins de segurança e estabilidade.</li>
          </ul>
          <p className="mt-2">
            <strong className="text-foreground">Importante:</strong> o DAMA Doc não coleta dados pessoais de pacientes
            (nome, prontuário, diagnóstico, exames). Apenas números agregados da agenda do médico
            são processados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Para que usamos seus dados</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Operar o aplicativo e calcular indicadores de eficiência (Índice IDEA, receita estimada, ocupação).</li>
            <li>Gerar relatórios semanais e mensais personalizados para o médico usuário.</li>
            <li>Enviar notificações operacionais relevantes (lembretes de check-in, alertas de queda de eficiência).</li>
            <li>Garantir a segurança da conta e prevenir fraudes ou abusos.</li>
            <li>Atender a obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Base legal (LGPD)</h2>
          <p>O tratamento dos seus dados se baseia em:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-foreground">Execução de contrato</strong> (art. 7º, V da LGPD): para entregar o serviço contratado.</li>
            <li><strong className="text-foreground">Consentimento</strong> (art. 7º, I): para envio de comunicações opcionais.</li>
            <li><strong className="text-foreground">Legítimo interesse</strong> (art. 7º, IX): para segurança e melhoria contínua do produto.</li>
            <li><strong className="text-foreground">Cumprimento de obrigação legal</strong> (art. 7º, II): quando exigido por autoridade competente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Com quem compartilhamos</h2>
          <p>
            Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço técnicos
            essenciais ao funcionamento do app, todos contratualmente obrigados a manter o sigilo
            e a segurança das informações:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-foreground">Supabase Inc.</strong> — hospedagem do banco de dados e autenticação.</li>
            <li><strong className="text-foreground">Apple Inc.</strong> — distribuição do aplicativo via App Store e processamento de pagamentos in-app.</li>
            <li><strong className="text-foreground">Provedores de envio de e-mail e notificação</strong> — apenas para mensagens transacionais.</li>
          </ul>
          <p className="mt-2">Não compartilhamos seus dados com anunciantes, redes sociais ou terceiros para fins de marketing.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Segurança dos dados</h2>
          <p>Adotamos medidas técnicas e organizacionais adequadas:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Criptografia em trânsito (TLS 1.2+) e em repouso.</li>
            <li>Autenticação obrigatória e Row Level Security no banco de dados — cada médico só acessa os próprios dados.</li>
            <li>Senhas armazenadas com hash criptográfico irreversível.</li>
            <li>Verificação contra senhas vazadas em bases públicas (HIBP).</li>
            <li>Logs de auditoria de operações sensíveis.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Tempo de retenção</h2>
          <p>
            Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento da conta,
            os dados são mantidos por até 90 dias para fins de eventual recuperação pelo usuário,
            e então excluídos permanentemente, exceto registros que devam ser preservados por
            obrigação legal (ex.: dados fiscais por até 5 anos).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Seus direitos (LGPD art. 18)</h2>
          <p>Você tem direito a:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados.</li>
            <li>Acessar seus dados.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Solicitar a portabilidade dos dados.</li>
            <li>Revogar o consentimento.</li>
            <li>Solicitar a exclusão completa da sua conta (ver seção 9).</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer um desses direitos, envie um e-mail para{' '}
            <a href="mailto:contato@damasaude.com.br" className="text-primary underline">
              contato@damasaude.com.br
            </a>{' '}
            com o assunto "Direitos LGPD". Responderemos em até 15 dias úteis.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">9. Exclusão de conta</h2>
          <p>
            Você pode solicitar a exclusão completa da sua conta e de todos os dados associados
            a qualquer momento, sem necessidade de justificativa.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Como solicitar:</strong> envie um e-mail para{' '}
            <a href="mailto:contato@damasaude.com.br" className="text-primary underline">
              contato@damasaude.com.br
            </a>{' '}
            a partir do endereço cadastrado na sua conta, com o assunto{' '}
            <strong className="text-foreground">"Exclusão de conta — DAMA Doc"</strong>. A exclusão será processada em até
            7 dias úteis e você receberá uma confirmação por e-mail.
          </p>
          <p className="mt-2">
            Após a exclusão, todos os dados pessoais e de uso serão removidos permanentemente
            dos nossos servidores, exceto registros que devam ser preservados por obrigação legal.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">10. Crianças e adolescentes</h2>
          <p>
            O DAMA Doc é destinado exclusivamente a profissionais médicos maiores de 18 anos.
            Não coletamos intencionalmente dados de menores de idade.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">11. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. Mudanças significativas serão
            comunicadas previamente por e-mail e/ou notificação dentro do aplicativo. A data
            da última atualização está sempre indicada no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">12. Contato e DPO</h2>
          <p>
            Para dúvidas, solicitações ou reclamações relacionadas a esta Política ou ao
            tratamento dos seus dados, entre em contato com nosso Encarregado de Dados:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>E-mail: <a href="mailto:contato@damasaude.com.br" className="text-primary underline">contato@damasaude.com.br</a></li>
            <li>Empresa: DAMA Saúde</li>
            <li>Localização: Recife — PE, Brasil</li>
          </ul>
          <p className="mt-2">
            Você também pode apresentar reclamações à Autoridade Nacional de Proteção de
            Dados (ANPD) através do site{' '}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              gov.br/anpd
            </a>.
          </p>
        </section>

        <section className="border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground/70">
            Esta Política de Privacidade rege o uso do aplicativo DAMA Doc e foi elaborada em
            conformidade com a LGPD (Lei nº 13.709/2018) e as diretrizes da Apple App Store.
          </p>
        </section>
      </div>

      {/* Bottom spacing for nav */}
      <div className="h-16" />
    </div>
  );
}