import { test, expect } from 'claude-code/testing'
import { bar } from './register'

test('bar fills by percent and handles missing', () => {
  expect(bar(undefined)).toBe('—')
  expect(bar(0)).toBe('░░░░░░░░░░ 0%')
  expect(bar(50)).toBe('█████░░░░░ 50%')
  expect(bar(150)).toBe('██████████ 100%')
})

import { hat } from './register'

test('hat picks model family', () => {
  expect(hat('claude-opus-5-5', 0).line).toContain('▲')
  expect(hat('Sonnet 5.5', 0).line).toContain('♪')
  expect(hat('claude-haiku-5-5', 1).line).toContain('❀')
  expect(hat('other', 0).color).toBeUndefined()
})

import { effortGauge } from './register'

test('effort gauge', () => {
  expect(effortGauge('low')).toBe('●○○○○ low')
  expect(effortGauge('max')).toBe('●●●●● max')
  expect(effortGauge('42')).toBe('42')
})

import { bubble } from './register'

test('bubble grows with effort, fixed width', () => {
  expect(bubble('medium', 0)).toBe(' °   ')
  expect(bubble('xhigh', 0)).toBe(' °oO ')
  expect(bubble('max', 1)).toBe(' °oO✽')
  expect(bubble(undefined, 0)).toBe('     ')
})

import { parseEffort } from './register'

test('parse /effort output', () => {
  expect(parseEffort('Set effort level to max (this session only): Maximum')).toBe('max')
  expect(parseEffort('Set effort level to high (saved as your default)')).toBe('high')
  expect(parseEffort(undefined)).toBeUndefined()
})

import { clawd } from './register'

test('coffee break near end of each 75-tick cycle, fixed width', () => {
  expect(clawd(0).join('')).not.toContain('▐▌')
  expect(clawd(65)[1]).toContain('▐▌')
  expect(clawd(75).join('')).not.toContain('▐▌')
  for (let f = 0; f < 150; f++) expect(clawd(f).every(l => l.length === 11)).toBe(true)
})

test('sonnet wears glasses, others do not', () => {
  expect(clawd(0, 'claude-sonnet-5-5')[0]).toContain('▛▀█▀▜')
  expect(clawd(3, 'Sonnet 5.5')[0]).toBe(clawd(3, 'opus')[0]) // blink: head stays whole
  expect(clawd(0, 'claude-opus-5-5')[0]).not.toContain('▀')
  for (let f = 0; f < 150; f++) expect(clawd(f, 'sonnet').every(l => l.length === 11)).toBe(true)
})

import { countdown, alertLevel, money } from './register'

test('countdown formats time to reset', () => {
  const now = Date.parse('2026-10-18T10:00:00Z')
  expect(countdown('2026-10-18T11:20:00Z', now)).toBe('1h20m')
  expect(countdown('2026-10-18T10:45:00Z', now)).toBe('45m')
  expect(countdown('2026-10-18T10:00:30Z', now)).toBe('<1m')
  expect(countdown('2026-10-21T14:00:00Z', now)).toBe('3d4h')
  expect(countdown('2026-10-18T09:00:00Z', now)).toBe('')
  expect(countdown(undefined, now)).toBe('')
})

test('alert levels and money', () => {
  expect(alertLevel(84.9)).toBe(0)
  expect(alertLevel(85)).toBe(85)
  expect(alertLevel(96)).toBe(95)
  expect(alertLevel(undefined)).toBe(0)
  expect(money(1.239)).toBe('$1.24')
  expect(money(undefined)).toBe('')
})

test('stressed Clawd gets a sweat drop, same width', () => {
  expect(clawd(0, 'opus', true)[0][0]).toBe(',')
  expect(clawd(1, 'opus', true)[0][0]).toBe('’')
  expect(clawd(0, 'opus', false)[0][0]).toBe(' ')
  expect(clawd(0, 'opus', true).every(l => l.length === 11)).toBe(true)
})

import { tokensLabel, toolsLabel } from './register'

test('token and tool labels', () => {
  expect(tokensLabel(950)).toBe('950 tok')
  expect(tokensLabel(1234)).toBe('1.23k tok')
  expect(tokensLabel(12345)).toBe('12.3k tok')
  expect(tokensLabel(4560000)).toBe('4.56M tok')
  expect(tokensLabel(undefined)).toBe('')
  expect(toolsLabel([])).toBe('')
  expect(toolsLabel(['Bash'])).toBe('Bash')
  expect(toolsLabel(['mcp__gh__issue', 'Read', 'Edit'])).toBe('issue +2')
})

test('busy Clawd never drinks coffee and keeps width', () => {
  for (let f = 0; f < 150; f++) {
    const lines = clawd(f, 'opus', false, true)
    expect(lines.join('')).not.toContain('▐▌')
    expect(lines.every(l => l.length === 11)).toBe(true)
  }
})

import { duration } from './register'

test('duration formats', () => {
  expect(duration(-5)).toBe('0s')
  expect(duration(42000)).toBe('42s')
  expect(duration(125000)).toBe('2m05s')
  expect(duration(3725000)).toBe('1h02m')
})

import { gitLabel, layout, skillHat, wearsGlasses } from './register'

test('git label', () => {
  expect(gitLabel('## main...origin/main\n M a.ts\n?? b.ts\n')).toBe('main ✎2')
  expect(gitLabel('## feat/x...origin/feat/x [ahead 2]\n')).toBe('feat/x ↑2')
  expect(gitLabel('## No commits yet on main\n')).toBe('main')
  expect(gitLabel('')).toBe('')
  expect(gitLabel('fatal: not a git repository')).toBe('')
})

test('layout drops extras on narrow terminals', () => {
  expect(layout(140)).toMatchObject({ resets: true, cost: true, git: true, barWidth: 10 })
  expect(layout(100)).toMatchObject({ resets: false, cost: true, barWidth: 10 })
  expect(layout(90)).toMatchObject({ cost: false, git: false, effortGauge: true, barWidth: 6 })
  expect(layout(60)).toMatchObject({ effortGauge: false, barWidth: 4 })
})

test('sad Clawd has droopy eyes, no glasses; skill hats', () => {
  expect(clawd(0, 'opus', false, false, true)[0]).toContain('▛▄█▄▜')
  expect(wearsGlasses('sonnet', true)).toBe(false)
  expect(wearsGlasses('sonnet', false)).toBe(true)
  for (let f = 0; f < 150; f++) expect(clawd(f, 'sonnet', true, false, true).every(l => l.length === 11)).toBe(true)
  expect(skillHat('caveman:caveman', 0).line.length).toBe(9)
  expect(skillHat('caveman:caveman', 0).color).toBe('#A0703C')
  expect(skillHat('unknown-thing', 0).color).toBe('#A78BFA')
})
