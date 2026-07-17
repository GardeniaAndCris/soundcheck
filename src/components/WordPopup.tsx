import { useEffect, useRef } from 'react'
import type { WordResult } from '../types'
import { speakWord } from '../lib/phonetic'
import styles from './WordPopup.module.css'

interface Props {
  result: WordResult
  phonetic: string
  tips?: [string, string]
  onClose: () => void
}

export default function WordPopup({ result, phonetic, tips, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div className={styles.popup} ref={ref} role="tooltip">
      <div className={styles.wordRow}>
        <div className={`${styles.word} ${styles[result.grade]}`}>{result.word}</div>
        <button
          className={styles.speakBtn}
          type="button"
          aria-label="播放标准发音"
          onClick={() => speakWord(result.word)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>
      </div>
      <div className={styles.phonetic}>{phonetic}</div>
      <div className={styles.scoreRow}>
        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${styles[result.grade]}`}
            style={{ width: result.score + '%' }}
          />
        </div>
        <div className={styles.scoreNum}>{result.score} 分</div>
      </div>
      {tips && <div className={styles.tip}>{tips[0]} · {tips[1]}</div>}
    </div>
  )
}
