const DRAFT_KEY = 'soundcheck-document-draft'

export function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDraft(text: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, text)
  } catch {
    // storage full/unavailable — draft is a convenience, not critical
  }
}
