import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rumen-patchnotes-dismissed-version', '0.6.0')
    localStorage.setItem('rumen-onboarding-complete', 'done')
  })
  await page.goto('/')
  await page.locator('.guest-entry').click()
  await expect(page.locator('.app-shell')).toBeVisible()
})

test('quest modal has clean non-sticky heading chrome', async ({ page }) => {
  await page.goto('/office')
  await page.locator('.office-quest-heading .primary').click()
  const modal = page.locator('.quest-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('#quest-modal-title')).toHaveText('새 퀘스트')
  const style = await modal.locator('.modal-head').evaluate((node) => ({ position: getComputedStyle(node).position, background: getComputedStyle(node).backgroundImage }))
  expect(style.position).toBe('static')
  expect(style.background).toBe('none')
})

test('saved diary date receives a calendar marker', async ({ page }) => {
  await page.goto('/diary')
  await expect(page.locator('.diary-calendar')).toBeVisible()
  await page.locator('.diary-title').fill('자동 테스트 다이어리')
  await page.locator('.diary-paper textarea').first().fill('오늘의 기록을 남겼습니다.')
  await page.locator('.save-diary').click()
  await expect(page.locator('.diary-calendar-days button.written')).not.toHaveCount(0)
})

test('secret garden exposes a three-track looping playlist', async ({ page }) => {
  await page.goto('/garden')
  const player = page.locator('.garden-player')
  await expect(player).toBeVisible()
  await expect(player).toContainText('1 / 3 · 전체 반복')
  await player.getByRole('button', { name: '다음 곡' }).click()
  await expect(player).toContainText('2 / 3 · 전체 반복')
  await expect(player.locator('audio')).toHaveAttribute('src', /secret-garden-tea-02\.mp3/)
})

test('data management is presented as one unified section', async ({ page }) => {
  await page.goto('/throne')
  await page.locator('.setting-list > button').nth(4).click()
  await expect(page.locator('.data-management-unified')).toBeVisible()
  await expect(page.locator('.data-management-unified .data-export')).toHaveCount(1)
  await expect(page.locator('.kingdom-account > .data-export')).toHaveCount(0)
})
