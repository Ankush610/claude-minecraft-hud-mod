import type { Hud } from '../types'

type Icon = 'full' | 'half' | 'empty'

// 10 icons, each worth 10% remaining; 5% leftover makes a half icon.
export const icons = (remainingPct: number): Icon[] => {
  const halves = Math.max(0, Math.min(20, Math.round(remainingPct / 5)))
  return Array.from({ length: 10 }, (_, i) =>
    halves >= (i + 1) * 2 ? 'full' : halves === i * 2 + 1 ? 'half' : 'empty',
  )
}

export const xpCells = (pct: number, width: number) =>
  Math.max(0, Math.min(width, Math.round((pct / 100) * width)))

// Vanilla HUD geometry: 182px wide, hearts and food 9px icons on an 8px step,
// XP bar 5px tall under them.
export const W = 182
export const H = 15
export const SCALE = 4
// Transparent pixels above the HUD: a gap smaller than a terminal row.
export const PAD_TOP = 2

const HEART = [
  '.kkk.kkk.',
  'kwwrkrrrk',
  'kwrrrrrrk',
  'krrrrrrdk',
  '.krrrrdk.',
  '..krrdk..',
  '...kdk...',
  '....k....',
]

const FOOD = [
  '.....kkk.',
  '....kppmk',
  '...kppmmk',
  '...kpmmmk',
  '..kbkmmk.',
  '.kbk.kk..',
  'kwbk.....',
  'kwwk.....',
  '.kk......',
]

const LIT: Record<string, number> = {
  k: 0x000000,
  r: 0xff1313, d: 0xb00000, w: 0xffa8a8, // heart
  p: 0xd8452b, m: 0x8c4a1e, b: 0xd9d9d9, // drumstick (w reused as bone tip below)
}
const BONE_TIP = 0xffffff
const EMPTY = 0x2e2e2e
const EMPTY_HI = 0x4a4a4a

const DIGITS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#...#', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...##', '..#.#', '.#..#', '#...#', '#####', '....#', '....#'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '#...#', '....#', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
}

// RGBA pixels of the HUD at 1x; transparent where nothing is drawn.
export const paint = (hud: Hud): Uint8Array => {
  const px = new Uint8Array(W * H * 4)
  const set = (x: number, y: number, rgb: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 4
    px[i] = rgb >> 16
    px[i + 1] = (rgb >> 8) & 0xff
    px[i + 2] = rgb & 0xff
    px[i + 3] = 255
  }
  const sprite = (rows: string[], x0: number, state: Icon, litFrom: (x: number) => boolean, isFood: boolean) =>
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return
        const lit = ch === 'k' || state === 'full' || (state === 'half' && litFrom(x))
        const color = !lit ? (ch === 'w' ? EMPTY_HI : EMPTY) : isFood && ch === 'w' ? BONE_TIP : LIT[ch]!
        set(x0 + x, y, color)
      }),
    )

  const hearts = hud.sessionUsed === null ? icons(0) : icons(100 - hud.sessionUsed)
  hearts.forEach((s, i) => sprite(HEART, i * 8, s, x => x <= 4, false))

  // Food drains from the left, so the icon list is reversed to lay out left to right.
  const food = (hud.weeklyUsed === null ? icons(0) : icons(100 - hud.weeklyUsed)).reverse()
  food.forEach((s, i) => sprite(FOOD, W - 81 + i * 8, s, x => x >= 4, true))

  const FILLED = [0xb6ff52, 0x80e01e, 0x4f9c0e]
  const UNFILLED = [0x5a5a5a, 0x3c3c3c, 0x2a2a2a]
  const fill = xpCells(hud.contextPct ?? 0, W - 2)
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 5; y++) {
      const edge = y === 0 || y === 4 || x === 0 || x === W - 1
      const isFilled = x <= fill
      const divider = x % 10 === 0
      const color = edge
        ? 0x000000
        : divider
          ? isFilled ? 0x2f5e08 : 0x111111
          : (isFilled ? FILLED : UNFILLED)[y - 1]!
      set(x, 10 + y, color)
    }
  }

  if (hud.contextPct !== null) {
    const text = String(Math.round(hud.contextPct))
    const x0 = Math.round((W - (text.length * 6 - 1)) / 2)
    const dots: [number, number][] = []
    ;[...text].forEach((c, n) =>
      DIGITS[c]!.forEach((row, y) =>
        [...row].forEach((ch, x) => ch === '#' && dots.push([x0 + n * 6 + x, 3 + y])),
      ),
    )
    for (const [x, y] of dots) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) set(x + dx, y + dy, 0x000000)
    for (const [x, y] of dots) set(x, y, 0x80ff20)
  }
  return px
}

// Nearest-neighbour upscale (so the terminal's scaling doesn't blur the pixels),
// with PAD_TOP transparent rows on top: W*s by (H+PAD_TOP)*s.
export const upscale = (px: Uint8Array, s = SCALE): Uint8Array => {
  const out = new Uint8Array(W * s * (H + PAD_TOP) * s * 4)
  for (let y = PAD_TOP * s; y < (H + PAD_TOP) * s; y++)
    for (let x = 0; x < W * s; x++) {
      const src = ((((y / s) | 0) - PAD_TOP) * W + ((x / s) | 0)) * 4
      out.set(px.subarray(src, src + 4), (y * W * s + x) * 4)
    }
  return out
}

// Desktop meter, Bootstrap-progress style: a pill track with a green fill clipped to
// it, amber from 75%, red from 90%. No viewBox and widths in %, so drawn at any width
// it lays out afresh instead of stretching: the rounded ends stay round.
export const barSvg = (pct: number): string => {
  const used = Math.max(0, Math.min(100, pct))
  const fill = used >= 90 ? '#c93c3c' : used >= 75 ? '#c98a1e' : '#4e8a1a'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="8"><clipPath id="pill"><rect width="100%" height="8" rx="4"/></clipPath><g clip-path="url(#pill)"><rect width="100%" height="8" fill="#8888884d"/><rect width="${used}%" height="8" fill="${fill}"/></g></svg>`
}

// Coarse time to reset, as the meter's right column shows it: "45 min", "2 hr", "1 day".
export const resetIn = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000))
  return m >= 1440 ? `${Math.floor(m / 1440)} day` : m >= 60 ? `${Math.floor(m / 60)} hr` : `${m} min`
}
