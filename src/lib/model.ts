import * as ort from 'onnxruntime-web/wasm'

ort.env.wasm.numThreads = 1

let session: ort.InferenceSession | null = null

const isLocal = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1'

const MODEL_URL = {
  local: '/models/wav2vec2.onnx',
  remote: 'https://huggingface.co/Xenova/wav2vec2-base-960h/resolve/main/onnx/model_quantized.onnx',
}

// IndexedDB helpers — persist the 90 MB model so we only download once
const IDB_DB = 'soundcheck-db'
const IDB_STORE = 'model-cache'
const IDB_KEY = 'wav2vec2'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readFromIDB(): Promise<ArrayBuffer | null> {
  try {
    const db = await openIDB()
    return new Promise(resolve => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function writeToIDB(buf: ArrayBuffer): Promise<void> {
  try {
    const db = await openIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(buf, IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // cache failure is non-fatal
  }
}

export async function loadModel(onProgress: (pct: number) => void): Promise<void> {
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    throw new Error('COOP/COEP 头未生效 (crossOriginIsolated=false)')
  }

  // ── 1. Try IndexedDB cache ─────────────────────────────────
  onProgress(3)
  let modelBuffer: ArrayBuffer | null = await readFromIDB()

  if (modelBuffer) {
    onProgress(75) // cache hit — jump straight to loading
  } else {
    // ── 2. Download model ─────────────────────────────────────
    const url = isLocal() ? MODEL_URL.local : MODEL_URL.remote
    let response: Response
    try {
      response = await fetch(url, { credentials: 'omit' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (e) {
      throw new Error(`模型下载失败: ${(e as Error).message}`)
    }

    const total = Number(response.headers.get('content-length') ?? 0)
    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      if (total > 0) onProgress(5 + Math.round((loaded / total) * 68))
    }

    // Assemble into a single ArrayBuffer
    const uint8 = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) { uint8.set(chunk, offset); offset += chunk.length }
    modelBuffer = uint8.buffer

    onProgress(75)
    writeToIDB(modelBuffer) // fire-and-forget; next load uses cache
  }

  // ── 3. ORT session ─────────────────────────────────────────
  onProgress(80)
  try {
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
  } catch (e) {
    throw new Error(`ONNX 会话初始化失败: ${(e as Error).message}`)
  }

  onProgress(95)

  // ── 4. Warm-up ─────────────────────────────────────────────
  try {
    const warmup = new ort.Tensor('float32', new Float32Array(16000), [1, 16000])
    await session.run({ input_values: warmup })
  } catch (e) {
    throw new Error(`推理预热失败: ${(e as Error).message}`)
  }

  onProgress(100)
}

export async function runInference(
  audioData: Float32Array
): Promise<{ logits: Float32Array; timeSteps: number; vocabSize: number }> {
  if (!session) throw new Error('Model not loaded')
  const tensor = new ort.Tensor('float32', audioData, [1, audioData.length])
  const results = await session.run({ input_values: tensor })
  const logitsTensor = results['logits']
  const [, timeSteps, vocabSize] = logitsTensor.dims as [number, number, number]
  return { logits: logitsTensor.data as Float32Array, timeSteps, vocabSize }
}

export const isModelReady = () => session !== null
