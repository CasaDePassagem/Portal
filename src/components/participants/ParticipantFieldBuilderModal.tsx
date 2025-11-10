import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import type { CustomFieldDraft } from '../../lib/customNotebook';
import type { ParticipantCustomFieldType } from '../../lib/types';
import { DatePickerPortal } from '../shared/DatePickerPortal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: CustomFieldDraft) => Promise<void>;
  pageOptions: Array<{ id: string; label: string }>;
  defaultPageId?: string;
};

type NumberRange = {
  min?: number | null;
  max?: number | null;
};

type DateRange = {
  min?: Date | null;
  max?: Date | null;
};

const FIELD_OPTIONS: Array<{ value: ParticipantCustomFieldType; label: string; description: string }> = [
  { value: 'text', label: 'Texto curto', description: 'Ideal para rótulos, apelidos ou campos rápidos.' },
  { value: 'textarea', label: 'Texto longo', description: 'Para anotações detalhadas e observações extensas.' },
  { value: 'number', label: 'Número', description: 'Quantidades, medida de tempo ou pontuações.' },
  { value: 'cpf', label: 'CPF', description: 'Documento com 11 dígitos (somente números).' },
  { value: 'rg', label: 'RG', description: 'Documento de identidade (7 a 12 dígitos).' },
  { value: 'phone', label: 'Telefone', description: 'Telefone ou celular com DDD.' },
  { value: 'date', label: 'Data', description: 'Datas de eventos importantes ou cadastros.' },
  { value: 'email', label: 'E-mail', description: 'Endereços de e-mail válidos.' },
  { value: 'url', label: 'URL', description: 'Links de redes sociais ou sites úteis.' },
];

export function ParticipantFieldBuilderModal({ isOpen, onClose, onSubmit, pageOptions, defaultPageId }: Props) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ParticipantCustomFieldType>('text');
  const [description, setDescription] = useState('');
  const [maxLength, setMaxLength] = useState<number | ''>('');
  const [numberRange, setNumberRange] = useState<NumberRange>({});
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [selectedPageId, setSelectedPageId] = useState<string>('__general__');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => FIELD_OPTIONS.find((option) => option.value === type) ?? FIELD_OPTIONS[0],
    [type],
  );

  const resetState = () => {
    setLabel('');
    setType('text');
    setDescription('');
    setMaxLength('');
    setNumberRange({});
    setDateRange({});
    setSelectedPageId('__general__');
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const initial = defaultPageId ?? pageOptions[0]?.id ?? '__general__';
    setSelectedPageId(initial);
  }, [isOpen, pageOptions, defaultPageId]);

  const handleClose = () => {
    if (submitting) return;
    resetState();
    onClose();
  };

  const buildConstraints = (): CustomFieldDraft['constraints'] => {
    switch (type) {
      case 'text':
      case 'textarea': {
        const max = typeof maxLength === 'number' && Number.isFinite(maxLength) ? Math.max(1, maxLength) : undefined;
        return max ? { maxLength: max } : {};
      }
      case 'number': {
        const { min, max } = numberRange;
        const constraints: Record<string, number> = {};
        if (typeof min === 'number' && Number.isFinite(min)) constraints.min = min;
        if (typeof max === 'number' && Number.isFinite(max)) constraints.max = max;
        return constraints;
      }
      case 'cpf':
        return { pattern: '^\\d{11}$', mask: '000.000.000-00' };
      case 'rg':
        return { pattern: '^\\d{7,12}$', mask: '00.000.000-0' };
      case 'phone':
        return { pattern: '^\\d{10,11}$', mask: '(00) 00000-0000' };
      case 'date': {
        const constraints: Record<string, unknown> = { dateFormat: 'iso' };
        if (dateRange.min) constraints.min = dateRange.min.toISOString();
        if (dateRange.max) constraints.max = dateRange.max.toISOString();
        return constraints;
      }
      default:
        return {};
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Informe um título para o campo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        label: trimmed,
        type,
        description: description.trim() || undefined,
        constraints: buildConstraints(),
        pageId: selectedPageId === '__general__' ? null : selectedPageId,
        isRequired: false,
      });
      resetState();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o campo.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="field-builder"
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-theme-surface border border-theme rounded-2xl shadow-2xl p-6 space-y-6"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold">Novo campo personalizado</h3>
                <p className="text-sm text-theme-secondary mt-1">
                  Adicione registros específicos para complementar o fichário do participante.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título do campo *</label>
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex.: Nome da avó materna"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de informação *</label>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as ParticipantCustomFieldType)}
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FIELD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-theme bg-theme-base/50 p-4 space-y-3">
                <div className="text-sm text-theme-secondary">{selectedOption.description}</div>

                {(type === 'text' || type === 'textarea') && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <label className="text-sm font-medium">Limite de caracteres</label>
                    <input
                      type="number"
                      min={20}
                      max={500}
                      value={maxLength === '' ? '' : maxLength}
                      onChange={(event) => {
                        const value = event.target.value;
                        setMaxLength(value === '' ? '' : Number(value));
                      }}
                      className="w-full sm:w-48 px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex.: 200"
                    />
                  </div>
                )}

                {type === 'number' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor mínimo</label>
                      <input
                        type="number"
                        value={numberRange.min ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setNumberRange((prev) => ({ ...prev, min: value === '' ? null : Number(value) }));
                        }}
                        className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Sem limite"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor máximo</label>
                      <input
                        type="number"
                        value={numberRange.max ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setNumberRange((prev) => ({ ...prev, max: value === '' ? null : Number(value) }));
                        }}
                        className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Sem limite"
                      />
                    </div>
                  </div>
                )}

                {type === 'date' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data mínima</label>
                  <DatePicker
                    selected={dateRange.min ?? null}
                    onChange={(value) => setDateRange((prev) => ({ ...prev, min: value }))}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholderText="Sem limite"
                    popperContainer={DatePickerPortal}
                  />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data máxima</label>
                  <DatePicker
                    selected={dateRange.max ?? null}
                    onChange={(value) => setDateRange((prev) => ({ ...prev, max: value }))}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholderText="Sem limite"
                    popperContainer={DatePickerPortal}
                  />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Escreva uma orientação rápida para quem for preencher este campo."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Página do fichário *</label>
                <select
                  value={selectedPageId}
                  onChange={(event) => setSelectedPageId(event.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {pageOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
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
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Salvando...' : 'Adicionar campo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
