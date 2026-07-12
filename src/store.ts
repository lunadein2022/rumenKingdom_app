import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, differenceInCalendarDays, format, parseISO, setDate } from 'date-fns'
import { createCalendarEvent, listCalendarEvents, removeCalendarEvent, updateCalendarEvent, updateCalendarEventDate } from './services/calendarRepository'
import { createProject as createProjectRow, listProjects, removeProject as removeProjectRow, updateProject as updateProjectRow } from './services/projectRepository'
import { createQuest as createQuestRow, listQuests, removeQuest as removeQuestRow, updateQuest as updateQuestRow } from './services/questRepository'
import { createMemo as createMemoRow, listMemos, removeMemo as removeMemoRow, updateMemo as updateMemoRow } from './services/memoRepository'
import { createRelationship as createRelationshipRow, listRelationships, removeRelationship as removeRelationshipRow, updateRelationship as updateRelationshipRow } from './services/relationshipRepository'
import { createDiary as createDiaryRow, listDiaries, removeDiary as removeDiaryRow, updateDiary as updateDiaryRow } from './services/diaryRepository'
import type { CalendarEvent, CalendarKind, DiaryEntry, LibraryRecordType, Memo, Project, Quest, Relationship } from './types'
import { setActiveAccountScope } from './lib/accountScope'

type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
type QuestInput = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
type MemoInput = Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>
type RelationshipInput = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>
type DiaryInput = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>

interface KingdomState {
  selectedDate: string
  events: CalendarEvent[]
  quests: Quest[]
  projects: Project[]
  memos: Memo[]
  relationships: Relationship[]
  diaries: DiaryEntry[]
  calendarSync: { status: 'idle' | 'saving' | 'saved' | 'error'; message: string }
  setSelectedDate: (date: string) => void
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<{ event: CalendarEvent; storage: 'cloud' | 'local' }>
  updateEvent: (id: string, event: Omit<CalendarEvent, 'id'>) => void
  deleteEvent: (id: string) => void
  moveEvent: (id: string, date: string) => void
  hydrateEvents: () => Promise<void>
  hydrateProjects: () => Promise<void>
  hydrateQuests: () => Promise<void>
  hydrateMemos: () => Promise<void>
  hydrateRelationships: () => Promise<void>
  hydrateDiaries: () => Promise<void>
  clearCalendarSync: () => void
  resetForAccount: (demo: boolean) => void
  toggleQuest: (id: string) => void
  addQuest: (quest: QuestInput) => string
  updateQuest: (id: string, quest: Partial<Quest>) => void
  deleteQuest: (id: string) => void
  addProject: (project: ProjectInput) => string
  updateProject: (id: string, project: Partial<ProjectInput>) => void
  deleteProject: (id: string) => void
  setProjectStatus: (id: string, status: Project['status']) => void
  addMemo: (memo: MemoInput) => string
  updateMemo: (id: string, memo: Partial<MemoInput>) => void
  deleteMemo: (id: string) => void
  addRelationship: (relationship: RelationshipInput) => string
  updateRelationship: (id: string, relationship: Partial<RelationshipInput>) => void
  deleteRelationship: (id: string) => void
  upsertDiary: (entry: DiaryInput) => string
  deleteDiary: (id: string) => void
  toggleLibraryFavorite: (type: LibraryRecordType, id: string) => void
}

const timestamp = () => new Date().toISOString()
const currentMonth = new Date()
const monthDate = (day: number) => format(setDate(currentMonth, day), 'yyyy-MM-dd')
const today = format(new Date(), 'yyyy-MM-dd')
const createdAt = timestamp()

const initialEvents: CalendarEvent[] = [
  { id: 'e1', title: '집무회의', date: monthDate(1), start: '10:00', end: '11:00', kind: 'royal' },
  { id: 'e2', title: '외교 서신 검토', date: monthDate(2), start: '14:00', kind: 'work' },
  { id: 'e3', title: '초록 정원 산책', date: monthDate(3), start: '11:00', kind: 'personal' },
  { id: 'e4', title: '왕실 보고 검토', date: monthDate(4), start: '15:10', kind: 'royal' },
  { id: 'e5', title: '공주의 기념일', date: monthDate(6), start: '', kind: 'anniversary', important: true },
  { id: 'e6', title: '집무회의', date: today, start: '09:00', end: '09:30', kind: 'royal' },
  { id: 'e7', title: '세라픽 정기 미팅', date: today, start: '11:00', end: '12:00', kind: 'work' },
  { id: 'e8', title: '마케팅 회의', date: monthDate(12), start: '10:00', kind: 'project' },
  { id: 'e9', title: '왕국 설립 기념', date: monthDate(15), start: '', kind: 'anniversary', important: true },
  { id: 'e10', title: 'Hydro Hawk 프로젝트 검토', date: monthDate(18), start: '14:00', kind: 'royal' },
  { id: 'e11', title: '문화행사 준비', date: monthDate(19), start: '17:00', kind: 'work' },
  { id: 'e12', title: '프로젝트 리뷰', date: monthDate(23), start: '15:00', kind: 'project' },
  { id: 'e13', title: '무도회 준비', date: monthDate(26), start: '19:00', kind: 'anniversary' },
]

const initialProjects: Project[] = [
  { id: 'p1', title: 'Hydro Hawk', description: '새로운 비행 경험을 위한 브랜드 프로젝트', progress: 72, startDate: monthDate(1), due: monthDate(30), tag: 'Branding', status: 'active', priority: 'high', favorite: true, createdAt, updatedAt: createdAt },
  { id: 'p2', title: 'Princess OS', description: '루멘왕국의 일상을 연결하는 생산성 시스템', progress: 46, startDate: monthDate(3), due: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 15), 'yyyy-MM-dd'), tag: 'Product', status: 'active', priority: 'high', favorite: false, createdAt, updatedAt: createdAt },
  { id: 'p3', title: '왕국 기록 아카이브', description: '흩어진 기록을 한 곳에 모으는 디지털 서고', progress: 28, startDate: monthDate(5), due: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 10), 'yyyy-MM-dd'), tag: 'Archive', status: 'active', priority: 'medium', favorite: false, createdAt, updatedAt: createdAt },
]

const initialQuests: Quest[] = [
  { id: 'q1', title: '발표자료 최종 검토', projectId: 'p1', project: 'Hydro Hawk', type: 'daily', status: 'completed', due: '오늘 10:30', done: true, priority: 'high', favorite: false, completedAt: createdAt, createdAt, updatedAt: createdAt },
  { id: 'q2', title: '왕실 회의록 정리', projectId: 'p3', project: '왕국 기록 아카이브', type: 'daily', status: 'active', due: '오늘 14:00', done: false, priority: 'medium', favorite: false, createdAt, updatedAt: createdAt },
  { id: 'q3', title: '사용자 인터뷰 질문지', projectId: 'p2', project: 'Princess OS', type: 'sub', status: 'active', due: '오늘 17:30', done: false, priority: 'high', favorite: true, createdAt, updatedAt: createdAt },
  { id: 'q4', title: '주간 독서 기록', project: '왕국 도서관', type: 'daily', status: 'active', due: '내일', done: false, priority: 'low', favorite: false, createdAt, updatedAt: createdAt },
]

const initialMemos: Memo[] = [
  { id: 'm1', title: 'Hydro Hawk 색상 후보', content: '남색과 금색을 주요 후보로 검토하기.', tags: ['Hydro Hawk', '디자인'], projectId: 'p1', important: true, favorite: false, status: 'review', source: 'rita', createdAt, updatedAt: createdAt },
]

const initialRelationships: Relationship[] = [
  { id: 'r1', name: '세라핀 드 로제', organization: '로제 상단', position: '상단 대표', phone: '', email: 'seraphine@example.com', social: '', relationshipType: '협력자', firstMetAt: monthDate(2), lastContactedAt: today, memo: 'Hydro Hawk 브랜딩 자문을 맡고 있다.', tags: ['Hydro Hawk', '협력자'], favorite: true, source: 'manual', createdAt, updatedAt: createdAt },
]

const initialDiaries: DiaryEntry[] = [
  { id: 'd1', date: today, title: '고요하지만 단단했던 하루', content: '오래 미뤄 두었던 생각을 하나씩 정리했다. 완벽하지 않아도 앞으로 나아가고 있다.', mood: '평온', favorite: false, tags: ['일상'], createdAt, updatedAt: createdAt },
]

export const calendarKinds: { id: CalendarKind; label: string }[] = [
  { id: 'royal', label: '왕실 공식 일정' },
  { id: 'personal', label: '개인 일정' },
  { id: 'work', label: '업무 일정' },
  { id: 'project', label: '프로젝트 일정' },
  { id: 'anniversary', label: '기념일' },
]

const accountData = (demo: boolean) => ({
  selectedDate: today,
  events: demo ? [...initialEvents] : [],
  quests: demo ? [...initialQuests] : [],
  projects: demo ? [...initialProjects] : [],
  memos: demo ? [...initialMemos] : [],
  relationships: demo ? [...initialRelationships] : [],
  diaries: demo ? [...initialDiaries] : [],
  calendarSync: { status: 'idle' as const, message: '' },
})

export function projectProgress(project: Project, quests: Quest[]) {
  const linked = quests.filter((quest) => quest.projectId === project.id)
  if (!linked.length) return 0
  return Math.round((linked.filter((quest) => quest.done || quest.status === 'completed').length / linked.length) * 100)
}

type PersistedState = {
  selectedDate?: string
  events?: CalendarEvent[]
  quests?: Array<Partial<Quest> & Pick<Quest, 'id' | 'title'>>
  projects?: Array<Partial<Project> & Pick<Project, 'id' | 'title'>>
  memos?: Memo[]
  relationships?: Relationship[]
  diaries?: DiaryEntry[]
}

export const useKingdomStore = create<KingdomState>()(persist((set) => ({
  selectedDate: today,
  events: initialEvents,
  quests: initialQuests,
  projects: initialProjects,
  memos: initialMemos,
  relationships: initialRelationships,
  diaries: initialDiaries,
  calendarSync: { status: 'idle', message: '' },
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  addEvent: (event) => {
    const optimisticId = crypto.randomUUID()
    const optimistic = { ...event, id: optimisticId }
    set((state) => ({ events: [...state.events, optimistic], calendarSync: { status: 'saving', message: '일정을 저장하고 있어요.' } }))
    return createCalendarEvent(event).then((saved) => {
      set((state) => ({
        events: saved ? state.events.map((item) => item.id === optimisticId ? saved : item) : state.events,
        calendarSync: { status: 'saved', message: saved ? '왕국 기록에 일정을 저장했어요.' : '이 기기에 일정을 저장했어요.' },
      }))
      return { event: saved ?? optimistic, storage: saved ? 'cloud' as const : 'local' as const }
    }).catch((error) => {
      set((state) => ({ events: state.events.filter((item) => item.id !== optimisticId), calendarSync: { status: 'error', message: '일정을 저장하지 못했어요. 다시 시도해 주세요.' } }))
      throw error
    })
  },
  updateEvent: (id, event) => {
    let previous: CalendarEvent | undefined
    set((state) => {
      previous = state.events.find((item) => item.id === id)
      return { events: state.events.map((item) => item.id === id ? { ...event, id } : item), calendarSync: { status: 'saving', message: '변경한 일정을 저장하고 있어요.' } }
    })
    void updateCalendarEvent(id, event).then((saved) => set((state) => ({
      events: saved ? state.events.map((item) => item.id === id ? saved : item) : state.events,
      calendarSync: { status: 'saved', message: saved ? '일정 변경사항을 왕국 기록에 저장했어요.' : '일정 변경사항을 이 기기에 저장했어요.' },
    }))).catch(() => set((state) => ({ events: previous ? state.events.map((item) => item.id === id ? previous as CalendarEvent : item) : state.events, calendarSync: { status: 'error', message: '일정을 수정하지 못해 이전 내용으로 되돌렸어요.' } })))
  },
  deleteEvent: (id) => {
    let removed: CalendarEvent | undefined
    set((state) => { removed = state.events.find((event) => event.id === id); return { events: state.events.filter((event) => event.id !== id), calendarSync: { status: 'saving', message: '일정을 삭제하고 있어요.' } } })
    void removeCalendarEvent(id).then(() => set({ calendarSync: { status: 'saved', message: '일정을 삭제했어요.' } })).catch(() => set((state) => ({ events: removed ? [...state.events, removed as CalendarEvent] : state.events, calendarSync: { status: 'error', message: '일정을 삭제하지 못해 복원했어요.' } })))
  },
  moveEvent: (id, date) => {
    let previous: CalendarEvent | undefined
    let nextEndDate: string | undefined
    set((state) => {
      previous = state.events.find((event) => event.id === id)
      if (previous?.endDate) {
        const duration = differenceInCalendarDays(parseISO(previous.endDate), parseISO(previous.date))
        nextEndDate = format(addDays(parseISO(date), duration), 'yyyy-MM-dd')
      }
      return { events: state.events.map((event) => event.id === id ? { ...event, date, endDate: nextEndDate } : event), calendarSync: { status: 'saving', message: '일정 날짜를 변경하고 있어요.' } }
    })
    void updateCalendarEventDate(id, date, nextEndDate).then(() => set({ calendarSync: { status: 'saved', message: '일정 날짜를 변경했어요.' } })).catch(() => set((state) => ({ events: previous ? state.events.map((event) => event.id === id ? previous as CalendarEvent : event) : state.events, calendarSync: { status: 'error', message: '날짜를 변경하지 못해 이전 위치로 되돌렸어요.' } })))
  },
  hydrateEvents: async () => { try { const savedEvents = await listCalendarEvents(); if (savedEvents) set({ events: savedEvents }) } catch { set({ calendarSync: { status: 'error', message: '왕국 일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' } }) } },
  hydrateProjects: async () => { try { const savedProjects = await listProjects(); if (savedProjects) set({ projects: savedProjects }) } catch { /* keep local projects on failure */ } },
  hydrateQuests: async () => {
    try {
      const savedQuests = await listQuests()
      if (savedQuests) set((state) => ({
        quests: savedQuests.map((quest) => ({
          ...quest,
          project: quest.projectId ? state.projects.find((project) => project.id === quest.projectId)?.title : undefined,
        })),
      }))
    } catch { /* keep local quests on failure */ }
  },
  hydrateMemos: async () => { try { const saved = await listMemos(); if (saved) set({ memos: saved }) } catch { /* keep local memos on failure */ } },
  hydrateRelationships: async () => { try { const saved = await listRelationships(); if (saved) set({ relationships: saved }) } catch { /* keep local relationships on failure */ } },
  hydrateDiaries: async () => { try { const saved = await listDiaries(); if (saved) set({ diaries: saved }) } catch { /* keep local diaries on failure */ } },
  clearCalendarSync: () => set({ calendarSync: { status: 'idle', message: '' } }),
  resetForAccount: (demo) => set(accountData(demo)),
  toggleQuest: (id) => {
    let nextStatus: Quest['status'] = 'active'
    let nextCompletedAt: string | undefined
    set((state) => ({ quests: state.quests.map((quest) => {
      if (quest.id !== id) return quest
      const nextDone = !quest.done
      nextStatus = nextDone ? 'completed' : 'active'
      nextCompletedAt = nextDone ? timestamp() : undefined
      return { ...quest, done: nextDone, status: nextStatus, completedAt: nextCompletedAt, updatedAt: timestamp() }
    }) }))
    void updateQuestRow(id, { status: nextStatus, completedAt: nextCompletedAt }).catch(() => {})
  },
  addQuest: (quest) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Quest = { ...quest, id, completedAt: quest.done ? now : undefined, createdAt: now, updatedAt: now }
    set((state) => ({ quests: [...state.quests, full] }))
    void createQuestRow(full).catch(() => {})
    return id
  },
  updateQuest: (id, quest) => {
    set((state) => ({ quests: state.quests.map((item) => item.id === id ? { ...item, ...quest, updatedAt: timestamp() } : item) }))
    void updateQuestRow(id, quest).catch(() => {})
  },
  deleteQuest: (id) => {
    set((state) => ({ quests: state.quests.filter((quest) => quest.id !== id) }))
    void removeQuestRow(id).catch(() => {})
  },
  addProject: (project) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Project = { ...project, id, createdAt: now, updatedAt: now }
    set((state) => ({ projects: [...state.projects, full] }))
    void createProjectRow(full).catch(() => {})
    return id
  },
  updateProject: (id, project) => {
    set((state) => ({ projects: state.projects.map((item) => item.id === id ? { ...item, ...project, updatedAt: timestamp() } : item) }))
    void updateProjectRow(id, project).catch(() => {})
  },
  deleteProject: (id) => {
    set((state) => ({ projects: state.projects.filter((item) => item.id !== id), quests: state.quests.map((quest) => quest.projectId === id ? { ...quest, projectId: undefined, project: undefined } : quest) }))
    void removeProjectRow(id).catch(() => {})
  },
  setProjectStatus: (id, status) => {
    const completedAt = status === 'completed' ? timestamp() : undefined
    set((state) => ({ projects: state.projects.map((project) => project.id === id ? { ...project, status, completedAt, updatedAt: timestamp() } : project) }))
    void updateProjectRow(id, { status, completedAt }).catch(() => {})
  },
  addMemo: (memo) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Memo = { ...memo, id, createdAt: now, updatedAt: now }
    set((state) => ({ memos: [...state.memos, full] }))
    void createMemoRow(full).catch(() => {})
    return id
  },
  updateMemo: (id, memo) => {
    set((state) => ({ memos: state.memos.map((item) => item.id === id ? { ...item, ...memo, updatedAt: timestamp() } : item) }))
    void updateMemoRow(id, memo).catch(() => {})
  },
  deleteMemo: (id) => {
    set((state) => ({ memos: state.memos.filter((item) => item.id !== id) }))
    void removeMemoRow(id).catch(() => {})
  },
  addRelationship: (relationship) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Relationship = { ...relationship, id, createdAt: now, updatedAt: now }
    set((state) => ({ relationships: [...state.relationships, full] }))
    void createRelationshipRow(full).catch(() => {})
    return id
  },
  updateRelationship: (id, relationship) => {
    set((state) => ({ relationships: state.relationships.map((item) => item.id === id ? { ...item, ...relationship, updatedAt: timestamp() } : item) }))
    void updateRelationshipRow(id, relationship).catch(() => {})
  },
  deleteRelationship: (id) => {
    set((state) => ({ relationships: state.relationships.filter((item) => item.id !== id) }))
    void removeRelationshipRow(id).catch(() => {})
  },
  upsertDiary: (entry) => {
    let id = ''
    let created = false
    let full: DiaryEntry | undefined
    set((state) => {
      const existing = state.diaries.find((item) => item.date === entry.date)
      id = existing?.id ?? crypto.randomUUID()
      if (existing) {
        full = { ...existing, ...entry, updatedAt: timestamp() }
        return { diaries: state.diaries.map((item) => item.id === existing.id ? full as DiaryEntry : item) }
      }
      created = true
      full = { ...entry, id, createdAt: timestamp(), updatedAt: timestamp() }
      return { diaries: [...state.diaries, full] }
    })
    if (created) void createDiaryRow(full as DiaryEntry).catch(() => {})
    else void updateDiaryRow(id, entry).catch(() => {})
    return id
  },
  deleteDiary: (id) => {
    set((state) => ({ diaries: state.diaries.filter((item) => item.id !== id) }))
    void removeDiaryRow(id).catch(() => {})
  },
  toggleLibraryFavorite: (type, id) => set((state) => ({
    projects: type === 'mainQuest' ? state.projects.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: timestamp() } : item) : state.projects,
    quests: type === 'dailyQuest' || type === 'subQuest' ? state.quests.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: timestamp() } : item) : state.quests,
    relationships: type === 'relationship' ? state.relationships.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: timestamp() } : item) : state.relationships,
    memos: type === 'memo' ? state.memos.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: timestamp() } : item) : state.memos,
    diaries: type === 'diary' ? state.diaries.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: timestamp() } : item) : state.diaries,
  })),
}), {
  name: 'rumen-kingdom:v2:locked',
  skipHydration: true,
  version: 5,
  migrate: (persisted) => {
    const old = (persisted ?? {}) as PersistedState
    const projectNames = new Map((old.projects ?? initialProjects).map((project) => [project.title, project.id]))
    return {
      ...old,
      selectedDate: old.selectedDate ?? today,
      events: old.events ?? initialEvents,
      projects: (old.projects ?? initialProjects).map((project) => {
        const due = project.due?.replaceAll('.', '-') ?? today
        const requestedStart = project.startDate ?? due
        return {
          id: project.id, title: project.title, goal: project.goal ?? '', description: project.description ?? '', memo: project.memo ?? '', tags: project.tags ?? (project.tag ? [project.tag] : []), progress: project.progress ?? 0,
          startDate: requestedStart > due ? due : requestedStart, due, tag: project.tag ?? 'Project',
          status: project.status ?? 'active', priority: project.priority ?? 'medium', favorite: project.favorite ?? false, completedAt: project.completedAt,
          createdAt: project.createdAt ?? createdAt, updatedAt: project.updatedAt ?? createdAt,
        }
      }),
      quests: (old.quests ?? initialQuests).map((quest) => ({
        id: quest.id, title: quest.title, description: quest.description ?? '', memo: quest.memo ?? '', tags: quest.tags ?? [], projectId: quest.projectId ?? (quest.project ? projectNames.get(quest.project) : undefined), project: quest.project,
        parentQuestId: quest.parentQuestId, type: quest.type ?? 'daily', status: quest.status ?? (quest.done ? 'completed' : 'active'),
        due: quest.due ?? '', scheduledDate: quest.scheduledDate, scheduledTime: quest.scheduledTime, done: quest.done ?? false, priority: quest.priority ?? 'medium', favorite: quest.favorite ?? false, completedAt: quest.completedAt,
        createdAt: quest.createdAt ?? createdAt, updatedAt: quest.updatedAt ?? createdAt,
      })),
      memos: old.memos ?? initialMemos,
      relationships: old.relationships ?? initialRelationships,
      diaries: old.diaries ?? initialDiaries,
    }
  },
  partialize: (state) => ({ selectedDate: state.selectedDate, events: state.events, quests: state.quests, projects: state.projects, memos: state.memos, relationships: state.relationships, diaries: state.diaries }),
}))

let activeKingdomStorageKey = ''

export async function activateKingdomAccount(scope: string, demo = false) {
  const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '-') || 'locked'
  const storageKey = `rumen-kingdom:v2:${safeScope}`
  if (activeKingdomStorageKey === storageKey) return
  setActiveAccountScope(safeScope)
  useKingdomStore.persist.setOptions({ name: storageKey })
  activeKingdomStorageKey = storageKey
  if (localStorage.getItem(storageKey)) {
    try { await useKingdomStore.persist.rehydrate() }
    catch { useKingdomStore.getState().resetForAccount(demo) }
  } else useKingdomStore.getState().resetForAccount(demo)
}

export function deactivateKingdomAccount() {
  const storageKey = 'rumen-kingdom:v2:locked'
  setActiveAccountScope('locked')
  useKingdomStore.persist.setOptions({ name: storageKey })
  activeKingdomStorageKey = ''
  useKingdomStore.getState().resetForAccount(false)
  localStorage.removeItem(storageKey)
}
