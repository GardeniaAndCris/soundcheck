import { useState, useEffect, useRef } from 'react'
import { loadModel, runInference } from '../lib/model'

export interface ModelHook {
  progress: number      // 0-100
  ready: boolean
  error: string | null
  runInference: typeof runInference
}

export function useModel(): ModelHook {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    loadModel(setProgress)
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message))
  }, [])

  return { progress, ready, error, runInference }
}
