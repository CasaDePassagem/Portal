import {
  insertContent,
  insertLesson,
  insertTopic,
  listContentsByTopic as listContentsFromStore,
  listLessonsByContent as listLessonsFromStore,
  listTopics as listTopicsFromStore,
  listAllContentsSnapshot,
  listAllLessonsSnapshot,
  patchContent,
  patchLesson,
  patchTopic,
  removeContent,
  removeLesson,
  removeTopic,
  reorderContents as reorderContentsInternal,
  reorderLessons as reorderLessonsInternal,
  reorderTopics as reorderTopicsInternal,
  subscribeContents,
  subscribeLessons,
  subscribeTopics,
  getContentById,
  getLessonById,
} from './memoryStore';
import { hydrateFromRemote } from './remoteSync';
import {
  isBackendAvailable,
  remoteCreateRecord,
  remoteDeleteRecord,
  remoteUpdateRecord,
  remoteUpsertRecords,
} from './remoteStore';
import type { Content, Lesson, Topic } from './types';

export type { Topic, Content, Lesson } from './types';

type Listener<T> = (items: T[]) => void;

function nextOrder<T extends { order?: number }>(items: T[]) {
  if (!items.length) return 0;
  const max = items.reduce((acc, item) => Math.max(acc, item.order ?? 0), 0);
  return max + 1;
}

function ensureId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2);
  const time = Date.now().toString(36);
  return `${time}-${random}`;
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) {
  const topics = await listAllTopics();
  const topic = insertTopic({
    id: ensureId(),
    name: data.name.trim(),
    category: data.category,
    color: data.color,
    coverImageUrl: data.coverImageUrl?.trim() || undefined,
    coverImageAlt: data.coverImageAlt?.trim() || undefined,
    order: data.order ?? nextOrder(topics),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (isBackendAvailable()) {
    await remoteCreateRecord('topics', topic);
    await hydrateFromRemote();
  }
  return topic;
}

export async function createContent(data: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) {
  const contents = await listContentsByTopic(data.topicId);
  const content = insertContent({
    id: ensureId(),
    topicId: data.topicId,
    title: data.title.trim(),
    description: data.description?.trim() || undefined,
    coverImageUrl: data.coverImageUrl?.trim() || undefined,
    coverImageAlt: data.coverImageAlt?.trim() || undefined,
    estimatedDuration: data.estimatedDuration,
    difficulty: data.difficulty,
    order: data.order ?? nextOrder(contents),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (isBackendAvailable()) {
    await remoteCreateRecord('contents', content);
    await hydrateFromRemote();
  }
  return content;
}

export async function createLesson(data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) {
  const lessons = await listLessonsByContent(data.contentId);
  const lesson = insertLesson({
    id: ensureId(),
    contentId: data.contentId,
    title: data.title.trim(),
    youtubeUrl: data.youtubeUrl.trim(),
    description: data.description?.trim() || undefined,
    order: data.order ?? nextOrder(lessons),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (isBackendAvailable()) {
    await remoteCreateRecord('lessons', lesson);
    await hydrateFromRemote();
  }
  return lesson;
}

export async function updateTopic(id: string, patch: Partial<Omit<Topic, 'id'>>) {
  patchTopic(id, patch);
  if (isBackendAvailable()) {
    await remoteUpdateRecord('topics', id, patch);
    await hydrateFromRemote();
  }
}

export async function updateContent(id: string, patch: Partial<Omit<Content, 'id'>>) {
  patchContent(id, patch);
  if (isBackendAvailable()) {
    await remoteUpdateRecord('contents', id, patch);
    await hydrateFromRemote();
  }
}

export async function updateLesson(id: string, patch: Partial<Omit<Lesson, 'id'>>) {
  patchLesson(id, patch);
  if (isBackendAvailable()) {
    await remoteUpdateRecord('lessons', id, patch);
    await hydrateFromRemote();
  }
}

export async function deleteTopic(id: string) {
  removeTopic(id);
  if (isBackendAvailable()) {
    await remoteDeleteRecord('topics', id);
    await hydrateFromRemote();
  }
}

export async function deleteContent(id: string) {
  removeContent(id);
  if (isBackendAvailable()) {
    await remoteDeleteRecord('contents', id);
    await hydrateFromRemote();
  }
}

export async function deleteLesson(id: string) {
  removeLesson(id);
  if (isBackendAvailable()) {
    await remoteDeleteRecord('lessons', id);
    await hydrateFromRemote();
  }
}

export async function reorderTopics(ids: string[]) {
  reorderTopicsInternal(ids);
  if (isBackendAvailable()) {
    const records = await listAllTopics();
    await remoteUpsertRecords('topics', records);
    await hydrateFromRemote();
  }
}

export async function reorderContents(ids: string[]) {
  reorderContentsInternal(ids);
  if (isBackendAvailable()) {
    const firstId = ids[0];
    const sample = firstId ? getContentById(firstId) : null;
    const topicId = sample?.topicId;
    const records = topicId ? await listContentsByTopic(topicId) : listAllContentsSnapshot();
    await remoteUpsertRecords('contents', records);
    await hydrateFromRemote();
  }
}

export async function reorderLessons(ids: string[]) {
  reorderLessonsInternal(ids);
  if (isBackendAvailable()) {
    const firstId = ids[0];
    const sample = firstId ? getLessonById(firstId) : null;
    const contentId = sample?.contentId;
    const records = contentId ? await listLessonsByContent(contentId) : listAllLessonsSnapshot();
    await remoteUpsertRecords('lessons', records);
    await hydrateFromRemote();
  }
}

export function listenTopics(cb: Listener<Topic>) {
  return subscribeTopics(cb);
}

export function listenContentsByTopic(topicId: string, cb: Listener<Content>) {
  return subscribeContents(topicId, cb);
}

export function listenLessonsByContent(contentId: string, cb: Listener<Lesson>) {
  return subscribeLessons(contentId, cb);
}

export async function listAllTopics(): Promise<Topic[]> {
  return listTopicsFromStore();
}

export async function listContentsByTopic(topicId: string): Promise<Content[]> {
  return listContentsFromStore(topicId);
}

export async function listLessonsByContent(contentId: string): Promise<Lesson[]> {
  return listLessonsFromStore(contentId);
}
