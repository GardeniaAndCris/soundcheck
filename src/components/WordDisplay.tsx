import type { WordResult } from '../types'
import styles from './WordDisplay.module.css'

interface Props {
  words: string[]
  results: WordResult[] | null
  recording: boolean
  onWordClick: (idx: number) => void
}

export default function WordDisplay({ words, results, recording, onWordClick }: Props) {
  return (
    <div
      className={`${styles.display} ${recording ? styles.recording : ''}`}
      aria-label="朗读句子"
    >
      {words.map((w, i) => {
        const result = results?.[i]
        return (
          <span key={i}>
            <span
              className={`${styles.word} ${result ? styles.result : ''} ${result ? styles[result.grade] : ''}`}
              onClick={result ? (e) => { e.stopPropagation(); onWordClick(i) } : undefined}
              role={result ? 'button' : undefined}
              tabIndex={result ? 0 : undefined}
              onKeyDown={result ? (e) => e.key === 'Enter' && onWordClick(i) : undefined}
            >
              {w}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
