import type { PrincessOption } from '../lib/princesses'

export function PrincessPortrait({ princess, variant = 'avatar', className = '', loading = 'eager' }: { princess: PrincessOption; variant?: 'avatar' | 'full'; className?: string; loading?: 'eager' | 'lazy' }) {
  const fallback = princess.avatarFallback && variant === 'avatar'
  return <img
    className={`princess-portrait princess-portrait-${variant} ${fallback ? 'is-full-crop' : ''} ${className}`.trim()}
    src={variant === 'full' ? princess.fullBody : princess.avatar}
    alt={princess.name}
    loading={loading}
    decoding="async"
  />
}
