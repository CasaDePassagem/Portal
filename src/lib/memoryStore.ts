import bcrypt from 'bcryptjs';

import type {
  Content,
  LearningProgress,
  Lesson,
  ParticipantRecord,
  ParticipantCustomField,
  ParticipantCustomValue,
  ParticipantCustomPage,
  Topic,
  UserRecord,
  UserRole,
} from './types';

export type StoredUser = UserRecord & {
  passwordHash?: string;
};

type ParticipantState = ParticipantRecord & {
  lessonProgress: Record<string, LearningProgress>;
};

export type DataStoreDump = {
  version: number;
  users: Array<Omit<StoredUser, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }>;
  topics: Array<Omit<Topic, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }>;
  contents: Array<Omit<Content, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }>;
  lessons: Array<Omit<Lesson, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }>;
  participants: Array<{
    code: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    age?: number | string | null;
    gender?: string;
    fatherName?: string;
    motherName?: string;
    careHouse?: string;
    createdAt: string;
    lastActiveAt?: string;
    lessonProgress: Record<string, {
      id: string;
      participantId: string;
      lessonId: string;
      contentId?: string;
      topicId?: string;
      lastPosition: number;
      duration: number;
      completed: boolean;
      updatedAt: string;
      completedAt?: string;
    }>;
  }>;
  participantCustomFields: Array<{
    id: string;
    label: string;
    type: string;
    description?: string;
    constraints?: unknown;
    order?: number | string;
    pageId?: string | null;
    isRequired?: boolean | string;
    isArchived?: boolean | string;
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
  }>;
  participantCustomValues: Array<{
    id: string;
    code: string;
    fieldId: string;
    value: string;
    metadata?: unknown;
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
  }>;
  participantCustomPages: Array<{
    id: string;
    label: string;
    order?: number | string;
    icon?: string;
    color?: string;
    isArchived?: boolean | string;
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
  }>;
};

type TopicsListener = (items: Topic[]) => void;
type ContentsListener = (items: Content[]) => void;
type LessonsListener = (items: Lesson[]) => void;
type UsersListener = (items: UserRecord[]) => void;
type ParticipantListener = (participant: ParticipantRecord | null) => void;
type ProgressListener = (progress: LearningProgress[]) => void;

const STORE_VERSION = 1;

export type DataStore = {
  users: StoredUser[];
  topics: Topic[];
  contents: Content[];
  lessons: Lesson[];
  participants: ParticipantState[];
  participantCustomPages: ParticipantCustomPage[];
  participantCustomFields: ParticipantCustomField[];
  participantCustomValues: ParticipantCustomValue[];
};

type InternalStore = DataStore;

const globalBucket: { store?: InternalStore } =
  typeof window !== 'undefined'
    ? ((window as typeof window & { __ITINERARIO_STORE__?: { store: InternalStore } }).__ITINERARIO_STORE__ ?? {})
    : {};

const store: InternalStore =
  globalBucket.store ?? {
    users: [],
    topics: [],
    contents: [],
    lessons: [],
    participants: [],
    participantCustomPages: [],
    participantCustomFields: [],
    participantCustomValues: [],
  };

if (typeof window !== 'undefined') {
  (window as typeof window & { __ITINERARIO_STORE__: { store: InternalStore } }).__ITINERARIO_STORE__ = {
    store,
  };
}

const topicListeners = new Set<TopicsListener>();
const contentListeners = new Map<string, Set<ContentsListener>>();
const lessonListeners = new Map<string, Set<LessonsListener>>();
const userListeners = new Set<UsersListener>();
const participantListeners = new Map<string, Set<ParticipantListener>>();
const progressListeners = new Map<string, Set<ProgressListener>>();
type CustomPageListener = (pages: ParticipantCustomPage[]) => void;
type CustomFieldListener = (fields: ParticipantCustomField[]) => void;
type CustomValueListener = (values: ParticipantCustomValue[]) => void;
const customPageListeners = new Set<CustomPageListener>();
const customFieldListeners = new Set<CustomFieldListener>();
const customValueListeners = new Map<string, Set<CustomValueListener>>();

function cloneTopics() {
  return store.topics.map((topic) => ({ ...topic }));
}

function cloneContents() {
  return store.contents.map((content) => ({ ...content }));
}

function cloneLessons() {
  return store.lessons.map((lesson) => ({ ...lesson }));
}

export function normalizePageIdentifier(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function cloneCustomPages() {
  return store.participantCustomPages
    .map((page) => ({
      ...page,
      id: normalizePageIdentifier(page.id) ?? page.id,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function cloneCustomFields() {
  return store.participantCustomFields
    .map((field) => ({
      ...field,
      constraints: field.constraints ? { ...field.constraints } : {},
      pageId: normalizePageIdentifier(field.pageId ?? null),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function cloneCustomValues(code: string) {
  const normalized = code.toUpperCase();
  return store.participantCustomValues
    .filter((entry) => entry.code === normalized)
    .map((entry) => ({
      ...entry,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
}

function cloneUsers() {
  return store.users.map(({ passwordHash, ...user }) => ({ ...user }));
}

function resolveDisplayName(participant: ParticipantState) {
  if (participant.displayName && participant.displayName.trim().length > 0) {
    return participant.displayName;
  }
  const fullName = [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim();
  return fullName.length > 0 ? fullName : participant.code;
}

function cloneParticipant(participant: ParticipantState): ParticipantRecord {
  return {
    code: participant.code,
    displayName: resolveDisplayName(participant),
    firstName: participant.firstName,
    lastName: participant.lastName,
    age: participant.age,
    gender: participant.gender,
    fatherName: participant.fatherName,
    motherName: participant.motherName,
    careHouse: participant.careHouse,
    createdAt: participant.createdAt,
    lastActiveAt: participant.lastActiveAt,
  };
}

function cloneProgressList(participant: ParticipantState): LearningProgress[] {
  return Object.values(participant.lessonProgress)
    .map((entry) => ({ ...entry }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

function sortByOrder<T extends { order?: number }>(items: T[]) {
  return items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function emitTopics() {
  const snapshot = sortByOrder(cloneTopics());
  topicListeners.forEach((listener) => listener(snapshot));
}

function emitContents(topicId: string) {
  const snapshot = sortByOrder(cloneContents().filter((item) => item.topicId === topicId));
  contentListeners.get(topicId)?.forEach((listener) => listener(snapshot));
}

function emitLessons(contentId: string) {
  const snapshot = sortByOrder(cloneLessons().filter((item) => item.contentId === contentId));
  lessonListeners.get(contentId)?.forEach((listener) => listener(snapshot));
}

function emitCustomPages() {
  const snapshot = cloneCustomPages();
  customPageListeners.forEach((listener) => listener(snapshot));
}

function emitUsers() {
  const snapshot = cloneUsers().sort((a, b) => a.fullName.localeCompare(b.fullName));
  userListeners.forEach((listener) => listener(snapshot));
}

function emitParticipant(code: string) {
  const participant = store.participants.find((item) => item.code === code);
  const payload = participant ? cloneParticipant(participant) : null;
  participantListeners.get(code)?.forEach((listener) => listener(payload));
}

function emitProgress(code: string) {
  const participant = store.participants.find((item) => item.code === code);
  const payload = participant ? cloneProgressList(participant) : [];
  progressListeners.get(code)?.forEach((listener) => listener(payload));
}

function emitCustomFields() {
  const snapshot = cloneCustomFields();
  customFieldListeners.forEach((listener) => listener(snapshot));
}

function emitCustomValues(code: string) {
  const snapshot = cloneCustomValues(code);
  customValueListeners.get(code)?.forEach((listener) => listener(snapshot));
}

function ensureId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2);
  const time = Date.now().toString(36);
  return `${time}-${random}`;
}

export function subscribeTopics(listener: TopicsListener) {
  topicListeners.add(listener);
  listener(sortByOrder(cloneTopics()));
  return () => {
    topicListeners.delete(listener);
  };
}

export function subscribeContents(topicId: string, listener: ContentsListener) {
  const bucket = contentListeners.get(topicId) ?? new Set<ContentsListener>();
  bucket.add(listener);
  contentListeners.set(topicId, bucket);
  listener(sortByOrder(cloneContents().filter((content) => content.topicId === topicId)));
  return () => {
    const group = contentListeners.get(topicId);
    if (!group) return;
    group.delete(listener);
    if (group.size === 0) {
      contentListeners.delete(topicId);
    }
  };
}

export function subscribeLessons(contentId: string, listener: LessonsListener) {
  const bucket = lessonListeners.get(contentId) ?? new Set<LessonsListener>();
  bucket.add(listener);
  lessonListeners.set(contentId, bucket);
  listener(sortByOrder(cloneLessons().filter((lesson) => lesson.contentId === contentId)));
  return () => {
    const group = lessonListeners.get(contentId);
    if (!group) return;
    group.delete(listener);
    if (group.size === 0) {
      lessonListeners.delete(contentId);
    }
  };
}

export function subscribeUsers(listener: UsersListener) {
  userListeners.add(listener);
  listener(cloneUsers());
  return () => {
    userListeners.delete(listener);
  };
}

export function subscribeParticipant(code: string, listener: ParticipantListener) {
  const bucket = participantListeners.get(code) ?? new Set<ParticipantListener>();
  bucket.add(listener);
  participantListeners.set(code, bucket);
  const participant = store.participants.find((item) => item.code === code);
  listener(participant ? cloneParticipant(participant) : null);
  return () => {
    const group = participantListeners.get(code);
    if (!group) return;
    group.delete(listener);
    if (group.size === 0) {
      participantListeners.delete(code);
    }
  };
}

export function subscribeProgress(code: string, listener: ProgressListener) {
  const bucket = progressListeners.get(code) ?? new Set<ProgressListener>();
  bucket.add(listener);
  progressListeners.set(code, bucket);
  const participant = store.participants.find((item) => item.code === code);
  listener(participant ? cloneProgressList(participant) : []);
  return () => {
    const group = progressListeners.get(code);
    if (!group) return;
    group.delete(listener);
    if (group.size === 0) {
      progressListeners.delete(code);
    }
  };
}

export function listTopics() {
  return sortByOrder(cloneTopics());
}

export function listContentsByTopic(topicId: string) {
  return sortByOrder(cloneContents().filter((item) => item.topicId === topicId));
}

export function listLessonsByContent(contentId: string) {
  return sortByOrder(cloneLessons().filter((item) => item.contentId === contentId));
}

export function getTopicById(id: string) {
  return store.topics.find((topic) => topic.id === id) ?? null;
}

export function getContentById(id: string) {
  return store.contents.find((content) => content.id === id) ?? null;
}

export function getLessonById(id: string) {
  return store.lessons.find((lesson) => lesson.id === id) ?? null;
}

export function listAllContentsSnapshot() {
  return cloneContents();
}

export function listAllLessonsSnapshot() {
  return cloneLessons();
}

export function insertTopic(data: Omit<Topic, 'id'> & { id?: string }) {
  const now = new Date();
  const topic: Topic = {
    id: data.id ?? ensureId(),
    name: data.name.trim(),
    coverImageUrl: data.coverImageUrl?.trim() || undefined,
    coverImageAlt: data.coverImageAlt?.trim() || undefined,
    category: data.category,
    color: data.color,
    order: data.order,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
  store.topics.push(topic);
  emitTopics();
  return topic;
}

export function patchTopic(id: string, patch: Partial<Topic>) {
  const topic = store.topics.find((item) => item.id === id);
  if (!topic) return;
  Object.assign(topic, patch, { updatedAt: new Date() });
  emitTopics();
}

export function removeTopic(id: string) {
  const topicsBefore = store.topics.length;
  store.topics = store.topics.filter((item) => item.id !== id);
  if (store.topics.length === topicsBefore) return;
  const contentsToRemove = store.contents.filter((content) => content.topicId === id).map((content) => content.id);
  store.contents = store.contents.filter((content) => content.topicId !== id);
  store.lessons = store.lessons.filter((lesson) => !contentsToRemove.includes(lesson.contentId));
  emitTopics();
  contentsToRemove.forEach((contentId) => emitLessons(contentId));
}

export function insertContent(data: Omit<Content, 'id'> & { id?: string }) {
  const now = new Date();
  const content: Content = {
    id: data.id ?? ensureId(),
    topicId: data.topicId,
    title: data.title.trim(),
    description: data.description?.trim() || undefined,
    coverImageUrl: data.coverImageUrl?.trim() || undefined,
    coverImageAlt: data.coverImageAlt?.trim() || undefined,
    estimatedDuration: data.estimatedDuration,
    difficulty: data.difficulty,
    order: data.order,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
  store.contents.push(content);
  emitContents(content.topicId);
  return content;
}

export function patchContent(id: string, patch: Partial<Content>) {
  const content = store.contents.find((item) => item.id === id);
  if (!content) return;
  Object.assign(content, patch, { updatedAt: new Date() });
  emitContents(content.topicId);
}

export function removeContent(id: string) {
  const content = store.contents.find((item) => item.id === id);
  if (!content) return;
  store.contents = store.contents.filter((item) => item.id !== id);
  store.lessons = store.lessons.filter((lesson) => lesson.contentId !== id);
  emitContents(content.topicId);
  emitLessons(id);
}

export function insertLesson(data: Omit<Lesson, 'id'> & { id?: string }) {
  const now = new Date();
  const lesson: Lesson = {
    id: data.id ?? ensureId(),
    contentId: data.contentId,
    title: data.title.trim(),
    youtubeUrl: data.youtubeUrl.trim(),
    description: data.description?.trim() || undefined,
    order: data.order,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
  store.lessons.push(lesson);
  emitLessons(lesson.contentId);
  return lesson;
}

export function patchLesson(id: string, patch: Partial<Lesson>) {
  const lesson = store.lessons.find((item) => item.id === id);
  if (!lesson) return;
  Object.assign(lesson, patch, { updatedAt: new Date() });
  emitLessons(lesson.contentId);
}

export function removeLesson(id: string) {
  const lesson = store.lessons.find((item) => item.id === id);
  if (!lesson) return;
  store.lessons = store.lessons.filter((item) => item.id !== id);
  emitLessons(lesson.contentId);
}

export function reorderTopics(ids: string[]) {
  ids.forEach((topicId, index) => {
    const topic = store.topics.find((item) => item.id === topicId);
    if (topic) topic.order = index;
  });
  emitTopics();
}

export function reorderContents(ids: string[]) {
  ids.forEach((contentId, index) => {
    const content = store.contents.find((item) => item.id === contentId);
    if (content) content.order = index;
  });
  store.contents.forEach((content) => emitContents(content.topicId));
}

export function reorderLessons(ids: string[]) {
  ids.forEach((lessonId, index) => {
    const lesson = store.lessons.find((item) => item.id === lessonId);
    if (lesson) lesson.order = index;
  });
  store.lessons.forEach((lesson) => emitLessons(lesson.contentId));
}

export function listUsers() {
  return cloneUsers();
}

export function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return store.users.find((user) => user.email.toLowerCase() === normalized) ?? null;
}

export function findUserById(uid: string) {
  return store.users.find((user) => user.uid === uid) ?? null;
}

export function insertUser(data: {
  uid?: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  password: string;
}) {
  const now = new Date();
  const user: StoredUser = {
    uid: data.uid ?? ensureId(),
    email: data.email.trim(),
    fullName: data.fullName.trim(),
    role: data.role,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
    passwordHash: '', // Será preenchido pelo backend
  };
  store.users.push(user);
  emitUsers();
  return { ...user };
}

export function patchUser(uid: string, patch: Partial<UserRecord>) {
  const user = store.users.find((item) => item.uid === uid);
  if (!user) return;
  Object.assign(user, patch, { updatedAt: new Date() });
  emitUsers();
}

export function setUserPassword(uid: string, password: string) {
  const user = store.users.find((item) => item.uid === uid);
  if (!user) return;
  user.passwordHash = bcrypt.hashSync(password, 10);
  user.updatedAt = new Date();
  emitUsers();
}

export function removeUser(uid: string) {
  const prevLength = store.users.length;
  store.users = store.users.filter((user) => user.uid !== uid);
  if (store.users.length !== prevLength) {
    emitUsers();
  }
}

export function verifyPassword(hash: string, password: string) {
  return bcrypt.compare(password, hash);
}

export function listParticipants() {
  return store.participants.map((participant) => ({
    ...cloneParticipant(participant),
    lessonProgress: { ...participant.lessonProgress },
  }));
}

export function findParticipant(code: string) {
  const participant = store.participants.find((item) => item.code === code);
  return participant ? { ...cloneParticipant(participant) } : null;
}

export function upsertParticipant(data: ParticipantState) {
  const normalized: ParticipantState = {
    ...data,
    firstName: data.firstName?.trim() || undefined,
    lastName: data.lastName?.trim() || undefined,
    gender: data.gender?.trim() || undefined,
    fatherName: data.fatherName?.trim() || undefined,
    motherName: data.motherName?.trim() || undefined,
    careHouse: data.careHouse?.trim() || undefined,
  };
  normalized.displayName = resolveDisplayName({
    ...normalized,
    lessonProgress: normalized.lessonProgress,
  });
  const existingIndex = store.participants.findIndex((item) => item.code === normalized.code);
  if (existingIndex >= 0) {
    store.participants[existingIndex] = {
      ...store.participants[existingIndex],
      ...normalized,
    };
  } else {
    store.participants.push({ ...normalized });
  }
  emitParticipant(normalized.code);
  emitProgress(normalized.code);
}

export function touchParticipant(code: string, patch: Partial<ParticipantState>) {
  const participant = store.participants.find((item) => item.code === code);
  if (!participant) return;
  Object.assign(participant, patch);
  participant.firstName = participant.firstName?.trim() || undefined;
  participant.lastName = participant.lastName?.trim() || undefined;
  participant.gender = participant.gender?.trim() || undefined;
  participant.fatherName = participant.fatherName?.trim() || undefined;
  participant.motherName = participant.motherName?.trim() || undefined;
  participant.careHouse = participant.careHouse?.trim() || undefined;
  participant.displayName = resolveDisplayName(participant);
  emitParticipant(code);
}

export function removeParticipant(code: string) {
  const index = store.participants.findIndex((item) => item.code === code);
  if (index === -1) return;
  store.participants.splice(index, 1);
  emitParticipant(code);
  emitProgress(code);
}

export function recordLessonProgress(code: string, lessonId: string, payload: LearningProgress) {
  let participant = store.participants.find((item) => item.code === code);
  if (!participant) {
    participant = {
      code,
      displayName: code,
      firstName: undefined,
      lastName: undefined,
      age: undefined,
      gender: undefined,
      fatherName: undefined,
      motherName: undefined,
      careHouse: undefined,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      lessonProgress: {},
    };
    store.participants.push(participant);
  }
  participant.lessonProgress = {
    ...participant.lessonProgress,
    [lessonId]: { ...payload },
  };
  participant.lastActiveAt = new Date();
  participant.displayName = resolveDisplayName(participant);
  emitParticipant(code);
  emitProgress(code);
}

export function resetLessonProgress(code: string, lessonId: string) {
  const participant = store.participants.find((item) => item.code === code);
  if (!participant || !participant.lessonProgress[lessonId]) return;
  participant.lessonProgress[lessonId] = {
    ...participant.lessonProgress[lessonId],
    lastPosition: 0,
    duration: 0,
    completed: false,
    completedAt: undefined,
    updatedAt: new Date(),
  };
  emitParticipant(code);
  emitProgress(code);
}

export function getLessonProgress(code: string, lessonId: string) {
  const participant = store.participants.find((item) => item.code === code);
  if (!participant) return null;
  const entry = participant.lessonProgress[lessonId];
  return entry ? { ...entry } : null;
}

export function listParticipantCustomPages(): ParticipantCustomPage[] {
  return cloneCustomPages();
}

export function subscribeParticipantCustomPages(listener: CustomPageListener) {
  customPageListeners.add(listener);
  listener(cloneCustomPages());
  return () => {
    customPageListeners.delete(listener);
  };
}

export function upsertParticipantCustomPage(page: ParticipantCustomPage) {
  const index = store.participantCustomPages.findIndex((item) => item.id === page.id);
  if (index >= 0) {
    store.participantCustomPages[index] = {
      ...store.participantCustomPages[index],
      ...page,
    };
  } else {
    store.participantCustomPages.push({ ...page });
  }
  store.participantCustomPages.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  emitCustomPages();
}

export function bulkUpdateParticipantCustomPageOrder(entries: Array<{ id: string; order: number }>) {
  const orderMap = new Map(entries.map((item) => [item.id, item.order]));
  store.participantCustomPages = store.participantCustomPages.map((page) => {
    const nextOrder = orderMap.get(page.id);
    return nextOrder === undefined ? page : { ...page, order: nextOrder };
  });
  store.participantCustomPages.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  emitCustomPages();
}

export function removeParticipantCustomPage(id: string) {
  const index = store.participantCustomPages.findIndex((page) => page.id === id);
  if (index === -1) return;
  store.participantCustomPages.splice(index, 1);
  emitCustomPages();
}

export function listParticipantCustomFields(): ParticipantCustomField[] {
  return cloneCustomFields();
}

export function subscribeParticipantCustomFields(listener: CustomFieldListener) {
  customFieldListeners.add(listener);
  listener(cloneCustomFields());
  return () => {
    customFieldListeners.delete(listener);
  };
}

export function upsertParticipantCustomField(field: ParticipantCustomField) {
  const normalizedField: ParticipantCustomField = {
    ...field,
    pageId: normalizePageIdentifier(field.pageId ?? null),
  };

  const index = store.participantCustomFields.findIndex((item) => item.id === field.id);
  if (index >= 0) {
    store.participantCustomFields[index] = {
      ...store.participantCustomFields[index],
      ...normalizedField,
    };
  } else {
    store.participantCustomFields.push({ ...normalizedField });
  }
  store.participantCustomFields.sort(fieldComparator);
  emitCustomFields();
}

export function bulkUpdateParticipantCustomFieldOrder(entries: Array<{ id: string; order: number }>) {
  const orderMap = new Map(entries.map((item) => [item.id, item.order]));
  store.participantCustomFields = store.participantCustomFields.map((field) => {
    const nextOrder = orderMap.get(field.id);
    return nextOrder === undefined ? field : { ...field, order: nextOrder };
  });
  store.participantCustomFields.sort(fieldComparator);
  emitCustomFields();
}

function fieldComparator(a: ParticipantCustomField, b: ParticipantCustomField) {
  const pageAId = normalizePageIdentifier(a.pageId ?? null) ?? '';
  const pageBId = normalizePageIdentifier(b.pageId ?? null) ?? '';
  const pageA = pageAId.localeCompare(pageBId);
  if (pageA !== 0) return pageA;
  if (a.order !== b.order) return a.order - b.order;
  return a.label.localeCompare(b.label);
}

export function removeParticipantCustomField(id: string) {
  const index = store.participantCustomFields.findIndex((field) => field.id === id);
  if (index === -1) return;
  store.participantCustomFields.splice(index, 1);
  emitCustomFields();
}

export function listParticipantCustomValues(code: string): ParticipantCustomValue[] {
  return cloneCustomValues(code);
}

export function subscribeParticipantCustomValues(code: string, listener: CustomValueListener) {
  const key = code.toUpperCase();
  let bucket = customValueListeners.get(key);
  if (!bucket) {
    bucket = new Set();
    customValueListeners.set(key, bucket);
  }
  bucket.add(listener);
  listener(cloneCustomValues(key));
  return () => {
    bucket?.delete(listener);
    if (bucket && bucket.size === 0) {
      customValueListeners.delete(key);
    }
  };
}

export function upsertParticipantCustomValue(value: ParticipantCustomValue) {
  const normalizedCode = value.code.toUpperCase();
  const index = store.participantCustomValues.findIndex((entry) => entry.id === value.id);
  if (index >= 0) {
    store.participantCustomValues[index] = {
      ...store.participantCustomValues[index],
      ...value,
      code: normalizedCode,
    };
  } else {
    store.participantCustomValues.push({ ...value, code: normalizedCode });
  }
  emitCustomValues(normalizedCode);
}

export function removeParticipantCustomValue(id: string) {
  const index = store.participantCustomValues.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const [removed] = store.participantCustomValues.splice(index, 1);
  if (removed) {
    emitCustomValues(removed.code.toUpperCase());
  }
}

export function findParticipantCustomValueById(id: string): ParticipantCustomValue | null {
  const entry = store.participantCustomValues.find((item) => item.id === id);
  if (!entry) return null;
  return {
    ...entry,
    metadata: entry.metadata ? { ...entry.metadata } : undefined,
  };
}

export function exportStore(): DataStoreDump {
  return {
    version: STORE_VERSION,
    users: store.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
    topics: store.topics.map((topic) => ({
      ...topic,
      createdAt: topic.createdAt?.toISOString(),
      updatedAt: topic.updatedAt?.toISOString(),
    })),
    contents: store.contents.map((content) => ({
      ...content,
      createdAt: content.createdAt?.toISOString(),
      updatedAt: content.updatedAt?.toISOString(),
    })),
    lessons: store.lessons.map((lesson) => ({
      ...lesson,
      createdAt: lesson.createdAt?.toISOString(),
      updatedAt: lesson.updatedAt?.toISOString(),
    })),
    participants: store.participants.map((participant) => ({
      code: participant.code,
      displayName: participant.displayName,
      firstName: participant.firstName,
      lastName: participant.lastName,
      age: participant.age ?? undefined,
      gender: participant.gender,
      fatherName: participant.fatherName,
      motherName: participant.motherName,
      careHouse: participant.careHouse,
      createdAt: participant.createdAt.toISOString(),
      lastActiveAt: participant.lastActiveAt?.toISOString(),
      lessonProgress: Object.fromEntries(
        Object.entries(participant.lessonProgress).map(([lessonId, entry]) => [
          lessonId,
          {
            ...entry,
            updatedAt: entry.updatedAt.toISOString(),
            completedAt: entry.completedAt?.toISOString(),
          },
        ]),
      ),
    })),
    participantCustomPages: store.participantCustomPages.map((page) => ({
      id: page.id,
      label: page.label,
      order: page.order,
      icon: page.icon,
      color: page.color,
      isArchived: page.isArchived,
      createdBy: page.createdBy,
      createdAt: page.createdAt.toISOString(),
      updatedBy: page.updatedBy,
      updatedAt: page.updatedAt.toISOString(),
    })),
    participantCustomFields: store.participantCustomFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      description: field.description,
      constraints: field.constraints,
      order: field.order,
      pageId: field.pageId ?? null,
      isRequired: field.isRequired,
      isArchived: field.isArchived,
      createdBy: field.createdBy,
      createdAt: field.createdAt.toISOString(),
      updatedBy: field.updatedBy,
      updatedAt: field.updatedAt.toISOString(),
    })),
    participantCustomValues: store.participantCustomValues.map((entry) => ({
      id: entry.id,
      code: entry.code,
      fieldId: entry.fieldId,
      value: entry.value,
      metadata: entry.metadata,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString(),
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt.toISOString(),
    })),
  };
}

export function importStore(dump: DataStoreDump) {
  if (!dump || typeof dump !== 'object') {
    throw new Error('Arquivo inválido');
  }

  const toBoolean = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  };

  const parseJson = (value: unknown): Record<string, unknown> => {
    if (value == null) return {};
    if (typeof value === 'object') return { ...(value as Record<string, unknown>) };
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  };

  store.users = dump.users.map((user) => ({
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }));

  store.topics = dump.topics.map((topic) => ({
    ...topic,
    createdAt: topic.createdAt ? new Date(topic.createdAt) : undefined,
    updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : undefined,
  }));

  store.contents = dump.contents.map((content) => ({
    ...content,
    createdAt: content.createdAt ? new Date(content.createdAt) : undefined,
    updatedAt: content.updatedAt ? new Date(content.updatedAt) : undefined,
  }));

  store.lessons = dump.lessons.map((lesson) => ({
    ...lesson,
    createdAt: lesson.createdAt ? new Date(lesson.createdAt) : undefined,
    updatedAt: lesson.updatedAt ? new Date(lesson.updatedAt) : undefined,
  }));

  store.participants = dump.participants.map((participant) => {
    const age = (() => {
      if (typeof participant.age === 'number' && Number.isFinite(participant.age)) {
        return participant.age;
      }
      if (typeof participant.age === 'string') {
        const parsed = Number(participant.age);
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    })();

    const base: ParticipantState = {
      code: participant.code,
      displayName: participant.displayName,
      firstName: participant.firstName,
      lastName: participant.lastName,
      age,
      gender: participant.gender,
      fatherName: participant.fatherName,
      motherName: participant.motherName,
      careHouse: participant.careHouse,
      createdAt: new Date(participant.createdAt),
      lastActiveAt: participant.lastActiveAt ? new Date(participant.lastActiveAt) : undefined,
      lessonProgress: Object.fromEntries(
        Object.entries(participant.lessonProgress ?? {}).map(([lessonId, entry]) => [
          lessonId,
          {
            ...entry,
            updatedAt: new Date(entry.updatedAt),
            completedAt: entry.completedAt ? new Date(entry.completedAt) : undefined,
          },
        ]),
      ),
    };

    base.displayName = resolveDisplayName(base);
    return base;
  });

  store.participantCustomPages = (dump.participantCustomPages ?? []).map((page) => ({
    id: page.id,
    label: page.label ?? '',
    order: (() => {
      const numeric = Number(page.order);
      return Number.isFinite(numeric) ? numeric : 0;
    })(),
    icon: page.icon ?? undefined,
    color: page.color ?? undefined,
    isArchived: toBoolean(page.isArchived),
    createdBy: page.createdBy ?? undefined,
    createdAt: page.createdAt ? new Date(page.createdAt) : new Date(),
    updatedBy: page.updatedBy ?? undefined,
    updatedAt: page.updatedAt ? new Date(page.updatedAt) : new Date(),
  }));
  store.participantCustomPages.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  const allowedFieldTypes: ParticipantCustomField['type'][] = ['text', 'textarea', 'number', 'cpf', 'rg', 'phone', 'date', 'email', 'url'];

  store.participantCustomFields = (dump.participantCustomFields ?? []).map((field) => {
    const rawType = typeof field.type === 'string' ? field.type.toLowerCase().trim() : 'text';
    const normalizedType = allowedFieldTypes.includes(rawType as ParticipantCustomField['type'])
      ? (rawType as ParticipantCustomField['type'])
      : 'text';
    const rawPageId =
      (field as Record<string, unknown>).pageId ??
      (field as Record<string, unknown>).paginaId ??
      null;

    return {
      id: field.id,
      label: field.label ?? '',
      type: normalizedType,
      description: field.description ?? '',
      constraints: parseJson(field.constraints),
      order: (() => {
        const numeric = Number(field.order);
        return Number.isFinite(numeric) ? numeric : 0;
      })(),
      pageId: normalizePageIdentifier(rawPageId),
      isRequired: toBoolean(field.isRequired),
      isArchived: toBoolean(field.isArchived),
      createdBy: field.createdBy ?? undefined,
      createdAt: field.createdAt ? new Date(field.createdAt) : new Date(),
      updatedBy: field.updatedBy ?? undefined,
      updatedAt: field.updatedAt ? new Date(field.updatedAt) : new Date(),
    };
  });

  store.participantCustomValues = (dump.participantCustomValues ?? []).map((entry) => ({
    id: entry.id,
    code: entry.code,
    fieldId: entry.fieldId,
    value: entry.value,
    metadata: parseJson(entry.metadata),
    createdBy: entry.createdBy ?? undefined,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    updatedBy: entry.updatedBy ?? undefined,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
  }));

  store.participantCustomFields.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  emitTopics();
  store.contents.forEach((content) => emitContents(content.topicId));
  store.lessons.forEach((lesson) => emitLessons(lesson.contentId));
  emitUsers();
  store.participants.forEach((participant) => {
    emitParticipant(participant.code);
    emitProgress(participant.code);
  });
  emitCustomPages();
  emitCustomFields();
  const codes = new Set(store.participantCustomValues.map((entry) => entry.code));
  codes.forEach((code) => emitCustomValues(code));
}
