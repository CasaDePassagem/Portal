import { AnimatePresence, motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import type { ParticipantCustomField } from '../../lib/types';

type Props = {
  isOpen: boolean;
  fields: ParticipantCustomField[];
  onClose: () => void;
  onRestore: (id: string) => Promise<void>;
};

export function ArchivedFieldsPanel({ isOpen, fields, onClose, onRestore }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="archived-fields"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed left-0 right-0 bottom-0 z-[70] mx-auto max-w-3xl px-4 pb-6"
        >
          <div className="bg-theme-surface border border-theme rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              <div>
                <h3 className="text-sm font-semibold">Campos arquivados</h3>
                <p className="text-xs text-theme-secondary">Restaure qualquer item para devolvê-lo ao fichário.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-theme-secondary hover:text-theme-primary"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-theme/60">
              {fields.length === 0 ? (
                <div className="py-12 text-center text-theme-secondary text-sm">Nenhum campo arquivado no momento.</div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-xs text-theme-secondary uppercase tracking-wide">{field.type}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestore(field.id)}
                      className="px-3 py-1.5 rounded-lg border border-theme text-xs flex items-center gap-2 hover:bg-theme-surface-hover"
                    >
                      <Undo2 size={14} />
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
