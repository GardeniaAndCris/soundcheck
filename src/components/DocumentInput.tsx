import { useState } from 'react'
import type { Sentence } from '../types'
import { loadDraft, saveDraft } from '../lib/documentStore'
import { parseDocument } from '../lib/documentParse'
import { autoSplitSentences } from '../lib/sentenceSplit'
import styles from './DocumentInput.module.css'

interface Props {
  onStart: (sentences: Sentence[]) => void
  onBack: () => void
}

export default function DocumentInput({ onStart, onBack }: Props) {
  const [text, setText] = useState(loadDraft)

  function handleChange(value: string) {
    setText(value)
    saveDraft(value)
  }

  function handleAutoSplit() {
    handleChange(autoSplitSentences(text))
  }

  function handleStart() {
    const sentences = parseDocument(text)
    if (sentences.length > 0) onStart(sentences)
  }

  const sentenceCount = parseDocument(text).length

  return (
    <div className={styles.screen}>
      <button className={styles.backBtn} type="button" onClick={onBack}>
        ← 首页
      </button>

      <div className={styles.titleRow}>
        <div>
          <div className={styles.title}>粘贴文本</div>
          <div className={styles.hint}>每行一句，逐句练习</div>
        </div>
        <button
          className={styles.splitBtn}
          type="button"
          disabled={!text.trim()}
          onClick={handleAutoSplit}
        >
          自动分行
        </button>
      </div>

      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={'She sells seashells by the seashore\nThe early bird catches the worm'}
      />

      <button
        className={styles.startBtn}
        type="button"
        disabled={sentenceCount === 0}
        onClick={handleStart}
      >
        开始练习（{sentenceCount} 句）→
      </button>
    </div>
  )
}
