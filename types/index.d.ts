export type Hud = {
  contextPct: number | null
  sessionUsed: number | null
  weeklyUsed: number | null
  sessionResetsAt?: string | null
  weeklyResetsAt?: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'minecraft-hud': { hud: Hud; isHidden: boolean }
  }
}
