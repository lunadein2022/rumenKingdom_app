export type PageId = 'lobby' | 'office' | 'calendar' | 'library' | 'diary' | 'garden' | 'rita' | 'throne'

export type CalendarKind = 'royal' | 'personal' | 'work' | 'project' | 'anniversary'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  endDate?: string
  start: string
  end?: string
  allDay?: boolean
  kind: CalendarKind
  important?: boolean
  recurrenceRule?: string
}

export type QuestPriority = 'high' | 'medium' | 'low'
export type QuestType = 'daily' | 'sub'
export type QuestStatus = 'planned' | 'active' | 'completed' | 'archived'

export interface Quest {
  id: string
  title: string
  description?: string
  memo?: string
  tags?: string[]
  projectId?: string
  parentQuestId?: string
  project?: string
  type: QuestType
  status: QuestStatus
  due: string
  scheduledDate?: string
  scheduledTime?: string
  done: boolean
  priority: QuestPriority
  favorite: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived'

export interface Project {
  id: string
  title: string
  goal?: string
  description: string
  memo?: string
  tags?: string[]
  /** Legacy persisted value. Display progress is always derived from linked quests. */
  progress: number
  startDate: string
  due: string
  tag: string
  status: ProjectStatus
  priority: QuestPriority
  favorite: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type MemoStatus = 'normal' | 'review' | 'completed' | 'archived'

export interface SourceAttachment {
  name: string
  mimeType: string
  size: number
  storagePath?: string
}

export interface Memo {
  id: string
  title: string
  content: string
  tags: string[]
  projectId?: string
  important: boolean
  favorite: boolean
  status: MemoStatus
  source: 'manual' | 'rita'
  sourceAttachment?: SourceAttachment
  transcript?: string
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  name: string
  organization: string
  position: string
  phone: string
  email: string
  social: string
  address?: string
  relationshipType: string
  firstMetAt?: string
  lastContactedAt?: string
  memo: string
  tags: string[]
  favorite: boolean
  businessCardImageRef?: string
  businessCardOcrText?: string
  sourceAttachment?: SourceAttachment
  source: 'manual' | 'rita'
  createdAt: string
  updatedAt: string
}

export interface DiaryEntry {
  id: string
  date: string
  title: string
  content: string
  mood: string
  favorite: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type LibraryCategory = 'all' | 'main-quests' | 'daily-quests' | 'sub-quests' | 'relationships' | 'memos' | 'diaries'
export type LibraryRecordType = 'mainQuest' | 'dailyQuest' | 'subQuest' | 'relationship' | 'memo' | 'diary'

export interface LibraryRecord {
  id: string
  sourceId: string
  type: LibraryRecordType
  title: string
  summary: string
  searchText?: string
  tags: string[]
  favorite: boolean
  createdAt: string
  updatedAt: string
  path: string
}
