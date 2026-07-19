import test from 'node:test'
import assert from 'node:assert/strict'
import {
  accountStorage,
  accountStorageKey,
  clearDemoSessionStorage,
  setActiveAccountScope,
  writeAccountStorage,
} from '../src/lib/accountScope.ts'

class MemoryStorage {
  #values = new Map<string, string>()
  get length() { return this.#values.size }
  clear() { this.#values.clear() }
  getItem(key: string) { return this.#values.get(key) ?? null }
  key(index: number) { return [...this.#values.keys()][index] ?? null }
  removeItem(key: string) { this.#values.delete(key) }
  setItem(key: string, value: string) { this.#values.set(key, value) }
}

const browser = globalThis as typeof globalThis & { localStorage: Storage; sessionStorage: Storage }

test('데모 데이터는 탭 세션 저장소에 격리되고 종료 시 해당 범위만 제거된다', () => {
  browser.localStorage = new MemoryStorage()
  browser.sessionStorage = new MemoryStorage()
  setActiveAccountScope('demo:first')
  writeAccountStorage('rumen-princess-name', '첫 번째 데모')
  browser.sessionStorage.setItem('rumen-kingdom:v2:demo:first', '{}')
  browser.sessionStorage.setItem('unrelated', 'keep')
  browser.localStorage.setItem('rumen-princess-name:v2:user:member', '회원')

  assert.equal(accountStorage(), browser.sessionStorage)
  assert.equal(browser.sessionStorage.getItem(accountStorageKey('rumen-princess-name')), '첫 번째 데모')

  clearDemoSessionStorage('demo:first')

  assert.equal(browser.sessionStorage.getItem('rumen-kingdom:v2:demo:first'), null)
  assert.equal(browser.sessionStorage.getItem('rumen-princess-name:v2:demo:first'), null)
  assert.equal(browser.sessionStorage.getItem('unrelated'), 'keep')
  assert.equal(browser.localStorage.getItem('rumen-princess-name:v2:user:member'), '회원')
})

test('회원 범위는 영구 저장소를 사용한다', () => {
  browser.localStorage = new MemoryStorage()
  browser.sessionStorage = new MemoryStorage()
  setActiveAccountScope('user:member')
  assert.equal(accountStorage(), browser.localStorage)
})
