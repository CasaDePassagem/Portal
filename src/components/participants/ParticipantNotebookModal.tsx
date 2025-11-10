import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  GripVertical,
  LayoutGrid,
  Loader2,
  NotebookPen,
  Plus,
  Save,
  X,
} from 'lucide-react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
  type DraggableProvided,
  type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import DatePicker from 'react-datepicker';
import {
  archiveNotebookField,
  createNotebookField,
  createNotebookPage,
  deleteNotebookEntry,
  listenNotebookEntries,
  listenNotebookFields,
  listenNotebookPages,
  reorderNotebookFields,
  reorderNotebookPages,
  restoreNotebookField,
  saveNotebookEntry,
  updateNotebookField,
  updateNotebookPage,
} from '../../lib/customNotebook';
import { listenAllUsers } from '../../lib/users';
import type { ParticipantCustomField, ParticipantCustomPage, ParticipantCustomValue } from '../../lib/types';
import { ParticipantFieldBuilderModal } from './ParticipantFieldBuilderModal';
import { ParticipantPageModal } from './ParticipantPageModal';
import { ArchivedFieldsPanel } from './ArchivedFieldsPanel';
import { DatePickerPortal } from '../shared/DatePickerPortal';

type ValueState = {
  id?: string;
  value: string;
  draft: string;
  dirty: boolean;
  saving: boolean;
  error?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    code: string;
    displayName: string;
  } | null;
};

const DEFAULT_PAGE_ID = '__general__';

function formatDateTime(date?: Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeDateInput(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const normalized = trimmed.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return null;
}

function validateValue(field: ParticipantCustomField, value: string) {
  const trimmed = value.trim();
  if (field.isRequired && trimmed.length === 0) {
    return 'Este campo é obrigatório.';
  }
  if (trimmed.length === 0) return null;

  const constraints = field.constraints ?? {};

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const maxLength = typeof constraints.maxLength === 'number' ? constraints.maxLength : undefined;
      if (maxLength && trimmed.length > maxLength) {
        return `Limite de ${maxLength} caracteres excedido.`;
      }
      return null;
    }
    case 'number': {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return 'Informe um número válido.';
      const min = typeof constraints.min === 'number' ? constraints.min : undefined;
      const max = typeof constraints.max === 'number' ? constraints.max : undefined;
      if (min !== undefined && numeric < min) return `Valor mínimo permitido: ${min}.`;
      if (max !== undefined && numeric > max) return `Valor máximo permitido: ${max}.`;
      return null;
    }
    case 'cpf': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length !== 11) return 'Informe um CPF com 11 dígitos.';
      return null;
    }
    case 'rg': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length < 7 || digits.length > 12) return 'Informe um RG válido.';
      return null;
    }
    case 'phone': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length < 10 || digits.length > 11) return 'Informe um telefone com DDD.';
      return null;
    }
    case 'email': {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(trimmed) ? null : 'Informe um e-mail válido.';
    }
    case 'url': {
      try {
        const url = new URL(trimmed);
        if (!url.protocol.startsWith('http')) return 'Use http ou https.';
        return null;
      } catch {
        return 'Informe uma URL válida.';
      }
    }
    case 'date': {
      const parsed = parseDateValue(trimmed);
      if (!parsed) return 'Informe uma data válida.';
      const min = constraints.min ? new Date(String(constraints.min)) : null;
      const max = constraints.max ? new Date(String(constraints.max)) : null;
      if (min && parsed < min) return `Data mínima: ${formatDateTime(min).split(' ')[0]}.`;
      if (max && parsed > max) return `Data máxima: ${formatDateTime(max).split(' ')[0]}.`;
      return null;
    }
    default:
      return null;
  }
}

function normalizeForStorage(field: ParticipantCustomField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  switch (field.type) {
    case 'cpf':
    case 'rg':
    case 'phone':
      return sanitizeDigits(trimmed);
    case 'number': {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? String(numeric) : trimmed;
    }
    default:
      return trimmed;
  }
}

function formatCpf(raw: string) {
  const digits = sanitizeDigits(raw);
  if (digits.length !== 11) return raw;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(raw: string) {
  const digits = sanitizeDigits(raw);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function formatRg(raw: string) {
  const digits = sanitizeDigits(raw);
  if (digits.length < 7 || digits.length > 12) return raw;
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
  }
  return raw;
}

function formatDisplayValue(field: ParticipantCustomField, raw: string) {
  const value = raw?.trim();
  if (!value) return '';
  switch (field.type) {
    case 'date': {
      const parsed = parseDateValue(value);
      if (!parsed) return value;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(parsed);
    }
    case 'number': {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toLocaleString('pt-BR') : value;
    }
    case 'cpf':
      return formatCpf(value);
    case 'phone':
      return formatPhone(value);
    case 'rg':
      return formatRg(value);
    default:
      return value;
  }
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ParticipantNotebookModal({ isOpen, onClose, participant }: Props) {
  const [pages, setPages] = useState<ParticipantCustomPage[]>([]);
  const [fields, setFields] = useState<ParticipantCustomField[]>([]);
  const [entries, setEntries] = useState<ParticipantCustomValue[]>([]);
  const [valueState, setValueState] = useState<Record<string, ValueState>>({});
  const [initializing, setInitializing] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isArchivedPanelOpen, setIsArchivedPanelOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isFieldOrdering, setIsFieldOrdering] = useState(false);
  const [fieldOrderingItems, setFieldOrderingItems] = useState<ParticipantCustomField[]>([]);
  const [fieldOrderingLoading, setFieldOrderingLoading] = useState(false);
  const [isPageOrdering, setIsPageOrdering] = useState(false);
  const [pageOrderingItems, setPageOrderingItems] = useState<ParticipantCustomPage[]>([]);
  const [pageOrderingLoading, setPageOrderingLoading] = useState(false);
  const [activePageId, setActivePageId] = useState<string>(DEFAULT_PAGE_ID);
  const [userDirectory, setUserDirectory] = useState<Record<string, string>>({});
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({});
  const [pageModalMode, setPageModalMode] = useState<'create' | 'edit'>('create');
  const [pageEditing, setPageEditing] = useState<ParticipantCustomPage | null>(null);

  const activePages = useMemo(
    () =>
      pages
        .filter((page) => !page.isArchived)
        .slice()
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    [pages],
  );

  const activeFields = useMemo(
    () =>
      fields
        .filter((field) => !field.isArchived)
        .slice()
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    [fields],
  );

  const archivedFields = useMemo(
    () =>
      fields
        .filter((field) => field.isArchived)
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label)),
    [fields],
  );

  const hasArchivedFields = archivedFields.length > 0;

  const activePageNormalized = activePageId === DEFAULT_PAGE_ID ? null : activePageId;

  const visibleFields = useMemo(
    () => {
      const normalizedActivePage = (activePageNormalized ?? '').trim() || null;
      return activeFields.filter((field) => {
        const normalizedFieldPage = (field.pageId ?? '').trim() || null;
        return normalizedFieldPage === normalizedActivePage;
      });
    },
    [activeFields, activePageNormalized],
  );

  const displayFields = isFieldOrdering ? fieldOrderingItems : visibleFields;
  const displayPages = isPageOrdering ? pageOrderingItems : activePages;

  useEffect(() => {
    if (!isOpen || !participant) return;
    setInitializing(true);
    const stopPages = listenNotebookPages((nextPages) => {
      setPages(nextPages);
      setInitializing(false);
    });
    const stopFields = listenNotebookFields((nextFields) => {
      setFields(nextFields);
      setInitializing(false);
    });
    const stopValues = listenNotebookEntries(participant.code, (nextValues) => {
      setEntries(nextValues);
    });
    return () => {
      stopPages();
      stopFields();
      stopValues();
      setPages([]);
      setFields([]);
      setEntries([]);
      setValueState({});
      setIsFieldOrdering(false);
      setFieldOrderingItems([]);
      setFieldOrderingLoading(false);
      setIsPageOrdering(false);
      setPageOrderingItems([]);
      setPageOrderingLoading(false);
      setGlobalError(null);
      setActivePageId(DEFAULT_PAGE_ID);
      setIsFieldModalOpen(false);
      setIsPageModalOpen(false);
      setIsArchivedPanelOpen(false);
      setEditingMap({});
      setPageModalMode('create');
      setPageEditing(null);
    };
  }, [isOpen, participant]);

  useEffect(() => {
    const unsubscribe = listenAllUsers((records) => {
      const directory: Record<string, string> = {};
      records.forEach((user) => {
        directory[user.uid] = user.fullName || user.email || user.uid;
      });
      setUserDirectory(directory);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const normalized = activePageNormalized;
    if (normalized && !activePages.some((page) => page.id === normalized)) {
      const fallback = activePages[0]?.id ?? DEFAULT_PAGE_ID;
      setActivePageId(fallback);
    }
  }, [activePages, activePageNormalized, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setValueState((prev) => {
      const next: Record<string, ValueState> = {};
      activeFields.forEach((field) => {
        const entry = entries.find((item) => item.fieldId === field.id) ?? null;
        const baseValue = entry?.value ?? '';
        const previous = prev[field.id];
        const draft = previous?.dirty ? previous.draft : baseValue;
        next[field.id] = {
          id: entry?.id,
          value: baseValue,
          draft,
          dirty: draft !== baseValue,
          saving: previous?.saving ? entry?.value !== previous.draft : false,
          error: previous?.dirty ? previous.error : null,
          metadata: entry?.metadata ?? previous?.metadata ?? {},
          createdAt: entry?.createdAt ?? previous?.createdAt,
          updatedAt: entry?.updatedAt ?? previous?.updatedAt,
          createdBy: entry?.createdBy ?? previous?.createdBy,
          updatedBy: entry?.updatedBy ?? previous?.updatedBy,
        };
      });
      return next;
    });
  }, [activeFields, entries, isOpen]);

  useEffect(() => {
    if (isFieldOrdering) {
      setFieldOrderingItems(visibleFields);
    }
  }, [isFieldOrdering, visibleFields]);

  useEffect(() => {
    if (isPageOrdering) {
      setPageOrderingItems(activePages);
    }
  }, [isPageOrdering, activePages]);

  useEffect(() => {
    if (!isOpen) return;
    setEditingMap((prev) => {
      const allowed = new Set(visibleFields.map((field) => field.id));
      let changed = false;
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((id) => {
        if (allowed.has(id)) {
          next[id] = true;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleFields, isOpen]);

  const resolveActorName = (identifier?: string | null) => {
    if (!identifier) return null;
    return userDirectory[identifier] ?? identifier;
  };

  const handleDraftChange = (fieldId: string, draftValue: string) => {
    setValueState((prev) => {
      const current = prev[fieldId];
      if (!current) return prev;
      const nextDraft = draftValue;
      return {
        ...prev,
        [fieldId]: {
          ...current,
          draft: nextDraft,
          dirty: nextDraft !== current.value,
          error: null,
        },
      };
    });
  };

  const handleDateChange = (fieldId: string, value: Date | null) => {
    const serialized = normalizeDateInput(value);
    handleDraftChange(fieldId, serialized);
  };

  const handleSaveValue = async (field: ParticipantCustomField) => {
    const current = valueState[field.id];
    if (!current) return;
    const errorMessage = validateValue(field, current.draft);
    if (errorMessage) {
      setValueState((prev) => ({
        ...prev,
        [field.id]: { ...current, error: errorMessage },
      }));
      return;
    }

    const normalized = normalizeForStorage(field, current.draft);
    setValueState((prev) => ({
      ...prev,
      [field.id]: { ...current, saving: true, error: null },
    }));
    try {
      await saveNotebookEntry(participant!.code, field.id, {
        id: current.id,
        value: normalized,
        metadata: current.metadata ?? {},
      });
      setEditingMap((prev) => {
        if (!prev[field.id]) return prev;
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar.';
      setValueState((prev) => ({
        ...prev,
        [field.id]: { ...current, saving: false, error: message },
      }));
    }
  };

  const handleStartEdit = (fieldId: string) => {
    if (isFieldOrdering) return;
    setEditingMap((prev) => ({ ...prev, [fieldId]: true }));
    setValueState((prev) => {
      const current = prev[fieldId];
      if (!current) return prev;
      return {
        ...prev,
        [fieldId]: { ...current, draft: current.value, dirty: false, error: null },
      };
    });
  };

  const handleCancelEdit = (fieldId: string) => {
    setEditingMap((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setValueState((prev) => {
      const current = prev[fieldId];
      if (!current) return prev;
      return {
        ...prev,
        [fieldId]: { ...current, draft: current.value, dirty: false, error: null },
      };
    });
  };

  const handleClearDraft = (fieldId: string) => {
    handleDraftChange(fieldId, '');
  };

  const handleDeleteValue = async (fieldId: string) => {
    const current = valueState[fieldId];
    if (!current?.id) {
      handleDraftChange(fieldId, '');
      return;
    }
    handleDraftChange(fieldId, '');
    try {
      await deleteNotebookEntry(current.id);
      setEditingMap((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover.';
      setValueState((prev) => ({
        ...prev,
        [fieldId]: { ...current, error: message },
      }));
    }
  };

  const handleToggleFieldOrdering = () => {
    setGlobalError(null);
    setIsFieldOrdering((prev) => {
      if (prev) {
        setFieldOrderingItems([]);
        setFieldOrderingLoading(false);
        return false;
      }
      setEditingMap({});
      setFieldOrderingItems(visibleFields);
      return true;
    });
  };

  const handleCancelFieldOrdering = () => {
    setFieldOrderingItems([]);
    setFieldOrderingLoading(false);
    setIsFieldOrdering(false);
  };

  const handleFieldDragEnd = (result: DropResult) => {
    if (!isFieldOrdering) return;
    const destination = result.destination;
    if (!destination) return;
    setFieldOrderingItems((prev) => reorderList(prev, result.source.index, destination.index));
  };

  const handleSaveFieldOrdering = async () => {
    if (!isFieldOrdering) return;
    setFieldOrderingLoading(true);
    try {
      const ordered = fieldOrderingItems.map((field) => field.id);
      const normalizedPageId = (activePageNormalized ?? '').trim() || null;
      await reorderNotebookFields(normalizedPageId, ordered);
      handleCancelFieldOrdering();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao reorganizar campos.';
      setGlobalError(message);
    } finally {
      setFieldOrderingLoading(false);
    }
  };

  const handleTogglePageOrdering = () => {
    setGlobalError(null);
    setIsPageOrdering((prev) => {
      if (prev) {
        setPageOrderingItems([]);
        setPageOrderingLoading(false);
        return false;
      }
      setPageOrderingItems(activePages);
      return true;
    });
  };

  const handleCancelPageOrdering = () => {
    setPageOrderingItems([]);
    setPageOrderingLoading(false);
    setIsPageOrdering(false);
  };

  const handlePageDragEnd = (result: DropResult) => {
    if (!isPageOrdering) return;
    const destination = result.destination;
    if (!destination) return;
    setPageOrderingItems((prev) => reorderList(prev, result.source.index, destination.index));
  };

  const handleSavePageOrdering = async () => {
    if (!isPageOrdering) return;
    setPageOrderingLoading(true);
    try {
      await reorderNotebookPages(pageOrderingItems.map((page) => page.id));
      handleCancelPageOrdering();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao reorganizar páginas.';
      setGlobalError(message);
    } finally {
      setPageOrderingLoading(false);
    }
  };

  const handleCreateField = async (draft: Parameters<typeof createNotebookField>[0]) => {
    setGlobalError(null);
    await createNotebookField(draft);
  };

  const handleChangeFieldPage = async (fieldId: string, pageValue: string) => {
    try {
      const pageId = pageValue === DEFAULT_PAGE_ID ? null : pageValue;
      const current = fields.find((field) => field.id === fieldId);
      if (!current) return;

      const normalizedCurrentPage = (current.pageId ?? '').trim() || null;
      const normalizedNewPage = (pageId ?? '').trim() || null;

      if (normalizedCurrentPage === normalizedNewPage) return;

      const siblings = fields
        .filter((field) => {
          if (field.isArchived || field.id === fieldId) return false;
          const fieldPage = (field.pageId ?? '').trim() || null;
          return fieldPage === normalizedNewPage;
        })
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
      const nextOrder = siblings.length;

      await updateNotebookField(fieldId, { pageId, order: nextOrder });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível mover o campo de página.';
      setGlobalError(message);
    }
  };

  const handleArchiveFieldClick = async (fieldId: string) => {
    try {
      await archiveNotebookField(fieldId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível arquivar o campo.';
      setGlobalError(message);
    }
  };

  const handleRestoreField = async (fieldId: string) => {
    try {
      await restoreNotebookField(fieldId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível restaurar o campo.';
      setGlobalError(message);
    }
  };

  const handleCreatePage = async (draft: Parameters<typeof createNotebookPage>[0]) => {
    setGlobalError(null);
    try {
      const page = await createNotebookPage(draft);
      setActivePageId(page.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a página.';
      setGlobalError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleUpdatePage = async (pageId: string, draft: Parameters<typeof createNotebookPage>[0]) => {
    setGlobalError(null);
    try {
      await updateNotebookPage(pageId, draft);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a página.';
      setGlobalError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleSelectPage = (pageId: string) => {
    if (isPageOrdering) return;
    setActivePageId(pageId);
  };

  const handleOpenCreatePage = () => {
    setPageModalMode('create');
    setPageEditing(null);
    setIsPageModalOpen(true);
  };

  const handleOpenEditPage = () => {
    if (!activePageNormalized) return;
    const page = activePages.find((item) => item.id === activePageNormalized);
    if (!page) return;
    setPageModalMode('edit');
    setPageEditing(page);
    setIsPageModalOpen(true);
  };

  const handleClosePageModal = () => {
    setIsPageModalOpen(false);
    setPageModalMode('create');
    setPageEditing(null);
  };

  const activeDisplayedPage = activePageNormalized
    ? activePages.find((page) => page.id === activePageNormalized) ?? null
    : null;

  const pageOptions = useMemo(
    () => [
      { id: DEFAULT_PAGE_ID, label: 'Geral' },
      ...activePages.map((page) => ({ id: page.id, label: page.label })),
    ],
    [activePages],
  );

  const renderFieldCard = (
    field: ParticipantCustomField,
    {
      innerRef,
      dragProps,
      dragHandleProps,
      style,
      isDragging,
    }: {
      innerRef?: (element: HTMLDivElement | null) => void;
      dragProps?: DraggableProvided['draggableProps'];
      dragHandleProps?: DraggableProvidedDragHandleProps | null;
      style?: CSSProperties;
      isDragging?: boolean;
    },
  ) => {
    const state = valueState[field.id];
    const draft = state?.draft ?? '';
    const error = state?.error ?? null;
    const isDirty = Boolean(state?.dirty);
    const isSaving = Boolean(state?.saving);
    const baseValue = state?.value ?? '';
    const updatedAt = state?.updatedAt;
    const updatedBy = resolveActorName(state?.updatedBy);
    const createdAt = field.createdAt;
    const isEditing = Boolean(editingMap[field.id]);
    const formattedValue = formatDisplayValue(field, baseValue);
    const hasValue = baseValue.trim().length > 0;
    const safeUrl =
      field.type === 'url'
        ? (/^https?:\/\//i.test(baseValue) ? baseValue : `https://${baseValue}`)
        : null;
    const valueView = hasValue
      ? field.type === 'url'
        ? (
          <a
            href={safeUrl ?? baseValue}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-surface text-sm text-blue-500 hover:underline'
          >
            {formattedValue}
          </a>
        )
        : field.type === 'email'
          ? (
            <a
              href={`mailto:${baseValue}`}
              className='inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-surface text-sm text-blue-500 hover:underline'
            >
              {formattedValue}
            </a>
          )
          : (
            <div
              className={`rounded-xl bg-theme-surface px-3 py-2 text-sm leading-relaxed text-theme-primary min-h-[3.25rem] ${field.type === 'textarea' ? 'whitespace-pre-wrap' : 'break-words'
                }`}
            >
              {field.type === 'textarea' ? baseValue : formattedValue}
            </div>
          )
      : (
        <div className='rounded-xl border border-dashed border-theme px-3 py-2 text-xs text-theme-secondary bg-theme-base/40 min-h-[3.25rem] flex items-center'>
          Nenhum dado registrado ainda.
        </div>
      );

    const combinedStyle: CSSProperties | undefined = {
      ...(dragProps?.style as CSSProperties | undefined),
      ...(style ?? {}),
    };
    const rootProps = dragProps ? { ...dragProps, style: combinedStyle } : combinedStyle ? { style: combinedStyle } : {};

    if (isFieldOrdering) {
      return (
        <div
          ref={innerRef}
          {...rootProps}
          className={`w-full border border-dashed border-theme rounded-xl px-4 py-3 bg-theme-base flex items-center justify-between text-sm ${isDragging ? 'shadow-md border-blue-400' : ''
            }`}
        >
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-theme-primary truncate'>{field.label}</span>
            {field.description && (
              <span className='text-xs text-theme-secondary truncate'>{field.description}</span>
            )}
          </div>
          <span
            className='px-2 py-1 rounded-lg border border-theme text-xs text-theme-secondary cursor-grab active:cursor-grabbing flex items-center gap-1.5'
            {...(dragHandleProps ?? {})}
          >
            <GripVertical className='w-3.5 h-3.5' />
            Mover
          </span>
        </div>
      );
    }

    return (
      <div
        ref={innerRef}
        {...rootProps}
        className={`w-full border rounded-2xl p-4 bg-theme-base/60 backdrop-blur transition-shadow flex flex-col min-w-0 ${isDragging ? 'border-blue-400 shadow-lg z-20' : 'border-theme'
          }`}
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='text-sm font-semibold text-theme-primary flex items-center gap-2'>
              {field.label}
              {field.isRequired && (
                <span className='text-[11px] font-medium uppercase tracking-wide text-red-500'>
                  obrigatório
                </span>
              )}
            </div>
            {field.description && (
              <p className='text-xs text-theme-secondary mt-1'>{field.description}</p>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => (isEditing ? handleCancelEdit(field.id) : handleStartEdit(field.id))}
              className='px-3 py-1.5 rounded-lg border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors'
              disabled={isSaving}
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
            <button
              type='button'
              onClick={() => handleArchiveFieldClick(field.id)}
              className='px-3 py-1.5 rounded-lg border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors'
              disabled={isSaving}
            >
              Arquivar
            </button>
          </div>
        </div>

        <div className='mt-3 space-y-3 flex-1'>
          {isEditing && (
            <div className='flex flex-col gap-2 text-sm'>
              <label className='font-medium text-theme-secondary'>Página do fichário</label>
              <select
                value={field.pageId ?? DEFAULT_PAGE_ID}
                onChange={(event) => handleChangeFieldPage(field.id, event.target.value)}
                className='px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                disabled={isSaving}
              >
                {pageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEditing ? (
            field.type === 'textarea' ? (
              <textarea
                rows={4}
                value={draft}
                onChange={(event) => handleDraftChange(field.id, event.target.value)}
                className='w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none'
                placeholder='Escreva aqui...'
                disabled={isSaving}
              />
            ) : field.type === 'date' ? (
              <div className='flex items-center gap-2'>
                <DatePicker
                  selected={parseDateValue(draft)}
                  onChange={(value) => handleDateChange(field.id, value)}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Selecionar data'
                  className='w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  popperContainer={({ children }) => (
                    <DatePickerPortal>{children}</DatePickerPortal>
                  )}
                  disabled={isSaving}
                />
                <Calendar className='w-4 h-4 text-theme-secondary' />
              </div>
            ) : (
              <input
                type={
                  field.type === 'number'
                    ? 'number'
                    : field.type === 'email'
                      ? 'email'
                      : field.type === 'url'
                        ? 'url'
                        : 'text'
                }
                value={draft}
                onChange={(event) => handleDraftChange(field.id, event.target.value)}
                className='w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                placeholder='Informe o valor'
                disabled={isSaving}
              />
            )
          ) : (
            valueView
          )}
          {error && (
            <div className='text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5'>
              {error}
            </div>
          )}
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-2 text-xs text-theme-secondary ${isEditing ? 'pt-2 mt-2 border-t border-theme/60' : 'pt-1 mt-2'
            }`}
        >
          <div className='space-y-1'>
            {updatedAt ? (
              <div>
                Última atualização em {formatDateTime(updatedAt)}
                {updatedBy ? ` · por ${updatedBy}` : ''}
              </div>
            ) : (
              <div>Nenhuma atualização registrada ainda.</div>
            )}
            {createdAt && (
              <div className='flex items-center gap-2 text-theme-muted'>
                <CheckCircle2 className='w-3 h-3' />
                Campo criado em {formatDateTime(createdAt)}
              </div>
            )}
          </div>

          {isEditing && (
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={() => handleClearDraft(field.id)}
                className='px-3 py-1.5 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-xs'
                disabled={isSaving}
              >
                Limpar
              </button>
              {state?.id && (
                <button
                  type='button'
                  onClick={() => handleDeleteValue(field.id)}
                  className='px-3 py-1.5 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-xs'
                  disabled={isSaving}
                >
                  Remover registro
                </button>
              )}
              <button
                type='button'
                onClick={() => handleSaveValue(field)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${isDirty
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-theme-surface text-theme-muted cursor-not-allowed opacity-60'
                  }`}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Save size={14} />
                )}
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const fieldsContainerClass = isFieldOrdering
    ? 'flex flex-col gap-3 w-full max-w-2xl mx-auto'
    : 'grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  if (!participant) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key='participant-notebook'
            className='fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='w-full max-w-5xl max-h-[90vh] overflow-hidden bg-theme-surface border border-theme rounded-3xl shadow-2xl flex flex-col'
            >
              <div className='px-6 pt-6 pb-4 border-b border-theme flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h2 className='text-xl font-semibold flex items-center gap-3'>
                    <NotebookPen className='w-5 h-5 text-blue-500' />
                    Ficha personalizada
                  </h2>
                  <div className='text-sm text-theme-secondary'>
                    {participant.displayName} · Código {participant.code}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2 justify-end'>
                  {hasArchivedFields && (
                    <button
                      type='button'
                      onClick={() => setIsArchivedPanelOpen(true)}
                      className='px-3 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-sm'
                    >
                      Campos arquivados
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={handleToggleFieldOrdering}
                    disabled={visibleFields.length <= 1}
                    className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${isFieldOrdering
                        ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                        : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                      } disabled:opacity-60`}
                  >
                    <LayoutGrid size={16} />
                    Organizar campos
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsFieldModalOpen(true)}
                    className='px-3 py-2 rounded-lg bg-blue-500 text-white text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors'
                  >
                    <Plus size={16} />
                    Novo campo
                  </button>
                  <button
                    type='button'
                    onClick={onClose}
                    className='px-3 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors flex items-center gap-2'
                  >
                    <X size={16} />
                    Fechar
                  </button>
                </div>
              </div>

              <div className='px-6 py-4 border-b border-theme/60 flex flex-col gap-3'>
                <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                  <div className='flex items-center gap-2 overflow-x-auto pb-1'>
                    <button
                      type='button'
                      onClick={() => handleSelectPage(DEFAULT_PAGE_ID)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors ${activePageId === DEFAULT_PAGE_ID
                          ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                          : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                        }`}
                    >
                      Geral
                    </button>
                    <DragDropContext onDragEnd={handlePageDragEnd}>
                      <Droppable droppableId='notebook-pages' direction='horizontal'>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className='flex items-center gap-2'>
                            {displayPages.map((page, index) => (
                              <Draggable
                                key={page.id}
                                draggableId={page.id}
                                index={index}
                                isDragDisabled={!isPageOrdering}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    style={dragProvided.draggableProps.style}
                                    className={`flex items-center ${snapshot.isDragging ? 'z-10' : ''
                                      }`}
                                  >
                                    <button
                                      type='button'
                                      onClick={() => handleSelectPage(page.id)}
                                      className={`whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${activePageId === page.id
                                          ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                                          : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                                        } ${isPageOrdering ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                      {...(isPageOrdering ? dragProvided.dragHandleProps : {})}
                                    >
                                      {page.label}
                                      {isPageOrdering && <GripVertical className='w-3.5 h-3.5 text-theme-muted' />}
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                  <div className='flex flex-wrap gap-2 justify-end'>
                    <button
                      type='button'
                      onClick={handleTogglePageOrdering}
                      disabled={activePages.length <= 1}
                      className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-colors ${isPageOrdering
                          ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                          : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                        } disabled:opacity-60`}
                    >
                      <GripVertical size={14} />
                      Organizar páginas
                    </button>
                    <button
                      type='button'
                      onClick={handleOpenEditPage}
                      disabled={!activeDisplayedPage || isPageOrdering}
                      className='px-3 py-1.5 rounded-lg border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors disabled:opacity-50'
                    >
                      Editar página
                    </button>
                    <button
                      type='button'
                      onClick={handleOpenCreatePage}
                      className='px-3 py-1.5 rounded-lg bg-theme-base border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors flex items-center gap-2'
                    >
                      <Plus size={14} />
                      Nova página
                    </button>
                  </div>
                </div>
                {isPageOrdering && (
                  <div className='flex flex-col gap-2 rounded-xl border border-blue-400/50 bg-blue-500/5 px-4 py-3 md:flex-row md:items-center md:justify-between'>
                    <div className='text-sm text-theme-secondary'>
                      Arraste as abas para reorganizar a ordem de exibição.
                    </div>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={handleCancelPageOrdering}
                        className='px-3 py-1.5 rounded-lg border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors'
                        disabled={pageOrderingLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        type='button'
                        onClick={handleSavePageOrdering}
                        className='px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50'
                        disabled={pageOrderingLoading}
                      >
                        {pageOrderingLoading ? (
                          <Loader2 className='w-3.5 h-3.5 animate-spin' />
                        ) : (
                          <Save size={14} />
                        )}
                        Salvar ordem
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {globalError && (
                <div className='px-6 py-3 bg-red-500/10 border-b border-red-500/30 text-sm text-red-500'>{globalError}</div>
              )}

              <div className='flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-6 scrollbar-thin scrollbar-thumb-theme-dark/40 scrollbar-track-transparent'>
                {initializing ? (
                  <div className='h-64 flex flex-col items-center justify-center text-theme-secondary gap-3'>
                    <Loader2 className='w-6 h-6 animate-spin' />
                    Carregando fichário personalizado...
                  </div>
                ) : (
                  <>
                    {isFieldOrdering && displayFields.length > 0 && (
                      <div className='sticky top-0 z-10 -mx-6 px-6 py-3 bg-blue-500/5 border border-blue-500/40 rounded-2xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='text-sm text-theme-secondary'>
                          Arraste os cards para definir a ordem dentro desta página.
                        </div>
                        <div className='flex gap-2'>
                          <button
                            type='button'
                            onClick={handleCancelFieldOrdering}
                            className='px-3 py-1.5 rounded-lg border border-theme text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors'
                            disabled={fieldOrderingLoading}
                          >
                            Cancelar
                          </button>
                          <button
                            type='button'
                            onClick={handleSaveFieldOrdering}
                            className='px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50'
                            disabled={fieldOrderingLoading}
                          >
                            {fieldOrderingLoading ? (
                              <Loader2 className='w-3.5 h-3.5 animate-spin' />
                            ) : (
                              <Save size={14} />
                            )}
                            Salvar ordem
                          </button>
                        </div>
                      </div>
                    )}

                    {displayFields.length === 0 ? (
                      <div className='border border-dashed border-theme rounded-2xl py-16 text-center text-theme-secondary space-y-3'>
                        <NotebookPen className='w-8 h-8 mx-auto opacity-60' />
                        <div className='text-lg font-medium'>Nenhum campo cadastrado nesta página</div>
                        <p className='text-sm max-w-lg mx-auto'>
                          Crie campos personalizados para montar o fichário completo da pessoa e registrar informações
                          relevantes, documentos ou histórico familiar.
                        </p>
                        <button
                          type='button'
                          onClick={() => setIsFieldModalOpen(true)}
                          className='px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-2'
                        >
                          <Plus size={16} />
                          Criar campo
                        </button>
                      </div>
                    ) : (
                      <DragDropContext onDragEnd={handleFieldDragEnd}>
                        <Droppable
                          droppableId='notebook-fields'
                          renderClone={(provided, snapshot, rubric) =>
                            renderFieldCard(displayFields[rubric.source.index], {
                              innerRef: provided.innerRef,
                              dragProps: provided.draggableProps,
                              dragHandleProps: provided.dragHandleProps,
                              style: provided.draggableProps.style as CSSProperties,
                              isDragging: snapshot.isDragging,
                            })
                          }
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={fieldsContainerClass}
                            >
                              {displayFields.map((field, index) => (
                                <Draggable
                                  key={field.id}
                                  draggableId={field.id}
                                  index={index}
                                  isDragDisabled={!isFieldOrdering}
                                >
                                  {(dragProvided, snapshot) =>
                                    renderFieldCard(field, {
                                      innerRef: dragProvided.innerRef,
                                      dragProps: dragProvided.draggableProps,
                                      dragHandleProps: dragProvided.dragHandleProps,
                                      style: dragProvided.draggableProps.style as CSSProperties,
                                      isDragging: snapshot.isDragging,
                                    })
                                  }
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParticipantFieldBuilderModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        onSubmit={handleCreateField}
        pageOptions={pageOptions}
        defaultPageId={activePageId}
      />

      <ParticipantPageModal
        isOpen={isPageModalOpen}
        mode={pageModalMode}
        initialPage={pageEditing}
        onClose={handleClosePageModal}
        onCreate={handleCreatePage}
        onUpdate={handleUpdatePage}
      />

      <ArchivedFieldsPanel
        isOpen={isArchivedPanelOpen}
        fields={archivedFields}
        onClose={() => setIsArchivedPanelOpen(false)}
        onRestore={handleRestoreField}
      />
    </>
  );
}
