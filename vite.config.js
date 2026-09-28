import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // MediaPipe loads its wasm runtime with importScripts(), which only exists
  // in a CLASSIC worker; in a module worker it fails with "ModuleFactory not
  // set". Vite defaults workers to modules in dev, so pin the format.
  worker: { format: 'iife' },
  server: { host: true, port: 5173 },
})
