// Word-abbreviations that end in a period but don't end a sentence.
const ABBREVIATIONS = [
  "Mr", "Mrs", "Ms", "Dr", "Prof", "Sr", "Jr", "St",
  "Sgt", "Capt", "Gen", "Rev", "Gov", "Sen", "Rep",
  "vs", "etc", "approx", "Inc", "Ltd", "Co", "Corp", "Vol", "No",
]

// Marker text unlikely to occur in real prose; stands in for a "protected" period.
const PLACEHOLDER = "@@SC_DOT@@"

function protectAbbreviations(text: string): string {
  // Multi-initial abbreviations: U.S., U.K., U.S.A., e.g., i.e., a.m., p.m.
  let result = text.replace(/\b(?:[A-Za-z]\.){2,}/g, (m) => m.split(".").join(PLACEHOLDER))
  // Whitelisted word abbreviations: Mr. Dr. etc. vs. Inc. ...
  for (const abbr of ABBREVIATIONS) {
    result = result.replace(new RegExp("\\b" + abbr + "\\.", "g"), abbr + PLACEHOLDER)
  }
  return result
}

function restorePlaceholder(text: string): string {
  return text.split(PLACEHOLDER).join(".")
}

function splitLineIntoSentences(line: string): string[] {
  if (!line) return []
  const protectedLine = protectAbbreviations(line)
  return protectedLine
    .split(/(?<=[.!?])\s+(?=[A-Z"'0-9])/)
    .map((s) => restorePlaceholder(s).trim())
    .filter(Boolean)
}

/**
 * Reformats pasted text into one sentence per line.
 * Existing line breaks are preserved as boundaries; each line is
 * further split into sentences (abbreviations like "Mr." are protected).
 */
export function autoSplitSentences(text: string): string {
  return text
    .split("\n")
    .flatMap((line) => splitLineIntoSentences(line.trim()))
    .join("\n")
}
