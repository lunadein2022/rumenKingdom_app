let activeAccountScope = 'locked'
const DATA_GENERATION = 'v2'

export function setActiveAccountScope(scope: string) {
  activeAccountScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '-') || 'locked'
}

export function getActiveAccountScope() {
  return activeAccountScope
}

export function accountStorageKey(base: string) {
  return `${base}:${DATA_GENERATION}:${activeAccountScope}`
}
