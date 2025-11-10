import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

type ThemeSwitchProps = {
    className?: string;
    fixed?: boolean;
};

const Star = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
    <motion.div
        className="absolute w-0.5 h-0.5 bg-yellow-200 rounded-full"
        style={{ left: `${x}px`, top: `${y}px` }}
        animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
        }}
        transition={{
            duration: 2,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
        }}
    />
);

const Cloud = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
    <motion.div
        className="absolute"
        style={{ left: `${x}px`, top: `${y}px` }}
        animate={{
            x: [-1, 1, -1],
            scale: [0.9, 1.1, 0.9],
        }}
        transition={{
            duration: 4,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
        }}
    >
        <div className="w-2 h-1 bg-theme-inverted/30 rounded-full" />
        <div className="w-1 h-0.5 bg-theme-inverted/20 rounded-full -mt-0.5 ml-0.5" />
    </motion.div>
);

export const ThemeSwitch = ({ className = '', fixed = true }: ThemeSwitchProps) => {
    const { isDark, toggleTheme } = useTheme();

    const containerClass = fixed
        ? `fixed top-4 right-4 md:top-6 md:right-6 z-30 ${className}`
        : `inline-flex ${className}`;

    return (
        <div className={containerClass}>
            <motion.button
                onClick={toggleTheme}
                className="relative w-16 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300 overflow-hidden"
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                        : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                }}
                whileTap={{ scale: 0.95 }}
            >
                <motion.div
                    className="absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md"
                    animate={{
                        x: isDark ? 0 : 32,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                    }}
                >
                    <motion.div
                        animate={{ rotate: isDark ? 0 : 180 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isDark ? (
                            <Moon className="w-4 h-4 text-slate-700" />
                        ) : (
                            <Sun className="w-4 h-4 text-amber-500" />
                        )}
                    </motion.div>
                </motion.div>

                {isDark ? (
                    <>
                        <Star delay={0} x={8} y={8} />
                        <Star delay={0.5} x={20} y={12} />
                        <Star delay={1} x={32} y={6} />
                        <Star delay={1.5} x={44} y={15} />
                        <Star delay={0.8} x={52} y={10} />
                    </>
                ) : (
                    <>
                        <Cloud delay={0} x={38} y={8} />
                        <Cloud delay={1} x={50} y={12} />
                        <Cloud delay={0.5} x={42} y={18} />
                    </>
                )}
            </motion.button>
        </div>
    );
};
