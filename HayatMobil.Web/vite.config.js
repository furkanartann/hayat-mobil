import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../HayatMobil.Api/wwwroot',
    emptyOutDir: true,
  },
})
