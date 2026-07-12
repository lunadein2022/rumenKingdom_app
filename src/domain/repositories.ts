import type { CalendarEvent, DiaryEntry, Memo, Project, Quest, Relationship } from '../types'

export type EntityId = string

export type PageRequest = {
  page: number
  pageSize: number
  query?: string
  sort?: 'created-desc' | 'created-asc' | 'updated-desc' | 'name-asc'
}

export type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface CrudRepository<T, CreateInput, UpdateInput = Partial<CreateInput>> {
  get(id: EntityId): Promise<T | null>
  list(request?: Partial<PageRequest>): Promise<PageResult<T>>
  create(input: CreateInput): Promise<T>
  update(id: EntityId, input: UpdateInput): Promise<T>
  remove(id: EntityId): Promise<void>
}

export type ProjectCreateInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type QuestCreateInput = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
export type CalendarCreateInput = Omit<CalendarEvent, 'id'>
export type DiaryCreateInput = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>
export type MemoCreateInput = Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>
export type RelationshipCreateInput = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>

export interface ProjectRepository extends CrudRepository<Project, ProjectCreateInput> {
  progress(projectId: EntityId): Promise<number>
}

export interface QuestRepository extends CrudRepository<Quest, QuestCreateInput> {
  listCompletedForServiceDate(serviceDate: string): Promise<Quest[]>
  connectToProject(questId: EntityId, projectId: EntityId | null): Promise<Quest>
}

export interface CalendarRepository extends CrudRepository<CalendarEvent, CalendarCreateInput> {
  listBetween(startDate: string, endDate: string): Promise<CalendarEvent[]>
  move(id: EntityId, startDate: string, endDate?: string): Promise<CalendarEvent>
}

export interface DiaryRepository extends CrudRepository<DiaryEntry, DiaryCreateInput> {
  getByDate(date: string): Promise<DiaryEntry | null>
  importCompletedQuests(diaryId: EntityId, questIds: EntityId[]): Promise<void>
}

export type MemoRepository = CrudRepository<Memo, MemoCreateInput>
export type RelationshipRepository = CrudRepository<Relationship, RelationshipCreateInput>

export type NotificationRecord = {
  id: EntityId
  title: string
  body: string
  relatedEntityType?: string
  relatedEntityId?: EntityId
  scheduledFor?: string
  readAt?: string
  createdAt: string
}

export interface NotificationRepository {
  list(request?: Partial<PageRequest>): Promise<PageResult<NotificationRecord>>
  unreadCount(): Promise<number>
  markRead(id: EntityId): Promise<void>
  markAllRead(): Promise<void>
  remove(id: EntityId): Promise<void>
}

export interface SettingsRepository {
  get<T>(key: string, fallback: T): Promise<T>
  set<T>(key: string, value: T): Promise<void>
}
