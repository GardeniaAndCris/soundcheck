import { createReadStream, existsSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Serves the large local-only ONNX model (gitignored, kept outside public/)
// so dev-mode fetch('/models/wav2vec2.onnx') keeps working without shipping
// 90MB into every production build.
function serveLocalModel(): Plugin {
  const filePath = new URL('./local-models/wav2vec2.onnx', import.meta.url)
  return {
    name: 'serve-local-model',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/models/wav2vec2.onnx' && existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/octet-stream')
          createReadStream(filePath).pipe(res)
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    serveLocalModel(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globIgnores: ['**/*.wasm', '**/*.onnx'],
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SoundCheck 英语发音评测',
        short_name: 'SoundCheck',
        description: '离线英语口语发音评测',
        theme_color: '#141824',
        background_color: '#141824',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnxruntime-web/wasm'],
  },
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
