// Copies ORT wasm files from node_modules to public/ort-wasm/
// Runs automatically after npm install via postinstall hook.
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const src  = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const dest = join(root, 'public', 'ort-wasm')

await mkdir(dest, { recursive: true })

// Only copy the runtime files ORT needs: wasm binaries + worker mjs scripts
const files = (await readdir(src)).filter(f =>
  f.startsWith('ort-wasm-simd-threaded') && (f.endsWith('.wasm') || f.endsWith('.mjs'))
)
for (const f of files) {
  await copyFile(join(src, f), join(dest, basename(f)))
  console.log(`  copied: ${f}`)
}
console.log(`[copy-wasm] ${files.length} files -> public/ort-wasm/`)
