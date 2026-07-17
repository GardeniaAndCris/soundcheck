import styles from './LoadingScreen.module.css'

interface Props {
  active: boolean
  progress: number      // 0-100, real download+init progress
  error: string | null
}

export default function LoadingScreen({ active, progress, error }: Props) {
  const label =
    error         ? '加载失败，请刷新页面重试' :
    progress < 80 ? `下载语音模型 ${progress}%` :
    progress < 95 ? '初始化模型...' :
    progress < 100 ? '准备就绪...' :
                     '完成'

  return (
    <div className={`${styles.screen} ${active ? styles.active : ''}`}>
      <div className={styles.wordmark}>
        Sound<em>Check</em>
      </div>
      <div className={styles.subtitle}>英语发音评测</div>
      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${error ? styles.error : ''}`}
          style={{ width: `${error ? 100 : progress}%` }}
        />
      </div>
      <p className={`${styles.note} ${error ? styles.noteError : ''}`}>
        {label}
        {error && (
          <span style={{ display: 'block', marginTop: 8, fontSize: 11, opacity: 0.7, wordBreak: 'break-all' }}>
            {error}
          </span>
        )}
        {!error && progress === 0 && (
          <>
            <br />
            <span>首次加载约 90MB，之后完全离线可用</span>
          </>
        )}
      </p>
    </div>
  )
}
