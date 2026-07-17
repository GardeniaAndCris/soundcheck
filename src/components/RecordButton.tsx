import { useRef, useEffect, useCallback, useState } from 'react'
import type { AppState, WordResult } from '../types'
import type { runInference } from '../lib/model'
import { startRecording } from '../lib/audioCapture'
import { scoreWords, ensureVocabLoaded } from '../lib/align'
import styles from './RecordButton.module.css'

interface Props {
  state: AppState
  expectedWords: string[]
  onStateChange: (s: AppState) => void
  onResults: (results: WordResult[]) => void
  runInference: typeof runInference
}

export default function RecordButton({
  state,
  expectedWords,
  onStateChange,
  onResults,
  runInference,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const animRef     = useRef<number>(0)
  const isDownRef   = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRef   = useRef<any>(null)

  // ── Mic permission ─────────────────────────────────────────────
  // 'checking' | 'prompt' | 'granted' | 'denied'
  const [micPerm, setMicPerm] = useState<'checking' | 'prompt' | 'granted' | 'denied'>('checking')

  useEffect(() => {
    if (!navigator.permissions) { setMicPerm('prompt'); return }
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((r) => {
        setMicPerm(r.state as typeof micPerm)
        r.onchange = () => setMicPerm(r.state as typeof micPerm)
      })
      .catch(() => setMicPerm('prompt'))
  }, [])

  const grantMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      setMicPerm('granted')
    } catch {
      setMicPerm('denied')
    }
  }, [])

  // ── Amplitude canvas ───────────────────────────────────────────
  const drawAmp = useCallback((analyser: AnalyserNode) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const data = new Uint8Array(analyser.frequencyBinCount)

    const frame = () => {
      analyser.getByteFrequencyData(data)
      const avg = data.slice(0, 24).reduce((a, b) => a + b, 0) / 24

      ctx.clearRect(0, 0, W, H)
      const r = 44 + (avg / 255) * 16
      const g = ctx.createRadialGradient(cx, cy, 42, cx, cy, r + 10)
      g.addColorStop(0, 'rgba(94,207,170,0.3)')
      g.addColorStop(1, 'rgba(94,207,170,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(94,207,170,${0.3 + (avg / 255) * 0.4})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      animRef.current = requestAnimationFrame(frame)
    }
    frame()
  }, [])

  const clearCanvas = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // ── Start recording ────────────────────────────────────────────
  const startRecord = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (state !== 'ready' || isDownRef.current) return
    isDownRef.current = true
    onStateChange('recording')

    try {
      const handle = await startRecording()
      handleRef.current = handle
      drawAmp(handle.analyser)
    } catch (err) {
      console.error('Mic error:', err)
      onStateChange('ready')
      isDownRef.current = false
    }
  }, [state, drawAmp, onStateChange])

  // ── Stop recording → infer → score ─────────────────────────────
  const stopRecord = useCallback(async () => {
    if (!isDownRef.current) return
    isDownRef.current = false

    const handle = handleRef.current
    handleRef.current = null
    clearCanvas()
    onStateChange('processing')

    try {
      const audio = handle ? await handle.stop() : new Float32Array(16000)
      const { logits, timeSteps, vocabSize } = await runInference(audio)
      await ensureVocabLoaded()
      const results = scoreWords(logits, timeSteps, vocabSize, expectedWords)
      onResults(results)
    } catch (err) {
      console.error('Inference error:', err)
      const fallback = expectedWords.map((word) => ({ word, score: 50, grade: 'ok' as const }))
      onResults(fallback)
    }
  }, [clearCanvas, onStateChange, runInference, expectedWords, onResults])

  useEffect(() => () => clearCanvas(), [clearCanvas])

  // ── Mic permission gate ────────────────────────────────────────
  if (micPerm === 'denied') {
    return (
      <div className={styles.zone}>
        <p style={{ color: 'var(--bad)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.5 }}>
          麦克风权限被拒绝<br />请在浏览器设置中允许访问
        </p>
      </div>
    )
  }

  if (micPerm === 'prompt') {
    return (
      <div className={styles.zone}>
        <div className={styles.wrap}>
          <button
            className={styles.btn}
            type="button"
            aria-label="授权麦克风"
            onClick={grantMic}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 26, height: 26, color: 'var(--text-muted)' }} aria-hidden="true">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </button>
        </div>
        <div className={styles.hint}>点击授权麦克风</div>
      </div>
    )
  }

  // ── Normal record button ───────────────────────────────────────
  const isRecording  = state === 'recording'
  const isProcessing = state === 'processing'
  const hint =
    isRecording  ? '说话中...' :
    isProcessing ? '评分中...' :
    state === 'results' ? '按住重录' : '按住说话'

  return (
    <div className={styles.zone}>
      <div className={styles.wrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={132}
          height={132}
          aria-hidden="true"
        />
        <button
          className={`${styles.btn} ${isRecording ? styles.recording : ''}`}
          type="button"
          aria-label="按住说话"
          disabled={isProcessing}
          onMouseDown={startRecord}
          onMouseUp={stopRecord}
          onMouseLeave={stopRecord}
          onTouchStart={startRecord}
          onTouchEnd={stopRecord}
        >
          <svg
            className={styles.micIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="9" y="1" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="8" y1="21" x2="16" y2="21" />
          </svg>
        </button>
      </div>
      <div
        className={`${styles.hint} ${isRecording ? styles.active : ''}`}
        aria-live="polite"
      >
        {hint}
      </div>
    </div>
  )
}
