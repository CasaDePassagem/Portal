import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface RealtimeIndicatorProps {
    lastUpdate?: Date;
}

export function RealtimeIndicator({ lastUpdate }: RealtimeIndicatorProps) {
    const [showUpdate, setShowUpdate] = useState(false);

    useEffect(() => {
        if (lastUpdate) {
            setShowUpdate(true);
            const timer = setTimeout(() => setShowUpdate(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastUpdate]);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Indicador de atualização */}
            <AnimatePresence>
                {showUpdate && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm shadow-lg"
                    >
                        <motion.div
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        >
                            <RefreshCw size={14} />
                        </motion.div>
                        Conteúdo atualizado
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
