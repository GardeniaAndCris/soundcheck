// Copies ORT wasm files from node_modules to public/ort-wasm/
// Runs automatically after npm install via postinstall hook.
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const src  = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const dest = join(root, 'public', 'ort-wasm')

await mkdir(dest, { recursive: true })

// Only copy the plain WASM-only variant (no jsep/asyncify/jspi — this project
// imports the 'onnxruntime-web/wasm' subpath, which doesn't use those).
// The jsep variant alone exceeds Cloudflare Pages' 25 MiB per-file limit.
const files = (await readdir(src)).filter(f =>
  /^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(f)
)
for (const f of files) {
  await copyFile(join(src, f), join(dest, basename(f)))
  console.log(`  copied: ${f}`)
}
console.log(`[copy-wasm] ${files.length} files -> public/ort-wasm/`)
