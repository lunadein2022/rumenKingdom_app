import { useState } from 'react'
import { CalendarDays, Check, ChevronRight, Sparkles, Sword } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { readAccountStorage, writeAccountStorage } from '../lib/accountScope'
import { princessOptions, storeSelectedPrincessId, useSelectedPrincess } from '../lib/princesses'
import { PrincessPortrait } from './PrincessPortrait'
import { useKingdomStore } from '../store'

export function Onboarding() {
  const navigate = useNavigate()
  const princess = useSelectedPrincess()
  const recordCount = useKingdomStore((state) => state.events.length + state.quests.length + state.projects.length + state.diaries.length)
  const [open, setOpen] = useState(() => readAccountStorage('rumen-onboarding-complete') !== 'done' && recordCount === 0)
  const [step, setStep] = useState(0)
  if (!open) return null
  const finish = (path?: string, state?: unknown) => { writeAccountStorage('rumen-onboarding-complete', 'done'); setOpen(false); if (path) navigate(path, { state }) }
  return <div className="onboarding-backdrop"><section className="onboarding-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><button className="onboarding-skip" onClick={() => finish()}>건너뛰기</button><div className="onboarding-progress" aria-label={`${step + 1}/3 단계`}>{[0, 1, 2].map((item) => <i key={item} className={item <= step ? 'active' : ''}/>)}</div>{step === 0 && <><PrincessPortrait className="onboarding-princess" princess={princess}/><span className="eyebrow">WELCOME, PRINCESS</span><h2 id="onboarding-title">공주님을 선택해 주세요</h2><p>선택한 공주는 로비와 왕국 전체에서 함께합니다.</p><div className="onboarding-princesses">{princessOptions.slice(0, 6).map((item) => <button key={item.id} aria-pressed={princess.id === item.id} onClick={() => storeSelectedPrincessId(item.id)}><PrincessPortrait princess={item} loading="lazy"/><small>{item.name}</small></button>)}</div><button className="primary" onClick={() => setStep(1)}>다음 <ChevronRight size={15}/></button></>}{step === 1 && <><span className="onboarding-icon"><Check/></span><span className="eyebrow">FIRST RECORD</span><h2 id="onboarding-title">첫 기록을 만들어 볼까요?</h2><p>일정이나 퀘스트 하나만 등록하면 오늘 브리핑이 시작됩니다.</p><div className="onboarding-choices"><button onClick={() => finish('/calendar', { quickCreate: true })}><CalendarDays/><b>첫 일정 만들기</b><small>날짜와 시간을 관리해요</small></button><button onClick={() => finish('/office', { quickCreate: true })}><Sword/><b>첫 퀘스트 만들기</b><small>오늘 할 일을 정리해요</small></button></div><button onClick={() => setStep(2)}>나중에 만들고 리타 보기 <ChevronRight size={15}/></button></>}{step === 2 && <><span className="onboarding-icon"><Sparkles/></span><span className="eyebrow">MEET RITA</span><h2 id="onboarding-title">말로도 기록할 수 있어요</h2><p>“내일 오후 2시에 회의 일정 추가해줘”처럼 리타에게 편하게 말해 보세요.</p><button className="primary" onClick={() => finish('/rita', { prompt: '내일 오후 2시에 회의 일정 추가해줘' })}><Sparkles size={15}/>리타와 시작하기</button><button onClick={() => finish()}>왕국부터 둘러보기</button></>}</section></div>
}
