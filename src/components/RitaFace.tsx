export type RitaExpression =
  | 'idle'
  | 'error'
  | 'sleeping'
  | 'concern'
  | 'celebration'
  | 'happy'
  | 'speaking'
  | 'thinking'
  | 'welcome'
  | 'notification'

const expressionLabels: Record<RitaExpression, string> = {
  idle: '차분한 리타',
  error: '당황한 리타',
  sleeping: '쉬고 있는 리타',
  concern: '걱정하는 리타',
  celebration: '축하하는 리타',
  happy: '기뻐하는 리타',
  speaking: '말하고 있는 리타',
  thinking: '생각하고 있는 리타',
  welcome: '인사하는 리타',
  notification: '알림을 전하는 리타',
}

export function RitaFace({ expression = 'idle', className = '' }: { expression?: RitaExpression; className?: string }) {
  return (
    <img
      className={`rita-face ${className}`}
      src={`/assets/characters/rita-expressions/rita-${expression}.webp`}
      alt={expressionLabels[expression]}
    />
  )
}
