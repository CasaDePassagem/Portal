import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { CustomPageDraft } from '../../lib/customNotebook';
import type { ParticipantCustomPage } from '../../lib/types';

type Props = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialPage?: ParticipantCustomPage | null;
  onClose: () => void;
  onCreate: (draft: CustomPageDraft) => Promise<void>;
  onUpdate: (id: string, draft: CustomPageDraft) => Promise<void>;
};

export function ParticipantPageModal({ isOpen, mode, initialPage, onClose, onCreate, onUpdate }: Props) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialPage) {
      setLabel(initialPage.label || '');
      setColor(initialPage.color || '#2563eb');
    } else {
      setLabel('');
      setColor('#2563eb');
    }
    setError(null);
  }, [isOpen, mode, initialPage]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Informe um título para a página.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CustomPageDraft = {
        label: trimmed,
        color: color.trim() || undefined,
      };
      if (mode === 'edit' && initialPage) {
        await onUpdate(initialPage.id, payload);
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a página.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="participant-page-modal"
          className="fixed inset-0 z-[65] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-theme-surface border border-theme rounded-2xl shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === 'edit' ? 'Editar página do fichário' : 'Nova página do fichário'}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex.: Informações pessoais"
                  maxLength={80}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Cor (opcional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color || '#2563eb'}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-10 w-16 border border-theme rounded-lg bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setColor('')}
                    className="px-3 py-2 text-xs rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors"
                  >
                    Remover cor
                  </button>
                </div>
                <p className="text-xs text-theme-secondary">Escolha uma cor de destaque ou deixe sem cor.</p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? (mode === 'edit' ? 'Salvando...' : 'Criando...') : mode === 'edit' ? 'Salvar alterações' : 'Criar página'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
