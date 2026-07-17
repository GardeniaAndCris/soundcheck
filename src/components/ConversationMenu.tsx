import type { DialogueScenario } from '../types'
import { loadProgress } from '../lib/conversationStore'
import styles from './ConversationMenu.module.css'

interface Props {
  scenarios: DialogueScenario[]
  onStart: (scenarioId: string) => void
  onBack: () => void
}

export default function ConversationMenu({ scenarios, onStart, onBack }: Props) {
  return (
    <div className={styles.screen}>
      <button className={styles.backBtn} type="button" onClick={onBack}>
        ← 首页
      </button>

      <div className={styles.titleRow}>
        <div className={styles.title}>情景对话</div>
        <div className={styles.hint}>选一句要说的台词，说出来看看发音</div>
      </div>

      <div className={styles.cards}>
        {scenarios.map((scenario) => {
          const progress = loadProgress(scenario.id)
          const status = progress?.completed
            ? '已完成 · 再来一次'
            : progress
              ? '继续上次'
              : '开始练习'

          return (
            <button
              key={scenario.id}
              className={styles.card}
              type="button"
              onClick={() => onStart(scenario.id)}
            >
              <div className={styles.cardTitle}>{scenario.title}</div>
              {scenario.description && <div className={styles.cardDesc}>{scenario.description}</div>}
              <div className={styles.cardStatus}>{status}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
