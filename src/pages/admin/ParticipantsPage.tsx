import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Copy,
  Check,
  RefreshCw,
  Clock,
  User,
  Pencil,
  Trash2,
  Plus,
  X,
  NotebookPen,
} from 'lucide-react';

import {
  getAllParticipants,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  type ParticipantProfileInput,
  type ParticipantProfilePatch,
} from '../../lib/progress';
import type { LearningProgress } from '../../lib/progress';
import { useAuth } from '../../hooks/useAuth';
import { SelectField } from '../../components/SelectField';
import { ParticipantNotebookModal } from '../../components/participants/ParticipantNotebookModal';

interface ParticipantSummary {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  careHouse?: string;
  totalLessons: number;
  completedLessons: number;
  totalWatchTime: number;
  lastActive: Date;
  progress: LearningProgress[];
}

type SortOption = 'name' | 'activity';

type FormMode = 'create' | 'edit';

type FormValues = {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
};

const emptyFormValues: FormValues = {
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
};

export function ParticipantsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('activity');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formValues, setFormValues] = useState<FormValues>(emptyFormValues);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [notebookParticipant, setNotebookParticipant] = useState<ParticipantSummary | null>(null);

  const loadParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const allParticipants = await getAllParticipants();
      setParticipants(allParticipants);
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };
  const openNotebook = (participant: ParticipantSummary) => {
    setNotebookParticipant(participant);
  };
  const closeNotebook = () => {
    setNotebookParticipant(null);
  };

  const filtered = useMemo(() => {
    let result = [...participants];

    const keyword = query.trim().toLowerCase();
    if (keyword) {
      result = result.filter((participant) => (
        `${participant.displayName} ${participant.id}`.toLowerCase().includes(keyword)
      ));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'activity':
        default:
          const timeA = new Date(a.lastActive).getTime();
          const timeB = new Date(b.lastActive).getTime();
          return timeB - timeA;
      }
    });

    return result;
  }, [participants, query, sortBy]);

  const formatWatchTime = (seconds: number) => {
    if (seconds <= 0) return '0 min';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  };

  const openCreateForm = () => {
    setFormValues(emptyFormValues);
    setFormMode('create');
    setSelectedCode(null);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (participant: ParticipantSummary) => {
    setFormValues({
      firstName: participant.firstName ?? '',
      lastName: participant.lastName ?? '',
      age: participant.age != null ? String(participant.age) : '',
      gender: participant.gender ?? '',
    });
    setFormMode('edit');
    setSelectedCode(participant.id);
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormLoading(false);
    setFormError('');
    setSelectedCode(null);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formValues.firstName.trim();
    if (!trimmedName) {
      setFormError('Nome é obrigatório.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const ageValue = formValues.age.trim();
    const ageNumber = ageValue.length === 0 ? undefined : Number(ageValue);
    if (ageValue.length > 0 && !Number.isFinite(ageNumber)) {
      setFormError('Informe uma idade válida.');
      setFormLoading(false);
      return;
    }

    const payload: ParticipantProfileInput = {
      firstName: trimmedName,
      lastName: formValues.lastName.trim() || undefined,
      age: ageNumber ?? undefined,
      gender: formValues.gender.trim() || undefined,
    };

    try {
      if (formMode === 'create') {
        await createParticipant(payload);
      } else if (selectedCode) {
        const patch: ParticipantProfilePatch = payload;
        await updateParticipant(selectedCode, patch);
      }
      await loadParticipants();
      closeForm();
    } catch (error) {
      console.error('Erro ao salvar participante:', error);
      setFormError('Não foi possível salvar as informações. Tente novamente.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm('Tem certeza que deseja remover este participante?');
    if (!confirmed) return;

    setDeletingCode(code);
    try {
      await deleteParticipant(code);
      await loadParticipants();
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      alert('Não foi possível remover o participante. Tente novamente.');
    } finally {
      setDeletingCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base text-theme-primary">
      <div className="max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-6">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciar Participantes</h1>
            <p className="text-theme-secondary">Visualize, cadastre e acompanhe os códigos de acesso.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por código ou nome..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto items-stretch sm:items-center justify-start sm:justify-end">
              <div className="relative w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="activity">Última atividade</option>
                  <option value="name">Nome A-Z</option>
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-theme-secondary">
                  {sortBy === 'activity' && <Clock size={14} />}
                  {sortBy === 'name' && <User size={14} />}
                </div>
              </div>

              <button
                onClick={() => loadParticipants()}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-theme bg-theme-surface text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>

              <button
                onClick={openCreateForm}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Novo participante
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Participantes ({filtered.length})</h2>
            <div className="text-sm text-theme-secondary">
              Ordenado por: {sortBy === 'name' ? 'Nome' : 'Atividade'}
            </div>
          </div>

          <AnimatePresence mode="sync">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-theme text-theme-secondary text-center py-12"
              >
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando participantes...
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-theme text-theme-secondary text-center py-12"
              >
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-lg">Nenhum participante encontrado</div>
                <div className="text-sm">Ajuste a busca ou cadastre um novo participante</div>
              </motion.div>
            ) : (
              <motion.div key="list" layout className="space-y-3">
                {filtered.map((participant) => {
                  const today = new Date();
                  const lastActiveDate = new Date(participant.lastActive);
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const lastActiveStart = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate());
                  const daysSinceActive = Math.floor((todayStart.getTime() - lastActiveStart.getTime()) / (1000 * 60 * 60 * 24));
                  const isRecentlyActive = daysSinceActive <= 7;
                  const fullName = [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim();

                  return (
                    <motion.div
                      key={participant.id}
                      layout
                      className="rounded-2xl border border-theme bg-theme-surface p-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="text-theme-primary" size={18} />
                            <h3 className="font-medium text-theme-primary truncate">
                              {fullName || participant.displayName}
                            </h3>
                          </div>
                          <div className="text-sm text-theme-secondary flex flex-wrap gap-4">
                            <span><strong>Código:</strong> {participant.id}</span>
                            {participant.age != null && (
                              <span><strong>Idade:</strong> {participant.age}</span>
                            )}
                            {participant.gender && (
                              <span><strong>Sexo:</strong> {participant.gender}</span>
                            )}
                          </div>

                          <div className="text-xs text-theme-secondary flex flex-wrap gap-4">
                            <span><strong>Aulas concluídas:</strong> {participant.completedLessons} / {participant.totalLessons}</span>
                            <span><strong>Tempo assistido:</strong> {formatWatchTime(participant.totalWatchTime)}</span>
                            <span className={isRecentlyActive ? 'text-green-600' : ''}>
                              <strong>Última atividade:</strong> {lastActiveDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center justify-start sm:justify-end">
                          <button
                            onClick={() => copyToClipboard(participant.id)}
                            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-theme text-sm flex items-center justify-center gap-2 hover:bg-theme-surface-hover transition-colors"
                          >
                            {copiedCode === participant.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {copiedCode === participant.id ? 'Copiado' : 'Copiar'}
                          </button>
                          <button
                            onClick={() => openEditForm(participant)}
                            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-theme text-sm flex items-center justify-center gap-2 hover:bg-theme-surface-hover transition-colors"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => openNotebook(participant)}
                            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-blue-500 text-sm flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 transition-colors"
                          >
                            <NotebookPen size={16} />
                            Ficha
                          </button>
                          <button
                            onClick={() => handleDelete(participant.id)}
                            disabled={!isAdmin || deletingCode === participant.id}
                            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-theme text-sm flex items-center justify-center gap-2 hover:bg-theme-surface-hover transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                            Remover
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            key="participant-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-theme-surface border border-theme rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {formMode === 'create' ? 'Novo participante' : 'Editar participante'}
                </h3>
                <button onClick={closeForm} className="text-theme-secondary hover:text-theme-primary">
                  <X size={20} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formValues.firstName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, firstName: event.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={80}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sobrenome</label>
                    <input
                      type="text"
                      value={formValues.lastName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, lastName: event.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Idade</label>
                    <input
                      type="number"
                      min={0}
                      value={formValues.age}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, age: event.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <SelectField
                    label="Sexo"
                    value={formValues.gender}
                    onChange={(newGender) => setFormValues((prev) => ({ ...prev, gender: newGender }))}
                    options={[
                      { label: 'Masculino', value: 'Masculino' },
                      { label: 'Feminino', value: 'Feminino' },
                    ]}
                    placeholder="Selecione o sexo"
                  />
                </div>

                {formError && (
                  <div className="text-sm text-red-500 bg-red-50 border border-red-200 p-2 rounded">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors"
                    disabled={formLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {formLoading ? 'Salvando...' : formMode === 'create' ? 'Cadastrar participante' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ParticipantNotebookModal
        isOpen={Boolean(notebookParticipant)}
        participant={
          notebookParticipant
            ? { code: notebookParticipant.id, displayName: notebookParticipant.displayName }
            : null
        }
        onClose={closeNotebook}
      />
    </div>
  );
}
