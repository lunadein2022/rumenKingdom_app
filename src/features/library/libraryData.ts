import type { DiaryEntry, LibraryCategory, LibraryRecord, Memo, Project, Quest, Relationship } from '../../types'

export const libraryCategories: Array<{ id: LibraryCategory; title: string; description: string; image: string }> = [
  { id: 'all', title: '전체 기록', description: '왕국의 모든 기록', image: '/assets/books/book-all-records-compatible.webp' },
  { id: 'main-quests', title: '메인퀘스트', description: '왕국의 목표와 여정', image: '/assets/books/book-mainquest.webp' },
  { id: 'daily-quests', title: '일일퀘스트', description: '오늘 실행할 작은 임무', image: '/assets/books/book-dailyquest.webp' },
  { id: 'sub-quests', title: '서브퀘스트', description: '독립적이거나 연결된 세부 임무', image: '/assets/books/book-subquest.webp' },
  { id: 'relationships', title: '인연록', description: '소중한 사람과 만남의 기록', image: '/assets/books/book-relationship.webp' },
  { id: 'memos', title: '비망록', description: '놓치고 싶지 않은 생각과 정보', image: '/assets/books/book-memorandum.webp' },
  { id: 'diaries', title: '다이어리', description: '공주님의 하루와 마음', image: '/assets/books/book-diary.webp' },
]

export function buildLibraryRecords(data: { projects: Project[]; quests: Quest[]; relationships: Relationship[]; memos: Memo[]; diaries: DiaryEntry[] }): LibraryRecord[] {
  return [
    ...data.projects.map((item): LibraryRecord => ({
      id: `mainQuest:${item.id}`, sourceId: item.id, type: 'mainQuest', title: item.title,
      summary: item.goal || item.description || '기록된 목표가 없습니다.',
      searchText: [item.title, item.goal, item.description, item.memo, item.tag, ...(item.tags ?? [])].filter(Boolean).join(' '),
      tags: Array.from(new Set([item.tag, ...(item.tags ?? [])])).filter(Boolean), favorite: item.favorite,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
      path: `/library/item/${encodeURIComponent(`mainQuest:${item.id}`)}`,
    })),
    ...data.quests.map((item): LibraryRecord => ({
      id: `${item.type === 'daily' ? 'dailyQuest' : 'subQuest'}:${item.id}`, sourceId: item.id,
      type: item.type === 'daily' ? 'dailyQuest' : 'subQuest', title: item.title,
      summary: item.description || `${item.project ?? '독립 퀘스트'} · ${item.due}`,
      searchText: [item.title, item.description, item.memo, item.project, ...(item.tags ?? [])].filter(Boolean).join(' '),
      tags: Array.from(new Set([...(item.tags ?? []), item.priority])).filter(Boolean), favorite: item.favorite,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
      path: `/library/item/${encodeURIComponent(`${item.type === 'daily' ? 'dailyQuest' : 'subQuest'}:${item.id}`)}`,
    })),
    ...data.relationships.map((item): LibraryRecord => ({ id: `relationship:${item.id}`, sourceId: item.id, type: 'relationship', title: item.name, summary: `${item.organization}${item.position ? ` · ${item.position}` : ''}`, searchText: [item.name, item.organization, item.position, item.memo, ...item.tags].join(' '), tags: item.tags, favorite: item.favorite, createdAt: item.createdAt, updatedAt: item.updatedAt, path: `/library/relationships/${item.id}` })),
    ...data.memos.map((item): LibraryRecord => ({ id: `memo:${item.id}`, sourceId: item.id, type: 'memo', title: item.title, summary: item.content, searchText: [item.title, item.content, ...item.tags].join(' '), tags: item.tags, favorite: item.favorite, createdAt: item.createdAt, updatedAt: item.updatedAt, path: `/library/memos/${item.id}` })),
    ...data.diaries.map((item): LibraryRecord => ({ id: `diary:${item.id}`, sourceId: item.id, type: 'diary', title: item.title || item.date, summary: item.content, searchText: [item.title, item.content, ...item.tags].join(' '), tags: item.tags, favorite: item.favorite, createdAt: item.createdAt, updatedAt: item.updatedAt, path: `/diary/${item.date}` })),
  ]
}

export function recordMatchesCategory(record: LibraryRecord, category: LibraryCategory) {
  if (category === 'all') return true
  if (category === 'favorites') return record.favorite
  return ({ 'main-quests': 'mainQuest', 'daily-quests': 'dailyQuest', 'sub-quests': 'subQuest', relationships: 'relationship', memos: 'memo', diaries: 'diary' } as const)[category] === record.type
}

export function recordPath(record: LibraryRecord) { return record.path }
