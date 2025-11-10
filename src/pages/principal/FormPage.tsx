import { motion } from 'framer-motion';
import { ResumeForm } from '../../components/ResumeForm';

export const FormPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <ResumeForm />
        </motion.div>
    );
};
