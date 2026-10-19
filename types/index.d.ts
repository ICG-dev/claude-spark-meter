export type Meter = {
  model: string
  context?: number
  fiveHour?: number
  weekly?: number
  fiveHourReset?: string
  weeklyReset?: string
  cost?: number
  effort?: string
  skill?: string
  busy?: boolean
  git?: string
  errors?: number
  turnStart?: number
  lastTurnMs?: number
  tools?: string[]
  agents?: number
  tokens?: number
}

declare module 'claude-code' {
  interface PluginState {
    'spark-meter': { frame: number; meter: Meter }
  }
}
