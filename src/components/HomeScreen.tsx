import styles from './HomeScreen.module.css'

interface Props {
  onSelectPractice: () => void
  onSelectDocument: () => void
}

export default function HomeScreen({ onSelectPractice, onSelectDocument }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.wordmark}>
        Sound<em>Check</em>
      </div>
      <div className={styles.subtitle}>选择练习模式</div>

      <div className={styles.cards}>
        <button className={styles.card} type="button" onClick={onSelectPractice}>
          <div className={styles.cardTitle}>内置练习</div>
          <div className={styles.cardDesc}>精选例句 · 含发音提示</div>
        </button>
        <button className={styles.card} type="button" onClick={onSelectDocument}>
          <div className={styles.cardTitle}>文档跟读</div>
          <div className={styles.cardDesc}>粘贴任意文本练习</div>
        </button>
      </div>
    </div>
  )
}
