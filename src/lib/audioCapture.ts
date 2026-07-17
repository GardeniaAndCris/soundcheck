export interface RecordingHandle {
  analyser: AnalyserNode
  stop: () => Promise<Float32Array>
}

/**
 * Start recording from microphone.
 * Returns an analyser node (for amplitude visualisation) and a stop() function.
 * stop() resolves with a 16 kHz mono Float32Array ready for wav2vec2 inference.
 */
export async function startRecording(): Promise<RecordingHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })

  // ── Analyser for canvas amplitude ring ──────────────────────
  const visCtx = new AudioContext()
  const analyser = visCtx.createAnalyser()
  analyser.fftSize = 256
  visCtx.createMediaStreamSource(stream).connect(analyser)

  // ── MediaRecorder ────────────────────────────────────────────
  const mimeType =
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      .find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start(100) // flush every 100ms

  return {
    analyser,
    stop: async () => {
      recorder.stop()
      stream.getTracks().forEach((t) => t.stop())
      visCtx.close()

      await new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()

      // Decode audio at its native sample rate
      const decodeCtx = new AudioContext()
      let decoded: AudioBuffer
      try {
        decoded = await decodeCtx.decodeAudioData(arrayBuffer)
      } finally {
        await decodeCtx.close()
      }

      // Resample to 16 kHz mono using OfflineAudioContext
      const TARGET_SR = 16000
      const targetLength = Math.max(1, Math.round(decoded.duration * TARGET_SR))
      const offCtx = new OfflineAudioContext(1, targetLength, TARGET_SR)
      const src = offCtx.createBufferSource()
      src.buffer = decoded
      src.connect(offCtx.destination)
      src.start()
      const rendered = await offCtx.startRendering()

      // Normalise amplitude so wav2vec2 sees values in [-1, 1]
      const raw = rendered.getChannelData(0)
      return normalise(raw)
    },
  }
}

function normalise(audio: Float32Array): Float32Array {
  let peak = 0
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i])
    if (abs > peak) peak = abs
  }
  if (peak < 0.001) return audio.slice() // silence — return as-is
  const out = new Float32Array(audio.length)
  const scale = 1 / peak
  for (let i = 0; i < audio.length; i++) out[i] = audio[i] * scale
  return out
}
