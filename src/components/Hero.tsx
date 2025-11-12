import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Hero = () => {
    const navigate = useNavigate();

    return (
        <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-theme-base">

            <motion.div
                className="absolute top-20 left-20 w-64 h-64 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 dark:opacity-10"
                style={{ background: 'var(--color-primary)' }}
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            <motion.div
                className="absolute bottom-20 right-20 w-80 h-80 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 dark:opacity-10"
                style={{ background: 'var(--color-accent)' }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [360, 180, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-16 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8"
                >

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-theme-primary mb-6 leading-tight">
                        Aprenda, pratique e descubra
                        <br />
                        <span className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                            novas áreas do digital
                            <motion.div
                                className="absolute -bottom-2 left-0 right-0 h-1 rounded-full hidden sm:block"
                                style={{ background: `linear-gradient(to right, var(--color-primary), var(--color-accent))` }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 1, duration: 0.8 }}
                            />
                        </span>
                    </h1>

                    <p className="text-lg lg:text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                        Conteúdos curtos, diretos e sempre atualizados para quem quer dar os primeiros passos no computador e explorar temas atuais — incluindo dicas práticas para um currículo mais forte.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                >
                    <button
                        onClick={() => navigate('/criar-cv')}
                        className="group relative px-6 py-3 btn-primary rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Criar meu Currículo
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <button
                        onClick={() => navigate('/tutorial')}
                        className="px-6 py-3 bg-theme-surface/90 text-theme-secondary rounded-full font-semibold border border-theme backdrop-blur-sm hover:bg-theme-surface transition-all duration-300"
                    >
                        Dicas de Currículo
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                >
                    {[
                        {
                            icon: Target,
                            title: "Fundamentos úteis",
                            description: "Uso básico de PC e internet"
                        },
                        {
                            icon: Sparkles,
                            title: "Recursos acessíveis",
                            description: "Conteúdo leve e fácil de seguir"
                        },
                        {
                            icon: Users,
                            title: "Dicas de Currículo",
                            description: "O que recrutadores valorizam"
                        }
                    ].map((item, index) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                            className="p-6 bg-theme-surface/70 rounded-2xl backdrop-blur-sm border border-theme hover:bg-theme-surface/90 transition-all duration-300"
                        >
                            <item.icon className="w-8 h-8 mb-4 mx-auto" style={{ color: 'var(--color-primary)' }} />
                            <h3 className="text-lg font-semibold text-theme-primary mb-2">
                                {item.title}
                            </h3>
                            <p className="text-theme-secondary">
                                {item.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
