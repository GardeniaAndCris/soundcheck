export type Grade = 'good' | 'ok' | 'bad'

export interface WordResult {
  word: string
  score: number
  grade: Grade
}

export interface Sentence {
  text: string
  translation?: string
  lesson?: string
  words: string[]
  tips?: Record<string, [string, string]>
}

export type AppState = 'loading' | 'ready' | 'recording' | 'processing' | 'results'
