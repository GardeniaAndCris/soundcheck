// Offline dialogue-scenario authoring tool. Calls the Claude API ONCE to draft a
// branching conversation scenario for the "conversation practice" mode
// (see src/data/conversations.ts). Never runs in the shipped app — this is a
// dev-time tool for atai to review and hand-merge output from.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/generate_scenario.mjs "ordering food at a restaurant"
//
// Output:
//   scripts/generated/<scenario-id>.json  (draft — review before merging into
//   src/data/conversations.ts; not auto-merged, not committed)

import Anthropic from '@anthropic-ai/sdk'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const topic = process.argv[2]
if (!topic) {
  console.error('Usage: node scripts/generate_scenario.mjs "<scenario topic>"')
  process.exit(1)
}

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'scripts', 'generated')

// ── JSON Schema (flattened: arrays instead of the app's Record<id, node> /
// Record<word, tip> maps, since structured outputs can't express arbitrary-
// keyed objects). The script reduces arrays -> Records after generation. ──
const TIP_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    word: { type: 'string' },
    headline: { type: 'string' },
    detail: { type: 'string' },
  },
  required: ['word', 'headline', 'detail'],
  additionalProperties: false,
}

const CHOICE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    text: { type: 'string' },
    words: { type: 'array', items: { type: 'string' } },
    translation: { type: 'string' },
    tips: { type: 'array', items: TIP_ENTRY_SCHEMA },
    next: { type: ['string', 'null'] },
  },
  required: ['id', 'text', 'words', 'translation', 'tips', 'next'],
  additionalProperties: false,
}

const AI_TURN_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    speaker: { const: 'ai' },
    text: { type: 'string' },
    translation: { type: 'string' },
    next: { type: 'string' },
  },
  required: ['id', 'speaker', 'text', 'translation', 'next'],
  additionalProperties: false,
}

const USER_TURN_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    speaker: { const: 'user' },
    choices: { type: 'array', items: CHOICE_SCHEMA },
  },
  required: ['id', 'speaker', 'choices'],
  additionalProperties: false,
}

const SCENARIO_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    startNodeId: { type: 'string' },
    nodes: { type: 'array', items: { anyOf: [AI_TURN_SCHEMA, USER_TURN_SCHEMA] } },
  },
  required: ['id', 'title', 'description', 'startNodeId', 'nodes'],
  additionalProperties: false,
}

// One-shot example in the flattened schema shape (mirrors the hand-authored
// coffee-shop scenario in src/data/conversations.ts, minus 2 exchanges for brevity).
const EXAMPLE_SCENARIO = {
  id: 'coffee-shop',
  title: '在咖啡店点单',
  description: '情景对话 · 4 轮问答',
  startNodeId: 'ai-greet',
  nodes: [
    {
      id: 'ai-greet',
      speaker: 'ai',
      text: 'Hi there, what can I get started for you today?',
      translation: '你好，今天想点些什么？',
      next: 'user-order',
    },
    {
      id: 'user-order',
      speaker: 'user',
      choices: [
        {
          id: 'order-coffee',
          text: "I'd like a coffee, please",
          translation: '我想要一杯咖啡',
          words: ['I', 'd', 'like', 'a', 'coffee', 'please'],
          tips: [
            { word: 'coffee', headline: '/ˈkɔːfi/ — 重音在前', detail: '/f/ 不要发成 /p/' },
            { word: 'please', headline: '/pliːz/ — 尾音 /z/', detail: '不要发成 /s/' },
          ],
          next: 'ai-size',
        },
        {
          id: 'order-latte',
          text: 'Can I get a latte?',
          translation: '可以给我一杯拿铁吗？',
          words: ['Can', 'I', 'get', 'a', 'latte'],
          tips: [
            { word: 'latte', headline: '/ˈlɑːteɪ/ — 三音节', detail: '重音在第一音节' },
          ],
          next: 'ai-size',
        },
      ],
    },
    {
      id: 'ai-size',
      speaker: 'ai',
      text: 'Sure. What size would you like?',
      translation: '好的，您要什么尺寸？',
      next: 'user-size',
    },
    {
      id: 'user-size',
      speaker: 'user',
      choices: [
        {
          id: 'size-medium',
          text: 'Medium, please',
          translation: '中杯，谢谢',
          words: ['Medium', 'please'],
          tips: [{ word: 'Medium', headline: '/ˈmiːdiəm/ — 三音节', detail: '重音在第一音节' }],
          next: null,
        },
        {
          id: 'size-large',
          text: 'Large, please',
          translation: '大杯，谢谢',
          words: ['Large', 'please'],
          tips: [{ word: 'Large', headline: '/lɑːrdʒ/ — 卷舌元音', detail: '尾音 /dʒ/ 清晰' }],
          next: null,
        },
      ],
    },
  ],
}

const SYSTEM_PROMPT = `You are drafting content for SoundCheck, an offline English pronunciation-practice PWA for Chinese learners. You are authoring ONE branching dialogue scenario for its "conversation practice" mode.

Structure rules:
- The dialogue alternates AI turns (a single spoken line the AI character says) and user turns (2 choices the learner can pick from, each a line they will speak aloud and get pronunciation-scored on).
- 3-5 total exchanges (one AI turn + one user turn = one exchange).
- Every user turn has EXACTLY 2 choices.
- Every line (AI text, user choice text) needs a natural, colloquial Chinese "translation".
- A choice's "words" field is its "text" with punctuation stripped and contractions split at the apostrophe into separate tokens, preserving word order and original capitalization — e.g. "I'd like a coffee, please" -> ["I","d","like","a","coffee","please"]; "It's Alex" -> ["It","s","Alex"]. No punctuation-only tokens.
- Each choice needs 1-4 "tips" entries, one per pronunciation-notable word in its "words" list (not necessarily every word) — "headline" is a short Chinese pronunciation cue (often including the IPA transcription), "detail" is a short supporting note, in the same terse style as the example below.
- Node ids are short kebab-case slugs, unique within the scenario (e.g. "ai-greet", "user-order", "order-coffee").
- Every AI turn's "next" must point at an existing user-turn node id.
- Every choice's "next" must point at an existing AI-turn node id, EXCEPT choices in the final user turn, which must have "next": null to end the scenario.
- The scenario's top-level "id" is a short kebab-case slug for the whole scenario (e.g. "restaurant-order"). "title" is a short Chinese scenario name. "description" is a short Chinese one-liner like "情景对话 · N 轮问答".

Here is a worked example in the exact JSON shape to produce (truncated to 2 exchanges for brevity — yours should have 3-5):

${JSON.stringify(EXAMPLE_SCENARIO, null, 2)}`

const client = new Anthropic()

console.log(`Generating scenario for topic: "${topic}"...`)

const response = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  output_config: { format: { type: 'json_schema', schema: SCENARIO_DRAFT_SCHEMA } },
  messages: [{ role: 'user', content: topic }],
})

if (response.stop_reason === 'refusal') {
  console.error('Request was declined by the model. Try rephrasing the topic.')
  process.exit(1)
}

const textBlock = response.content.find((b) => b.type === 'text')
if (!textBlock) {
  console.error('No text content in response:', JSON.stringify(response, null, 2))
  process.exit(1)
}

const draft = JSON.parse(textBlock.text)

function validateAndReduce(draft) {
  const rawById = new Map()
  for (const raw of draft.nodes) {
    if (rawById.has(raw.id)) throw new Error(`Duplicate node id: "${raw.id}"`)
    rawById.set(raw.id, raw)
  }
  if (!rawById.has(draft.startNodeId)) {
    throw new Error(`startNodeId "${draft.startNodeId}" not found among node ids`)
  }

  const nodes = {}
  for (const raw of draft.nodes) {
    if (raw.speaker === 'ai') {
      if (!rawById.has(raw.next)) {
        throw new Error(`AI node "${raw.id}" has next "${raw.next}" which doesn't exist`)
      }
      nodes[raw.id] = {
        id: raw.id,
        speaker: 'ai',
        text: raw.text,
        translation: raw.translation,
        next: raw.next,
      }
    } else if (raw.speaker === 'user') {
      if (!raw.choices || raw.choices.length === 0) {
        throw new Error(`User node "${raw.id}" has no choices`)
      }
      const choices = raw.choices.map((c) => {
        if (c.next !== null && !rawById.has(c.next)) {
          throw new Error(`Choice "${c.id}" has next "${c.next}" which doesn't exist`)
        }
        const tips = {}
        for (const t of c.tips) tips[t.word] = [t.headline, t.detail]
        return {
          id: c.id,
          text: c.text,
          words: c.words,
          translation: c.translation,
          tips,
          ...(c.next !== null ? { next: c.next } : {}),
        }
      })
      nodes[raw.id] = { id: raw.id, speaker: 'user', choices }
    } else {
      throw new Error(`Node "${raw.id}" has unknown speaker "${raw.speaker}"`)
    }
  }

  // Reachability is a warning, not a hard failure — a dangling branch is a
  // content quality issue for the human reviewer, not a broken data shape.
  const seen = new Set()
  const queue = [draft.startNodeId]
  while (queue.length > 0) {
    const id = queue.shift()
    if (seen.has(id)) continue
    seen.add(id)
    const node = nodes[id]
    if (node.speaker === 'ai') queue.push(node.next)
    else for (const c of node.choices) if (c.next) queue.push(c.next)
  }
  const unreachable = Object.keys(nodes).filter((id) => !seen.has(id))
  if (unreachable.length > 0) {
    console.warn(`Warning: unreachable node(s) from startNodeId: ${unreachable.join(', ')}`)
  }

  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    startNodeId: draft.startNodeId,
    nodes,
  }
}

const scenario = validateAndReduce(draft)

const aiCount = Object.values(scenario.nodes).filter((n) => n.speaker === 'ai').length
const userCount = Object.values(scenario.nodes).filter((n) => n.speaker === 'user').length
const choiceCount = Object.values(scenario.nodes)
  .filter((n) => n.speaker === 'user')
  .reduce((sum, n) => sum + n.choices.length, 0)

await mkdir(outDir, { recursive: true })
const outPath = join(outDir, `${scenario.id}.json`)
await writeFile(outPath, JSON.stringify(scenario, null, 2))

console.log(`\nDraft written: ${outPath}`)
console.log(`  ${aiCount} AI turns, ${userCount} user turns, ${choiceCount} choices`)
console.log('\nNext steps: review the draft (translations, IPA tips, tone), then hand-copy')
console.log('it into the CONVERSATIONS array in src/data/conversations.ts.')
