import {
  bulkUpdateParticipantCustomFieldOrder,
  bulkUpdateParticipantCustomPageOrder,
  listParticipantCustomPages,
  listParticipantCustomFields,
  listParticipantCustomValues,
  normalizePageIdentifier,
  removeParticipantCustomPage,
  removeParticipantCustomField,
  removeParticipantCustomValue,
  subscribeParticipantCustomPages,
  subscribeParticipantCustomFields,
  subscribeParticipantCustomValues,
  upsertParticipantCustomPage,
  upsertParticipantCustomField,
  upsertParticipantCustomValue,
  findParticipantCustomValueById,
} from './memoryStore';
import {
  remoteDeleteCustomPage,
  remoteDeleteCustomField,
  remoteDeleteCustomValue,
  remoteUpsertCustomPages,
  remoteUpsertCustomFields,
  remoteUpsertCustomValues,
} from './remoteStore';
import { hydrateFromRemote, syncInBackground } from './remoteSync';
import type {
  ParticipantCustomField,
  ParticipantCustomFieldConstraints,
  ParticipantCustomFieldType,
  ParticipantCustomPage,
  ParticipantCustomValue,
} from './types';

type FieldListener = (fields: ParticipantCustomField[]) => void;
type ValueListener = (entries: ParticipantCustomValue[]) => void;
type PageListener = (pages: ParticipantCustomPage[]) => void;

export type CustomFieldDraft = {
  label: string;
  type: ParticipantCustomFieldType;
  description?: string;
  constraints?: ParticipantCustomFieldConstraints;
  isRequired?: boolean;
  pageId?: string | null;
};

export type CustomFieldPatch = Partial<CustomFieldDraft> & {
  order?: number;
  isArchived?: boolean;
};

export type CustomValueDraft = {
  id?: string;
  value: string;
  metadata?: Record<string, unknown>;
};

export type CustomPageDraft = {
  label: string;
  icon?: string;
  color?: string;
};

export type CustomPagePatch = Partial<CustomPageDraft> & {
  order?: number;
  isArchived?: boolean;
};

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeConstraints(constraints?: ParticipantCustomFieldConstraints) {
  if (!constraints) return {};
  if (typeof constraints !== 'object') return {};
  return { ...constraints };
}

function selectField(id: string) {
  return listParticipantCustomFields().find((field) => field.id === id);
}

function selectPage(id: string) {
  return listParticipantCustomPages().find((page) => page.id === id);
}

export function getNotebookPages() {
  return listParticipantCustomPages();
}

export function listenNotebookPages(listener: PageListener) {
  return subscribeParticipantCustomPages(listener);
}

export function getNotebookFields() {
  return listParticipantCustomFields();
}

export function getActiveNotebookFields() {
  return listParticipantCustomFields().filter((field) => !field.isArchived);
}

export function getArchivedNotebookFields() {
  return listParticipantCustomFields().filter((field) => field.isArchived);
}

export function getNotebookFieldsByPage(pageId: string | null) {
  const normalized = normalizePageIdentifier(pageId);
  return getActiveNotebookFields().filter((field) => normalizePageIdentifier(field.pageId) === normalized);
}

export function listenNotebookFields(listener: FieldListener) {
  return subscribeParticipantCustomFields(listener);
}

export function getNotebookEntries(code: string) {
  return listParticipantCustomValues(code);
}

export function listenNotebookEntries(code: string, listener: ValueListener) {
  return subscribeParticipantCustomValues(code.toUpperCase(), listener);
}

export async function createNotebookPage(draft: CustomPageDraft) {
  const label = draft.label.trim();
  if (!label) throw new Error('Informe um título para a página.');
  const pages = listParticipantCustomPages();
  const nextOrder = pages.length > 0 ? Math.max(...pages.map((page) => page.order)) + 1 : 0;
  const now = new Date();
  const page: ParticipantCustomPage = {
    id: generateId(),
    label,
    order: nextOrder,
    icon: draft.icon?.trim() || undefined,
    color: draft.color?.trim() || undefined,
    isArchived: false,
    createdBy: undefined,
    createdAt: now,
    updatedBy: undefined,
    updatedAt: now,
  };

  upsertParticipantCustomPage(page);

  try {
    await remoteUpsertCustomPages([
      {
        id: page.id,
        label: page.label,
        order: page.order,
        icon: page.icon,
        color: page.color,
        isArchived: page.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return page;
}

export async function updateNotebookPage(id: string, patch: CustomPagePatch) {
  const current = selectPage(id);
  if (!current) throw new Error('Página não encontrada.');
  const updated: ParticipantCustomPage = {
    ...current,
    label: patch.label !== undefined ? (patch.label.trim() || current.label) : current.label,
    icon: patch.icon !== undefined ? (patch.icon?.trim() || undefined) : current.icon,
    color: patch.color !== undefined ? (patch.color?.trim() || undefined) : current.color,
    order: patch.order ?? current.order,
    isArchived: patch.isArchived ?? current.isArchived,
    updatedAt: new Date(),
  };

  upsertParticipantCustomPage(updated);

  try {
    await remoteUpsertCustomPages([
      {
        id: updated.id,
        label: updated.label,
        order: updated.order,
        icon: updated.icon,
        color: updated.color,
        isArchived: updated.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return updated;
}

export async function reorderNotebookPages(order: string[]) {
  const ordered = order.map((id, index) => ({ id, order: index }));
  bulkUpdateParticipantCustomPageOrder(ordered);
  try {
    await remoteUpsertCustomPages(ordered);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function archiveNotebookPage(id: string) {
  await updateNotebookPage(id, { isArchived: true });
}

export async function restoreNotebookPage(id: string) {
  await updateNotebookPage(id, { isArchived: false });
}

export async function deleteNotebookPage(id: string) {
  const snapshot = selectPage(id);
  if (!snapshot) return;
  removeParticipantCustomPage(id);
  try {
    await remoteDeleteCustomPage(id);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function createNotebookField(draft: CustomFieldDraft) {
  const label = draft.label.trim();
  if (!label) {
    throw new Error('Label é obrigatório.');
  }
  const pageId = normalizePageIdentifier(draft.pageId);
  const existing = listParticipantCustomFields().filter((field) => normalizePageIdentifier(field.pageId) === pageId);
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((field) => field.order)) + 1 : 0;
  const now = new Date();
  const field: ParticipantCustomField = {
    id: generateId(),
    label,
    type: draft.type,
    description: draft.description?.trim() || undefined,
    constraints: sanitizeConstraints(draft.constraints),
    order: nextOrder,
    pageId,
    isRequired: Boolean(draft.isRequired),
    isArchived: false,
    createdBy: undefined,
    createdAt: now,
    updatedBy: undefined,
    updatedAt: now,
  };

  upsertParticipantCustomField(field);

  try {
    await remoteUpsertCustomFields([
      {
        id: field.id,
        label: field.label,
        type: field.type,
        description: field.description ?? '',
        constraints: field.constraints,
        order: field.order,
        pageId: field.pageId,
        isRequired: field.isRequired,
        isArchived: field.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return field;
}

export async function updateNotebookField(id: string, patch: CustomFieldPatch) {
  const current = selectField(id);
  if (!current) throw new Error('Campo não encontrado.');

  const updated: ParticipantCustomField = {
    ...current,
    label: patch.label !== undefined ? patch.label.trim() || current.label : current.label,
    type: patch.type ?? current.type,
    description: patch.description !== undefined ? patch.description?.trim() || undefined : current.description,
    constraints: patch.constraints ? sanitizeConstraints(patch.constraints) : current.constraints,
    order: patch.order ?? current.order,
    pageId: patch.pageId === undefined ? current.pageId : normalizePageIdentifier(patch.pageId),
    isRequired: patch.isRequired ?? current.isRequired,
    isArchived: patch.isArchived ?? current.isArchived,
    updatedAt: new Date(),
  };

  upsertParticipantCustomField(updated);

  try {
    await remoteUpsertCustomFields([
      {
        id: updated.id,
        label: updated.label,
        type: updated.type,
        description: updated.description ?? '',
        constraints: updated.constraints,
        order: updated.order,
        pageId: updated.pageId,
        isRequired: updated.isRequired,
        isArchived: updated.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return updated;
}

export async function reorderNotebookFields(pageId: string | null, orderedIds: string[]) {
  const normalizedPageId = normalizePageIdentifier(pageId);
  const fields = listParticipantCustomFields();
  const target = fields
    .filter((field) => !field.isArchived && normalizePageIdentifier(field.pageId) === normalizedPageId)
    .map((field) => field.id);

  if (target.length !== orderedIds.length) {
    throw new Error('Dados inconsistentes ao reordenar campos.');
  }

  const entries = orderedIds.map((id, index) => ({ id, order: index }));
  bulkUpdateParticipantCustomFieldOrder(entries);

  try {
    await remoteUpsertCustomFields(entries);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function archiveNotebookField(id: string) {
  await updateNotebookField(id, { isArchived: true });
}

export async function restoreNotebookField(id: string) {
  await updateNotebookField(id, { isArchived: false });
}

export async function deleteNotebookField(id: string) {
  const snapshot = selectField(id);
  if (!snapshot) return;
  removeParticipantCustomField(id);
  try {
    await remoteDeleteCustomField(id);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function saveNotebookEntry(code: string, fieldId: string, draft: CustomValueDraft) {
  const normalizedCode = code.toUpperCase().trim();
  if (!normalizedCode) throw new Error('Código é obrigatório.');
  const field = selectField(fieldId);
  if (!field) throw new Error('Campo não encontrado.');

  const now = new Date();
  const existing = draft.id ? findParticipantCustomValueById(draft.id) : null;
  const id = draft.id ?? generateId();
  const entry: ParticipantCustomValue = {
    id,
    code: normalizedCode,
    fieldId,
    value: draft.value,
    metadata: draft.metadata ? { ...draft.metadata } : existing?.metadata ?? {},
    createdBy: existing?.createdBy,
    createdAt: existing?.createdAt ?? now,
    updatedBy: existing?.updatedBy,
    updatedAt: now,
  };

  upsertParticipantCustomValue(entry);

  try {
    await remoteUpsertCustomValues([
      {
        id: entry.id,
        code: entry.code,
        fieldId: entry.fieldId,
        value: entry.value,
        metadata: entry.metadata ?? {},
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return entry;
}

export async function deleteNotebookEntry(id: string) {
  const existing = findParticipantCustomValueById(id);
  if (!existing) return;
  removeParticipantCustomValue(id);
  try {
    await remoteDeleteCustomValue(id);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}
