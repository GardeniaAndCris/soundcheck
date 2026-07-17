import type { Sentence } from '../types'

export function parseDocument(text: string): Sentence[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      text: line,
      words: line.split(/\s+/).filter(Boolean),
    }))
}
