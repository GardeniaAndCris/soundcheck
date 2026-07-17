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

export interface DialogueChoice {
  id: string
  text: string
  words: string[]
  translation?: string
  tips?: Record<string, [string, string]>
  next?: string
}

export interface DialogueAiTurn {
  id: string
  speaker: 'ai'
  text: string
  translation?: string
  next: string
}

export interface DialogueUserTurn {
  id: string
  speaker: 'user'
  choices: DialogueChoice[]
}

export type DialogueNode = DialogueAiTurn | DialogueUserTurn

export interface DialogueScenario {
  id: string
  title: string
  description?: string
  startNodeId: string
  nodes: Record<string, DialogueNode>
}
