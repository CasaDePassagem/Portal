import { motion } from 'framer-motion';
import { Hero } from '../../components/Hero';

export const HomePage = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <Hero />
        </motion.div>
    );
};
