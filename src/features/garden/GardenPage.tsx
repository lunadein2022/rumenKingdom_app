import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'

const gardenPlaylist = [
  { src: '/assets/audio/secret-garden-tea-01.mp3', title: '영국 비밀정원 다과회 I' },
  { src: '/assets/audio/secret-garden-tea-02.mp3', title: '영국 비밀정원 다과회 II' },
  { src: '/assets/audio/secret-garden-tea-03.mp3', title: '영국 비밀정원 다과회 III' },
]

export function GardenPage() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [track, setTrack] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [volume, setVolume] = useState(0.35)

  const play = async () => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    try {
      await audio.play()
      setPlaying(true)
      setAutoplayBlocked(false)
    } catch {
      setPlaying(false)
      setAutoplayBlocked(true)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    void play()
    return () => audio?.pause()
    // 정원에 들어오거나 곡이 바뀔 때마다 재생을 시도한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track])

  const move = (direction: -1 | 1) => setTrack((current) => (current + direction + gardenPlaylist.length) % gardenPlaylist.length)
  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void play()
    else { audio.pause(); setPlaying(false) }
  }

  return <section className="garden-scene" aria-label="루멘 비밀정원">
    <div className="garden-place-copy">
      <span>TAKE A BREATH</span>
      <h1>공주님,<br/>이곳에선 잠시 쉬셔도 좋습니다.</h1>
      <p>서두르지 않아도 괜찮아요.<br/>고요가 다시 마음을 채울 때까지 머물러 보세요.</p>
    </div>
    <section className="garden-player glass-panel" aria-label="비밀정원 음악 재생기">
      <audio
        ref={audioRef}
        src={gardenPlaylist[track].src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => move(1)}
      />
      <div><small>SECRET GARDEN PLAYLIST</small><b>{gardenPlaylist[track].title}</b><span>{track + 1} / {gardenPlaylist.length} · 전체 반복</span></div>
      <button type="button" onClick={() => move(-1)} aria-label="이전 곡"><SkipBack size={16}/></button>
      <button type="button" className="garden-play" onClick={toggle} aria-label={playing ? '음악 일시정지' : '음악 재생'}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
      <button type="button" onClick={() => move(1)} aria-label="다음 곡"><SkipForward size={16}/></button>
      <label><Volume2 size={15}/><input aria-label="음악 음량" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next }}/></label>
      {autoplayBlocked && <button type="button" className="garden-autoplay" onClick={() => void play()}>눌러서 정원 음악 시작</button>}
    </section>
  </section>
}
