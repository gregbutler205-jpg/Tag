/**
 * benchmark/run.mjs
 *
 * Runs 50 vanity plates through three models and scores results.
 *
 * Models tested:
 *   1. GPT-5.4 mini Thinking   (OpenAI)
 *   2. Claude Haiku 4.5        (Anthropic)
 *   3. Grok 4.1 Fast Reasoning (xAI — OpenAI-compatible)
 *
 * Usage:
 *   node benchmark/run.mjs
 *
 * Requires in server/.env:
 *   OPENAI_API_KEY=...
 *   ANTHROPIC_API_KEY=...
 *   XAI_API_KEY=...
 */

import fs                from 'fs'
import path              from 'path'
import { fileURLToPath } from 'url'
import { config }        from 'dotenv'
import OpenAI            from 'openai'
import Anthropic         from '@anthropic-ai/sdk'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
config({ path: path.resolve(__dirname, '../.env'), override: true })

// ── Config ────────────────────────────────────────────────────────────────────
const MODELS = {
  gpt:   process.env.BENCH_GPT_MODEL   || 'gpt-5.4-mini',
  claude: process.env.BENCH_CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  grok:  process.env.BENCH_GROK_MODEL  || 'grok-4-1-fast',
}
const JUDGE_MODEL    = process.env.BENCH_JUDGE_MODEL || 'gpt-5.4'
const CONCURRENCY    = parseInt(process.env.BENCH_CONCURRENCY || '3')
const RESULTS_DIR    = path.join(__dirname, 'results')

// ── Clients ───────────────────────────────────────────────────────────────────
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const claude  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const grok    = new OpenAI({
  apiKey:  process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
})
const judge   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Shared system prompt (mirrors openai.js) ──────────────────────────────────
const SYSTEM_PROMPT = `You are an expert interpreter of US vanity license plates.

Your job is to determine the most likely intended human meaning of a vanity plate.
Treat each plate as a phonetic, abbreviation, and cultural-reference puzzle.

Core interpretation rules:
1. Prefer the most socially plausible intended meaning, not the most literal or bizarre reading.
2. Prioritize how the plate sounds when spoken aloud.
3. Assume spaces may be missing and vowels may be dropped.
4. Reconstruct likely word boundaries before deciding meaning.
5. Prefer likely real human intent over raw mechanical decoding.
6. Interpret the plate as something a real person might choose to represent identity, humor, status, faith, hobbies, family, work, achievement, survival, or interests.
7. Do not force a meaning when the plate is highly ambiguous.
8. It is better to be uncertain than wrong.
9. If no strong clean reading exists, return "Meaning unclear" with low confidence.
10. If one interpretation is clearly best, present it cleanly rather than overcomplicating the result.
11. Keep explanations brief, practical, and in plain English.

Substitution and phonetic rules:
12. Consider common number and character substitutions, but do not apply them mechanically.
13. Test substitutions in context and choose the reading that creates the most natural clean phrase, name, or word.
14. Common substitution guidance:
    - 2 = to / too / two
    - 4 = for / four
    - 8 = ate / eight
    - 0 = O
    - 1 = I / L / one
    - 3 = E
    - 5 = S
    - 7 = T
15. A digit may represent more than one spoken form depending on context.

Names, identity, and human context:
19. Consider abbreviations, names, initials, nicknames, family roles, hobbies, professions, faith references, military references, sports references, regional slang, life events, achievements, and survival stories.
20. Consider that a plate may represent a first name, last name, nickname, initials, family role, or online handle.

Cultural references:
24. Consider TV shows, movies, books, music, internet culture, sports teams, and memes.
25. Recognize compressed pop-culture references even when characters are removed or substituted.

OCR-awareness:
38. Consider common OCR mistakes before interpreting: O/0, I/1/L, S/5, B/8, Z/2, G/6.

Hard safety and tone rule:
46. Never return crude, vulgar, obscene, sexual, profane, or insulting interpretations.
47. If a plate could be interpreted that way, choose the best clean interpretation instead.
48. EXCEPTION: If a plate is clearly offensive even with the best-faith reading (e.g., reads an offensive word in a mirror), note this factually in the "why" field but still return a clean primary meaning or flag as offensive.

Response format:
51. Return valid JSON only, using this exact structure:
{
  "plate": "string",
  "most_likely_meaning": "string",
  "confidence": 0-100,
  "category": "string",
  "why": "string",
  "alternatives": ["string"]
}

Category — use one of:
name, family, hobby, profession, sports, faith, military, health/survival, humor, luxury/status, performance/car culture, foreign phrase, cultural reference, unclear`

const FEW_SHOT = [
  { plate: 'LV2RUN', state: 'OR', answer: '{"plate":"LV2RUN","most_likely_meaning":"Love to run","confidence":93,"category":"hobby","why":"Standard phonetic compression: LV=love, 2=to, RUN=run.","alternatives":[]}' },
  { plate: 'NCC1701D', state: 'NM', answer: '{"plate":"NCC1701D","most_likely_meaning":"Star Trek USS Enterprise-D","confidence":97,"category":"cultural reference","why":"NCC-1701-D is the exact registry number of the USS Enterprise in Star Trek: The Next Generation.","alternatives":["Star Trek reference"]}' },
  { plate: '10SNE1', state: 'CT', answer: '{"plate":"10SNE1","most_likely_meaning":"Tennis anyone","confidence":91,"category":"hobby","why":"10S = tennis, NE = any, 1 = one. Classic phonetic compression of the phrase \'tennis anyone?\'.","alternatives":[]}' },
]

function buildUserMsg(plate, state) {
  return `Plate: ${plate}\nState: ${state}\nVehicle make: unknown\nVehicle model: unknown`
}

// ── Callers ───────────────────────────────────────────────────────────────────
async function callGPT(plate, state) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (const ex of FEW_SHOT) {
    messages.push({ role: 'user',      content: buildUserMsg(ex.plate, ex.state) })
    messages.push({ role: 'assistant', content: ex.answer })
  }
  messages.push({ role: 'user', content: buildUserMsg(plate, state) })

  const t0  = Date.now()
  const res = await openai.chat.completions.create({
    model:                 MODELS.gpt,
    messages,
    response_format:       { type: 'json_object' },
    temperature:           0.2,
    max_completion_tokens: 400,
  })
  const ms = Date.now() - t0
  return { raw: res.choices[0].message.content, ms }
}

async function callClaude(plate, state) {
  // Claude uses system + user messages; few-shot via alternating human/assistant
  const messages = []
  for (const ex of FEW_SHOT) {
    messages.push({ role: 'user',      content: buildUserMsg(ex.plate, ex.state) })
    messages.push({ role: 'assistant', content: ex.answer })
  }
  messages.push({ role: 'user', content: buildUserMsg(plate, state) })

  const t0  = Date.now()
  const res = await claude.messages.create({
    model:      MODELS.claude,
    system:     SYSTEM_PROMPT,
    messages,
    max_tokens: 400,
  })
  const ms = Date.now() - t0
  return { raw: res.content[0].text, ms }
}

async function callGrok(plate, state) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (const ex of FEW_SHOT) {
    messages.push({ role: 'user',      content: buildUserMsg(ex.plate, ex.state) })
    messages.push({ role: 'assistant', content: ex.answer })
  }
  messages.push({ role: 'user', content: buildUserMsg(plate, state) })

  const t0  = Date.now()
  const res = await grok.chat.completions.create({
    model:                 MODELS.grok,
    messages,
    response_format:       { type: 'json_object' },
    temperature:           0.2,
    max_completion_tokens: 400,
  })
  const ms = Date.now() - t0
  return { raw: res.choices[0].message.content, ms }
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────
function safeParse(raw) {
  try {
    const cleaned = (raw || '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return { ok: true, data: JSON.parse(cleaned) }
  } catch {
    return { ok: false, data: null }
  }
}

// ── AI Judge ──────────────────────────────────────────────────────────────────
async function judgeResults(plateObj, results) {
  const prompt = `You are judging AI interpretations of a US vanity license plate.

Plate: ${plateObj.plate}
State: ${plateObj.state}
Expected meaning: ${plateObj.expected}
Expected tier: ${plateObj.tier}
Category: ${plateObj.category}

Here are three model responses. Score each on:
- accuracy (0-10): How close is "most_likely_meaning" to the expected meaning?
- tier_accuracy (0-10): Does the assigned rarity tier match the expected tier? (common/uncommon/rare/epic/legendary)
- alternatives_quality (0-10): Are alternative interpretations plausible and useful, not just generic filler?
- explanation_quality (0-10): Is the "why" field concise, accurate, and useful?

Tier mapping for reference: confidence 80-100 = common, 60-79 = uncommon, 40-59 = rare, 20-39 = epic, 0-19 = legendary (higher difficulty = lower confidence = rarer)

Models:
GPT: ${JSON.stringify(results.gpt?.data)}
Claude: ${JSON.stringify(results.claude?.data)}
Grok: ${JSON.stringify(results.grok?.data)}

Return valid JSON only:
{
  "gpt":    { "accuracy": 0-10, "tier_accuracy": 0-10, "alternatives_quality": 0-10, "explanation_quality": 0-10, "notes": "brief" },
  "claude": { "accuracy": 0-10, "tier_accuracy": 0-10, "alternatives_quality": 0-10, "explanation_quality": 0-10, "notes": "brief" },
  "grok":   { "accuracy": 0-10, "tier_accuracy": 0-10, "alternatives_quality": 0-10, "explanation_quality": 0-10, "notes": "brief" }
}`

  const res = await judge.chat.completions.create({
    model:                 JUDGE_MODEL,
    messages:              [{ role: 'user', content: prompt }],
    response_format:       { type: 'json_object' },
    temperature:           0.1,
    max_completion_tokens: 600,
  })
  return safeParse(res.choices[0].message.content)
}

// ── Concurrency limiter ───────────────────────────────────────────────────────
async function withConcurrency(tasks, limit) {
  const results = []
  const queue   = [...tasks]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const task = queue.shift()
      if (task) results.push(await task())
    }
  })
  await Promise.all(workers)
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const plates = JSON.parse(fs.readFileSync(path.join(__dirname, 'plates.json'), 'utf8'))

  // Determine which models to run (set model to 'skip' to exclude)
  const skipGPT    = MODELS.gpt    === 'skip'
  const skipClaude = MODELS.claude === 'skip'
  const skipGrok   = MODELS.grok   === 'skip'

  // Check required keys
  const missing = []
  if (!skipGPT    && !process.env.OPENAI_API_KEY)    missing.push('OPENAI_API_KEY')
  if (!skipClaude && !process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY')
  if (!skipGrok   && !process.env.XAI_API_KEY)       missing.push('XAI_API_KEY')
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    process.exit(1)
  }

  console.log(`\niWonde Tag — Model Benchmark`)
  console.log(`Models: GPT=${MODELS.gpt}  Claude=${MODELS.claude}  Grok=${MODELS.grok}`)
  console.log(`Judge:  ${JUDGE_MODEL}`)
  console.log(`Plates: ${plates.length}  Concurrency: ${CONCURRENCY}\n`)
  console.log('Running...\n')

  const allResults = []

  const tasks = plates.map(p => async () => {
    process.stdout.write(`  [${String(p.id).padStart(2,'0')}] ${p.plate.padEnd(10)} `)

    // Call active models in parallel
    const [gptRaw, claudeRaw, grokRaw] = await Promise.allSettled([
      skipGPT    ? Promise.resolve({ raw: null, ms: null }) : callGPT(p.plate, p.state),
      skipClaude ? Promise.resolve({ raw: null, ms: null }) : callClaude(p.plate, p.state),
      skipGrok   ? Promise.resolve({ raw: null, ms: null }) : callGrok(p.plate, p.state),
    ])

    const gptResult    = gptRaw.status    === 'fulfilled' ? safeParse(gptRaw.value.raw)    : { ok: false, data: null }
    const claudeResult = claudeRaw.status === 'fulfilled' ? safeParse(claudeRaw.value.raw) : { ok: false, data: null }
    const grokResult   = grokRaw.status   === 'fulfilled' ? safeParse(grokRaw.value.raw)   : { ok: false, data: null }

    const gptMs    = gptRaw.status    === 'fulfilled' ? gptRaw.value.ms    : null
    const claudeMs = claudeRaw.status === 'fulfilled' ? claudeRaw.value.ms : null
    const grokMs   = grokRaw.status   === 'fulfilled' ? grokRaw.value.ms   : null

    // Judge
    let scores = null
    try {
      const judged = await judgeResults(p, { gpt: gptResult, claude: claudeResult, grok: grokResult })
      scores = judged.ok ? judged.data : null
    } catch { /* judge failed */ }

    const row = {
      id:       p.id,
      plate:    p.plate,
      state:    p.state,
      tier:     p.tier,
      category: p.category,
      expected: p.expected,
      flag:     p.flag || null,
      gpt: {
        meaning:   gptResult.data?.most_likely_meaning ?? null,
        confidence:gptResult.data?.confidence          ?? null,
        parseOk:   gptResult.ok,
        ms:        gptMs,
        scores:    scores?.gpt ?? null,
      },
      claude: {
        meaning:   claudeResult.data?.most_likely_meaning ?? null,
        confidence:claudeResult.data?.confidence          ?? null,
        parseOk:   claudeResult.ok,
        ms:        claudeMs,
        scores:    scores?.claude ?? null,
      },
      grok: {
        meaning:   grokResult.data?.most_likely_meaning ?? null,
        confidence:grokResult.data?.confidence          ?? null,
        parseOk:   grokResult.ok,
        ms:        grokMs,
        scores:    scores?.grok ?? null,
      },
    }

    // Quick console summary
    const scoreStr = m => {
      const s = row[m].scores
      if (!s) return '  ?  '
      const avg = ((s.accuracy + s.tier_accuracy + s.alternatives_quality + s.explanation_quality) / 4).toFixed(1)
      return avg.padStart(4)
    }
    console.log(`GPT:${scoreStr('gpt')}  Claude:${scoreStr('claude')}  Grok:${scoreStr('grok')}`)

    allResults.push(row)
    return row
  })

  await withConcurrency(tasks, CONCURRENCY)

  // Sort by id
  allResults.sort((a, b) => a.id - b.id)

  // ── Save JSON ───────────────────────────────────────────────────────────────
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const jsonPath = path.join(RESULTS_DIR, `benchmark_${ts}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2))

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totals = { gpt: { acc:0,tier:0,alt:0,exp:0,ms:0,n:0 }, claude: { acc:0,tier:0,alt:0,exp:0,ms:0,n:0 }, grok: { acc:0,tier:0,alt:0,exp:0,ms:0,n:0 } }

  for (const row of allResults) {
    for (const m of ['gpt','claude','grok']) {
      const s = row[m].scores
      if (s) {
        totals[m].acc  += s.accuracy
        totals[m].tier += s.tier_accuracy
        totals[m].alt  += s.alternatives_quality
        totals[m].exp  += s.explanation_quality
        totals[m].n++
      }
      if (row[m].ms) totals[m].ms += row[m].ms
    }
  }

  console.log('\n' + '─'.repeat(70))
  console.log('RESULTS SUMMARY (scores out of 10, averaged across all plates)')
  console.log('─'.repeat(70))
  console.log(`${'Metric'.padEnd(25)} ${'GPT-5.4mini'.padEnd(14)} ${'Claude Haiku4.5'.padEnd(16)} Grok 4.1 Fast`)
  console.log('─'.repeat(70))

  const row = (label, key) => {
    const f = (m) => {
      const n = totals[m].n
      if (!n) return 'N/A'.padEnd(14)
      return (totals[m][key] / n).toFixed(2).padEnd(14)
    }
    console.log(`${label.padEnd(25)} ${f('gpt')} ${f('claude').padEnd(16)} ${f('grok')}`)
  }

  row('Accuracy',            'acc')
  row('Tier accuracy',       'tier')
  row('Alternatives quality','alt')
  row('Explanation quality', 'exp')

  console.log('─'.repeat(70))

  for (const m of ['gpt','claude','grok']) {
    const n    = totals[m].n || 1
    const avg  = ((totals[m].acc + totals[m].tier + totals[m].alt + totals[m].exp) / (4 * n)).toFixed(2)
    const avgMs= (totals[m].ms / allResults.filter(r => r[m].ms).length || 0).toFixed(0)
    const label = m === 'gpt' ? 'GPT-5.4 mini' : m === 'claude' ? 'Claude Haiku 4.5' : 'Grok 4.1 Fast'
    console.log(`${label.padEnd(20)}  Overall avg: ${avg}/10   Avg latency: ${avgMs}ms`)
  }

  console.log('─'.repeat(70))
  console.log(`\nFull results saved to: ${jsonPath}`)

  // ── Generate HTML report ────────────────────────────────────────────────────
  const htmlPath = path.join(RESULTS_DIR, `benchmark_${ts}.html`)
  fs.writeFileSync(htmlPath, generateHTML(allResults, totals, ts))
  console.log(`HTML report saved to:  ${htmlPath}\n`)
}

// ── HTML report generator ─────────────────────────────────────────────────────
function generateHTML(results, totals, ts) {
  const tierColor = { common:'#4CAF50', uncommon:'#2196F3', rare:'#9C27B0', epic:'#FF9800', legendary:'#F44336' }
  const scoreColor = s => s >= 8 ? '#4CAF50' : s >= 6 ? '#FF9800' : '#F44336'

  const rows = results.map(r => {
    const cell = (m) => {
      const d = r[m]
      const s = d.scores
      const avg = s ? ((s.accuracy + s.tier_accuracy + s.alternatives_quality + s.explanation_quality) / 4).toFixed(1) : '?'
      const color = s ? scoreColor(parseFloat(avg)) : '#999'
      return `<td>
        <div style="font-weight:bold;color:${color}">${avg}/10</div>
        <div style="font-size:11px;margin-top:2px">${d.meaning || '<em>parse failed</em>'}</div>
        <div style="font-size:10px;color:#888">${d.ms ? d.ms+'ms' : ''}</div>
        ${s ? `<div style="font-size:10px;color:#666">Acc:${s.accuracy} Tier:${s.tier_accuracy} Alt:${s.alternatives_quality} Exp:${s.explanation_quality}</div>` : ''}
      </td>`
    }
    return `<tr>
      <td style="text-align:center;font-weight:bold">${r.id}</td>
      <td><strong>${r.plate}</strong><br><span style="font-size:11px;color:#888">${r.state} · ${r.category}</span></td>
      <td><span style="background:${tierColor[r.tier]||'#999'};color:white;padding:2px 6px;border-radius:3px;font-size:11px">${r.tier}</span></td>
      <td style="font-size:12px">${r.expected}</td>
      ${cell('gpt')}
      ${cell('claude')}
      ${cell('grok')}
    </tr>`
  }).join('\n')

  const summaryRow = (label, key) => {
    const f = m => {
      const n = totals[m].n
      if (!n) return '<td>N/A</td>'
      const v = (totals[m][key] / n).toFixed(2)
      return `<td style="text-align:center;color:${scoreColor(parseFloat(v))};font-weight:bold">${v}</td>`
    }
    return `<tr><td><strong>${label}</strong></td>${f('gpt')}${f('claude')}${f('grok')}</tr>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>iWonde Tag — Model Benchmark ${ts}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; color: #333; }
  h1 { color: #1a237e; }
  table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.15); margin-bottom: 30px; }
  th { background: #1a237e; color: white; padding: 10px 8px; text-align: left; font-size: 13px; }
  td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
  tr:hover td { background: #f0f4ff; }
  .summary-table th { background: #37474f; }
  .note { font-size: 12px; color: #666; margin-bottom: 20px; }
</style>
</head>
<body>
<h1>iWonde Tag — AI Model Benchmark</h1>
<p class="note">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Models: GPT-5.4 mini · Claude Haiku 4.5 · Grok 4.1 Fast &nbsp;|&nbsp; Judge: GPT-5.4</p>

<h2>Summary</h2>
<table class="summary-table" style="max-width:600px">
  <tr><th>Metric</th><th>GPT-5.4 mini</th><th>Claude Haiku 4.5</th><th>Grok 4.1 Fast</th></tr>
  ${summaryRow('Accuracy', 'acc')}
  ${summaryRow('Tier accuracy', 'tier')}
  ${summaryRow('Alternatives quality', 'alt')}
  ${summaryRow('Explanation quality', 'exp')}
</table>

<h2>Plate-by-Plate Results</h2>
<table>
  <tr>
    <th>#</th><th>Plate</th><th>Tier</th><th>Expected</th>
    <th>GPT-5.4 mini</th><th>Claude Haiku 4.5</th><th>Grok 4.1 Fast</th>
  </tr>
  ${rows}
</table>
</body>
</html>`
}

main().catch(err => { console.error(err); process.exit(1) })
