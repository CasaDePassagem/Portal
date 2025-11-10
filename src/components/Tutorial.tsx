import { motion } from 'framer-motion';
import { Camera, FileText, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const photoTips = [
  "Use fundo neutro e bem iluminado",
  "Vista roupas profissionais apropriadas",
  "Mantenha postura ereta e sorriso discreto",
  "Evite acessórios chamativos",
  "Resolução mínima de 300x300 pixels"
];

const resumeTips = [
  "Seja objetivo: máximo 2 páginas",
  "Use verbos de ação (gerenciei, desenvolvi, implementei)",
  "Quantifique resultados sempre que possível",
  "Adapte o currículo para cada vaga",
  "Inclua palavras-chave da descrição da vaga"
];

const designTips = [
  "Use fontes legíveis e profissionais",
  "Mantenha hierarquia visual clara",
  "Use cores com moderação",
  "Deixe espaços em branco adequados",
  "Seja consistente com formatação"
];

const photoDonts = [
  "Selfies ou fotos casuais",
  "Óculos escuros ou bonés",
  "Fundos bagunçados ou coloridos",
  "Fotos em grupo cortadas",
  "Imagens pixeladas ou borradas"
];

const resumeDonts = [
  "Informações pessoais desnecessárias",
  "Erros de ortografia ou gramática",
  "Experiências muito antigas (>10 anos)",
  "Mentiras ou exageros",
  "Formato confuso ou desorganizado"
];

const GuidelineRow = ({ icon: Icon, title, tips, donts, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tips: string[];
  donts: string[];
  color: string;
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-theme bg-theme-surface">
    {/* bottom accent line emanating from center */}
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1" style={{ background: 'radial-gradient(80% 100% at 50% 100%, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0.0) 70%)' }} />

    <div className="grid md:grid-cols-[240px_1fr_1fr] gap-6 p-6 items-stretch">
      <div className="flex flex-col items-center justify-center gap-4 text-center h-full">
        <div className={`w-14 h-14 ${color} rounded-xl grid place-items-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-theme-primary">{title}</h3>
      </div>

      {/* Good practices */}
      <div>
        <div className="text-sm font-medium text-emerald-500 mb-3">Boas práticas</div>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
              <span className="text-theme-secondary leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Avoid */}
      <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/30">
        <div className="text-sm font-medium text-red-500 mb-3">O que evitar</div>
        <ul className="space-y-3">
          {donts.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <span className="text-red-600 dark:text-red-300 leading-relaxed">{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export const Tutorial = () => {
  const navigate = useNavigate();

  // Motion variants para animação suave por etapas
  const container = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.08 }
    }
  } as const;

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  } as const;

  return (
    <section className="py-20 bg-theme-base min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 pt-20"
        >
          <h1 className="text-5xl font-bold text-theme-primary mb-6">
            Dicas de Currículo
            <span className="block text-primary">para o Mercado</span>
          </h1>
          <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
            Melhore seu currículo com técnicas práticas e sugestões animadas que mostram o que importa para recrutadores.
          </p>
        </motion.div>

        {/* Seção com carregamento em etapas e entrada on-scroll */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="space-y-6 mb-16"
        >
          <motion.div variants={item}>
            <GuidelineRow
              icon={Camera}
              title="Foto Profissional"
              tips={photoTips}
              donts={photoDonts}
              color="bg-gradient-to-r from-blue-500 to-cyan-500"
            />
          </motion.div>

          <motion.div variants={item}>
            <GuidelineRow
              icon={FileText}
              title="Conteúdo do Currículo"
              tips={resumeTips}
              donts={resumeDonts}
              color="bg-gradient-to-r from-violet-500 to-purple-500"
            />
          </motion.div>

          <motion.div variants={item}>
            <GuidelineRow
              icon={Star}
              title="Design & Layout"
              tips={designTips}
              donts={[
                "Fontes muito decorativas",
                "Excesso de cores e elementos",
                "Falta de organização visual",
                "Informações sobrepostas",
              ]}
              color="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="rounded-3xl p-8 text-center text-white"
          style={{ background: `linear-gradient(to right, var(--color-primary), var(--color-secondary))` }}
        >
          <h3 className="text-2xl font-bold mb-4">Pronto para aplicar as dicas?</h3>
          <p className="text-white/90 mb-6 text-lg">Gere seu currículo com cores personalizadas e preview fiel antes de baixar.</p>
          <button
            onClick={() => navigate('/criar-cv')}
            className="bg-theme-inverted text-theme-base px-8 py-4 rounded-full font-semibold hover:bg-theme-inverted/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 cursor-pointer"
          >
            Criar meu Currículo
          </button>
        </motion.div>
      </div>
    </section>
  );
};
