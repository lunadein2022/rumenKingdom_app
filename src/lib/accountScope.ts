let activeAccountScope = 'locked'
const DATA_GENERATION = 'v2'

export const DEMO_SESSION_ID_KEY = 'rumen-demo-session-id'
export const DEMO_MODE_KEY = 'rumen-guest-mode'

export function setActiveAccountScope(scope: string) {
  activeAccountScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '-') || 'locked'
}

export function getActiveAccountScope() {
  return activeAccountScope
}

export function isDemoAccountScope(scope = activeAccountScope) {
  return scope.startsWith('demo:')
}

export function accountStorageKey(base: string) {
  return `${base}:${DATA_GENERATION}:${activeAccountScope}`
}

export function accountStorage() {
  return isDemoAccountScope() ? sessionStorage : localStorage
}

export function readAccountStorage(base: string) {
  return accountStorage().getItem(accountStorageKey(base))
}

export function writeAccountStorage(base: string, value: string) {
  accountStorage().setItem(accountStorageKey(base), value)
}

export function removeAccountStorage(base: string) {
  accountStorage().removeItem(accountStorageKey(base))
}

export function createDemoSessionId() {
  const id = crypto.randomUUID()
  sessionStorage.setItem(DEMO_SESSION_ID_KEY, id)
  sessionStorage.setItem(DEMO_MODE_KEY, 'true')
  return id
}

export function currentDemoSessionId() {
  return sessionStorage.getItem(DEMO_SESSION_ID_KEY)
}

export function clearDemoSessionStorage(scope: string) {
  if (!isDemoAccountScope(scope)) return
  const suffix = `:${DATA_GENERATION}:${scope}`
  for (const storage of [sessionStorage, localStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key))
    for (const key of keys) {
      if (key.endsWith(suffix) || key === `rumen-kingdom:${DATA_GENERATION}:${scope}`) storage.removeItem(key)
    }
  }
  // 이전 버전의 고정 guest 저장소도 데모 종료 때 함께 치운다.
  localStorage.removeItem(`rumen-kingdom:${DATA_GENERATION}:guest`)
  sessionStorage.removeItem(DEMO_SESSION_ID_KEY)
  sessionStorage.removeItem(DEMO_MODE_KEY)
}
