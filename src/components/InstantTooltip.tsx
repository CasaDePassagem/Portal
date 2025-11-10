import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface InstantTooltipProps {
    children: ReactNode;
    tooltip: string;
    position?: 'right' | 'left' | 'top' | 'bottom';
    delay?: number;
}

export default function InstantTooltip({
    children,
    tooltip,
    position = 'right',
    delay = 0
}: InstantTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        right: 'left-full ml-2 top-1/2 -translate-y-1/2',
        left: 'right-full mr-2 top-1/2 -translate-y-1/2',
        top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-2 left-1/2 -translate-x-1/2'
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: position === 'right' ? -5 : 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: position === 'right' ? -5 : 0 }}
                        transition={{
                            duration: 0.2,
                            delay: delay / 1000,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
                    >
                        {/* Balãozinho com seta integrada */}
                        <div className="relative">
                            {/* Sombra do balão */}
                            <div className="absolute inset-0 bg-black/20 rounded-xl translate-x-0.5 translate-y-0.5 blur-sm" />

                            {/* Balão principal */}
                            <div className="relative bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-lg">
                                {tooltip}

                                {/* Seta do balão usando pseudo-elementos via SVG */}
                                {position === 'right' && (
                                    <div className="absolute right-full top-1/2 -translate-y-1/2">
                                        <svg width="6" height="12" viewBox="0 0 6 12" className="text-gray-900 dark:text-gray-100">
                                            <path d="M0 0L6 6L0 12Z" fill="currentColor" />
                                        </svg>
                                    </div>
                                )}

                                {position === 'left' && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2">
                                        <svg width="6" height="12" viewBox="0 0 6 12" className="text-gray-900 dark:text-gray-100">
                                            <path d="M6 0L0 6L6 12Z" fill="currentColor" />
                                        </svg>
                                    </div>
                                )}

                                {position === 'top' && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2">
                                        <svg width="12" height="6" viewBox="0 0 12 6" className="text-gray-900 dark:text-gray-100">
                                            <path d="M0 0L6 6L12 0Z" fill="currentColor" />
                                        </svg>
                                    </div>
                                )}

                                {position === 'bottom' && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2">
                                        <svg width="12" height="6" viewBox="0 0 12 6" className="text-gray-900 dark:text-gray-100">
                                            <path d="M0 6L6 0L12 6Z" fill="currentColor" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}