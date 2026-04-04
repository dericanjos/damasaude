import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, TrendingUp, Target } from 'lucide-react';

const parceiraUrl = 'https://parceria.damasecretariadomedico.com.br';

export default function InstitucionalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(220,30%,7%)]">
      {/* Back */}
      <div className="sticky top-0 z-50 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao App
        </button>
      </div>

      <div className="mx-auto max-w-lg px-6 pb-16">
        {/* ── ABERTURA — storytelling ── */}
        {/* ── ABERTURA — storytelling ── */}
        <section className="pt-8 pb-10 space-y-6 text-center">
          {[
            'Você passou anos estudando pra salvar vidas.',
            'Mas ninguém te ensinou a lotar sua agenda.',
            'Ninguém te ensinou a parar de perder pacientes.',
            'Ninguém te ensinou que seu consultório é um negócio — e que sem uma operação comercial, ele perde receita todos os dias sem que você perceba.',
          ].map((line, i) => (
            <p
              key={i}
              className="text-[15px] leading-relaxed text-white/80 font-light tracking-wide"
            >
              {line}
            </p>
          ))}

          <div className="h-px w-12 mx-auto bg-white/10" />

          {[
            'Enquanto você está em consulta, pacientes ligam e ninguém atende direito.',
            'Leads chegam e ninguém converte.',
            'Sua agenda tem buracos que custam milhares por mês.',
          ].map((line, i) => (
            <p
              key={i}
              className="text-[15px] leading-relaxed text-white/60 font-light"
            >
              {line}
            </p>
          ))}

          <div className="h-px w-12 mx-auto bg-white/10" />

          <p className="text-[15px] leading-relaxed text-white/80 font-medium">
            Você sabe disso. O DAMA Saúde acabou de te mostrar os números.
          </p>
          <p className="text-base text-white font-semibold pt-2">
            A pergunta é: você vai continuar resolvendo isso sozinho?
          </p>
        </section>

        {/* ── TRANSIÇÃO ── */}
        <section className="py-8 text-center">
          <p className="text-lg font-bold text-[#D4AF37] leading-snug tracking-tight">
            A DAMA existe pra que você nunca mais precise se preocupar com isso.
          </p>
        </section>

        {/* ── 3 PILARES ── */}
        <section className="space-y-4 pb-10">
          {[
            {
              icon: Phone,
              title: 'Secretariado Estratégico',
              text: 'Seu paciente é atendido com excelência antes mesmo de te conhecer.',
            },
            {
              icon: TrendingUp,
              title: 'Time Comercial Humanizado',
              text: 'Cada lead vira uma oportunidade real. Cada oportunidade vira consulta.',
            },
            {
              icon: Target,
              title: 'Growth e Marketing 360',
              text: 'Sua clínica na frente de quem precisa de você. Todos os dias.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl bg-white/[0.05] border border-white/10 p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                  <Icon className="h-[18px] w-[18px] text-[#D4AF37]" />
                </div>
                <p className="text-sm font-bold text-[#D4AF37]">{title}</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed pl-12">
                {text}
              </p>
            </div>
          ))}
        </section>

        {/* ── PROVA SOCIAL ── */}
        <section className="grid grid-cols-3 gap-3 pb-10">
          {[
            { value: '+25.000', label: 'Consultas Agendadas' },
            { value: '+90', label: 'Médicos Parceiros' },
            { value: '16+', label: 'Estados Atendidos' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-white/50">{label}</p>
            </div>
          ))}
        </section>

        {/* ── FECHAMENTO + CTA ── */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center">
          <p className="text-[15px] text-white/80 font-medium leading-relaxed mb-6">
            Você cuida do paciente.
            <br />
            A gente cuida do seu crescimento.
          </p>

          <a
            href={parceiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[hsl(220,30%,7%)] font-bold text-sm h-14 shadow-lg transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            Quero aplicar para a parceria →
          </a>

          <p className="text-[11px] text-white/40 mt-4 leading-relaxed">
            Vagas limitadas. Atendemos apenas médicos com perfil alinhado à nossa metodologia.
          </p>
        </section>
      </div>
    </div>
  );
}
