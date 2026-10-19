import { atom, read, update } from 'claude-code'
import type { Engine, Register, SessionRateLimit } from 'claude-code'

import type { Meter } from '../types'

// Clawd, the Claude Code mascot: idle, blink, wave, shuffle feet.
const IDLE = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  ']
const BLINK = [' ▐█████▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  ']
const WAVE = ['▗▐▛███▜▌▖', ' ▜█████▛ ', '  ▘▘ ▝▝  ']
const STEP = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▝▝ ▘▘  ']
export const FRAMES = [IDLE, IDLE, IDLE, BLINK, IDLE, IDLE, WAVE, IDLE, WAVE, IDLE, STEP, IDLE, STEP, IDLE]

// Coffee break: cup in hand (steam wiggles), sip, eyes closed, put it down.
const FEET = '  ▘▘ ▝▝  '
const HOLD1 = [' ▐▛███▜▌ ~', '▝▜█████▛▘▐▌', FEET]
const HOLD2 = [' ▐▛███▜▌~ ', '▝▜█████▛▘▐▌', FEET]
const SIP = [' ▐▛███▜▌▐▌', '▝▜█████▛▘', FEET]
const BLISS = [' ▐█████▌▐▌', '▝▜█████▛▘', FEET]
const COFFEE = [HOLD1, HOLD2, HOLD1, HOLD2, SIP, BLISS, BLISS, SIP, HOLD1, HOLD2]
const COFFEE_EVERY = 75 // ticks of 400ms: one break every 30s
export const BODY = 9 // columns of Clawd; anything right of it is the cup
const SKILL_COLOR = '#A78BFA'

export const SAD_AFTER = 3 // consecutive failed tool calls

export const wearsGlasses = (model: string, sad: boolean) => !sad && model.toLowerCase().includes('sonnet')

export function clawd(f: number, model = '', stressed = false, busy = false, sad = false): string[] {
  const t = f % COFFEE_EVERY
  const start = COFFEE_EVERY - COFFEE.length
  // Working: feet shuffle every tick, no coffee. Waiting: the idle routine.
  const lines = busy ? (f % 2 ? STEP : IDLE) : t >= start ? COFFEE[t - start] : FRAMES[f % FRAMES.length]
  // Eyes: glasses (Sonnet), droopy when tools keep failing, else as drawn.
  const eyes = sad ? '▛▄█▄▜' : wearsGlasses(model, sad) ? '▛▀█▀▜' : undefined
  return lines.map((l, i) =>
    (eyes && i === 0 ? l.replace('▛███▜', eyes) : l).padEnd(BODY + 2),
  ).map((l, i) => (stressed && i === 0 ? `${f % 2 ? '’' : ','}${l.slice(1)}` : l)) // sweat drop
}

// Splits a line so the glasses can take their own color.
export const glassesParts = (line: string) => line.split(/([▀▄][█▀▄]*[▀▄])/).filter(Boolean)
const GLASSES_COLOR = '#6A9BCC'

// One hat per model family, two variants that alternate.
const HATS: [string, string, string[]][] = [
  ['opus', '#E5B53D', [' ▗▲▲▲▲▲▖ ', ' ▗▲▲▲▲▲▖ ']], // crown
  ['sonnet', '#6A9BCC', ['   ♪ ♫   ', '  ♫   ♪  ']], // music
  ['haiku', '#E58FB0', ['   ❀ ✿   ', '   ✿ ❀   ']], // flowers
  ['fable', '#7FB77E', ['   ✦ ✧   ', '   ✧ ✦   ']], // sparkles
  ['mythos', '#9A7FD1', ['  ✧ ✦ ✧  ', '  ✦ ✧ ✦  ']], // stars
  ['gpt', '#10A37F', ['   {·}   ', '   {•}   ']], // braces
  ['gemini', '#4285F4', ['   ✦ ✦   ', '   ✧ ✧   ']], // twins
]

// One hat per skill family; replaces the model's hat while the skill runs.
const SKILL_HATS: [RegExp, string, string[]][] = [
  [/caveman/, '#A0703C', ['  ^ ^ ^  ', '  ^^ ^^  ']], // rocks
  [/codex|ejecutar/, '#10A37F', ['  </>    ', '  < />  ']], // code
  [/review|audit|simplify|verif/, '#E5B53D', ['  Q   Q  ', '   Q Q   ']], // magnifiers
  [/brainstorm|plan|grill|research/, '#E5B53D', ['  ~*~*~  ', '  *~*~*  ']], // ideas
  [/plugin|skill|config|keybind/, '#9AA0A6', ['  { } { }', '  {} {}  ']], // tools
]

export function skillHat(skill: string, f: number): { line: string; color: string } {
  const found = SKILL_HATS.find(([re]) => re.test(skill.toLowerCase()))
  return found
    ? { line: found[2][f % 2].padEnd(9), color: found[1] }
    : { line: (f % 2 ? '   ✦ ✧   ' : '   ✧ ✦   '), color: SKILL_COLOR }
}

export function hat(model: string, f: number): { line: string; color?: string } {
  const found = HATS.find(([name]) => model.toLowerCase().includes(name))
  if (!found) return { line: '         ' }
  return { line: found[2][f % 2], color: found[1] }
}

const frame = atom({ plugin: 'spark-meter', key: 'frame' } as const, 0)
const meter = atom({ plugin: 'spark-meter', key: 'meter' } as const, { model: '' })

export function bar(percent: number | undefined, width = 10): string {
  if (percent === undefined) return '—'
  const p = Math.max(0, Math.min(100, percent))
  const full = Math.round((p / 100) * width)
  return `${'█'.repeat(full)}${'░'.repeat(width - full)} ${Math.round(p)}%`
}

const pick = (limits: SessionRateLimit[], kind: string) =>
  limits.find(l => l.kind === kind)?.percentUsed
const resetOf = (limits: SessionRateLimit[], kind: string) =>
  limits.find(l => l.kind === kind)?.resetsAt

// "1h20m", "3d4h", "<1m"; empty when unknown or already past.
export function countdown(iso: string | undefined, nowMs: number): string {
  const ms = iso ? Date.parse(iso) - nowMs : NaN
  if (!(ms > 0)) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  if (min < 1440) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`
  return `${Math.floor(min / 1440)}d${Math.floor((min % 1440) / 60)}h`
}

// 0 = fine, 85 = warn, 95 = critical.
export const alertLevel = (p: number | undefined) => (p === undefined ? 0 : p >= 95 ? 95 : p >= 85 ? 85 : 0)

const resetLabel = (iso: string | undefined, now: number) => {
  const c = countdown(iso, now)
  return c && `↻${c}`
}

// 950 -> "950", 12_300 -> "12.3k", 4_560_000 -> "4.56M"
export function tokensLabel(n: number | undefined): string {
  if (n === undefined) return ''
  if (n < 1000) return `${n} tok`
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e4 ? 2 : 1)}k tok`
  return `${(n / 1e6).toFixed(2)}M tok`
}

// 42_000 -> "42s", 125_000 -> "2m05s", 3_725_000 -> "1h02m"
export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

// `git status --porcelain=v1 -b` -> "main ✎3 ↑1"; empty when not a repo.
export function gitLabel(out: string): string {
  const [head, ...rest] = out.trim().split('\n')
  if (!head?.startsWith('## ')) return ''
  const branch = head.slice(3).replace(/^No commits yet on /, '').split('...')[0].split(' ')[0]
  const dirty = rest.filter(Boolean).length
  const ahead = head.match(/ahead (\d+)/)?.[1]
  return `${branch}${dirty ? ` ✎${dirty}` : ''}${ahead ? ` ↑${ahead}` : ''}`
}

async function refreshGit($: Engine) {
  const r = await $.process.run(['git', 'status', '--porcelain=v1', '-b'], { timeoutMs: 5000 }).catch(() => undefined)
  const git = r && r.exitCode === 0 ? gitLabel(r.stdout) : ''
  await update($, meter, m => (m.git === git ? m : { ...m, git }))
}

// Narrow terminals drop the extras instead of cutting the line.
export function layout(columns: number) {
  return {
    resets: columns >= 120,
    cost: columns >= 100,
    git: columns >= 100,
    effortGauge: columns >= 80,
    barWidth: columns >= 100 ? 10 : columns >= 80 ? 6 : 4,
  }
}

// MCP tools read mcp__server__tool; show the last segment.
export const toolLabel = (tool: string) => tool.split('__').pop() || tool

export function toolsLabel(tools: string[] | undefined): string {
  if (!tools?.length) return ''
  return tools.length === 1 ? toolLabel(tools[0]) : `${toolLabel(tools[0])} +${tools.length - 1}`
}

export const money = (usd: number | undefined) => (usd === undefined ? '' : `$${usd.toFixed(2)}`)

async function refresh($: Engine) {
  const [model, usage] = await Promise.all([$.session.model(), $.session.usage()])
  const next: Meter = {
    model,
    context: usage.context.percent,
    fiveHour: pick(usage.rateLimits, 'five_hour'),
    weekly: pick(usage.rateLimits, 'seven_day'),
    fiveHourReset: resetOf(usage.rateLimits, 'five_hour'),
    weeklyReset: resetOf(usage.rateLimits, 'seven_day'),
    cost: usage.cost?.usd,
  }
  await update($, meter, m => ({ ...m, ...next }))
}

const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']

const EFFORT_COLORS: Record<string, string> = {
  low: 'gray', medium: 'green', high: 'yellow', xhigh: '#E5843D', max: 'red',
}
export const effortColor = (effort?: string) => EFFORT_COLORS[effort ?? '']

// Thought bubbles beside Clawd's head: more effort, bigger bubbles.
export function bubble(effort: string | undefined, f: number): string {
  const b: Record<string, string> = {
    low: f % 4 < 2 ? 'z' : 'zZ',
    medium: '°',
    high: '°o',
    xhigh: '°oO',
    max: f % 2 ? '°oO✽' : '°oO✻',
  }
  return ` ${b[effort ?? ''] ?? ''}`.padEnd(5)
}

export const parseEffort = (text?: string) =>
  text?.match(/effort level to (low|medium|high|xhigh|max)\b/i)?.[1].toLowerCase()

export function effortGauge(effort: string): string {
  const n = LEVELS.indexOf(effort) + 1
  return n === 0 ? effort : `${'●'.repeat(n)}${'○'.repeat(5 - n)} ${effort}`
}

export const register: Register = (on, options) => {
  const useTokens = options.costUnit === 'tokens'
  const warned: Record<string, number> = {}
  // /effort has no getter: read the level off its output ("Set effort level to high ...").
  on('command.run', { command: 'effort' }, async ($, e, next) => {
    const ran = await next(e)
    const effort = parseEffort(ran.text)
    if (effort) await update($, meter, m => ({ ...m, effort }))
    return ran
  })

  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    await refresh($)
    await refreshGit($)
    $.clock.every(400, async () => {
      await update($, frame, f => (f + 1) % (COFFEE_EVERY * FRAMES.length))
      // /model fires no event: poll the name, write only on change.
      const model = await $.session.model()
      if (model !== (await read($, meter)).model) await update($, meter, m => ({ ...m, model }))
      const agents = (await $.agent.list()).filter(a => a.status === 'running' || a.status === 'pending').length
      if (agents !== ((await read($, meter)).agents ?? 0)) await update($, meter, m => ({ ...m, agents }))
    })
    return ran
  })

  // Effort has no getter: read it off each main-loop request.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && e.effort !== undefined) {
      const effort = String(e.effort)
      if (effort !== (await read($, meter)).effort) await update($, meter, m => ({ ...m, effort }))
    }
    return yield* next(e)
  })

  // Main-loop turn state: working vs waiting for the person.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      const turnStart = await $.clock.now()
      await update($, meter, m => ({ ...m, busy: true, turnStart }))
    }
    return next(e)
  })

  // Tools running right now (parallel calls stack).
  on('tool.call', async ($, e, next) => {
    await update($, meter, m => ({ ...m, tools: [...(m.tools ?? []), e.tool] }))
    try {
      const result = await next(e)
      const errors = result.isError ? ((await read($, meter)).errors ?? 0) + 1 : 0
      await update($, meter, m => ({ ...m, errors }))
      return result
    } finally {
      await update($, meter, m => {
        const tools = [...(m.tools ?? [])]
        const at = tools.indexOf(e.tool)
        if (at >= 0) tools.splice(at, 1)
        return { ...m, tools }
      })
    }
  })

  // Skill in use: Clawd turns purple and shows its name until the turn ends.
  // Fires for /name and the Skill tool alike.
  on('skill.prompt', async ($, e, next) => {
    await update($, meter, m => ({ ...m, skill: e.skill }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    const used = u ? u.input_tokens + u.output_tokens + u.cache_creation_input_tokens : 0
    // Subagent turns count toward tokens too; only the main loop ends "busy".
    await update($, meter, m => ({
      ...m,
      tokens: (m.tokens ?? 0) + used,
      ...(e.agentId === undefined ? { busy: false, skill: undefined, tools: [], lastTurnMs: e.durationMs } : {}),
    }))
    await refreshGit($) // the turn likely changed files
    return next(e)
  })

  // Model can change via /model; usage pushes here after each turn.
  on('session.measure', async ($, e, next) => {
    await refresh($)
    const readings: [string, string, number | undefined][] = [
      ['ctx', 'Contexto casi lleno: considera /compact', e.context.percent],
      ['five_hour', 'Límite de 5 horas', pick(e.rateLimits, 'five_hour')],
      ['seven_day', 'Límite semanal', pick(e.rateLimits, 'seven_day')],
    ]
    for (const [key, label, p] of readings) {
      const level = alertLevel(p)
      // Toast only when a window climbs to a higher level; falling back re-arms it.
      if (level > (warned[key] ?? 0)) {
        $.ui.toast(key === 'ctx' ? `⚠ ${label} (${Math.round(p!)}%)` : `⚠ ${label} al ${Math.round(p!)}%`)
      }
      warned[key] = level
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const m = await read($, meter)
    const f = await read($, frame)
    const now = await $.clock.now()
    const L = layout(e.props.bodyColumns ?? e.viewport?.columns ?? 120)
    const sad = (m.errors ?? 0) >= SAD_AFTER
    const glasses = wearsGlasses(m.model, sad)
    const topHat = m.skill ? skillHat(m.skill, f) : hat(m.model, f)
    const costText = useTokens ? tokensLabel(m.tokens) : money(m.cost)
    const stressed = [m.context, m.fiveHour, m.weekly].some(p => alertLevel(p) > 0)
    const color = (p?: number) => (p === undefined ? undefined : p >= 90 ? 'red' : p >= 70 ? 'yellow' : 'green')

    return (
      <Box gap={2}>
        <Box flexDirection="column">
          <Text color={topHat.color}>{topHat.line}</Text>
          {clawd(f, m.model, stressed, m.busy, sad).map((line, i) => (
            <Text color={m.skill ? SKILL_COLOR : '#D97757'}>
              {glassesParts(line.slice(0, BODY)).map(part =>
                glasses && /^[▀▄][█▀▄]*[▀▄]$/.test(part) ? <Text color={GLASSES_COLOR} bold>{part}</Text> : part,
              )}
              <Text color="#A0703C">{line.slice(BODY)}</Text>
              <Text color={effortColor(m.effort)}>{i === 0 ? bubble(m.effort, f) : '     '}</Text>
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text> </Text>
          <Box gap={2}>
            <Text color={hat(m.model, f).color ?? '#D97757'} bold>{m.model || 'Claude'}</Text>
            {m.effort && L.effortGauge && <Text>effort <Text color={effortColor(m.effort) ?? '#D97757'}>{effortGauge(m.effort)}</Text></Text>}
            {m.skill && <Text color={SKILL_COLOR} bold>{f % 2 ? '✦' : '✧'} {m.skill}</Text>}
            {m.busy
              ? <Text color="green">{['◐', '◓', '◑', '◒'][f % 4]} {toolsLabel(m.tools) || 'pensando'} ⏱ {duration(now - (m.turnStart ?? now))}</Text>
              : <Text dimColor>○ esperando{m.lastTurnMs !== undefined ? ` · último ${duration(m.lastTurnMs)}` : ''}</Text>}
            {sad && <Text color="red">✖ {m.errors} errores seguidos</Text>}
            {L.git && !!m.git && <Text color="#7FB77E">⎇ {m.git}</Text>}
            {!!m.agents && <Text color="#6A9BCC">◈ {m.agents} {m.agents === 1 ? 'agente' : 'agentes'}</Text>}
          </Box>
          <Box gap={2}>
            <Text>ctx <Text color={color(m.context)}>{bar(m.context, L.barWidth)}</Text></Text>
            <Text>5h <Text color={color(m.fiveHour)}>{bar(m.fiveHour, L.barWidth)}</Text>{L.resets && <Text dimColor> {resetLabel(m.fiveHourReset, now)}</Text>}</Text>
            <Text>sem <Text color={color(m.weekly)}>{bar(m.weekly, L.barWidth)}</Text>{L.resets && <Text dimColor> {resetLabel(m.weeklyReset, now)}</Text>}</Text>
            {L.cost && costText && <Text color="#A0703C">{costText}</Text>}
          </Box>
        </Box>
      </Box>
    )
  })
}
