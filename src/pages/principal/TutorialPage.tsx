import { motion } from 'framer-motion';
import { Tutorial } from '../../components/Tutorial';

export const TutorialPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <Tutorial />
        </motion.div>
    );
};
