import {
  getLessonProgress as getLessonProgressInternal,
  listParticipants,
  recordLessonProgress,
  resetLessonProgress as resetLessonProgressInternal,
  subscribeParticipant,
  subscribeProgress,
  touchParticipant,
  upsertParticipant,
  removeParticipant,
} from './memoryStore';
import type { LearningProgress, ParticipantRecord } from './types';
import { hydrateFromRemote } from './remoteSync';
import { isBackendAvailable, remoteUpsertRecords, remoteFetchParticipant, remoteDeleteRecord } from './remoteStore';
import {
  loadSnapshot as loadCachedSnapshot,
  saveLesson as saveCachedLesson,
  saveSnapshot as saveCachedSnapshot,
  removeSnapshot as clearCachedSnapshot,
  deserializeLessons as deserializeCachedLessons,
  isolateSnapshot as isolateCachedSnapshot,
} from './progressCache';

export type { ParticipantRecord, LearningProgress } from './types';

export type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  totalWatchTime: number;
  lastUpdated: Date;
};

type SaveLessonProgressParams = {
  participantId: string;
  lessonId: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  contentId?: string;
  topicId?: string;
};

export type ParticipantProfileInput = {
  firstName: string;
  lastName?: string;
  age?: number | null;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  careHouse?: string;
};

export type ParticipantProfilePatch = Partial<ParticipantProfileInput>;

const SYNC_DEBOUNCE_MS = 1500;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let syncQueued = false;
const dirtyParticipants = new Set<string>();

function serializeParticipantForRemote(participant: ReturnType<typeof listParticipants>[number]) {
  return {
    code: participant.code,
    firstName: participant.firstName ?? '',
    lastName: participant.lastName ?? '',
    age: typeof participant.age === 'number' && Number.isFinite(participant.age) ? participant.age : undefined,
    gender: participant.gender ?? '',
    fatherName: participant.fatherName ?? '',
    motherName: participant.motherName ?? '',
    careHouse: participant.careHouse ?? '',
    createdAt: participant.createdAt,
    lastActiveAt: participant.lastActiveAt ?? participant.createdAt,
    lessonProgress: JSON.stringify(participant.lessonProgress ?? {}),
  };
}

function scheduleParticipantSync(immediate = false) {
  if (!isBackendAvailable()) return;
  if (dirtyParticipants.size === 0) return;
  if (immediate) {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    void performParticipantSync();
    return;
  }
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void performParticipantSync();
  }, SYNC_DEBOUNCE_MS);
}

async function performParticipantSync() {
  if (!isBackendAvailable()) return;
  if (dirtyParticipants.size === 0) return;
  if (syncInFlight) {
    syncQueued = true;
    return;
  }
  syncInFlight = true;
  try {
    const codes = Array.from(dirtyParticipants);
    const participants = listParticipants();
    const payload: Array<Record<string, unknown>> = [];
    const snapshots = new Map<string, Record<string, LearningProgress>>();
    codes.forEach((code) => {
      const participant = participants.find((item) => item.code === code);
      if (!participant) {
        dirtyParticipants.delete(code);
        return;
      }
      payload.push(serializeParticipantForRemote(participant));
      const normalizedProgress = normalizeProgressMap(
        participant.lessonProgress as Record<string, Partial<LearningProgress>>,
        participant.code,
      );
      snapshots.set(code, normalizedProgress);
    });
    if (!payload.length) return;
    await remoteUpsertRecords('participants', payload);
    payload.forEach((record) => {
      const code = String(record.code);
      dirtyParticipants.delete(code);
      const progressSnapshot = snapshots.get(code);
      if (progressSnapshot) {
        saveCachedSnapshot(code, progressSnapshot, { dirty: false });
      }
    });
  } catch (error) {
    console.warn('Falha ao sincronizar participantes com backend:', error);
  } finally {
    syncInFlight = false;
    if (syncQueued) {
      syncQueued = false;
      scheduleParticipantSync(true);
    }
  }
}

function reapplyCachedProgress() {
  const participants = listParticipants();
  participants.forEach((participant) => {
    const cached = loadCachedProgress(participant.code);
    if (Object.keys(cached.lessons).length === 0) return;
    applyParticipantSnapshot(
      participant.code,
      { lessonProgress: cached.lessons },
      { updateCache: true, dirty: cached.dirty },
    );
    if (cached.dirty) scheduleParticipantSync(true);
  });
}

function normalizeNumber(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeDate(value: unknown, fallback: Date = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate;
  }
  if (typeof value === 'string' && value.length > 0) {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate;
  }
  return fallback;
}

function createLearningProgress(
  participantId: string,
  lessonId: string,
  payload: Partial<LearningProgress> | undefined,
): LearningProgress {
  const normalizedParticipant = participantId.toUpperCase();
  const normalizedLesson = typeof payload?.lessonId === 'string' && payload.lessonId.trim().length > 0
    ? payload.lessonId
    : lessonId;
  const updatedAt = normalizeDate(payload?.updatedAt, new Date());
  const completed = Boolean(payload?.completed);
  const completedAtValue = payload?.completedAt
    ? normalizeDate(payload.completedAt, updatedAt)
    : undefined;

  return {
    id: normalizedLesson,
    participantId: normalizedParticipant,
    lessonId: normalizedLesson,
    contentId: normalizeOptionalString(payload?.contentId),
    topicId: normalizeOptionalString(payload?.topicId),
    lastPosition: normalizeNumber(payload?.lastPosition),
    duration: normalizeNumber(payload?.duration),
    completed,
    updatedAt,
    completedAt: completed ? completedAtValue : undefined,
  };
}

function normalizeProgressMap(
  progress: Record<string, Partial<LearningProgress>> | undefined,
  participantId: string,
): Record<string, LearningProgress> {
  if (!progress) return {};
  const map: Record<string, LearningProgress> = {};
  Object.entries(progress).forEach(([lessonId, value]) => {
    map[lessonId] = createLearningProgress(participantId, lessonId, value);
  });
  return map;
}

function cloneProgress(progress: LearningProgress): LearningProgress {
  return {
    id: progress.lessonId,
    participantId: progress.participantId,
    lessonId: progress.lessonId,
    contentId: progress.contentId,
    topicId: progress.topicId,
    lastPosition: progress.lastPosition,
    duration: progress.duration,
    completed: progress.completed,
    updatedAt: new Date(progress.updatedAt.getTime()),
    completedAt: progress.completedAt ? new Date(progress.completedAt.getTime()) : undefined,
  };
}

function mergeProgressMaps(
  primary: Record<string, LearningProgress>,
  secondary: Record<string, LearningProgress>,
): Record<string, LearningProgress> {
  const merged: Record<string, LearningProgress> = {};
  Object.entries(secondary).forEach(([lessonId, progress]) => {
    merged[lessonId] = cloneProgress(progress);
  });
  Object.entries(primary).forEach(([lessonId, progress]) => {
    const current = merged[lessonId];
    if (!current || progress.updatedAt.getTime() >= current.updatedAt.getTime()) {
      merged[lessonId] = cloneProgress(progress);
    }
  });
  return merged;
}

export function computeParticipantDisplayName(params: {
  code: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}) {
  const explicit = params.displayName?.trim();
  if (explicit) return explicit;
  const fullName = [params.firstName, params.lastName]
    .map((segment) => segment?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName.length > 0) return fullName;
  return params.code;
}

function markParticipantDirty(code: string) {
  dirtyParticipants.add(code.toUpperCase());
}

type ParticipantSnapshot = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  careHouse?: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  lessonProgress?: Record<string, LearningProgress>;
};

function applyParticipantSnapshot(
  code: string,
  snapshot: ParticipantSnapshot,
  options?: { updateCache?: boolean; dirty?: boolean },
) {
  const normalizedCode = code.toUpperCase();
  const existing = listParticipants().find((item) => item.code === normalizedCode);
  const existingProgress = normalizeProgressMap(
    (existing?.lessonProgress ?? {}) as Record<string, Partial<LearningProgress>>,
    normalizedCode,
  );
  const incomingProgress = normalizeProgressMap(
    snapshot.lessonProgress as Record<string, Partial<LearningProgress>> | undefined,
    normalizedCode,
  );
  const mergedProgress = mergeProgressMaps(incomingProgress, existingProgress);
  const createdAt = snapshot.createdAt ?? existing?.createdAt ?? new Date();
  const lastActiveAt = snapshot.lastActiveAt ?? existing?.lastActiveAt ?? createdAt;

  const firstName = normalizeOptionalString(snapshot.firstName ?? existing?.firstName);
  const lastName = normalizeOptionalString(snapshot.lastName ?? existing?.lastName);
  const gender = normalizeOptionalString(snapshot.gender ?? existing?.gender);
  const fatherName = normalizeOptionalString(snapshot.fatherName ?? existing?.fatherName);
  const motherName = normalizeOptionalString(snapshot.motherName ?? existing?.motherName);
  const age = normalizeOptionalNumber(snapshot.age ?? existing?.age);
  const careHouse = normalizeOptionalString(snapshot.careHouse ?? existing?.careHouse);

  const participantState = {
    code: normalizedCode,
    displayName: computeParticipantDisplayName({
      code: normalizedCode,
      displayName: snapshot.displayName ?? existing?.displayName,
      firstName: firstName ?? existing?.firstName,
      lastName: lastName ?? existing?.lastName,
    }),
    firstName,
    lastName,
    age,
    gender,
    fatherName,
    motherName,
    careHouse,
    createdAt,
    lastActiveAt,
    lessonProgress: mergedProgress,
  };

  upsertParticipant(participantState);
  if (options?.updateCache) {
    saveCachedSnapshot(normalizedCode, mergedProgress, { dirty: options.dirty ?? false });
  }
  return participantState;
}

function toParticipantRecord(state: {
  code: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  createdAt: Date;
  lastActiveAt?: Date;
}): ParticipantRecord {
  return {
    code: state.code,
    displayName: state.displayName,
    firstName: state.firstName,
    lastName: state.lastName,
    age: state.age ?? undefined,
    gender: state.gender,
    fatherName: state.fatherName,
    motherName: state.motherName,
    createdAt: state.createdAt,
    lastActiveAt: state.lastActiveAt,
  };
}

function loadCachedProgress(participantId: string): { lessons: Record<string, LearningProgress>; dirty: boolean } {
  const snapshot = loadCachedSnapshot(participantId);
  const lessons = deserializeCachedLessons(snapshot?.lessons ?? null);
  const normalized = normalizeProgressMap(
    lessons as Record<string, Partial<LearningProgress>> | undefined,
    participantId,
  );
  return { lessons: normalized, dirty: snapshot?.dirty ?? false };
}

function normalizeLessonProgressPayload(
  payload: unknown,
  participantId: string,
): Record<string, LearningProgress> {
  if (!payload) return {};
  let raw = payload;
  if (typeof payload === 'string') {
    try {
      raw = JSON.parse(payload);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object') return {};
  const entries = raw as Record<string, Partial<LearningProgress>>;
  return normalizeProgressMap(entries, participantId);
}

export function generateAccessCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function createParticipant(input: ParticipantProfileInput): Promise<ParticipantRecord> {
  const firstNameValue = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  if (!firstNameValue) {
    throw new Error('first_name_required');
  }

  const lastName = normalizeOptionalString(input.lastName);
  const age = normalizeOptionalNumber(input.age ?? undefined);
  const gender = normalizeOptionalString(input.gender);
  const fatherName = normalizeOptionalString(input.fatherName);
  const motherName = normalizeOptionalString(input.motherName);
  const careHouse = normalizeOptionalString(input.careHouse);

  const code = generateAccessCode();
  const now = new Date();
  clearCachedSnapshot(code);

  const participantState = {
    code,
    displayName: computeParticipantDisplayName({
      code,
      firstName: firstNameValue,
      lastName,
    }),
    firstName: firstNameValue,
    lastName,
    age,
    gender,
    fatherName,
    motherName,
    careHouse,
    createdAt: now,
    lastActiveAt: now,
    lessonProgress: {},
  };

  upsertParticipant(participantState);
  saveCachedSnapshot(code, {});
  markParticipantDirty(code);
  scheduleParticipantSync(true);
  return toParticipantRecord(participantState);
}

export async function updateParticipant(code: string, patch: ParticipantProfilePatch): Promise<ParticipantRecord> {
  const normalizedCode = code.toUpperCase();
  const participants = listParticipants();
  const existing = participants.find((participant) => participant.code === normalizedCode);
  if (!existing) {
    throw new Error('participant_not_found');
  }

  const updatedFirstName = patch.firstName !== undefined
    ? (normalizeOptionalString(patch.firstName) ?? '')
    : normalizeOptionalString(existing.firstName) ?? '';
  if (!updatedFirstName) {
    throw new Error('first_name_required');
  }

  const updatedLastName = patch.lastName !== undefined
    ? normalizeOptionalString(patch.lastName)
    : normalizeOptionalString(existing.lastName);
  const updatedAge = patch.age !== undefined ? normalizeOptionalNumber(patch.age) : (typeof existing.age === 'number' ? existing.age : undefined);
  const updatedGender = patch.gender !== undefined
    ? normalizeOptionalString(patch.gender)
    : normalizeOptionalString(existing.gender);
  const updatedFatherName = patch.fatherName !== undefined
    ? normalizeOptionalString(patch.fatherName)
    : normalizeOptionalString(existing.fatherName);
  const updatedMotherName = patch.motherName !== undefined
    ? normalizeOptionalString(patch.motherName)
    : normalizeOptionalString(existing.motherName);
  const updatedCareHouse = patch.careHouse !== undefined
    ? normalizeOptionalString(patch.careHouse)
    : normalizeOptionalString(existing.careHouse);

  const participantState = applyParticipantSnapshot(
    normalizedCode,
    {
      firstName: updatedFirstName,
      lastName: updatedLastName,
      age: updatedAge,
      gender: updatedGender,
      fatherName: updatedFatherName,
      motherName: updatedMotherName,
      careHouse: updatedCareHouse,
      createdAt: existing.createdAt,
      lastActiveAt: existing.lastActiveAt,
      lessonProgress: existing.lessonProgress ?? {},
    },
    { updateCache: true, dirty: true },
  );

  markParticipantDirty(normalizedCode);
  scheduleParticipantSync(true);
  return toParticipantRecord(participantState);
}

export async function deleteParticipant(code: string): Promise<void> {
  const normalizedCode = code.toUpperCase();
  removeParticipant(normalizedCode);
  clearCachedSnapshot(normalizedCode);

  if (!isBackendAvailable()) return;

  try {
    await remoteDeleteRecord('participants', normalizedCode);
    await hydrateFromRemote();
  } catch (error) {
    console.error('Falha ao remover participante no backend:', error);
    throw error;
  }
}

export async function fetchParticipant(code: string): Promise<ParticipantRecord | null> {
  const upperCode = code.toUpperCase();
  isolateCachedSnapshot(upperCode);
  const cachedProgress = loadCachedProgress(upperCode);
  const cachedState = applyParticipantSnapshot(
    upperCode,
    { lessonProgress: cachedProgress.lessons },
    { updateCache: false },
  );

  try {
    const data = await remoteFetchParticipant(upperCode);
    if (!data) {
      if (Object.keys(cachedProgress.lessons).length === 0) return null;
      return toParticipantRecord(cachedState);
    }

    const remoteProgress = normalizeLessonProgressPayload(data.lessonProgress, upperCode);
    const mergedProgress = mergeProgressMaps(remoteProgress, cachedProgress.lessons);
    const firstName = normalizeOptionalString(data.firstName);
    const lastName = normalizeOptionalString(data.lastName);
    const gender = normalizeOptionalString(data.gender);
    const fatherName = normalizeOptionalString(data.fatherName);
    const motherName = normalizeOptionalString(data.motherName);
    const age = normalizeOptionalNumber(data.age);
    const careHouse = normalizeOptionalString(data.careHouse);
    const participantState = applyParticipantSnapshot(
      upperCode,
      {
        displayName: data.displayName ? String(data.displayName) : undefined,
        firstName,
        lastName,
        age,
        gender,
        fatherName,
        motherName,
        careHouse,
        createdAt: normalizeDate(data.createdAt),
        lastActiveAt: data.lastActiveAt ? normalizeDate(data.lastActiveAt) : undefined,
        lessonProgress: mergedProgress,
      },
      { updateCache: true, dirty: cachedProgress.dirty },
    );
    return toParticipantRecord(participantState);
  } catch (error) {
    console.error('Erro ao buscar participante:', error);
    if (Object.keys(cachedProgress.lessons).length === 0) return null;
    return toParticipantRecord(cachedState);
  } finally {
    if (cachedProgress.dirty) {
      scheduleParticipantSync(true);
    }
  }
}

export function listenParticipant(code: string, cb: (participant: ParticipantRecord | null) => void) {
  return subscribeParticipant(code.toUpperCase(), cb);
}

export async function saveLessonProgress(params: SaveLessonProgressParams) {
  const now = new Date();
  const participantId = params.participantId.toUpperCase();

  const progress: LearningProgress = {
    id: params.lessonId,
    participantId,
    lessonId: params.lessonId,
    contentId: params.contentId?.trim() || undefined,
    topicId: params.topicId?.trim() || undefined,
    lastPosition: Math.max(0, params.lastPosition || 0),
    duration: Math.max(0, params.duration || 0),
    completed: Boolean(params.completed),
    updatedAt: now,
    completedAt: params.completed ? now : undefined,
  };

  recordLessonProgress(participantId, params.lessonId, progress);
  saveCachedLesson(participantId, progress);
  touchParticipant(participantId, { lastActiveAt: now });
  markParticipantDirty(participantId);
  scheduleParticipantSync(progress.completed);
}

export async function getLessonProgress(participantId: string, lessonId: string): Promise<LearningProgress | null> {
  const normalized = participantId.toUpperCase();
  const local = getLessonProgressInternal(normalized, lessonId);
  if (local) return local;

  const cached = loadCachedProgress(normalized);
  const entry = cached.lessons[lessonId];
  if (!entry) return null;

  applyParticipantSnapshot(
    normalized,
    { lessonProgress: { [lessonId]: entry } },
    { updateCache: false },
  );
  if (cached.dirty) {
    scheduleParticipantSync(true);
  }
  return cloneProgress(entry);
}

export async function getAllProgressForParticipant(participantId: string): Promise<LearningProgress[]> {
  const participant = listParticipants().find((item) => item.code === participantId.toUpperCase());
  if (!participant) return [];
  const progress = Object.values(participant.lessonProgress ?? {}).map((entry) => ({ ...entry }));
  return progress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function subscribeToProgress(participantId: string, callback: (progress: LearningProgress[]) => void) {
  return subscribeProgress(participantId.toUpperCase(), callback);
}

export async function getAllParticipants() {
  if (isBackendAvailable()) {
    await hydrateFromRemote();
  }
  return listParticipants().map((participant) => {
    const progressList = Object.values(participant.lessonProgress ?? {}).map((entry) => ({ ...entry }));
    const sorted = progressList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      id: participant.code,
      displayName: computeParticipantDisplayName({
        code: participant.code,
        displayName: participant.displayName,
        firstName: participant.firstName,
        lastName: participant.lastName,
      }),
      firstName: participant.firstName,
      lastName: participant.lastName,
      age: participant.age,
      gender: participant.gender,
      fatherName: participant.fatherName,
      motherName: participant.motherName,
      careHouse: participant.careHouse,
      totalLessons: sorted.length,
      completedLessons: sorted.filter((p) => p.completed).length,
      totalWatchTime: sorted.reduce((total, p) => total + (p.lastPosition || 0), 0),
      lastActive: participant.lastActiveAt ?? participant.createdAt,
      progress: sorted,
    };
  });
}

export async function getProgressStats(participantId: string): Promise<ProgressStats> {
  const allProgress = await getAllProgressForParticipant(participantId);
  const totalLessons = allProgress.length;
  const completedLessons = allProgress.filter((p) => p.completed).length;
  const totalWatchTime = allProgress.reduce((total, p) => total + (p.lastPosition || 0), 0);
  const lastUpdated = allProgress.length > 0 ? allProgress[0].updatedAt : new Date();

  return {
    totalLessons,
    completedLessons,
    totalWatchTime,
    lastUpdated,
  };
}

export function isLessonCompleted(currentTime: number, duration: number) {
  if (duration <= 0) return false;
  const remaining = duration - currentTime;
  return remaining <= 5 || currentTime / duration >= 0.95;
}

export async function resetLessonCompletion(code: string, lessonId: string) {
  const participantId = code.toUpperCase();
  resetLessonProgressInternal(participantId, lessonId);
  const updated = await getLessonProgressInternal(participantId, lessonId);
  if (updated) {
    const normalized = createLearningProgress(participantId, lessonId, updated);
    saveCachedLesson(participantId, normalized);
  }
  markParticipantDirty(participantId);
  scheduleParticipantSync(true);
}

export function markParticipantActive(code: string) {
  const now = new Date();
  const upper = code.toUpperCase();
  touchParticipant(upper, { lastActiveAt: now });
  markParticipantDirty(upper);
  scheduleParticipantSync();
}

export function hydrateProgressFromCache() {
  reapplyCachedProgress();
}

if (typeof window !== 'undefined') {
  const flushSync = () => {
    scheduleParticipantSync(true);
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSync();
    }
  });
  window.addEventListener('pagehide', flushSync);
  window.addEventListener('beforeunload', flushSync);
}
