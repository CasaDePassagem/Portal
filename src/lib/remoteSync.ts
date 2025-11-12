import { fetchDump, isBackendAvailable } from './remoteStore';
import {
  findUserById,
  importStore,
  type DataStore,
  type DataStoreDump,
} from './memoryStore';
import type {
  Content,
  Lesson,
  ParticipantCustomField,
  ParticipantCustomPage,
  ParticipantCustomValue,
  Topic,
  UserRole,
} from './types';
import { setLoading } from './loadingStore';
import { getCachedData, setCachedData } from './cache';

type SyncOptions = {
  silent?: boolean;
};

type Snapshot = {
  users?: Array<Record<string, unknown>>;
  topics?: Array<Record<string, unknown>>;
  contents?: Array<Record<string, unknown>>;
  lessons?: Array<Record<string, unknown>>;
  participants?: Array<Record<string, unknown>>;
  participant_custom_pages?: Array<Record<string, unknown>>;
  participant_custom_schema?: Array<Record<string, unknown>>;
  participant_custom_data?: Array<Record<string, unknown>>;
};

function toDate(value: unknown): Date | undefined {
  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

function normalizeUsers(rows: Array<Record<string, unknown>> = []) {
  const toBoolean = (value: unknown): boolean => {
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0 || value === null || value === undefined) return false;
    return Boolean(value);
  };

  return rows
    .filter(row => row.uid && String(row.uid).trim() !== '')
    .map((row) => ({
      uid: String(row.uid ?? ''),
      email: String(row.email ?? ''),
      fullName: String(row.fullName ?? ''),
      role: (row.role === 'admin' ? 'admin' : 'user') as UserRole,
      isActive: toBoolean(row.isActive),
      hasPassword: toBoolean(row.hasPassword),
      passwordHash:
        typeof row.passwordHash === 'string'
          ? row.passwordHash
          : (findUserById(String(row.uid ?? ''))?.passwordHash ?? undefined),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
}

function normalizeTopics(rows: Array<Record<string, unknown>> = []): Topic[] {
  return rows
    .filter(row => row.id && String(row.id).trim() !== '') // Filtra vazios
    .map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      category: row.category ? String(row.category) : undefined,
      color: row.color ? String(row.color) : undefined,
      order: typeof row.order === 'number' ? row.order : Number(row.order ?? 0),
      coverImageUrl: row.coverImageUrl ? String(row.coverImageUrl) : undefined,
      coverImageAlt: row.coverImageAlt ? String(row.coverImageAlt) : undefined,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
    }));
}

function normalizeContents(rows: Array<Record<string, unknown>> = []): Content[] {
  return rows
    .filter(row => row.id && String(row.id).trim() !== '') // Filtra vazios
    .map((row) => {
      const raw = row.difficulty ? String(row.difficulty) : undefined;
      const allowed = ['beginner', 'intermediate', 'advanced'] as const;
      const difficulty = allowed.includes(raw as typeof allowed[number])
        ? (raw as Content['difficulty'])
        : undefined;

      return {
        id: String(row.id ?? ''),
        topicId: String(row.topicId ?? ''),
        title: String(row.title ?? ''),
        description: row.description ? String(row.description) : undefined,
        order: typeof row.order === 'number' ? row.order : Number(row.order ?? 0),
        coverImageUrl: row.coverImageUrl ? String(row.coverImageUrl) : undefined,
        coverImageAlt: row.coverImageAlt ? String(row.coverImageAlt) : undefined,
        difficulty,
        createdAt: toDate(row.createdAt),
        updatedAt: toDate(row.updatedAt),
      };
    });
}

function normalizeLessons(rows: Array<Record<string, unknown>> = []): Lesson[] {
  return rows
    .filter(row => row.id && String(row.id).trim() !== '') // Filtra vazios
    .map((row) => ({
      id: String(row.id ?? ''),
      contentId: String(row.contentId ?? ''),
      title: String(row.title ?? ''),
      youtubeUrl: String(row.youtubeUrl ?? ''),
      order: typeof row.order === 'number' ? row.order : Number(row.order ?? 0),
      description: row.description ? String(row.description) : undefined,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
    }));
}

function parseLessonProgress(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) ?? {};
    } catch {
      return {};
    }
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

function normalizeParticipants(rows: Array<Record<string, unknown>> = []) {
  return rows
    .filter(row => row.code && String(row.code).trim() !== '') // Filtra vazios
    .map((row) => ({
      code: String(row.code ?? ''),
      displayName: row.displayName ? String(row.displayName) : undefined,
      firstName: row.firstName ? String(row.firstName) : undefined,
      lastName: row.lastName ? String(row.lastName) : undefined,
      age: typeof row.age === 'number' ? row.age : row.age ? Number(row.age) : undefined,
      gender: row.gender ? String(row.gender) : undefined,
      fatherName: row.fatherName ? String(row.fatherName) : undefined,
      motherName: row.motherName ? String(row.motherName) : undefined,
      careHouse: row.careHouse ? String(row.careHouse) : undefined,
      createdAt: toDate(row.createdAt) ?? new Date(),
      lastActiveAt: toDate(row.lastActiveAt),
      lessonProgress: parseLessonProgress(row.lessonProgress),
    }));
}

function coerceBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') {
    return { ...(value as Record<string, unknown>) };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeCustomPages(rows: Array<Record<string, unknown>> = []): ParticipantCustomPage[] {
  return rows
    .filter(row => row.id && String(row.id).trim() !== '')
    .map((row) => ({
      id: String(row.id ?? ''),
      label: String(row.label ?? ''),
      order: typeof row.order === 'number' ? row.order : Number(row.order ?? 0),
      icon: row.icon ? String(row.icon) : undefined,
      color: row.color ? String(row.color) : undefined,
      isArchived: coerceBoolean(row.isArchived),
      createdBy: row.createdBy ? String(row.createdBy) : undefined,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedBy: row.updatedBy ? String(row.updatedBy) : undefined,
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
}

function normalizePageIdentifier(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function normalizeCustomFields(rows: Array<Record<string, unknown>> = []): ParticipantCustomField[] {
  const allowed: ParticipantCustomField['type'][] = ['text', 'textarea', 'number', 'cpf', 'rg', 'phone', 'date', 'email', 'url'];
  return rows
    .filter(row => row.id && String(row.id).trim() !== '')
    .map((row) => {
      const rawPageId = row.pageId ?? row.paginaId ?? null;
      const normalizedPageId = normalizePageIdentifier(rawPageId);
      const rawType = typeof row.type === 'string' ? row.type.toLowerCase().trim() : 'text';
      const type = allowed.includes(rawType as ParticipantCustomField['type'])
        ? (rawType as ParticipantCustomField['type'])
        : 'text';
      return {
        id: String(row.id ?? ''),
        label: String(row.label ?? ''),
        type,
        description: row.description ? String(row.description) : undefined,
        constraints: parseJsonObject(row.constraints),
        order: typeof row.order === 'number' ? row.order : Number(row.order ?? 0),
        pageId: normalizedPageId,
        isRequired: coerceBoolean(row.isRequired),
        isArchived: coerceBoolean(row.isArchived),
        createdBy: row.createdBy ? String(row.createdBy) : undefined,
        createdAt: toDate(row.createdAt) ?? new Date(),
        updatedBy: row.updatedBy ? String(row.updatedBy) : undefined,
        updatedAt: toDate(row.updatedAt) ?? new Date(),
      };
    });
}

function normalizeCustomValues(rows: Array<Record<string, unknown>> = []): ParticipantCustomValue[] {
  return rows
    .filter(row => row.id && row.code && row.fieldId)
    .map((row) => ({
      id: String(row.id ?? ''),
      code: String(row.code ?? '').toUpperCase(),
      fieldId: String(row.fieldId ?? ''),
      value: row.value != null ? String(row.value) : '',
      metadata: parseJsonObject(row.metadata),
      createdBy: row.createdBy ? String(row.createdBy) : undefined,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedBy: row.updatedBy ? String(row.updatedBy) : undefined,
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
}

export async function hydrateFromRemote() {
  if (!isBackendAvailable()) {
    setLoading(false);
    return;
  }

  // Tenta carregar do cache primeiro (APENAS dados públicos: topics, contents, lessons)
  const cached = getCachedData();
  if (cached) {
    const cachedData: DataStore = {
      users: [], // SEMPRE buscar do servidor
      topics: normalizeTopics(cached.topics as Array<Record<string, unknown>>),
      contents: normalizeContents(cached.contents as Array<Record<string, unknown>>),
      lessons: normalizeLessons(cached.lessons as Array<Record<string, unknown>>),
      participants: [], // SEMPRE buscar do servidor (progresso de aulas)
      participantCustomPages: [],
      participantCustomFields: [],
      participantCustomValues: [],
    };

    const cachedDump: DataStoreDump = {
      version: 1,
      users: [],
      topics: cachedData.topics.map((topic) => ({
        ...topic,
        createdAt: topic.createdAt ? topic.createdAt.toISOString() : undefined,
        updatedAt: topic.updatedAt ? topic.updatedAt.toISOString() : undefined,
      })),
      contents: cachedData.contents.map((content) => ({
        ...content,
        createdAt: content.createdAt ? content.createdAt.toISOString() : undefined,
        updatedAt: content.updatedAt ? content.updatedAt.toISOString() : undefined,
      })),
      lessons: cachedData.lessons.map((lesson) => ({
        ...lesson,
        createdAt: lesson.createdAt ? lesson.createdAt.toISOString() : undefined,
        updatedAt: lesson.updatedAt ? lesson.updatedAt.toISOString() : undefined,
      })),
      participantCustomPages: [],
      participants: [],
      participantCustomFields: [],
      participantCustomValues: [],
    };

    importStore(cachedDump);

    // IMPORTANTE: Busca users e participants do servidor IMEDIATAMENTE (não em background)
    await fetchAndUpdateData();
    setLoading(false);
    return;
  }

  // Sem cache, carrega tudo normalmente
  await fetchAndUpdateData();
}

/**
 * Versão leve: atualiza dados em background sem bloquear UI
 * Use após criar/editar itens para manter sincronizado
 */
export function syncInBackground(options?: SyncOptions) {
  if (!isBackendAvailable()) return;

  // Não mostra loading, não bloqueia
  setTimeout(() => {
    void fetchAndUpdateData(options);
  }, 50);
}

async function fetchAndUpdateData(options?: SyncOptions) {
  try {
    const showLoading = !options?.silent;
    if (showLoading) {
      setLoading(true, 'Atualizando dados...');
    }
    const snapshot = (await fetchDump()) as Snapshot | null;
    if (!snapshot) {
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    const data: DataStore = {
      users: normalizeUsers(snapshot.users),
      topics: normalizeTopics(snapshot.topics),
      contents: normalizeContents(snapshot.contents),
      lessons: normalizeLessons(snapshot.lessons),
      participants: normalizeParticipants(snapshot.participants),
      participantCustomPages: normalizeCustomPages(snapshot.participant_custom_pages),
      participantCustomFields: normalizeCustomFields(snapshot.participant_custom_schema),
      participantCustomValues: normalizeCustomValues(snapshot.participant_custom_data),
    };

    const dump: DataStoreDump = {
      version: 1,
      users: data.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        hasPassword: user.hasPassword ?? Boolean(user.passwordHash),
        passwordHash: user.passwordHash,
        createdAt: (user.createdAt ?? new Date()).toISOString(),
        updatedAt: (user.updatedAt ?? new Date()).toISOString(),
      })),
      topics: data.topics.map((topic) => ({
        ...topic,
        createdAt: topic.createdAt ? topic.createdAt.toISOString() : undefined,
        updatedAt: topic.updatedAt ? topic.updatedAt.toISOString() : undefined,
      })),
      contents: data.contents.map((content) => ({
        ...content,
        createdAt: content.createdAt ? content.createdAt.toISOString() : undefined,
        updatedAt: content.updatedAt ? content.updatedAt.toISOString() : undefined,
      })),
      lessons: data.lessons.map((lesson) => ({
        ...lesson,
        createdAt: lesson.createdAt ? lesson.createdAt.toISOString() : undefined,
        updatedAt: lesson.updatedAt ? lesson.updatedAt.toISOString() : undefined,
      })),
      participantCustomPages: data.participantCustomPages.map((page) => ({
        id: page.id,
        label: page.label,
        order: page.order,
        icon: page.icon,
        color: page.color,
        isArchived: page.isArchived,
        createdBy: page.createdBy,
        createdAt: page.createdAt?.toISOString(),
        updatedBy: page.updatedBy,
        updatedAt: page.updatedAt?.toISOString(),
      })),
      participants: data.participants.map((participant) => ({
        code: participant.code,
        displayName: participant.displayName,
        firstName: participant.firstName,
        lastName: participant.lastName,
        age: participant.age,
        gender: participant.gender,
        fatherName: participant.fatherName,
        motherName: participant.motherName,
        careHouse: participant.careHouse,
        createdAt: (participant.createdAt ?? new Date()).toISOString(),
        lastActiveAt: participant.lastActiveAt ? participant.lastActiveAt.toISOString() : undefined,
        lessonProgress: Object.fromEntries(
          Object.entries(participant.lessonProgress ?? {}).map(([lessonId, entry]) => {
            const updatedAt = entry.updatedAt
              ? new Date(entry.updatedAt as string | number | Date).toISOString()
              : new Date().toISOString();
            const completedAt = entry.completedAt
              ? new Date(entry.completedAt as string | number | Date).toISOString()
              : undefined;
            return [lessonId, { ...entry, updatedAt, completedAt }];
          }),
        ),
      })),
      participantCustomFields: data.participantCustomFields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        description: field.description,
        constraints: field.constraints,
        order: field.order,
        pageId: field.pageId,
        isRequired: field.isRequired,
        isArchived: field.isArchived,
        createdBy: field.createdBy,
        createdAt: field.createdAt?.toISOString(),
        updatedBy: field.updatedBy,
        updatedAt: field.updatedAt?.toISOString(),
      })),
      participantCustomValues: data.participantCustomValues.map((entry) => ({
        id: entry.id,
        code: entry.code,
        fieldId: entry.fieldId,
        value: entry.value,
        metadata: entry.metadata,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt?.toISOString(),
        updatedBy: entry.updatedBy,
        updatedAt: entry.updatedAt?.toISOString(),
      })),
    };

    importStore(dump);

    // Salva cache (só dados públicos)
    setCachedData({
      topics: snapshot.topics || [],
      contents: snapshot.contents || [],
      lessons: snapshot.lessons || [],
    });

    if (showLoading) {
      setLoading(false);
    }
  } catch (error) {
    console.error('Falha ao carregar dados remotos:', error);
    if (!options?.silent) {
      setLoading(false);
    }
  }
}
