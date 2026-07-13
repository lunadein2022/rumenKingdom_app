import { Check } from 'lucide-react'
import { useKingdomStore } from '../store'

export function QuestRow({ id }: { id: string }) {
  const { quests, projects, toggleQuest } = useKingdomStore()
  const quest = quests.find((item) => item.id === id)
  if (!quest) return null
  const projectTitle = projects.find((project) => project.id === quest.projectId)?.title
  return <button className={`quest-row ${quest.done ? 'done' : ''}`} onClick={() => toggleQuest(id)}><span className="quest-check">{quest.done && <Check size={12}/>}</span><span><b>{quest.title}</b><small>{projectTitle ?? '독립 퀘스트'} · {quest.due}</small></span><i className={`priority ${quest.priority}`}/></button>
}
