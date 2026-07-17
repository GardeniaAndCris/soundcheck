import { useState } from 'react'
import type { AppState, DialogueChoice, DialogueScenario, WordResult } from '../types'
import type { runInference } from '../lib/model'
import { getPhonetic } from '../lib/phonetic'
import { loadProgress, saveProgress } from '../lib/conversationStore'
import WordDisplay from './WordDisplay'
import RecordButton from './RecordButton'
import WordPopup from './WordPopup'
import styles from './ConversationScreen.module.css'

interface Props {
  scenario: DialogueScenario
  runInference: typeof runInference
  onExit: () => void
}

function playTTS(text: string) {
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-US'
  utt.rate = 0.82
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}

export default function ConversationScreen({ scenario, runInference, onExit }: Props) {
  const [nodeId, setNodeId]     = useState(() => loadProgress(scenario.id)?.nodeId ?? scenario.startNodeId)
  const [finished, setFinished] = useState(() => loadProgress(scenario.id)?.completed ?? false)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [state, setState]       = useState<AppState>('ready')
  const [results, setResults]   = useState<WordResult[] | null>(null)
  const [popupIdx, setPopupIdx] = useState<number | null>(null)

  const node = scenario.nodes[nodeId]
  const selectedChoice: DialogueChoice | null =
    node.speaker === 'user' ? node.choices.find((c) => c.id === selectedChoiceId) ?? null : null

  const totalScore = results
    ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
    : null

  function resetTurnUi() {
    setSelectedChoiceId(null)
    setResults(null)
    setPopupIdx(null)
    setState('ready')
  }

  function handleResults(wordResults: WordResult[]) {
    setResults(wordResults)
    setState('results')
  }

  function tryAgain() {
    setResults(null)
    setPopupIdx(null)
    setState('ready')
  }

  function chooseChoice(choiceId: string) {
    setSelectedChoiceId(choiceId)
    setResults(null)
    setPopupIdx(null)
    setState('ready')
  }

  function changeChoice() {
    resetTurnUi()
  }

  function advanceFromAiTurn(next: string) {
    setNodeId(next)
    resetTurnUi()
  }

  function advanceFromChoice(choice: DialogueChoice) {
    saveProgress(scenario.id, { nodeId: choice.next ?? nodeId, completed: !choice.next })
    if (choice.next) {
      setNodeId(choice.next)
      resetTurnUi()
    } else {
      setFinished(true)
    }
  }

  if (finished) {
    return (
      <div className={styles.screen}>
        <div className={styles.finishedZone}>
          <div className={styles.finishedTitle}>对话完成 🎉</div>
          <div className={styles.finishedHint}>{scenario.title}</div>
          <button className={styles.btnPrimary} type="button" onClick={onExit}>
            返回场景列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.exitBtn} type="button" onClick={onExit}>
          ← 场景列表
        </button>
        <span className={styles.scenarioLabel}>{scenario.title}</span>
      </div>

      {node.speaker === 'ai' && (
        <div className={styles.aiZone}>
          <div className={styles.bubble}>
            <div className={styles.bubbleText}>{node.text}</div>
            {node.translation && <div className={styles.translation}>{node.translation}</div>}
          </div>
          <button className={styles.playBtn} onClick={() => playTTS(node.text)} type="button">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M2 1.5l9 4.5-9 4.5z" />
            </svg>
            播放
          </button>
          <button className={styles.btnPrimary} onClick={() => advanceFromAiTurn(node.next)} type="button">
            继续 →
          </button>
        </div>
      )}

      {node.speaker === 'user' && !selectedChoice && (
        <div className={styles.choiceZone}>
          <div className={styles.choiceHint}>选一句你要说的话</div>
          {node.choices.map((choice) => (
            <button
              key={choice.id}
              className={styles.choiceBtn}
              type="button"
              onClick={() => chooseChoice(choice.id)}
            >
              <div className={styles.choiceText}>{choice.text}</div>
              {choice.translation && <div className={styles.choiceTranslation}>{choice.translation}</div>}
            </button>
          ))}
        </div>
      )}

      {node.speaker === 'user' && selectedChoice && (
        <>
          <div className={styles.sentenceZone}>
            <button className={styles.playBtn} onClick={() => playTTS(selectedChoice.text)} type="button">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M2 1.5l9 4.5-9 4.5z" />
              </svg>
              听示范
            </button>

            <WordDisplay
              words={selectedChoice.words}
              results={results}
              recording={state === 'recording'}
              onWordClick={(i) => setPopupIdx(i)}
            />

            {selectedChoice.translation && <div className={styles.translation}>{selectedChoice.translation}</div>}

            <button className={styles.changeBtn} onClick={changeChoice} type="button">
              换一个选项
            </button>
          </div>

          <div className={`${styles.resultsBar} ${results ? styles.visible : ''}`}>
            <div className={styles.scoreBadge}>
              <strong>{totalScore ?? '—'}</strong>分
            </div>
            <div className={styles.actionBtns}>
              <button className={styles.btnSecondary} onClick={tryAgain} type="button">
                再试一次
              </button>
              <button className={styles.btnPrimary} onClick={() => advanceFromChoice(selectedChoice)} type="button">
                下一步 →
              </button>
            </div>
          </div>

          <RecordButton
            state={state}
            expectedWords={selectedChoice.words}
            onStateChange={setState}
            onResults={handleResults}
            runInference={runInference}
          />

          {popupIdx !== null && results && (
            <WordPopup
              result={results[popupIdx]}
              phonetic={getPhonetic(results[popupIdx].word)}
              tips={selectedChoice.tips?.[results[popupIdx].word]}
              onClose={() => setPopupIdx(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
