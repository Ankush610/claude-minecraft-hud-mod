import { atom, read, update } from 'claude-code'
import type { Register, SessionMeasureInput } from 'claude-code'

import type { Hud } from '../types'
import { H, PAD_TOP, SCALE, W, paint, upscale } from './hud'

const hud = atom({ plugin: 'minecraft-hud', key: 'hud' } as const, {
  contextPct: null,
  sessionUsed: null,
  weeklyUsed: null,
} as Hud)
const isHidden = atom({ plugin: 'minecraft-hud', key: 'isHidden' } as const, false)

const toHud = (u: Pick<SessionMeasureInput, 'context' | 'rateLimits'>): Hud => ({
  contextPct: u.context.percent ?? null,
  sessionUsed: u.rateLimits.find(r => r.kind === 'five_hour')?.percentUsed ?? null,
  weeklyUsed: u.rateLimits.find(r => r.kind === 'seven_day')?.percentUsed ?? null,
})

// Terminal cell height / width, measured on Ghostty's default font. Off, and the
// HUD leaves a gap below it (too high) or gets clipped (too low).
const CELL_ASPECT = 2.2
const HP = H + PAD_TOP
// The hooks runtime has ES2025's Uint8Array.toBase64; TypeScript's es2023 lib doesn't yet.
type Bytes = Uint8Array & { toBase64(): string }
const ROWS = 2
const MAX_COLUMNS = Math.round((ROWS * CELL_ASPECT * W) / HP)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hud', description: 'Show or hide the Minecraft HUD' })
    const r = await next(e)
    const u = await $.session.usage()
    await update($, hud, () => toHud(u))
    return r
  })

  on('command.run', { command: 'hud' }, async $ => {
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'HUD hidden. /hud to show it again.' : 'HUD shown.' }
  })

  on('session.measure', async ($, e, next) => {
    await update($, hud, () => toHud(e))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const s = await read($, hud)
    const pct = (n: number | null) => (n === null ? '?' : `${Math.round(n)}%`)
    const alt = `health ${pct(s.sessionUsed === null ? null : 100 - s.sessionUsed)} · xp ${pct(s.contextPct)} · food ${pct(s.weeklyUsed === null ? null : 100 - s.weeklyUsed)}`

    if (e.surface !== 'terminal') {
      const { Text } = $.ui.resolve(e)
      return <Text>{alt}</Text>
    }

    const { Box, Image } = $.ui.resolve(e)
    const columns = Math.min(e.props.bodyColumns, MAX_COLUMNS)
    const rows = Math.max(1, Math.round((columns * HP) / (W * CELL_ASPECT)))
    return (
      <Box justifyContent="center" width={e.props.bodyColumns}>
        <Image
          // Size in the key: a keyed Image redrawn at a new size kept the old placement's scale.
          key={`hud-${columns}x${rows}`}
          source={{ rgba: (upscale(paint(s)) as Bytes).toBase64(), width: W * SCALE, height: HP * SCALE }}
          columns={columns}
          rows={rows}
          alt={alt}
        />
      </Box>
    )
  })
}
