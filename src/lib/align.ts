import type { WordResult } from '../types'

// ── Vocab ────────────────────────────────────────────────────
let vocab: Record<string, number> = {}

export async function ensureVocabLoaded(): Promise<void> {
  if (Object.keys(vocab).length > 0) return
  const resp = await fetch('/models/vocab.json')
  vocab = await resp.json()
}

// ── Log-softmax ───────────────────────────────────────────────
function logSoftmax(logits: Float32Array, T: number, V: number): Float64Array {
  const out = new Float64Array(T * V)
  for (let t = 0; t < T; t++) {
    const offset = t * V
    let max = -Infinity
    for (let v = 0; v < V; v++) if (logits[offset + v] > max) max = logits[offset + v]
    let sumExp = 0
    for (let v = 0; v < V; v++) sumExp += Math.exp(logits[offset + v] - max)
    const logSumExp = Math.log(sumExp)
    for (let v = 0; v < V; v++) {
      out[offset + v] = (logits[offset + v] - max) - logSumExp
    }
  }
  return out
}

// ── Text → token IDs ─────────────────────────────────────────
function textToTokens(text: string): number[] {
  const PAD = vocab['<pad>'] ?? 0
  const tokens: number[] = []
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') {
      const id = vocab['|']
      if (id !== undefined) tokens.push(id)
    } else {
      const id = vocab[ch]
      if (id !== undefined) tokens.push(id)
    }
  }
  return tokens.filter((id) => id !== PAD)
}

/**
 * Score each word using a monotone greedy alignment over CTC log-probs.
 *
 * Algorithm:
 * 1. Apply log-softmax to raw logits → log P(token | t) for each frame t
 * 2. For each character token in the expected sequence (in order), find the
 *    time frame t ≥ prevT where that token has its highest log prob.
 *    This enforces the monotone constraint: tokens must appear left-to-right.
 * 3. Average character log-probs within each word → word log-prob
 * 4. Map to 0-100 score.
 */
export function scoreWords(
  logits: Float32Array,
  timeSteps: number,
  vocabSize: number,
  words: string[],
): WordResult[] {
  const T = timeSteps
  const V = vocabSize

  const logProbs = logSoftmax(logits, T, V)

  // Build the full token sequence with word boundaries
  // e.g. ["She", "sells"] → [{word:0, tokens:[S,H,E]}, {word:1, tokens:[S,E,L,L,S]}]
  interface TokenEntry { wordIdx: number; tokenId: number }
  const sequence: TokenEntry[] = []

  words.forEach((word, wordIdx) => {
    const tokens = textToTokens(word)
    tokens.forEach((tokenId) => sequence.push({ wordIdx, tokenId }))
  })

  if (sequence.length === 0) {
    return words.map((word) => ({ word, score: 50, grade: 'ok' as const }))
  }

  // Monotone alignment: for each token[i], search t ∈ [prevT, searchEnd]
  const searchWindow = Math.max(3, Math.ceil(T / sequence.length) * 4)
  const charLogProbs: number[] = []
  let prevT = 0

  for (let i = 0; i < sequence.length; i++) {
    const { tokenId } = sequence[i]
    const searchEnd = Math.min(T, prevT + searchWindow)

    let bestT = prevT
    let bestLP = logProbs[prevT * V + tokenId]

    for (let t = prevT; t < searchEnd; t++) {
      const lp = logProbs[t * V + tokenId]
      if (lp > bestLP) { bestLP = lp; bestT = t }
    }

    charLogProbs.push(bestLP)
    prevT = bestT
  }

  // Aggregate character log-probs per word → word score
  const wordLogProbs: number[] = new Array(words.length).fill(0)
  const wordCounts: number[] = new Array(words.length).fill(0)

  sequence.forEach(({ wordIdx }, i) => {
    wordLogProbs[wordIdx] += charLogProbs[i]
    wordCounts[wordIdx]++
  })

  return words.map((word, i) => {
    const count = wordCounts[i]
    const avgLogP = count > 0 ? wordLogProbs[i] / count : -10

    // Calibration: logP ~0 = perfect, ~-4 = good, ~-7 = ok, ~-10 = bad
    // Tuned for Chinese-accented English (wav2vec2-base-960h is strict)
    const score = Math.max(0, Math.min(100, Math.round((avgLogP + 12) / 12 * 100)))
    const grade = score >= 80 ? 'good' : score >= 60 ? 'ok' : 'bad'

    return { word, score, grade } satisfies WordResult
  })
}
