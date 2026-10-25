import { test, expect } from 'claude-code/testing'
import { H, W, barSvg, icons, paint, resetIn, xpCells } from './hud'

const rgb = (px: Uint8Array, x: number, y: number) => {
  const i = (y * W + x) * 4
  return (px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!
}

test('icons and xp bar math', async () => {
  expect(icons(100)).toEqual(Array(10).fill('full'))
  expect(icons(0)).toEqual(Array(10).fill('empty'))
  expect(icons(95).slice(8)).toEqual(['full', 'half'])
  expect(xpCells(50, 40)).toBe(20)
  expect(xpCells(150, 40)).toBe(40)
})

test('paint lays hearts, food and bar where vanilla does', async () => {
  const px = paint({ contextPct: 50, sessionUsed: 95, weeklyUsed: 0 })
  expect(px.length).toBe(W * H * 4)
  expect(rgb(px, 3, 3)).toBe(0xff1313) // first heart is lit
  expect(rgb(px, 72 + 6, 3)).toBe(0x2e2e2e) // last heart empty (5% left)
  expect(rgb(px, W - 81 + 6, 3)).toBe(0x8c4a1e) // food full
  expect(rgb(px, 5, 12)).toBe(0x80e01e) // bar filled at the left
  expect(rgb(px, W - 5, 12)).toBe(0x3c3c3c) // and empty at the right
  expect(px[85 * 4 + 3]).toBe(0) // gap above the level number is transparent
})

const HUD_CMD = { command: 'hud', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

test('band draws an Image, and /hud toggles it', async ($, on) => {
  // Stands in for the engine's own band when the HUD passes.
  on('ui.render', ($, e) => $.ui.resolve(e).Box({}))
  const ui = await $.ui.mount({
    plugin: 'minecraft-hud',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  expect(await ui.find({ type: 'Image' })).toBeDefined()
  expect((await $.command.run(HUD_CMD)).text).toMatch(/hidden/)
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  await $.command.run(HUD_CMD)
  expect(await ui.find({ type: 'Image' })).toBeDefined()
  await ui.unmount()
})

test('desktop draws plain 5h and week meters, no Minecraft Image', async ($, on) => {
  on('ui.render', ($, e) => $.ui.resolve(e).Box({}))
  on('clock.now', () => ({ value: 0 }))
  const ui = await $.ui.mount({
    plugin: 'minecraft-hud',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  const svg = await ui.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(barSvg(50)).toContain('width="50%"')
  expect(barSvg(80)).toContain('#c98a1e')
  expect(barSvg(150)).toContain('width="100%" height="8" fill="#c93c3c"') // clamped, red
  expect(resetIn(45 * 60_000)).toBe('45 min')
  expect(resetIn(150 * 60_000)).toBe('2 hr')
  expect(resetIn(30 * 3600_000)).toBe('1 day')
  await ui.unmount()
})
