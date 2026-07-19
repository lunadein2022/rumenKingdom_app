import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { addDays, differenceInCalendarDays, format, parseISO, setDate } from 'date-fns'
import { createCalendarEvent, listCalendarEvents, removeCalendarEvent, updateCalendarEvent, updateCalendarEventDate } from './services/calendarRepository'
import { createProject as createProjectRow, listProjects, removeProject as removeProjectRow, updateProject as updateProjectRow } from './services/projectRepository'
import { createQuest as createQuestRow, listQuests, removeQuest as removeQuestRow, updateQuest as updateQuestRow } from './services/questRepository'
import { createMemo as createMemoRow, listMemos, removeMemo as removeMemoRow, updateMemo as updateMemoRow } from './services/memoRepository'
import { createRelationship as createRelationshipRow, listRelationships, removeRelationship as removeRelationshipRow, updateRelationship as updateRelationshipRow } from './services/relationshipRepository'
import { createRelationshipGroup as createRelationshipGroupRow, listRelationshipGroups, removeRelationshipGroup as removeRelationshipGroupRow, updateRelationshipGroup as updateRelationshipGroupRow } from './services/relationshipGroupRepository'
import { createDiary as createDiaryRow, listDiaries, removeDiary as removeDiaryRow, updateDiary as updateDiaryRow } from './services/diaryRepository'
import { listQuestCompletions, removeQuestCompletion, saveQuestCompletion } from './services/questCompletionRepository'
import type { CalendarEvent, CalendarKind, DiaryEntry, LibraryRecordType, Memo, Project, Quest, QuestCompletion, Relationship, RelationshipGroup } from './types'
import { getActiveAccountScope, setActiveAccountScope } from './lib/accountScope'
import { serviceDate } from './lib/serviceTime'

type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
type QuestInput = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
type MemoInput = Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>
type RelationshipInput = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>
type DiaryInput = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>

interface KingdomState {
  selectedDate: string
  events: CalendarEvent[]
  quests: Quest[]
  questCompletions: QuestCompletion[]
  projects: Project[]
  memos: Memo[]
  relationships: Relationship[]
  relationshipGroups: RelationshipGroup[]
  diaries: DiaryEntry[]
  /** 집무실에서 사용자가 드래그로 지정한 퀘스트 표시 순서 (id → 순번). 로컬에만 보관. */
  questOrder: Record<string, number>
  calendarSync: { status: 'idle' | 'saving' | 'saved' | 'error'; message: string }
  recordSync: { status: 'idle' | 'saving' | 'saved' | 'error'; message: string }
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
  hydrateRelationshipGroups: () => Promise<void>
  hydrateDiaries: () => Promise<void>
  clearCalendarSync: () => void
  resetForAccount: (demo: boolean) => void
  clearRecordSync: () => void
  toggleQuest: (id: string) => Promise<boolean>
  addQuest: (quest: QuestInput) => Promise<string | null>
  updateQuest: (id: string, quest: Partial<Quest>) => Promise<boolean>
  deleteQuest: (id: string) => Promise<boolean>
  reorderQuests: (orderedIds: string[]) => void
  /** 현재 서비스일의 완료 로그를 반복 퀘스트 화면 상태에 반영한다. */
  refreshRecurringQuestState: (today: string) => void
  addProject: (project: ProjectInput) => Promise<string | null>
  updateProject: (id: string, project: Partial<ProjectInput>) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
  setProjectStatus: (id: string, status: Project['status']) => Promise<boolean>
  addMemo: (memo: MemoInput) => Promise<string | null>
  updateMemo: (id: string, memo: Partial<MemoInput>) => Promise<boolean>
  deleteMemo: (id: string) => Promise<boolean>
  addRelationship: (relationship: RelationshipInput) => Promise<string | null>
  updateRelationship: (id: string, relationship: Partial<RelationshipInput>) => Promise<boolean>
  deleteRelationship: (id: string) => Promise<boolean>
  addRelationshipGroup: (name: string, color?: string) => Promise<string | null>
  updateRelationshipGroup: (id: string, patch: Partial<Pick<RelationshipGroup, 'name' | 'color' | 'sortOrder'>>) => Promise<boolean>
  deleteRelationshipGroup: (id: string) => Promise<boolean>
  upsertDiary: (entry: DiaryInput) => Promise<string | null>
  deleteDiary: (id: string) => Promise<boolean>
  toggleLibraryFavorite: (type: LibraryRecordType, id: string) => Promise<boolean>
}

const timestamp = () => new Date().toISOString()
const currentMonth = new Date()
const monthDate = (day: number) => format(setDate(currentMonth, day), 'yyyy-MM-dd')
const today = serviceDate()
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
  { id: 'r1', name: '세라핀 드 로제', organization: '로제 상단', position: '상단 대표', phone: '', email: 'seraphine@example.com', social: '', relationshipType: '협력자', firstMetAt: monthDate(2), lastContactedAt: today, memo: 'Hydro Hawk 브랜딩 자문을 맡고 있다.', tags: ['Hydro Hawk', '협력자'], groupIds: ['rg1'], favorite: true, source: 'manual', createdAt, updatedAt: createdAt },
]

const initialRelationshipGroups: RelationshipGroup[] = [
  { id: 'rg1', name: '협력자', color: '#9a78b6', sortOrder: 0, createdAt, updatedAt: createdAt },
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
  selectedDate: serviceDate(),
  events: demo ? [...initialEvents] : [],
  quests: demo ? [...initialQuests] : [],
  questCompletions: [],
  projects: demo ? [...initialProjects] : [],
  memos: demo ? [...initialMemos] : [],
  relationships: demo ? [...initialRelationships] : [],
  relationshipGroups: demo ? [...initialRelationshipGroups] : [],
  diaries: demo ? [...initialDiaries] : [],
  questOrder: {},
  calendarSync: { status: 'idle' as const, message: '' },
  recordSync: { status: 'idle' as const, message: '' },
})

const cloudAccountActive = () => getActiveAccountScope().startsWith('user:')
const assertStoredWhenRequired = (stored: boolean) => {
  if (cloudAccountActive() && !stored) throw new Error('인증된 클라우드 저장소에 연결되지 않았습니다.')
}

export function projectProgress(project: Project, quests: Quest[]) {
  const linked = quests.filter((quest) => quest.projectId === project.id)
  if (!linked.length) return Math.min(100, Math.max(0, project.progress || 0))
  return Math.round((linked.filter((quest) => quest.done || quest.status === 'completed').length / linked.length) * 100)
}

type PersistedState = {
  selectedDate?: string
  events?: CalendarEvent[]
  quests?: Array<Partial<Quest> & Pick<Quest, 'id' | 'title'>>
  questCompletions?: QuestCompletion[]
  projects?: Array<Partial<Project> & Pick<Project, 'id' | 'title'>>
  memos?: Memo[]
  relationships?: Relationship[]
  relationshipGroups?: RelationshipGroup[]
  diaries?: DiaryEntry[]
  questOrder?: Record<string, number>
}

type PersistedKingdomSlice = Pick<KingdomState,
  'selectedDate' | 'events' | 'quests' | 'questCompletions' | 'projects' | 'memos' |
  'relationships' | 'relationshipGroups' | 'diaries' | 'questOrder'>

export const useKingdomStore = create<KingdomState>()(persist((set, get) => ({
  selectedDate: today,
  events: initialEvents,
  quests: initialQuests,
  questCompletions: [],
  projects: initialProjects,
  memos: initialMemos,
  relationships: initialRelationships,
  relationshipGroups: initialRelationshipGroups,
  diaries: initialDiaries,
  questOrder: {},
  calendarSync: { status: 'idle', message: '' },
  recordSync: { status: 'idle', message: '' },
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
  hydrateEvents: async () => { const scope = getActiveAccountScope(); try { const savedEvents = await listCalendarEvents(); if (scope === getActiveAccountScope() && savedEvents) set({ events: savedEvents }) } catch { if (scope === getActiveAccountScope()) set({ calendarSync: { status: 'error', message: '왕국 일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' } }) } },
  hydrateProjects: async () => { const scope = getActiveAccountScope(); try { const savedProjects = await listProjects(); if (scope === getActiveAccountScope() && savedProjects) set({ projects: savedProjects }) } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '메인퀘스트를 불러오지 못했어요.' } }) } },
  hydrateQuests: async () => {
    const scope = getActiveAccountScope()
    try {
      const [savedQuests, savedCompletions] = await Promise.all([listQuests(), listQuestCompletions()])
      if (scope === getActiveAccountScope() && savedQuests) set((state) => ({
        questCompletions: savedCompletions ?? [],
        quests: savedQuests.map((quest) => ({
          ...quest,
          project: quest.projectId ? state.projects.find((project) => project.id === quest.projectId)?.title : undefined,
          ...(quest.recurrenceRule ? (() => {
            const completion = (savedCompletions ?? []).find((item) => item.questId === quest.id && item.occurrenceDate === serviceDate())
            return {
              done: Boolean(completion),
              status: completion ? 'completed' as const : quest.status === 'completed' ? 'active' as const : quest.status,
              completedAt: completion?.completedAt,
            }
          })() : {}),
        })),
      }))
    } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '퀘스트를 불러오지 못했어요.' } }) }
  },
  hydrateMemos: async () => { const scope = getActiveAccountScope(); try { const saved = await listMemos(); if (scope === getActiveAccountScope() && saved) set({ memos: saved }) } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '비망록을 불러오지 못했어요.' } }) } },
  hydrateRelationships: async () => { const scope = getActiveAccountScope(); try { const saved = await listRelationships(); if (scope === getActiveAccountScope() && saved) set({ relationships: saved }) } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '인연록을 불러오지 못했어요.' } }) } },
  hydrateRelationshipGroups: async () => { const scope = getActiveAccountScope(); try { const saved = await listRelationshipGroups(); if (scope === getActiveAccountScope() && saved) set({ relationshipGroups: saved }) } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '인연록 그룹을 불러오지 못했어요.' } }) } },
  hydrateDiaries: async () => { const scope = getActiveAccountScope(); try { const saved = await listDiaries(); if (scope === getActiveAccountScope() && saved) set({ diaries: saved }) } catch { if (scope === getActiveAccountScope()) set({ recordSync: { status: 'error', message: '다이어리를 불러오지 못했어요.' } }) } },
  clearCalendarSync: () => set({ calendarSync: { status: 'idle', message: '' } }),
  clearRecordSync: () => set({ recordSync: { status: 'idle', message: '' } }),
  resetForAccount: (demo) => set(accountData(demo)),
  toggleQuest: async (id) => {
    const previous = get().quests.find((quest) => quest.id === id)
    if (!previous) return false
    const nextDone = !previous.done
    const nextStatus: Quest['status'] = nextDone ? 'completed' : 'active'
    const nextCompletedAt = nextDone ? timestamp() : undefined
    if (previous.recurrenceRule) {
      const occurrenceDate = serviceDate()
      const previousCompletions = get().questCompletions
      const nextCompletion = nextDone ? { questId: id, occurrenceDate, completedAt: nextCompletedAt as string } : undefined
      set((state) => ({
        quests: state.quests.map((quest) => quest.id === id ? { ...quest, done: nextDone, status: nextStatus, completedAt: nextCompletedAt, updatedAt: timestamp() } : quest),
        questCompletions: nextDone
          ? [...state.questCompletions.filter((item) => item.questId !== id || item.occurrenceDate !== occurrenceDate), nextCompletion as QuestCompletion]
          : state.questCompletions.filter((item) => item.questId !== id || item.occurrenceDate !== occurrenceDate),
        recordSync: { status: 'saving', message: '반복 퀘스트 완료 기록을 저장하고 있어요.' },
      }))
      try {
        const stored = nextCompletion
          ? await saveQuestCompletion(nextCompletion)
          : await removeQuestCompletion(id, occurrenceDate)
        assertStoredWhenRequired(stored)
        set({ recordSync: { status: 'saved', message: nextDone ? '오늘의 반복 퀘스트를 완료했어요.' : '오늘의 완료 기록을 취소했어요.' } })
        return true
      } catch {
        set((state) => ({
          quests: state.quests.map((quest) => quest.id === id ? previous : quest),
          questCompletions: previousCompletions,
          recordSync: { status: 'error', message: '반복 퀘스트 완료 기록을 저장하지 못해 되돌렸어요.' },
        }))
        return false
      }
    }
    set((state) => ({ quests: state.quests.map((quest) => quest.id === id ? { ...quest, done: nextDone, status: nextStatus, completedAt: nextCompletedAt, updatedAt: timestamp() } : quest), recordSync: { status: 'saving', message: '퀘스트 상태를 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await updateQuestRow(id, { status: nextStatus, completedAt: nextCompletedAt }))
      set({ recordSync: { status: 'saved', message: '퀘스트 상태를 저장했어요.' } })
      return true
    } catch {
      set((state) => ({ quests: state.quests.map((quest) => quest.id === id ? previous : quest), recordSync: { status: 'error', message: '퀘스트 상태를 저장하지 못해 되돌렸어요.' } }))
      return false
    }
  },
  addQuest: async (quest) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Quest = { ...quest, id, completedAt: quest.done ? now : undefined, createdAt: now, updatedAt: now }
    const occurrenceDate = serviceDate()
    const completion = full.recurrenceRule && full.done
      ? { questId: id, occurrenceDate, completedAt: full.completedAt as string }
      : undefined
    const storedQuest = full.recurrenceRule
      ? { ...full, status: full.status === 'completed' ? 'active' as const : full.status, done: false, completedAt: undefined }
      : full
    set((state) => ({
      quests: [...state.quests, full],
      questCompletions: completion ? [...state.questCompletions, completion] : state.questCompletions,
      recordSync: { status: 'saving', message: '퀘스트를 저장하고 있어요.' },
    }))
    try {
      assertStoredWhenRequired(await createQuestRow(storedQuest))
      if (completion) assertStoredWhenRequired(await saveQuestCompletion(completion))
      set({ recordSync: { status: 'saved', message: '퀘스트를 저장했어요.' } })
      return id
    } catch {
      if (cloudAccountActive()) void removeQuestRow(id).catch(() => undefined)
      set((state) => ({
        quests: state.quests.filter((item) => item.id !== id),
        questCompletions: state.questCompletions.filter((item) => item.questId !== id),
        recordSync: { status: 'error', message: '퀘스트를 저장하지 못했어요.' },
      }))
      return null
    }
  },
  updateQuest: async (id, quest) => {
    const previous = get().quests.find((item) => item.id === id)
    if (!previous) return false
    const previousCompletions = get().questCompletions
    const nextRecurrenceRule = 'recurrenceRule' in quest ? quest.recurrenceRule : previous.recurrenceRule
    const occurrenceDate = serviceDate()
    const requestedDone = quest.done !== undefined
      ? quest.done
      : quest.status !== undefined
        ? quest.status === 'completed'
        : previous.done
    const requestedCompletedAt = requestedDone ? quest.completedAt ?? previous.completedAt ?? timestamp() : undefined
    const templateStatus: Quest['status'] = nextRecurrenceRule && requestedDone
      ? 'active'
      : quest.status ?? (nextRecurrenceRule && previous.status === 'completed' ? 'active' : previous.status)
    const storagePatch: Partial<Quest> = nextRecurrenceRule
      ? { ...quest, status: templateStatus, completedAt: undefined }
      : quest
    const localPatch: Partial<Quest> = nextRecurrenceRule
      ? { ...quest, done: requestedDone, status: requestedDone ? 'completed' : templateStatus, completedAt: requestedCompletedAt }
      : quest
    const nextCompletion = nextRecurrenceRule && requestedDone
      ? { questId: id, occurrenceDate, completedAt: requestedCompletedAt as string }
      : undefined
    set((state) => ({
      quests: state.quests.map((item) => item.id === id ? { ...item, ...localPatch, updatedAt: timestamp() } : item),
      questCompletions: nextRecurrenceRule
        ? nextCompletion
          ? [...state.questCompletions.filter((item) => item.questId !== id || item.occurrenceDate !== occurrenceDate), nextCompletion]
          : state.questCompletions.filter((item) => item.questId !== id || item.occurrenceDate !== occurrenceDate)
        : state.questCompletions,
      recordSync: { status: 'saving', message: '퀘스트 변경사항을 저장하고 있어요.' },
    }))
    try {
      assertStoredWhenRequired(await updateQuestRow(id, storagePatch))
      if (nextRecurrenceRule) {
        const stored = nextCompletion
          ? await saveQuestCompletion(nextCompletion)
          : await removeQuestCompletion(id, occurrenceDate)
        assertStoredWhenRequired(stored)
      }
      set({ recordSync: { status: 'saved', message: '퀘스트 변경사항을 저장했어요.' } })
      return true
    } catch {
      if (cloudAccountActive()) void updateQuestRow(id, previous).catch(() => undefined)
      set((state) => ({
        quests: state.quests.map((item) => item.id === id ? previous : item),
        questCompletions: previousCompletions,
        recordSync: { status: 'error', message: '퀘스트 변경사항을 저장하지 못해 되돌렸어요.' },
      }))
      return false
    }
  },
  deleteQuest: async (id) => {
    const previous = get().quests
    const previousCompletions = get().questCompletions
    if (!previous.some((quest) => quest.id === id)) return false
    set({
      quests: previous.filter((quest) => quest.id !== id),
      questCompletions: previousCompletions.filter((item) => item.questId !== id),
      recordSync: { status: 'saving', message: '퀘스트를 삭제하고 있어요.' },
    })
    try {
      assertStoredWhenRequired(await removeQuestRow(id))
      set({ recordSync: { status: 'saved', message: '퀘스트를 삭제했어요.' } })
      return true
    } catch {
      set({ quests: previous, questCompletions: previousCompletions, recordSync: { status: 'error', message: '퀘스트를 삭제하지 못해 복원했어요.' } })
      return false
    }
  },
  reorderQuests: (orderedIds) => set((state) => {
    const order = { ...state.questOrder }
    orderedIds.forEach((id, index) => { order[id] = index })
    return { questOrder: order }
  }),
  refreshRecurringQuestState: (today) => {
    set((state) => ({
      quests: state.quests.map((quest) => {
        if (!quest.recurrenceRule) return quest
        const completion = state.questCompletions.find((item) => item.questId === quest.id && item.occurrenceDate === today)
        return {
          ...quest,
          done: Boolean(completion),
          status: completion ? 'completed' : quest.status === 'completed' ? 'active' : quest.status,
          completedAt: completion?.completedAt,
        }
      }),
    }))
  },
  addProject: async (project) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Project = { ...project, id, createdAt: now, updatedAt: now }
    set((state) => ({ projects: [...state.projects, full], recordSync: { status: 'saving', message: '메인퀘스트를 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await createProjectRow(full))
      set({ recordSync: { status: 'saved', message: '메인퀘스트를 저장했어요.' } })
      return id
    } catch {
      set((state) => ({ projects: state.projects.filter((item) => item.id !== id), recordSync: { status: 'error', message: '메인퀘스트를 저장하지 못했어요.' } }))
      return null
    }
  },
  updateProject: async (id, project) => {
    const previous = get().projects.find((item) => item.id === id)
    if (!previous) return false
    set((state) => ({ projects: state.projects.map((item) => item.id === id ? { ...item, ...project, updatedAt: timestamp() } : item), recordSync: { status: 'saving', message: '메인퀘스트를 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await updateProjectRow(id, project))
      set({ recordSync: { status: 'saved', message: '메인퀘스트를 저장했어요.' } })
      return true
    } catch {
      set((state) => ({ projects: state.projects.map((item) => item.id === id ? previous : item), recordSync: { status: 'error', message: '메인퀘스트를 저장하지 못해 되돌렸어요.' } }))
      return false
    }
  },
  deleteProject: async (id) => {
    const previousProjects = get().projects
    const previousQuests = get().quests
    const previousMemos = get().memos
    if (!previousProjects.some((item) => item.id === id)) return false
    set({ projects: previousProjects.filter((item) => item.id !== id), quests: previousQuests.map((quest) => quest.projectId === id ? { ...quest, projectId: undefined, project: undefined } : quest), memos: previousMemos.map((memo) => memo.projectId === id ? { ...memo, projectId: undefined } : memo), recordSync: { status: 'saving', message: '메인퀘스트를 삭제하고 있어요.' } })
    try {
      assertStoredWhenRequired(await removeProjectRow(id))
      set({ recordSync: { status: 'saved', message: '메인퀘스트를 삭제했어요.' } })
      return true
    } catch {
      set({ projects: previousProjects, quests: previousQuests, memos: previousMemos, recordSync: { status: 'error', message: '메인퀘스트를 삭제하지 못해 복원했어요.' } })
      return false
    }
  },
  setProjectStatus: async (id, status) => {
    const completedAt = status === 'completed' ? timestamp() : undefined
    return get().updateProject(id, { status, completedAt })
  },
  addMemo: async (memo) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Memo = { ...memo, id, createdAt: now, updatedAt: now }
    set((state) => ({ memos: [...state.memos, full], recordSync: { status: 'saving', message: '비망록을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await createMemoRow(full))
      set({ recordSync: { status: 'saved', message: '비망록을 저장했어요.' } })
      return id
    } catch {
      set((state) => ({ memos: state.memos.filter((item) => item.id !== id), recordSync: { status: 'error', message: '비망록을 저장하지 못했어요.' } }))
      return null
    }
  },
  updateMemo: async (id, memo) => {
    const previous = get().memos.find((item) => item.id === id)
    if (!previous) return false
    set((state) => ({ memos: state.memos.map((item) => item.id === id ? { ...item, ...memo, updatedAt: timestamp() } : item), recordSync: { status: 'saving', message: '비망록을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await updateMemoRow(id, memo))
      set({ recordSync: { status: 'saved', message: '비망록을 저장했어요.' } })
      return true
    } catch {
      set((state) => ({ memos: state.memos.map((item) => item.id === id ? previous : item), recordSync: { status: 'error', message: '비망록을 저장하지 못해 되돌렸어요.' } }))
      return false
    }
  },
  deleteMemo: async (id) => {
    const previous = get().memos
    if (!previous.some((item) => item.id === id)) return false
    set({ memos: previous.filter((item) => item.id !== id), recordSync: { status: 'saving', message: '비망록을 삭제하고 있어요.' } })
    try {
      assertStoredWhenRequired(await removeMemoRow(id))
      set({ recordSync: { status: 'saved', message: '비망록을 삭제했어요.' } })
      return true
    } catch {
      set({ memos: previous, recordSync: { status: 'error', message: '비망록을 삭제하지 못해 복원했어요.' } })
      return false
    }
  },
  addRelationship: async (relationship) => {
    const id = crypto.randomUUID()
    const now = timestamp()
    const full: Relationship = { ...relationship, id, createdAt: now, updatedAt: now }
    set((state) => ({ relationships: [...state.relationships, full], recordSync: { status: 'saving', message: '인연록을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await createRelationshipRow(full))
      set({ recordSync: { status: 'saved', message: '인연록을 저장했어요.' } })
      return id
    } catch {
      set((state) => ({ relationships: state.relationships.filter((item) => item.id !== id), recordSync: { status: 'error', message: '인연록을 저장하지 못했어요.' } }))
      return null
    }
  },
  updateRelationship: async (id, relationship) => {
    const previous = get().relationships.find((item) => item.id === id)
    if (!previous) return false
    const next: Relationship = { ...previous, ...relationship, updatedAt: timestamp() }
    set((state) => ({ relationships: state.relationships.map((item) => item.id === id ? next : item), recordSync: { status: 'saving', message: '인연록을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await updateRelationshipRow(id, next))
      set({ recordSync: { status: 'saved', message: '인연록을 저장했어요.' } })
      return true
    } catch {
      set((state) => ({ relationships: state.relationships.map((item) => item.id === id ? previous : item), recordSync: { status: 'error', message: '인연록을 저장하지 못해 되돌렸어요.' } }))
      return false
    }
  },
  deleteRelationship: async (id) => {
    const previous = get().relationships
    if (!previous.some((item) => item.id === id)) return false
    set({ relationships: previous.filter((item) => item.id !== id), recordSync: { status: 'saving', message: '인연록을 삭제하고 있어요.' } })
    try {
      assertStoredWhenRequired(await removeRelationshipRow(id))
      set({ recordSync: { status: 'saved', message: '인연록을 삭제했어요.' } })
      return true
    } catch {
      set({ relationships: previous, recordSync: { status: 'error', message: '인연록을 삭제하지 못해 복원했어요.' } })
      return false
    }
  },
  addRelationshipGroup: async (name, color = '#8f78b5') => {
    const normalized = name.trim()
    if (!normalized || get().relationshipGroups.some((group) => group.name.toLocaleLowerCase('ko') === normalized.toLocaleLowerCase('ko'))) return null
    const now = timestamp()
    const group: RelationshipGroup = { id: crypto.randomUUID(), name: normalized, color, sortOrder: get().relationshipGroups.length, createdAt: now, updatedAt: now }
    set((state) => ({ relationshipGroups: [...state.relationshipGroups, group], recordSync: { status: 'saving', message: '인연록 그룹을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await createRelationshipGroupRow(group))
      set({ recordSync: { status: 'saved', message: '인연록 그룹을 만들었어요.' } })
      return group.id
    } catch {
      set((state) => ({ relationshipGroups: state.relationshipGroups.filter((item) => item.id !== group.id), recordSync: { status: 'error', message: '인연록 그룹을 만들지 못했어요.' } }))
      return null
    }
  },
  updateRelationshipGroup: async (id, patch) => {
    const previous = get().relationshipGroups.find((item) => item.id === id)
    if (!previous) return false
    const next = { ...patch, name: patch.name?.trim() || previous.name }
    set((state) => ({ relationshipGroups: state.relationshipGroups.map((item) => item.id === id ? { ...item, ...next, updatedAt: timestamp() } : item), recordSync: { status: 'saving', message: '인연록 그룹을 저장하고 있어요.' } }))
    try {
      assertStoredWhenRequired(await updateRelationshipGroupRow(id, next))
      set({ recordSync: { status: 'saved', message: '인연록 그룹을 수정했어요.' } })
      return true
    } catch {
      set((state) => ({ relationshipGroups: state.relationshipGroups.map((item) => item.id === id ? previous : item), recordSync: { status: 'error', message: '인연록 그룹을 수정하지 못했어요.' } }))
      return false
    }
  },
  deleteRelationshipGroup: async (id) => {
    const previousGroups = get().relationshipGroups
    const previousRelationships = get().relationships
    if (!previousGroups.some((item) => item.id === id)) return false
    set({ relationshipGroups: previousGroups.filter((item) => item.id !== id), relationships: previousRelationships.map((item) => ({ ...item, groupIds: item.groupIds.filter((groupId) => groupId !== id) })), recordSync: { status: 'saving', message: '인연록 그룹을 삭제하고 있어요.' } })
    try {
      assertStoredWhenRequired(await removeRelationshipGroupRow(id))
      set({ recordSync: { status: 'saved', message: '그룹만 삭제하고 인연록은 미분류로 보존했어요.' } })
      return true
    } catch {
      set({ relationshipGroups: previousGroups, relationships: previousRelationships, recordSync: { status: 'error', message: '인연록 그룹을 삭제하지 못했어요.' } })
      return false
    }
  },
  upsertDiary: async (entry) => {
    const previous = get().diaries
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
    set({ recordSync: { status: 'saving', message: '다이어리를 저장하고 있어요.' } })
    try {
      const stored = created ? await createDiaryRow(full as DiaryEntry) : await updateDiaryRow(id, entry)
      assertStoredWhenRequired(stored)
      set({ recordSync: { status: 'saved', message: '다이어리를 저장했어요.' } })
      return id
    } catch {
      set({ diaries: previous, recordSync: { status: 'error', message: '다이어리를 저장하지 못해 되돌렸어요.' } })
      return null
    }
  },
  deleteDiary: async (id) => {
    const previous = get().diaries
    if (!previous.some((item) => item.id === id)) return false
    set({ diaries: previous.filter((item) => item.id !== id), recordSync: { status: 'saving', message: '다이어리를 삭제하고 있어요.' } })
    try {
      assertStoredWhenRequired(await removeDiaryRow(id))
      set({ recordSync: { status: 'saved', message: '다이어리를 삭제했어요.' } })
      return true
    } catch {
      set({ diaries: previous, recordSync: { status: 'error', message: '다이어리를 삭제하지 못해 복원했어요.' } })
      return false
    }
  },
  toggleLibraryFavorite: async (type, id) => {
    if (type === 'mainQuest') { const item = get().projects.find((value) => value.id === id); return item ? get().updateProject(id, { favorite: !item.favorite }) : false }
    if (type === 'dailyQuest' || type === 'subQuest') { const item = get().quests.find((value) => value.id === id); return item ? get().updateQuest(id, { favorite: !item.favorite }) : false }
    if (type === 'relationship') { const item = get().relationships.find((value) => value.id === id); return item ? get().updateRelationship(id, { favorite: !item.favorite }) : false }
    if (type === 'memo') { const item = get().memos.find((value) => value.id === id); return item ? get().updateMemo(id, { favorite: !item.favorite }) : false }
    const item = get().diaries.find((value) => value.id === id)
    return item ? get().upsertDiary({ ...item, favorite: !item.favorite }).then(Boolean) : false
  },
}), {
  name: 'rumen-kingdom:v2:locked',
  skipHydration: true,
  version: 7,
  migrate: (persisted) => {
    const old = (persisted ?? {}) as PersistedState
    const projectNames = new Map((old.projects ?? initialProjects).map((project) => [project.title, project.id]))
    const migratedCompletions = old.questCompletions ?? (old.quests ?? [])
      .filter((quest) => quest.recurrenceRule && quest.completedAt)
      .map((quest) => ({
        questId: quest.id,
        occurrenceDate: serviceDate(new Date(quest.completedAt as string)),
        completedAt: quest.completedAt as string,
      }))
    const completedToday = new Set(migratedCompletions.filter((item) => item.occurrenceDate === serviceDate()).map((item) => item.questId))
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
      quests: (old.quests ?? initialQuests).map((quest) => {
        const recurringDone = Boolean(quest.recurrenceRule && completedToday.has(quest.id))
        return {
          id: quest.id, title: quest.title, description: quest.description ?? '', memo: quest.memo ?? '', tags: quest.tags ?? [], projectId: quest.projectId ?? (quest.project ? projectNames.get(quest.project) : undefined), project: quest.project,
          parentQuestId: quest.parentQuestId, type: quest.type ?? 'daily', status: quest.recurrenceRule ? (recurringDone ? 'completed' : 'active') : quest.status ?? (quest.done ? 'completed' : 'active'),
          due: quest.due ?? '', scheduledDate: quest.scheduledDate, scheduledTime: quest.scheduledTime, recurrenceRule: quest.recurrenceRule, done: quest.recurrenceRule ? recurringDone : quest.done ?? false, priority: quest.priority ?? 'medium', favorite: quest.favorite ?? false, completedAt: quest.recurrenceRule ? migratedCompletions.find((item) => item.questId === quest.id && item.occurrenceDate === serviceDate())?.completedAt : quest.completedAt,
          createdAt: quest.createdAt ?? createdAt, updatedAt: quest.updatedAt ?? createdAt,
        }
      }),
      questCompletions: migratedCompletions,
      memos: old.memos ?? initialMemos,
      relationships: (old.relationships ?? initialRelationships).map((relationship) => ({ ...relationship, groupIds: relationship.groupIds ?? [] })),
      relationshipGroups: old.relationshipGroups ?? initialRelationshipGroups,
      diaries: old.diaries ?? initialDiaries,
      questOrder: old.questOrder ?? {},
    }
  },
  partialize: (state) => ({ selectedDate: state.selectedDate, events: state.events, quests: state.quests, questCompletions: state.questCompletions, projects: state.projects, memos: state.memos, relationships: state.relationships, relationshipGroups: state.relationshipGroups, diaries: state.diaries, questOrder: state.questOrder }),
}))

let activeKingdomStorageKey = ''

export async function activateKingdomAccount(scope: string, demo = false) {
  const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '-') || 'locked'
  const storageKey = `rumen-kingdom:v2:${safeScope}`
  if (activeKingdomStorageKey === storageKey) return
  setActiveAccountScope(safeScope)
  const storage = createJSONStorage<PersistedKingdomSlice>(() => demo ? sessionStorage : localStorage)
  useKingdomStore.persist.setOptions({ name: storageKey, storage })
  activeKingdomStorageKey = storageKey
  const backingStorage = demo ? sessionStorage : localStorage
  if (backingStorage.getItem(storageKey)) {
    try { await useKingdomStore.persist.rehydrate() }
    catch { useKingdomStore.getState().resetForAccount(demo) }
  } else useKingdomStore.getState().resetForAccount(demo)
}

export function deactivateKingdomAccount() {
  const storageKey = 'rumen-kingdom:v2:locked'
  setActiveAccountScope('locked')
  useKingdomStore.persist.setOptions({ name: storageKey, storage: createJSONStorage<PersistedKingdomSlice>(() => localStorage) })
  activeKingdomStorageKey = ''
  useKingdomStore.getState().resetForAccount(false)
  localStorage.removeItem(storageKey)
}
