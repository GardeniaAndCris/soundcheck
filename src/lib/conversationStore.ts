export interface ScenarioProgress {
  nodeId: string
  completed: boolean
}

const PROGRESS_KEY = 'soundcheck-conversation-progress'

function readAll(): Record<string, ScenarioProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function loadProgress(scenarioId: string): ScenarioProgress | null {
  return readAll()[scenarioId] ?? null
}

export function saveProgress(scenarioId: string, progress: ScenarioProgress): void {
  try {
    const all = readAll()
    all[scenarioId] = progress
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {
    // storage full/unavailable — progress is a convenience, not critical
  }
}
