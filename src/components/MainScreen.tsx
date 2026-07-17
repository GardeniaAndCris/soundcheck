import { useState } from 'react'
import type { AppState, Sentence, WordResult } from '../types'
import type { runInference } from '../lib/model'
import { getPhonetic } from '../lib/phonetic'
import WordDisplay from './WordDisplay'
import RecordButton from './RecordButton'
import WordPopup from './WordPopup'
import styles from './MainScreen.module.css'

interface Props {
  sentences: Sentence[]
  navStyle: 'dots' | 'counter'
  runInference: typeof runInference
  onExit: () => void
}

export default function MainScreen({ sentences, navStyle, runInference, onExit }: Props) {
  const [idx, setIdx]         = useState(0)
  const [state, setState]     = useState<AppState>('ready')
  const [results, setResults] = useState<WordResult[] | null>(null)
  const [popupIdx, setPopupIdx] = useState<number | null>(null)

  const sentence   = sentences[idx]
  const totalScore = results
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : null

  function handleResults(wordResults: WordResult[]) {
    setResults(wordResults)
    setState('results')
  }

  function playTTS() {
    const utt = new SpeechSynthesisUtterance(sentence.text)
    utt.lang = 'en-US'
    utt.rate = 0.82
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utt)
  }

  function tryAgain() {
    setResults(null)
    setPopupIdx(null)
    setState('ready')
  }

  function nextSentence() {
    setIdx((i) => (i + 1) % sentences.length)
    setResults(null)
    setPopupIdx(null)
    setState('ready')
  }

  return (
    <div className={styles.screen}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.exitBtn} type="button" onClick={onExit}>
            ← 首页
          </button>
          {sentence.lesson && <span className={styles.lessonLabel}>{sentence.lesson}</span>}
        </div>
        {navStyle === 'dots' ? (
          <div className={styles.dots}>
            {sentences.map((_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${i < idx ? styles.done : i === idx ? styles.current : ''}`}
              />
            ))}
          </div>
        ) : (
          <div className={styles.counter}>第 {idx + 1} / {sentences.length} 句</div>
        )}
      </div>

      {/* Sentence zone */}
      <div className={styles.sentenceZone}>
        <button className={styles.playBtn} onClick={playTTS} type="button">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M2 1.5l9 4.5-9 4.5z" />
          </svg>
          听示范
        </button>

        <WordDisplay
          words={sentence.words}
          results={results}
          recording={state === 'recording'}
          onWordClick={(i) => setPopupIdx(i)}
        />

        {sentence.translation && <div className={styles.translation}>{sentence.translation}</div>}
      </div>

      {/* Results bar */}
      <div className={`${styles.resultsBar} ${results ? styles.visible : ''}`}>
        <div className={styles.scoreBadge}>
          <strong>{totalScore ?? '—'}</strong>分
        </div>
        <div className={styles.actionBtns}>
          <button className={styles.btnSecondary} onClick={tryAgain} type="button">
            再试一次
          </button>
          <button className={styles.btnPrimary} onClick={nextSentence} type="button">
            下一句 →
          </button>
        </div>
      </div>

      {/* Record button — real audio pipeline */}
      <RecordButton
        state={state}
        expectedWords={sentence.words}
        onStateChange={setState}
        onResults={handleResults}
        runInference={runInference}
      />

      {/* Word detail popup */}
      {popupIdx !== null && results && (
        <WordPopup
          result={results[popupIdx]}
          phonetic={getPhonetic(results[popupIdx].word)}
          tips={sentence.tips?.[results[popupIdx].word]}
          onClose={() => setPopupIdx(null)}
        />
      )}
    </div>
  )
}
