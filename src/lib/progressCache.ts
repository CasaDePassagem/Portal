import type { LearningProgress } from './types';

const VERSION = 'v1';
const PREFIX = 'progress_cache_v1_';

type SerializedLesson = {
  participantId: string;
  lessonId: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
  completedAt?: number;
  contentId?: string;
  topicId?: string;
};

type SerializedSnapshot = {
  version: string;
  code: string;
  updatedAt: number;
  dirty: boolean;
  lessons: Record<string, SerializedLesson>;
};

export type CachedSnapshot = {
  lessons: Record<string, SerializedLesson>;
  dirty: boolean;
};

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyFor(code: string) {
  return `${PREFIX}${code}`;
}

function sanitizeSnapshot(raw: unknown): SerializedSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const snap = raw as Partial<SerializedSnapshot>;
  if (snap.version !== VERSION) return null;
  if (!snap.code || typeof snap.code !== 'string') return null;
  if (!snap.lessons || typeof snap.lessons !== 'object') return null;
  return {
    version: VERSION,
    code: snap.code,
    updatedAt: typeof snap.updatedAt === 'number' ? snap.updatedAt : Date.now(),
    dirty: Boolean(snap.dirty),
    lessons: Object.fromEntries(
      Object.entries(snap.lessons).map(([lessonId, entry]) => {
        const serialized = entry as Partial<SerializedLesson>;
        const normalized: SerializedLesson = {
          participantId:
            typeof serialized.participantId === 'string' && serialized.participantId.trim().length > 0
              ? serialized.participantId
              : '',
          lessonId,
          lastPosition: typeof serialized.lastPosition === 'number' ? serialized.lastPosition : 0,
          duration: typeof serialized.duration === 'number' ? serialized.duration : 0,
          completed: Boolean(serialized.completed),
          updatedAt:
            typeof serialized.updatedAt === 'number'
              ? serialized.updatedAt
              : Date.now(),
          completedAt:
            typeof serialized.completedAt === 'number'
              ? serialized.completedAt
              : undefined,
          contentId:
            typeof serialized.contentId === 'string' && serialized.contentId.trim().length > 0
              ? serialized.contentId
              : undefined,
          topicId:
            typeof serialized.topicId === 'string' && serialized.topicId.trim().length > 0
              ? serialized.topicId
              : undefined,
        };
        return [lessonId, normalized];
      }),
    ),
  };
}

export function loadSnapshot(code: string): CachedSnapshot | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(keyFor(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const snapshot = sanitizeSnapshot(parsed);
    if (!snapshot) return null;
    return {
      lessons: snapshot.lessons,
      dirty: snapshot.dirty,
    };
  } catch {
    removeSnapshot(code);
    return null;
  }
}

export function saveLesson(code: string, progress: LearningProgress) {
  const snapshot = loadSnapshot(code);
  const lessons = { ...(snapshot?.lessons ?? {}) };
  const serialized = serializeLesson(progress);
  lessons[progress.lessonId] = serialized;
  writeSnapshot(code, lessons, true);
}

export function saveSnapshot(
  code: string,
  lessons: Record<string, LearningProgress>,
  options?: { dirty?: boolean },
) {
  const serializedEntries: Record<string, SerializedLesson> = {};
  Object.entries(lessons).forEach(([lessonId, progress]) => {
    serializedEntries[lessonId] = serializeLesson(progress);
  });
  writeSnapshot(code, serializedEntries, options?.dirty ?? false);
}

export function markSnapshotDirty(code: string) {
  const snapshot = loadSnapshot(code);
  if (!snapshot) return;
  writeSnapshot(code, snapshot.lessons, true);
}

export function removeSnapshot(code?: string) {
  const storage = safeStorage();
  if (!storage) return;
  if (!code) {
    Object.keys(storage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => {
        storage.removeItem(key);
      });
    return;
  }
  storage.removeItem(keyFor(code));
}

export function isolateSnapshot(code: string) {
  const storage = safeStorage();
  if (!storage) return;
  const currentKey = keyFor(code);
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key && key.startsWith(PREFIX) && key !== currentKey) {
      storage.removeItem(key);
    }
  }
}

export function deserializeLessons(entries: Record<string, SerializedLesson> | null): Record<string, LearningProgress> {
  if (!entries) return {};
  const lessons: Record<string, LearningProgress> = {};
  Object.entries(entries).forEach(([lessonId, entry]) => {
    lessons[lessonId] = {
      id: lessonId,
      participantId: entry.participantId,
      lessonId,
      contentId: entry.contentId,
      topicId: entry.topicId,
      lastPosition: entry.lastPosition,
      duration: entry.duration,
      completed: entry.completed,
      updatedAt: new Date(entry.updatedAt),
      completedAt: entry.completedAt ? new Date(entry.completedAt) : undefined,
    };
  });
  return lessons;
}

export function serializeLesson(progress: LearningProgress): SerializedLesson {
  return {
    participantId: progress.participantId,
    lessonId: progress.lessonId,
    lastPosition: progress.lastPosition || 0,
    duration: progress.duration || 0,
    completed: Boolean(progress.completed),
    updatedAt: progress.updatedAt instanceof Date ? progress.updatedAt.getTime() : Date.now(),
    completedAt: progress.completedAt instanceof Date ? progress.completedAt.getTime() : undefined,
    contentId: progress.contentId,
    topicId: progress.topicId,
  };
}

function writeSnapshot(code: string, lessons: Record<string, SerializedLesson>, dirty: boolean) {
  const storage = safeStorage();
  if (!storage) return;
  const payload: SerializedSnapshot = {
    version: VERSION,
    code,
    updatedAt: Date.now(),
    dirty,
    lessons,
  };
  try {
    storage.setItem(keyFor(code), JSON.stringify(payload));
  } catch {
    storage.removeItem(keyFor(code));
  }
}
