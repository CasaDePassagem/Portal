export type UserRole = 'admin' | 'user';

export interface UserRecord {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  category?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Content {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  estimatedDuration?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Lesson {
  id: string;
  contentId: string;
  title: string;
  youtubeUrl: string;
  order?: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParticipantRecord {
  code: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  careHouse?: string;
  createdAt: Date;
  lastActiveAt?: Date;
}

export interface LearningProgress {
  id: string;
  participantId: string;
  lessonId: string;
  contentId?: string;
  topicId?: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  updatedAt: Date;
  completedAt?: Date;
}

export type ParticipantCustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'cpf'
  | 'rg'
  | 'phone'
  | 'date'
  | 'email'
  | 'url';

export type ParticipantCustomFieldConstraints = Record<string, unknown>;

export interface ParticipantCustomField {
  id: string;
  label: string;
  type: ParticipantCustomFieldType;
  description?: string;
  constraints: ParticipantCustomFieldConstraints;
  order: number;
  pageId?: string | null;
  isRequired: boolean;
  isArchived: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}

export interface ParticipantCustomPage {
  id: string;
  label: string;
  order: number;
  icon?: string;
  color?: string;
  isArchived: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}

export interface ParticipantCustomValue {
  id: string;
  code: string;
  fieldId: string;
  value: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}
